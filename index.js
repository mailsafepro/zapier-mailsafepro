/**
 * @module ZapierMailSafeProIntegration
 * @description Integración empresarial de MailSafePro para Zapier con:
 * - Autenticación dual (API Key + JWT con refresh automático)
 * - Manejo inteligente de errores con retry exponencial
 * - Rate limiting con throttling adaptativo
 * - Logging estructurado para debugging
 * - Testing hooks y mocks
 * - Versionado de API
 * - Webhooks para resultados async
 * - Polling de estado de batch
 * @version 2.0.0
 * @author MailSafePro Team
 */

const authentication = require('./authentication');
const validateEmailTrigger = require('./triggers/validate_email');
const batchWebhookTrigger = require('./triggers/batch_webhook');
const batchValidateCreate = require('./creates/batch_validate');
const cancelBatchCreate = require('./creates/cancel_batch');
const getUsageSearch = require('./searches/get_usage');
const getBatchStatusSearch = require('./searches/get_batch_status');
const getBatchResultsSearch = require('./searches/get_batch_results');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  version: '2.0.0',
  apiVersion: 'v1',
  baseUrl: 'https://api.mailsafepro.com/v1',
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
  rateLimit: {
    throttleDelay: 1000, // 1 segundo entre requests al detectar 429
    maxThrottleAttempts: 5,
  },
  logging: {
    enabled: process.env.NODE_ENV !== 'test', // Deshabilitado en tests por defecto
    includeHeaders: false, // Solo en debug
    maxBodyLength: 500,
  },
};

// ============================================================================
// UTILIDADES
// ============================================================================

const logger = {
  _log(level, message, data = {}) {
    if (!CONFIG.logging.enabled) return;
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };
    console.log(JSON.stringify(logEntry));
  },
  debug(message, data) {
    this._log('DEBUG', message, data);
  },
  info(message, data) {
    this._log('INFO', message, data);
  },
  warn(message, data) {
    this._log('WARN', message, data);
  },
  error(message, data) {
    this._log('ERROR', message, data);
  },
};

const sanitizeForLogging = obj => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};
  const sensitiveKeys = [
    'password',
    'apikey',
    'api_key',
    'token',
    'authorization',
    'refresh_token',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    // Redactar claves sensibles (comparación case-insensitive)
    if (sensitiveKeys.some(sk => keyLower === sk.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else if (typeof value === 'string' && value.length > CONFIG.logging.maxBodyLength) {
      sanitized[key] = value.substring(0, CONFIG.logging.maxBodyLength) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const extractRequestInfo = request => ({
  method: request.method,
  url: request.url,
  headers: CONFIG.logging.includeHeaders ? sanitizeForLogging(request.headers) : undefined,
  body: sanitizeForLogging(request.body),
});

const extractResponseInfo = response => ({
  status: response.status,
  statusText: response.statusText,
  headers: CONFIG.logging.includeHeaders ? sanitizeForLogging(response.headers) : undefined,
  body: sanitizeForLogging(response.json || response.getContent?.() || {}),
});

const isRecoverableError = status => {
  return CONFIG.retry.retryableStatuses.includes(status);
};

const calculateRetryDelay = (attempt, baseDelay = CONFIG.retry.baseDelay) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const delay = Math.min(exponentialDelay, CONFIG.retry.maxDelay);

  // Jitter: ±20% variación para evitar thundering herd
  const jitter = delay * 0.4 * (Math.random() - 0.5); // -20% to +20%
  const finalDelay = Math.floor(delay + jitter);

  // Asegurar que el delay no sea menor que baseDelay ni mayor que maxDelay
  return Math.min(Math.max(finalDelay, baseDelay), CONFIG.retry.maxDelay);
};

// ============================================================================
// HOOKS
// ============================================================================

// Request deduplication cache (prevents duplicate requests in short time window)
const requestCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Generate cache key from request
 * @param {Object} request - Request object
 * @returns {string} - Cache key
 */
const getRequestCacheKey = request => {
  const bodyHash = request.body ? JSON.stringify(request.body) : '';
  return `${request.method}:${request.url}:${bodyHash}`;
};

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
};

const beforeRequest = async (z, bundle) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check for duplicate request
  const cacheKey = getRequestCacheKey(bundle.request);
  const cachedEntry = requestCache.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    logger.debug('Request deduplicated (cache hit)', { requestId, cacheKey });
    bundle.meta = bundle.meta || {};
    bundle.meta.fromCache = true;
  }

  logger.info('Request iniciado', {
    requestId,
    request: extractRequestInfo(bundle.request),
    fromCache: bundle.meta?.fromCache || false,
  });

  // Inyectar auth headers usando beforeRequest de authentication
  if (authentication.beforeRequest && authentication.beforeRequest[0]) {
    try {
      const authPreRequest = authentication.beforeRequest[0];
      const authResult = await authPreRequest(bundle.request, z, bundle);
      if (authResult?.headers) {
        bundle.request.headers = {
          ...bundle.request.headers,
          ...authResult.headers,
        };
        logger.debug('Headers de autenticación inyectados', { requestId });
      }
    } catch (authError) {
      logger.error('Error en autenticación preRequest', {
        requestId,
        error: authError.message,
      });
      throw authError;
    }
  }

  // Añadir headers estándar
  bundle.request.headers = {
    'User-Agent': `Zapier-MailSafePro/${CONFIG.version}`,
    'X-Request-ID': requestId,
    ...bundle.request.headers,
  };

  // Guardar requestId en bundle para correlación
  bundle.meta = bundle.meta || {};
  bundle.meta.requestId = requestId;

  // Store request in cache for deduplication
  if (!bundle.meta.fromCache) {
    requestCache.set(cacheKey, {
      timestamp: Date.now(),
      requestId,
    });
    // Clean up old cache entries periodically
    if (requestCache.size > 100) {
      clearExpiredCache();
    }
  }

  return bundle.request;
};

const afterResponse = async (response, z, bundle) => {
  const requestId = bundle.meta?.requestId || 'unknown';

  logger.info('Response recibida', {
    requestId,
    response: extractResponseInfo(response),
  });

  // 1. RATE LIMITING (429)
  if (response.status === 429) {
    const retryAfter = response.headers['retry-after'];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : CONFIG.rateLimit.throttleDelay;
    logger.warn('Rate limit alcanzado', {
      requestId,
      retryAfter: delay,
    });
    throw new z.errors.ThrottledError(
      `Rate limit excedido. Reintentando en ${delay / 1000} segundos...`
    );
  }

  // 2. AUTH ERRORS (401)
  if (response.status === 401) {
    logger.warn('Error de autenticación 401', { requestId });
    if (bundle.authData?.jwt && bundle.authData?.refreshToken) {
      logger.info('Intentando refresh automático de JWT', { requestId });
      try {
        const newAuth = await authentication.refreshAccessToken(z, bundle);
        bundle.authData.jwt = newAuth.jwt;
        bundle.authData.refreshToken = newAuth.refreshToken;
        bundle.authData.expiresAt = newAuth.expiresAt;
        logger.info('JWT refrescado, reintentando request', { requestId });
        bundle.request.headers['Authorization'] = `Bearer ${newAuth.jwt}`;
        return z.request(bundle.request);
      } catch (refreshError) {
        logger.error('Refresh automático falló', {
          requestId,
          error: refreshError.message,
        });
        throw new z.errors.RefreshAuthError(
          'Tu sesión expiró y no pudimos refrescarla. Por favor vuelve a conectar tu cuenta.'
        );
      }
    }
    throw new z.errors.RefreshAuthError(
      'Autenticación inválida o expirada. Por favor vuelve a conectar tu cuenta.'
    );
  }

  // 3. FORBIDDEN (403)
  if (response.status === 403) {
    let message = 'Acceso denegado. Verifica los permisos de tu cuenta.';
    try {
      const json = response.json || response.getContent?.() || {};
      if (json?.detail) {
        message = json.detail;
      }
    } catch (e) {
      logger.debug('No se pudo parsear detalle de error 403', {
        requestId,
        parseError: e.message,
      });
    }
    logger.warn('Acceso prohibido 403', {
      requestId,
      message,
    });
    throw new z.errors.Error(message, 'FORBIDDEN', 403);
  }

  // 4. ERRORES RECUPERABLES (5xx, timeouts)
  if (isRecoverableError(response.status)) {
    const attemptNumber = bundle.meta?.attemptNumber || 0;
    if (attemptNumber < CONFIG.retry.maxAttempts - 1) {
      const delay = calculateRetryDelay(attemptNumber);
      logger.warn('Error recuperable, programando retry', {
        requestId,
        status: response.status,
        attempt: attemptNumber + 1,
        maxAttempts: CONFIG.retry.maxAttempts,
        delay,
      });
      bundle.meta.attemptNumber = attemptNumber + 1;
      await new Promise(resolve => setTimeout(resolve, delay));
      return z.request(bundle.request);
    } else {
      logger.error('Máximo de reintentos alcanzado', {
        requestId,
        status: response.status,
        attempts: CONFIG.retry.maxAttempts,
      });
      // CAÍDA: Lanzar error después de máximo de reintentos
      let message = 'Error interno del servidor MailSafePro';
      try {
        const json = response.json || response.getContent?.() || {};
        message = json?.detail || json?.message || message;
      } catch (e) {
        // Ignorar error de parseo, usar mensaje por defecto
      }
      throw new z.errors.Error(
        `${message}. Si el problema persiste, contacta a soporte.`,
        'SERVER_ERROR',
        response.status
      );
    }
  }

  // 5. OTROS ERRORES 4xx
  if (response.status >= 400 && response.status < 500) {
    let message = 'Error en la solicitud';
    let errorType = 'CLIENT_ERROR';
    try {
      const json = response.json || response.getContent?.() || {};
      message = json?.detail || json?.message || message;
      errorType = json?.error_type || errorType;
    } catch (e) {
      logger.debug('No se pudo parsear detalle de error 4xx', {
        requestId,
        parseError: e.message,
      });
    }
    logger.error('Error del cliente', {
      requestId,
      status: response.status,
      message,
      errorType,
    });
    throw new z.errors.Error(message, errorType, response.status);
  }

  // 6. ERRORES 5xx (sin reintentos o después de reintentos)
  if (response.status >= 500) {
    let message = 'Error interno del servidor MailSafePro';
    try {
      const json = response.json || response.getContent?.() || {};
      message = json?.detail || json?.message || message;
    } catch (e) {
      logger.debug('No se pudo parsear detalle de error 5xx', {
        requestId,
        parseError: e.message,
      });
    }
    logger.error('Error del servidor', {
      requestId,
      status: response.status,
      message,
    });
    throw new z.errors.Error(
      `${message}. Si el problema persiste, contacta a soporte.`,
      'SERVER_ERROR',
      response.status
    );
  }

  // 7. SUCCESS (2xx)
  logger.info('Request completado exitosamente', {
    requestId,
    status: response.status,
  });

  return response;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  // Solo exportar la configuración de autenticación de Zapier, no todo el módulo
  authentication: authentication.authentication,

  // Hooks globales
  beforeRequest: [beforeRequest],
  afterResponse: [afterResponse],

  // Modules
  triggers: {
    [validateEmailTrigger.key]: validateEmailTrigger,
    [batchWebhookTrigger.key]: batchWebhookTrigger,
  },
  creates: {
    [batchValidateCreate.key]: batchValidateCreate,
    [cancelBatchCreate.key]: cancelBatchCreate,
  },
  searches: {
    [getUsageSearch.key]: getUsageSearch,
    [getBatchStatusSearch.key]: getBatchStatusSearch,
    [getBatchResultsSearch.key]: getBatchResultsSearch,
  },
  ...(process.env.NODE_ENV === 'test' && {
    testHelpers: {
      logger,
      sanitizeForLogging,
      isRecoverableError,
      calculateRetryDelay,
      extractRequestInfo,
      extractResponseInfo,
      CONFIG, // Exponer CONFIG para tests
    },
  }),
};

/**
 * @module Authentication
 * @description Sistema de autenticación para MailSafePro compatible con Zapier v18.
 */

const { jwtDecode } = require('jwt-decode');

const CONFIG = {
  baseUrl: 'https://api.mailsafepro.com/v1',
  timeout: {
    auth: 12000,
    test: 10000,
    refresh: 8000,
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  jwt: {
    refreshThreshold: 300000,
    minExpiry: 60000,
  },
  apiKey: {
    minLength: 32,
    pattern: /^[a-zA-Z0-9_-]{32,}$/,
  },
};

const exponentialBackoff = attempt => {
  const delay = Math.min(CONFIG.retry.baseDelay * Math.pow(2, attempt), CONFIG.retry.maxDelay);
  return new Promise(resolve => setTimeout(resolve, delay));
};

const withRetry = async (requestFn, options = {}) => {
  const { maxAttempts = CONFIG.retry.maxAttempts, retryOn = [500, 502, 503, 504] } = options;
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await requestFn();
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      if (response.status === 429 || retryOn.includes(response.status)) {
        if (attempt < maxAttempts - 1) {
          await exponentialBackoff(attempt);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await exponentialBackoff(attempt);
      }
    }
  }
  throw lastError;
};

const validateJWTResponse = response => {
  if (!response.access_token || typeof response.access_token !== 'string') {
    throw new Error('access_token faltante o inválido');
  }
  if (!response.refresh_token || typeof response.refresh_token !== 'string') {
    throw new Error('refresh_token faltante o inválido');
  }
  if (!response.expires_in || typeof response.expires_in !== 'number') {
    throw new Error('expires_in faltante o inválido');
  }
  try {
    const decoded = jwtDecode(response.access_token);
    if (!decoded.exp || !decoded.sub) {
      throw new Error('Token JWT con claims inválidos');
    }
  } catch (error) {
    throw new Error(`Token JWT no decodificable: ${error.message}`);
  }
};

const extractErrorMessage = (response, defaultMessage) => {
  try {
    const json = response.json;
    return json?.detail || json?.message || defaultMessage;
  } catch {
    return defaultMessage;
  }
};

const refreshAccessToken = async (z, bundle) => {
  if (!bundle.authData.refreshToken) {
    throw new z.errors.Error(
      'No se encontró refresh token. Por favor vuelve a autenticarte.',
      'REFRESH_MISSING',
      401
    );
  }
  z.console.log('[Auth] Refrescando access token...');
  try {
    const refreshResponse = await withRetry(() =>
      z.request({
        url: `${CONFIG.baseUrl}/auth/refresh`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bundle.authData.refreshToken}`,
        },
        body: {
          refresh_token: bundle.authData.refreshToken,
        },
        timeout: CONFIG.timeout.refresh,
      })
    );
    if (refreshResponse.status === 401) {
      throw new z.errors.RefreshAuthError(
        'Refresh token expirado o inválido. Por favor vuelve a autenticarte.'
      );
    }
    if (refreshResponse.status >= 400) {
      const message = extractErrorMessage(refreshResponse, 'Error al refrescar token');
      throw new z.errors.Error(message, 'REFRESH_ERROR', refreshResponse.status);
    }
    try {
      validateJWTResponse(refreshResponse.json);
    } catch (validationError) {
      throw new z.errors.Error(
        `Respuesta de refresh inválida: ${validationError.message}`,
        'REFRESH_INVALID_RESPONSE',
        500
      );
    }
    z.console.log('[Auth] Token refrescado exitosamente');
    return {
      jwt: refreshResponse.json.access_token,
      refreshToken: refreshResponse.json.refresh_token,
      email: bundle.authData.email,
      expiresAt: Date.now() + refreshResponse.json.expires_in * 1000,
      authMethod: 'jwt',
    };
  } catch (error) {
    if (error.name === 'RefreshAuthError') {
      throw error;
    }
    if (error.name === 'Error' && error.status) {
      throw error;
    }
    throw new z.errors.Error(
      `Error de conexión al refrescar token: ${error.message}`,
      'REFRESH_CONNECTION_ERROR',
      500
    );
  }
};

const preRequest = async (request, z, bundle) => {
  // Ensure headers object exists
  if (!request.headers) {
    request.headers = {};
  }

  if (bundle.authData.apiKey) {
    request.headers['X-API-Key'] = bundle.authData.apiKey;
    return request;
  }
  if (bundle.authData.jwt) {
    let expiresAt;
    try {
      if (bundle.authData.expiresAt) {
        expiresAt = bundle.authData.expiresAt;
      } else {
        const decoded = jwtDecode(bundle.authData.jwt);
        if (!decoded.exp) {
          throw new Error('Claim exp faltante');
        }
        expiresAt = decoded.exp * 1000;
      }
    } catch (decodeError) {
      z.console.error('[Auth] Error al decodificar JWT:', decodeError.message);
      throw new z.errors.ExpiredAuthError('Token JWT corrupto. Por favor vuelve a autenticarte.');
    }
    const timeUntilExpiry = expiresAt - Date.now();
    if (timeUntilExpiry < CONFIG.jwt.refreshThreshold) {
      if (timeUntilExpiry < CONFIG.jwt.minExpiry) {
        z.console.log('[Auth] Token expirado, refrescando...');
      } else {
        z.console.log('[Auth] Token próximo a expirar, refrescando proactivamente...');
      }
      const newAuth = await refreshAccessToken(z, bundle);
      bundle.authData.jwt = newAuth.jwt;
      bundle.authData.refreshToken = newAuth.refreshToken;
      bundle.authData.expiresAt = newAuth.expiresAt;
    }
    request.headers['Authorization'] = `Bearer ${bundle.authData.jwt}`;
    return request;
  }
  z.console.warn('[Auth] preRequest sin método de autenticación');
  return request;
};

const test = async (z, bundle) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (bundle.authData.apiKey) {
    headers['X-API-Key'] = bundle.authData.apiKey;
  } else if (bundle.authData.jwt) {
    headers['Authorization'] = `Bearer ${bundle.authData.jwt}`;
  } else {
    throw new z.errors.Error('No se encontró método de autenticación válido.', 'AUTH_MISSING', 401);
  }
  try {
    const testResponse = await withRetry(() =>
      z.request({
        url: `${CONFIG.baseUrl}/validate/email`,
        method: 'POST',
        headers,
        body: {
          email: 'zapier-test@mailsafepro.com',
        },
        timeout: CONFIG.timeout.test,
      })
    );
    if (testResponse.status === 401) {
      throw new z.errors.Error(
        'Autenticación expirada o inválida. Por favor vuelve a conectar tu cuenta.',
        'AUTH_EXPIRED',
        401
      );
    }
    if (testResponse.status === 403) {
      throw new z.errors.Error(
        'Sin permisos suficientes. Verifica tu plan MailSafePro.',
        'AUTH_FORBIDDEN',
        403
      );
    }
    if (testResponse.status >= 400) {
      const message = extractErrorMessage(testResponse, 'Error en test de autenticación');
      throw new z.errors.Error(message, 'AUTH_TEST_ERROR', testResponse.status);
    }
    z.console.log('[Auth] Test de autenticación exitoso');
    return {
      success: true,
      authMethod: bundle.authData.authMethod,
      ...testResponse.json,
    };
  } catch (error) {
    if (error.name === 'Error' && error.status) {
      throw error;
    }
    throw new z.errors.Error(
      `Error de conexión en test: ${error.message}`,
      'AUTH_TEST_CONNECTION_ERROR',
      500
    );
  }
};

const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      required: false,
      type: 'string',
      helpText:
        'Tu API Key de MailSafePro (32+ caracteres). Encuéntrala en Dashboard > API Keys. Recomendado para producción.',
      placeholder: 'sk_live_abc123...',
    },
    {
      key: 'email',
      label: 'Email (para autenticación JWT)',
      required: false,
      type: 'string',
      helpText: 'Tu email de usuario MailSafePro. Solo necesario si usas JWT en lugar de API Key.',
      placeholder: 'usuario@empresa.com',
    },
    {
      key: 'password',
      label: 'Contraseña',
      required: false,
      type: 'password',
      helpText: 'Tu contraseña de MailSafePro. Solo necesario si usas JWT.',
    },
  ],
  connectionLabel: (z, bundle) => {
    if (bundle.authData.apiKey) {
      const prefix = bundle.authData.apiKey.slice(0, 8);
      return `API Key: ${prefix}...`;
    }
    if (bundle.authData.email) {
      return `Usuario: ${bundle.authData.email}`;
    }
    return 'MailSafePro (no autenticado)';
  },
  test,
};

const getSessionKey = async (z, bundle) => {
  const hasApiKey = !!bundle.inputData.apiKey;
  const hasJWT = !!(bundle.inputData.email && bundle.inputData.password);
  if (!hasApiKey && !hasJWT) {
    throw new z.errors.Error(
      'Debes proporcionar una API Key O tus credenciales (email + contraseña) para autenticarte.',
      'AUTH_MISSING',
      400
    );
  }
  if (hasApiKey) {
    const apiKey = bundle.inputData.apiKey.trim();
    if (apiKey.length < CONFIG.apiKey.minLength) {
      throw new z.errors.Error(
        `API Key inválida: debe tener al menos ${CONFIG.apiKey.minLength} caracteres. Tu key tiene ${apiKey.length}.`,
        'AUTH_INVALID_FORMAT',
        400
      );
    }
    if (!CONFIG.apiKey.pattern.test(apiKey)) {
      throw new z.errors.Error(
        'API Key inválida: solo puede contener letras, números, guiones y guiones bajos.',
        'AUTH_INVALID_FORMAT',
        400
      );
    }
    try {
      const testResponse = await withRetry(() =>
        z.request({
          url: `${CONFIG.baseUrl}/validate/email`,
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: {
            email: 'zapier-test@mailsafepro.com',
          },
          timeout: CONFIG.timeout.test,
        })
      );
      if (testResponse.status === 401) {
        throw new z.errors.Error(
          'API Key inválida o revocada. Verifica que esté activa en tu dashboard.',
          'AUTH_INVALID',
          401
        );
      }
      if (testResponse.status === 403) {
        throw new z.errors.Error(
          'API Key válida pero sin permisos suficientes. Verifica tu plan.',
          'AUTH_FORBIDDEN',
          403
        );
      }
      if (testResponse.status >= 400) {
        const message = extractErrorMessage(testResponse, 'Error al validar API Key');
        throw new z.errors.Error(message, 'AUTH_ERROR', testResponse.status);
      }
      z.console.log('[Auth] API Key validada correctamente');
      return {
        apiKey,
        authMethod: 'api_key',
      };
    } catch (error) {
      if (error.name === 'Error' && error.status) {
        throw error;
      }
      throw new z.errors.Error(
        `Error de conexión al validar API Key: ${error.message}`,
        'AUTH_CONNECTION_ERROR',
        500
      );
    }
  }
  if (hasJWT) {
    const email = bundle.inputData.email.trim();
    const password = bundle.inputData.password;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new z.errors.Error('Email inválido. Verifica el formato.', 'AUTH_INVALID_EMAIL', 400);
    }
    if (!password || password.length < 8) {
      throw new z.errors.Error(
        'Contraseña inválida: debe tener al menos 8 caracteres.',
        'AUTH_INVALID_PASSWORD',
        400
      );
    }
    try {
      const loginResponse = await withRetry(() =>
        z.request({
          url: `${CONFIG.baseUrl}/auth/login`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email,
            password,
          },
          timeout: CONFIG.timeout.auth,
        })
      );
      if (loginResponse.status === 401) {
        throw new z.errors.Error(
          'Credenciales inválidas. Verifica tu email y contraseña.',
          'AUTH_INVALID_CREDENTIALS',
          401
        );
      }
      if (loginResponse.status === 429) {
        throw new z.errors.Error(
          'Demasiados intentos de login. Por favor espera 5 minutos e intenta de nuevo.',
          'AUTH_RATE_LIMIT',
          429
        );
      }
      if (loginResponse.status >= 400) {
        const message = extractErrorMessage(loginResponse, 'Error en autenticación JWT');
        throw new z.errors.Error(message, 'AUTH_ERROR', loginResponse.status);
      }
      try {
        validateJWTResponse(loginResponse.json);
      } catch (validationError) {
        throw new z.errors.Error(
          `Respuesta JWT inválida: ${validationError.message}`,
          'AUTH_INVALID_RESPONSE',
          500
        );
      }
      z.console.log('[Auth] JWT obtenido correctamente');
      return {
        jwt: loginResponse.json.access_token,
        refreshToken: loginResponse.json.refresh_token,
        email,
        expiresAt: Date.now() + loginResponse.json.expires_in * 1000,
        authMethod: 'jwt',
      };
    } catch (error) {
      if (error.name === 'Error' && error.status) {
        throw error;
      }
      throw new z.errors.Error(
        `Error de conexión al autenticar: ${error.message}`,
        'AUTH_CONNECTION_ERROR',
        500
      );
    }
  }
  throw new z.errors.Error(
    'Método de autenticación no soportado o configuración inválida.',
    'AUTH_UNSUPPORTED_METHOD',
    400
  );
};

module.exports = {
  authentication,
  beforeRequest: [preRequest],
  refreshAccessToken,
  getSessionKey,
  withRetry,
  exponentialBackoff,
  test,
};

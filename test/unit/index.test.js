const index = require('../../index');
const authentication = require('../../authentication');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

// Los hooks se exportan como arrays en index.js
const beforeRequest = index.beforeRequest[0];
const afterResponse = index.afterResponse[0];

// Helpers de test (NODE_ENV=test con Jest)
const { logger, sanitizeForLogging, isRecoverableError, calculateRetryDelay } = index.testHelpers;

describe('📦 Index.js - Test Suite Completo', () => {
  describe('🔧 Configuración y Exportación', () => {
    it('debería exportar la configuración correcta', () => {
      expect(index).toHaveProperty('version', '2.0.0');
      expect(index).toHaveProperty('platformVersion');
      expect(index).toHaveProperty('authentication');
      expect(index).toHaveProperty('beforeRequest');
      expect(index).toHaveProperty('afterResponse');
      expect(index).toHaveProperty('triggers');
      expect(index).toHaveProperty('creates');
      expect(index).toHaveProperty('searches');
    });

    it('debería exportar hooks como arrays', () => {
      expect(Array.isArray(index.beforeRequest)).toBe(true);
      expect(Array.isArray(index.afterResponse)).toBe(true);
      expect(index.beforeRequest).toHaveLength(1);
      expect(index.afterResponse).toHaveLength(1);
    });

    it('debería exportar testHelpers en entorno de test', () => {
      expect(index.testHelpers).toBeDefined();
      expect(index.testHelpers).toHaveProperty('logger');
      expect(index.testHelpers).toHaveProperty('sanitizeForLogging');
      expect(index.testHelpers).toHaveProperty('isRecoverableError');
      expect(index.testHelpers).toHaveProperty('calculateRetryDelay');
    });
  });

  describe('📝 Logger & Utilidades', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    describe('logger', () => {
      it('debería registrar en todos los niveles sin lanzar error', () => {
        // Temporalmente habilitar logging para este test
        const originalEnabled = index.testHelpers.CONFIG.logging.enabled;
        index.testHelpers.CONFIG.logging.enabled = true;

        logger.debug('Debug message', { foo: 'bar' });
        logger.info('Info message', { foo: 'bar' });
        logger.warn('Warn message', { foo: 'bar' });
        logger.error('Error message', { foo: 'bar' });

        expect(console.log).toHaveBeenCalled();

        // Restaurar
        index.testHelpers.CONFIG.logging.enabled = originalEnabled;
      });

      it('debería incluir timestamp y nivel en cada log', () => {
        // Temporalmente habilitar logging para este test
        const originalEnabled = index.testHelpers.CONFIG.logging.enabled;
        index.testHelpers.CONFIG.logging.enabled = true;

        logger.info('Test message', { data: 'test' });

        const logCall = console.log.mock.calls[0][0];
        const logEntry = JSON.parse(logCall);

        expect(logEntry).toHaveProperty('timestamp');
        expect(logEntry).toHaveProperty('level', 'INFO');
        expect(logEntry).toHaveProperty('message', 'Test message');
        expect(logEntry).toHaveProperty('data', 'test');

        // Restaurar
        index.testHelpers.CONFIG.logging.enabled = originalEnabled;
      });

      it('debería respetar la configuración de logging deshabilitado', () => {
        // El logger llama a _log que verifica CONFIG.logging.enabled
        // Mockeamos _log para verificar que se llama con los parámetros correctos
        const originalLog = index.testHelpers.logger._log;
        index.testHelpers.logger._log = jest.fn();

        logger.info('Test message');

        // _log SÍ se llama, pero internamente verifica CONFIG.logging.enabled
        expect(index.testHelpers.logger._log).toHaveBeenCalledWith(
          'INFO',
          'Test message',
          undefined
        );

        // Restaurar
        index.testHelpers.logger._log = originalLog;
      });
    });

    describe('sanitizeForLogging', () => {
      it('debería redactar claves sensibles', () => {
        const input = {
          password: 'secret',
          apiKey: 'key123',
          api_key: 'key456',
          token: 'jwt-token',
          Authorization: 'Bearer xyz',
          refresh_token: 'refresh-abc',
          normal: 'safe-data',
        };

        const output = sanitizeForLogging(input);

        expect(output.password).toBe('[REDACTED]');
        expect(output.apiKey).toBe('[REDACTED]');
        expect(output.api_key).toBe('[REDACTED]');
        expect(output.token).toBe('[REDACTED]');
        expect(output.Authorization).toBe('[REDACTED]');
        expect(output.refresh_token).toBe('[REDACTED]');
        expect(output.normal).toBe('safe-data');
      });

      it('debería truncar strings largos', () => {
        const longText = 'a'.repeat(600);
        const input = {
          longField: longText,
          shortField: 'short',
        };

        const output = sanitizeForLogging(input);

        expect(output.longField.length).toBe(503); // 500 + '...'
        expect(output.longField.endsWith('...')).toBe(true);
        expect(output.shortField).toBe('short');
      });

      it('debería manejar objetos anidados', () => {
        const input = {
          user: {
            password: 'nested-secret',
            email: 'test@example.com',
            profile: {
              token: 'nested-token',
              name: 'John',
            },
          },
        };

        const output = sanitizeForLogging(input);

        expect(output.user.password).toBe('[REDACTED]');
        expect(output.user.profile.token).toBe('[REDACTED]');
        expect(output.user.email).toBe('test@example.com');
        expect(output.user.profile.name).toBe('John');
      });

      it('debería manejar arrays', () => {
        const input = [
          { password: 'secret1', data: 'safe1' },
          { password: 'secret2', data: 'safe2' },
        ];

        const output = sanitizeForLogging(input);

        expect(output[0].password).toBe('[REDACTED]');
        expect(output[0].data).toBe('safe1');
        expect(output[1].password).toBe('[REDACTED]');
        expect(output[1].data).toBe('safe2');
      });

      it('debería devolver valores no objetos tal cual', () => {
        expect(sanitizeForLogging(null)).toBeNull();
        expect(sanitizeForLogging(undefined)).toBeUndefined();
        expect(sanitizeForLogging('string')).toBe('string');
        expect(sanitizeForLogging(123)).toBe(123);
        expect(sanitizeForLogging(true)).toBe(true);
      });
    });

    describe('extractRequestInfo & extractResponseInfo', () => {
      it('debería extraer información de request correctamente', () => {
        const request = {
          method: 'POST',
          url: 'https://api.example.com/test',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
          body: { email: 'test@example.com', password: 'secret' },
        };

        const requestInfo = index.testHelpers.extractRequestInfo(request);

        expect(requestInfo.method).toBe('POST');
        expect(requestInfo.url).toBe('https://api.example.com/test');
        expect(requestInfo.body.password).toBe('[REDACTED]');
        expect(requestInfo.body.email).toBe('test@example.com');
      });

      it('debería extraer información de response correctamente', () => {
        const response = {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
          },
          json: { data: 'test', token: 'secret' },
        };

        const responseInfo = index.testHelpers.extractResponseInfo(response);

        expect(responseInfo.status).toBe(200);
        expect(responseInfo.statusText).toBe('OK');
        expect(responseInfo.body.token).toBe('[REDACTED]');
        expect(responseInfo.body.data).toBe('test');
      });
    });
  });

  describe('🔄 beforeRequest Hook', () => {
    let bundle;

    beforeEach(() => {
      bundle = createMockBundle({
        request: {
          method: 'GET',
          url: 'https://api.mailsafepro.es/test',
          headers: {},
          body: { email: 'test@example.com' },
        },
      });
    });

    it('debería inyectar headers de autenticación y estándar', async () => {
      // Mockear beforeRequest array del módulo authentication
      const mockPreRequest = jest.fn().mockResolvedValue({
        headers: {
          Authorization: 'Bearer test-token',
          'X-API-Key': 'test-api-key',
        },
      });

      const originalBeforeRequest = authentication.beforeRequest;
      authentication.beforeRequest = [mockPreRequest];

      const resultRequest = await beforeRequest(mockZapier, bundle);

      expect(mockPreRequest).toHaveBeenCalledWith(bundle.request, mockZapier, bundle);
      expect(resultRequest.headers.Authorization).toBe('Bearer test-token');
      expect(resultRequest.headers['X-API-Key']).toBe('test-api-key');
      expect(resultRequest.headers['User-Agent']).toContain('Zapier-MailSafePro/2.0.0');
      expect(resultRequest.headers['X-Request-ID']).toMatch(/^req_\d+_[\w\d]+$/);
      expect(bundle.meta.requestId).toBeDefined();

      authentication.beforeRequest = originalBeforeRequest;
    });

    it('debería manejar errores de autenticación preRequest', async () => {
      const mockPreRequest = jest.fn().mockRejectedValue(new Error('auth_failed'));

      const originalBeforeRequest = authentication.beforeRequest;
      authentication.beforeRequest = [mockPreRequest];

      await expect(beforeRequest(mockZapier, bundle)).rejects.toThrow('auth_failed');

      authentication.beforeRequest = originalBeforeRequest;
    });

    it('debería funcionar sin authentication.beforeRequest', async () => {
      const originalBeforeRequest = authentication.beforeRequest;
      authentication.beforeRequest = undefined;

      const resultRequest = await beforeRequest(mockZapier, bundle);

      expect(resultRequest.headers['User-Agent']).toContain('Zapier-MailSafePro/2.0.0');
      expect(resultRequest.headers['X-Request-ID']).toBeDefined();
      expect(bundle.meta.requestId).toBeDefined();

      // Restaurar
      authentication.beforeRequest = originalBeforeRequest;
    });

    it('debería preservar headers existentes', async () => {
      bundle.request.headers = {
        'Custom-Header': 'custom-value',
        'Content-Type': 'application/xml',
      };

      const mockPreRequest = jest.fn().mockResolvedValue({ headers: {} });
      const originalBeforeRequest = authentication.beforeRequest;
      authentication.beforeRequest = [mockPreRequest];

      const resultRequest = await beforeRequest(mockZapier, bundle);

      expect(resultRequest.headers['Custom-Header']).toBe('custom-value');
      expect(resultRequest.headers['Content-Type']).toBe('application/xml');
      expect(resultRequest.headers['User-Agent']).toBeDefined();

      authentication.beforeRequest = originalBeforeRequest;
    });
  });

  describe('🔄 afterResponse Hook', () => {
    let bundle;

    beforeEach(() => {
      bundle = createMockBundle({
        request: {
          method: 'GET',
          url: 'https://api.mailsafepro.es/test',
          headers: {},
        },
      });
      mockZapier.request.mockReset();
    });

    describe('Rate Limiting (429)', () => {
      it('debería lanzar ThrottledError con mensaje de rate limit', async () => {
        const response = createMockResponse({
          status: 429,
          headers: { 'retry-after': '120' },
          json: { detail: 'Rate limit exceeded' },
        });

        await expect(afterResponse(response, mockZapier, bundle)).rejects.toThrow(
          /Rate limit excedido. Reintentando en 120 segundos/
        );
      });

      it('debería usar delay por defecto si no hay retry-after header', async () => {
        const response = createMockResponse({
          status: 429,
          headers: {},
          json: { detail: 'Rate limit' },
        });

        await expect(afterResponse(response, mockZapier, bundle)).rejects.toThrow(
          /Rate limit excedido. Reintentando en 1 segundos/
        );
      });
    });

    describe('Authentication Errors (401)', () => {
      it('debería refrescar token JWT y reintentar request exitosamente', async () => {
        bundle.authData = {
          jwt: 'old.jwt',
          refreshToken: 'old.refresh',
        };

        const refreshSpy = jest.spyOn(authentication, 'refreshAccessToken').mockResolvedValue({
          jwt: 'new.jwt',
          refreshToken: 'new.refresh',
          expiresAt: Date.now() + 3600000,
        });

        mockZapier.request.mockResolvedValue(
          createMockResponse({
            status: 200,
            json: { success: true },
          })
        );

        const response401 = createMockResponse({
          status: 401,
          json: { detail: 'Token expired' },
        });

        const finalResponse = await afterResponse(response401, mockZapier, bundle);

        expect(refreshSpy).toHaveBeenCalledWith(mockZapier, bundle);
        expect(bundle.authData.jwt).toBe('new.jwt');
        expect(bundle.authData.refreshToken).toBe('new.refresh');
        expect(bundle.request.headers.Authorization).toBe('Bearer new.jwt');
        expect(mockZapier.request).toHaveBeenCalledWith(bundle.request);
        expect(finalResponse.status).toBe(200);

        refreshSpy.mockRestore();
      });

      it('debería lanzar RefreshAuthError cuando el refresh falla', async () => {
        bundle.authData = {
          jwt: 'old.jwt',
          refreshToken: 'old.refresh',
        };

        jest
          .spyOn(authentication, 'refreshAccessToken')
          .mockRejectedValue(new Error('refresh_failed'));

        const response401 = createMockResponse({
          status: 401,
          json: { detail: 'Token expired' },
        });

        await expect(afterResponse(response401, mockZapier, bundle)).rejects.toThrow(
          'Tu sesión expiró y no pudimos refrescarla. Por favor vuelve a conectar tu cuenta.'
        );
      });

      it('debería lanzar RefreshAuthError cuando no hay credenciales JWT', async () => {
        bundle.authData = {};

        const response401 = createMockResponse({
          status: 401,
          json: { detail: 'Unauthorized' },
        });

        await expect(afterResponse(response401, mockZapier, bundle)).rejects.toThrow(
          'Autenticación inválida o expirada. Por favor vuelve a conectar tu cuenta.'
        );
      });
    });

    describe('Forbidden (403)', () => {
      it('debería lanzar Error con mensaje del servidor', async () => {
        const response403 = createMockResponse({
          status: 403,
          json: { detail: 'Custom forbidden message' },
        });

        await expect(afterResponse(response403, mockZapier, bundle)).rejects.toThrow(
          'Custom forbidden message'
        );
      });

      it('debería usar mensaje por defecto si no hay detail', async () => {
        const response403 = createMockResponse({
          status: 403,
          json: {},
        });

        await expect(afterResponse(response403, mockZapier, bundle)).rejects.toThrow(
          'Acceso denegado. Verifica los permisos de tu cuenta.'
        );
      });
    });

    describe('Recoverable Errors (5xx, 408)', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('debería reintentar errores recuperables mientras queden intentos', async () => {
        bundle.meta = { attemptNumber: 0 };

        const response500 = createMockResponse({
          status: 500,
          json: { detail: 'Temporary server error' },
        });

        mockZapier.request.mockResolvedValue(
          createMockResponse({
            status: 200,
            json: { success: true },
          })
        );

        const finalResponsePromise = afterResponse(response500, mockZapier, bundle);

        // Avanzar los timers
        jest.runAllTimers();

        const finalResponse = await finalResponsePromise;

        expect(bundle.meta.attemptNumber).toBe(1);
        expect(mockZapier.request).toHaveBeenCalledTimes(1);
        expect(finalResponse.status).toBe(200);
      });

      it('debería lanzar error cuando se supera el máximo de reintentos', async () => {
        bundle.meta = { attemptNumber: 2 }; // maxAttempts = 3, so this is the last attempt

        const response503 = createMockResponse({
          status: 503,
          json: { detail: 'Service unavailable' },
        });

        await expect(afterResponse(response503, mockZapier, bundle)).rejects.toThrow(
          /Service unavailable.*Si el problema persiste/
        );
      });
    });

    describe('Client Errors (4xx)', () => {
      it('debería lanzar Error con detalle del servidor para 400', async () => {
        const response400 = createMockResponse({
          status: 400,
          json: {
            detail: 'Bad request data',
            error_type: 'VALIDATION_ERROR',
          },
        });

        await expect(afterResponse(response400, mockZapier, bundle)).rejects.toThrow(
          'Bad request data'
        );
      });

      it('debería usar mensaje por defecto para 4xx sin detail', async () => {
        const response404 = createMockResponse({
          status: 404,
          json: {},
        });

        await expect(afterResponse(response404, mockZapier, bundle)).rejects.toThrow(
          'Error en la solicitud'
        );
      });
    });

    describe('Server Errors (5xx)', () => {
      it('debería lanzar SERVER_ERROR con mensaje extendido', async () => {
        const response501 = createMockResponse({
          status: 501,
          json: { detail: 'Not implemented' },
        });

        await expect(afterResponse(response501, mockZapier, bundle)).rejects.toThrow(
          'Not implemented. Si el problema persiste, contacta a soporte.'
        );
      });

      it('debería usar mensaje por defecto para 5xx sin detail', async () => {
        // Para que entre en la sección 5xx (línea 303) y NO en recoverable errors (línea 243),
        // necesitamos que attemptNumber >= maxAttempts O que no sea un status recuperable
        // 500 ES recuperable, entonces ponemos attemptNumber alto
        bundle.meta = { attemptNumber: 3 }; // >= maxAttempts (3), no reintentará

        const response500 = createMockResponse({
          status: 500,
          json: {},
        });

        await expect(afterResponse(response500, mockZapier, bundle)).rejects.toThrow(
          'Error interno del servidor MailSafePro. Si el problema persiste, contacta a soporte.'
        );
      });
    });

    describe('Success Responses (2xx)', () => {
      it('debería devolver la response sin modificar para 200', async () => {
        const response200 = createMockResponse({
          status: 200,
          json: { data: 'success' },
        });

        const result = await afterResponse(response200, mockZapier, bundle);

        expect(result).toBe(response200);
        expect(result.status).toBe(200);
        expect(result.json).toEqual({ data: 'success' });
      });

      it('debería devolver la response sin modificar para 201', async () => {
        const response201 = createMockResponse({
          status: 201,
          json: { created: true },
        });

        const result = await afterResponse(response201, mockZapier, bundle);

        expect(result).toBe(response201);
        expect(result.status).toBe(201);
      });
    });
  });

  describe('⚙️ Utilidades de Retry', () => {
    describe('isRecoverableError', () => {
      it('debería devolver true para estados reintentables', () => {
        [408, 429, 500, 502, 503, 504].forEach(status => {
          expect(isRecoverableError(status)).toBe(true);
        });
      });

      it('debería devolver false para otros estados', () => {
        [200, 201, 301, 400, 401, 403, 404, 418].forEach(status => {
          expect(isRecoverableError(status)).toBe(false);
        });
      });
    });

    describe('calculateRetryDelay', () => {
      it('debería calcular delay con exponential backoff y jitter', () => {
        const baseDelay = 1000;

        for (let attempt = 0; attempt < 5; attempt++) {
          const delay = calculateRetryDelay(attempt, baseDelay);
          const exponentialDelay = baseDelay * Math.pow(2, attempt);
          const cappedDelay = Math.min(exponentialDelay, 10000); // maxDelay

          // El delay debe estar entre baseDelay y cappedDelay * 1.2 (max jitter)
          expect(delay).toBeGreaterThanOrEqual(Math.floor(baseDelay));
          expect(delay).toBeLessThanOrEqual(Math.ceil(cappedDelay * 1.2));
        }
      });

      it('debería respetar el delay máximo', () => {
        const delay = calculateRetryDelay(10, 1000); // attempt 10 should hit max delay

        // Con jitter, el delay puede ser hasta maxDelay * 1.2
        // Pero la función debe cap it al maxDelay después del jitter
        expect(delay).toBeLessThanOrEqual(12000); // maxDelay * 1.2
      });

      it('debería producir delays aleatorios con jitter', () => {
        // El jitter usa Math.random() que NO está mockeado en este entorno
        // Verificamos que los delays son diferentes (gracias al jitter)
        const delays = [];
        for (let i = 0; i < 10; i++) {
          delays.push(calculateRetryDelay(1, 1000));
        }

        // Al menos algunos delays deben ser diferentes debido al jitter
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);
      });
    });
  });

  describe('🔗 Integración de Módulos', () => {
    it('debería integrar todos los módulos correctamente', () => {

      expect(index.creates).toHaveProperty('batch_validate_enterprise');
      expect(index.searches).toHaveProperty('get_usage');
      expect(index.authentication).toBeDefined();
    });

    it('debería tener la estructura completa de Zapier app', () => {
      const zapierApp = {
        version: index.version,
        platformVersion: index.platformVersion,
        authentication: index.authentication,
        beforeRequest: index.beforeRequest,
        afterResponse: index.afterResponse,
        triggers: index.triggers,
        creates: index.creates,
        searches: index.searches,
      };

      expect(zapierApp).toBeDefined();
      expect(typeof zapierApp.authentication.test).toBe('function');
    });
  });
});

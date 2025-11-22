const getUsageSearch = require('../../searches/get_usage');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');
const { mockUsageResponse, mockErrorResponses } = require('../mocks/api-responses');

describe('📊 get_usage.js - Test Suite Completo', () => {
  let z;
  let bundle;

  beforeEach(() => {
    jest.clearAllMocks();

    z = {
      ...mockZapier,
      request: jest.fn(),
    };

    bundle = createMockBundle({
      inputData: {
        time_range: 'today',
        include_projections: true,
        include_recommendations: true,
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('🔧 Configuración y Validación', () => {
    it('debería tener la estructura correcta de Zapier integration', () => {
      expect(getUsageSearch).toHaveProperty('key', 'get_usage');
      expect(getUsageSearch).toHaveProperty('noun', 'Métricas de Uso');
      expect(getUsageSearch.display.label).toContain('Métricas de Uso');
      expect(getUsageSearch.operation).toHaveProperty('perform');
      expect(getUsageSearch.operation).toHaveProperty('sample');
      expect(getUsageSearch.operation).toHaveProperty('outputFields');
    });

    it('debería definir campos de entrada correctamente', () => {
      const inputFields = getUsageSearch.operation.inputFields;
      expect(inputFields).toHaveLength(5);

      expect(inputFields[0]).toMatchObject({
        key: 'time_range',
        type: 'string',
        required: false,
        default: 'today',
      });

      expect(inputFields[3]).toMatchObject({
        key: 'include_projections',
        type: 'boolean',
        required: false,
        default: true,
      });

      expect(inputFields[4]).toMatchObject({
        key: 'include_recommendations',
        type: 'boolean',
        required: false,
        default: true,
      });
    });

    it('debería definir campos de salida completos', () => {
      const outputFields = getUsageSearch.operation.outputFields;
      expect(outputFields.length).toBeGreaterThan(15);

      const outputKeys = outputFields.map(field => field.key);
      expect(outputKeys).toContain('plan');
      expect(outputKeys).toContain('usage_today');
      expect(outputKeys).toContain('daily_limit');
      expect(outputKeys).toContain('remaining_today');
    });
  });

  describe('🔐 Autenticación', () => {
    it('debería usar API Key cuando está disponible', async () => {
      bundle.authData.apiKey = 'test_api_key_123';
      bundle.authData.jwt = null;

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test_api_key_123',
          }),
        })
      );
    });

    it('debería usar JWT token cuando API Key no está disponible', async () => {
      bundle.authData.apiKey = null;
      bundle.authData.jwt = 'test_jwt_token_456';

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_jwt_token_456',
          }),
        })
      );
    });

    it('debería priorizar API Key sobre JWT token', async () => {
      bundle.authData.apiKey = 'test_api_key_123';
      bundle.authData.jwt = 'test_jwt_token_456';

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      const requestHeaders = z.request.mock.calls[0][0].headers;
      expect(requestHeaders['X-API-Key']).toBe('test_api_key_123');
      expect(requestHeaders['Authorization']).toBeUndefined();
    });

    it('debería incluir headers de User-Agent y versión', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      const requestHeaders = z.request.mock.calls[0][0].headers;
      expect(requestHeaders['User-Agent']).toBe('Zapier-Usage-Analytics/2.0.0');
      expect(requestHeaders['X-Client-Version']).toBe('2.0.0');
    });
  });

  describe('📅 Validación de Fechas', () => {
    it('debería fallar cuando el rango personalizado no tiene fechas', async () => {
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = null;
      bundle.inputData.end_date = null;

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Ambas fechas (inicio y fin) son requeridas para el rango personalizado'
      );
    });

    it('debería fallar cuando la fecha de inicio es posterior a la fecha de fin', async () => {
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = '2024-01-20T00:00:00.000Z';
      bundle.inputData.end_date = '2024-01-15T00:00:00.000Z';

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'La fecha de inicio no puede ser posterior a la fecha de fin'
      );
    });

    it('debería fallar cuando la fecha de fin está en el futuro', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Mañana
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = '2024-01-01T00:00:00.000Z';
      bundle.inputData.end_date = futureDate;

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'La fecha de fin no puede ser en el futuro'
      );
    });

    it('debería fallar cuando el rango excede 90 días', async () => {
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = '2024-01-01T00:00:00.000Z';
      bundle.inputData.end_date = '2024-04-01T00:00:00.000Z'; // 91 días

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'El rango de fechas no puede exceder 90 días'
      );
    });

    it('debería aceptar rango personalizado válido', async () => {
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = '2024-01-01T00:00:00.000Z';
      bundle.inputData.end_date = '2024-01-15T00:00:00.000Z';

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await expect(getUsageSearch.operation.perform(z, bundle)).resolves.toBeDefined();
    });
  });

  describe('🌐 Configuración de Request', () => {
    it('debería hacer GET request a la URL correcta', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.com/v1/stats/usage',
          method: 'GET',
          timeout: 15000,
        })
      );
    });

    it('debería incluir parámetros de consulta correctos para today', async () => {
      bundle.inputData.time_range = 'today';
      bundle.inputData.include_projections = true;
      bundle.inputData.include_recommendations = false;

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.params).toEqual({
        time_range: 'today',
        include_projections: true,
        include_recommendations: false,
      });
    });

    it('debería incluir fechas formateadas para rango personalizado', async () => {
      bundle.inputData.time_range = 'custom';
      bundle.inputData.start_date = '2024-01-01T10:30:00.000Z';
      bundle.inputData.end_date = '2024-01-15T14:45:00.000Z';

      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));

      await getUsageSearch.operation.perform(z, bundle);

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.params).toEqual({
        time_range: 'custom',
        include_projections: true,
        include_recommendations: true,
        start_date: '2024-01-01',
        end_date: '2024-01-15',
      });
    });
  });

  describe('✅ Flujo Principal - Casos de Éxito', () => {
    beforeEach(() => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
    });

    it('debería retornar métricas básicas cuando la consulta es exitosa', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        plan: mockUsageResponse.plan,
        usage_today: mockUsageResponse.usage_today,
        daily_limit: mockUsageResponse.daily_limit,
        remaining_today: mockUsageResponse.remaining_today,
        usage_percentage: mockUsageResponse.usage_percentage,
      });
    });

    it('debería enriquecer la respuesta con metadatos', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0]).toHaveProperty('queried_at');
      expect(result[0]).toHaveProperty('time_range', 'today');
      expect(result[0]).toHaveProperty('query_options');
      expect(result[0].query_options).toEqual({
        include_projections: true,
        include_recommendations: true,
      });
    });

    it('debería incluir analytics calculados', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].analytics).toMatchObject({
        average_daily_usage: expect.any(Number),
        peak_usage_day: expect.any(String),
        peak_usage_value: expect.any(Number),
        usage_trend: expect.any(String),
        forecasted_monthly_usage: expect.any(Number),
        efficiency_score: expect.any(Number),
        cost_per_validation: expect.any(Number),
      });
    });

    it('debería incluir projections cuando include_projections es true', async () => {
      bundle.inputData.include_projections = true;

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].projections).toMatchObject({
        days_until_limit: expect.any(Number),
        projected_end_of_month_usage: expect.any(Number),
        will_exceed_limit: expect.any(Boolean),
        excess_risk_percentage: expect.any(Number),
        recommended_daily_cap: expect.any(Number),
      });
    });

    it('debería excluir projections cuando include_projections es false', async () => {
      bundle.inputData.include_projections = false;

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].projections).toBeUndefined();
    });

    it('debería incluir recommendations cuando include_recommendations es true', async () => {
      bundle.inputData.include_recommendations = true;

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(Array.isArray(result[0].recommendations)).toBe(true);
    });

    it('debería excluir recommendations cuando include_recommendations es false', async () => {
      bundle.inputData.include_recommendations = false;

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].recommendations).toBeUndefined();
    });

    it('debería incluir alerts inteligentes', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(Array.isArray(result[0].alerts)).toBe(true);
      if (result[0].alerts.length > 0) {
        expect(result[0].alerts[0]).toMatchObject({
          type: expect.any(String),
          message: expect.any(String),
          severity: expect.any(String),
          action_required: expect.any(Boolean),
        });
      }
    });

    it('debería incluir URLs de acción', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].action_urls).toMatchObject({
        upgrade_plan: expect.any(String),
        usage_dashboard: expect.any(String),
        api_documentation: expect.any(String),
      });
    });
  });

  describe('🚨 Manejo de Errores HTTP', () => {
    it('debería manejar error 400 - Bad Request', async () => {
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[400]));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Parámetros de consulta inválidos. Verifique las fechas y el rango.'
      );
    });

    it('debería manejar error 401 - Unauthorized', async () => {
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[401]));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Autenticación inválida. Verifique sus credenciales.'
      );
    });

    it('debería manejar error 403 - Forbidden', async () => {
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[403]));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Sin permisos para acceder a las métricas de uso.'
      );
    });

    it('debería manejar error 404 - Not Found', async () => {
      z.request.mockResolvedValue(
        createMockResponse({
          status: 404,
          json: { detail: 'Not found' },
        })
      );

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Endpoint de métricas no encontrado.'
      );
    });

    it('debería manejar error 429 - Rate Limit', async () => {
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[429]));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de consultas excedido. Por favor espere antes de realizar más consultas.'
      );
    });

    it('debería manejar error 500 - Internal Server Error', async () => {
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[500]));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Error inesperado del servidor: 500'
      );
    });

    it('debería manejar errores HTTP desconocidos', async () => {
      z.request.mockResolvedValue(
        createMockResponse({
          status: 418,
          json: { detail: "I'm a teapot" },
        })
      );

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Error inesperado del servidor: 418'
      );
    });
  });

  describe('🌐 Errores de Red y Timeout', () => {
    it('debería manejar timeout de conexión (ETIMEDOUT)', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Timeout al consultar métricas de uso. El servicio puede estar ocupado.'
      );
    });

    it('debería manejar socket timeout (ESOCKETTIMEDOUT)', async () => {
      const timeoutError = new Error('Socket timeout');
      timeoutError.code = 'ESOCKETTIMEDOUT';
      z.request.mockRejectedValue(timeoutError);

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Timeout al consultar métricas de uso. El servicio puede estar ocupado.'
      );
    });

    it('debería manejar conexión rechazada (ECONNREFUSED)', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(connectionError);

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'No se puede conectar al servicio de métricas. Verifique su conexión.'
      );
    });

    it('debería re-lanzar errores ya procesados', async () => {
      const processedError = new Error('MailSafePro: Error procesado');
      z.request.mockRejectedValue(processedError);

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'MailSafePro: Error procesado'
      );
    });
  });

  describe('🔍 Validación de Respuesta', () => {
    it('debería fallar cuando la respuesta no es un objeto', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: null }));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Respuesta inválida del servidor'
      );
    });

    it('debería fallar cuando faltan campos requeridos (plan)', async () => {
      const incompleteResponse = {
        // Falta el campo 'plan' que es requerido
        usage_today: 1250,
        daily_limit: 10000,
        remaining_today: 8750,
      };
      z.request.mockResolvedValue(createMockResponse({ json: incompleteResponse }));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Respuesta incompleta: faltan campos requeridos'
      );
    });

    it('debería fallar cuando faltan campos requeridos (usage_today)', async () => {
      const incompleteResponse = {
        plan: 'PREMIUM',
        // Falta el campo 'usage_today' que es requerido
        daily_limit: 10000,
        remaining_today: 8750,
      };
      z.request.mockResolvedValue(createMockResponse({ json: incompleteResponse }));

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Respuesta incompleta: faltan campos requeridos'
      );
    });
  });

  describe('📋 Estructura de Respuesta', () => {
    beforeEach(() => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
    });

    it('debería integrar todas las funciones correctamente', async () => {
      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0]).toMatchObject({
        plan: expect.any(String),
        usage_today: expect.any(Number),
        daily_limit: expect.any(Number),
        remaining_today: expect.any(Number),
        usage_percentage: expect.any(Number),
        monthly_usage: expect.any(Number),
        monthly_limit: expect.any(Number),
        monthly_remaining: expect.any(Number),
        monthly_percentage: expect.any(Number),
        queried_at: expect.any(String),
        time_range: expect.any(String),
        query_options: expect.any(Object),
        analytics: expect.any(Object),
        projections: expect.any(Object),
        recommendations: expect.any(Array),
        alerts: expect.any(Array),
        action_urls: expect.any(Object),
      });
    });

    it('debería manejar respuesta mínima del API correctamente', async () => {
      const minimalResponse = {
        plan: 'FREE',
        usage_today: 25,
        daily_limit: 100,
        remaining_today: 75,
        usage_percentage: 25,
        monthly_usage: 750,
        monthly_limit: 3000,
        monthly_remaining: 2250,
        monthly_percentage: 25,
      };
      z.request.mockResolvedValue(createMockResponse({ json: minimalResponse }));

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0]).toMatchObject({
        plan: 'FREE',
        usage_today: 25,
        daily_limit: 100,
        remaining_today: 75,
        usage_percentage: 25,
      });
      // Debería incluir analytics calculados incluso con respuesta mínima
      expect(result[0].analytics).toBeDefined();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería manejar uso exactamente en el límite', async () => {
      const exactLimitResponse = {
        ...mockUsageResponse,
        usage_today: 10000,
        remaining_today: 0,
        usage_percentage: 100,
      };
      z.request.mockResolvedValue(createMockResponse({ json: exactLimitResponse }));

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].remaining_today).toBe(0);
      expect(result[0].usage_percentage).toBe(100);
    });

    it('debería manejar uso cero', async () => {
      const zeroUsageResponse = {
        ...mockUsageResponse,
        usage_today: 0,
        remaining_today: 10000,
        usage_percentage: 0,
      };
      z.request.mockResolvedValue(createMockResponse({ json: zeroUsageResponse }));

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].usage_today).toBe(0);
      expect(result[0].usage_percentage).toBe(0);
    });

    it('debería manejar límites muy grandes', async () => {
      const largeLimitResponse = {
        ...mockUsageResponse,
        usage_today: 500000,
        daily_limit: 1000000,
        remaining_today: 500000,
        usage_percentage: 50,
      };
      z.request.mockResolvedValue(createMockResponse({ json: largeLimitResponse }));

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].usage_today).toBe(500000);
      expect(result[0].daily_limit).toBe(1000000);
    });

    it('debería manejar diferentes planes', async () => {
      const enterpriseResponse = {
        ...mockUsageResponse,
        plan: 'ENTERPRISE',
        daily_limit: 50000,
        monthly_limit: 1500000,
      };
      z.request.mockResolvedValue(createMockResponse({ json: enterpriseResponse }));

      const result = await getUsageSearch.operation.perform(z, bundle);

      expect(result[0].plan).toBe('ENTERPRISE');
      expect(result[0].daily_limit).toBe(50000);
    });
  });

  describe('📊 Funciones Auxiliares', () => {
    it('debería calcular analytics correctamente', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
      const result = await getUsageSearch.operation.perform(z, bundle);

      const analytics = result[0].analytics;
      expect(analytics.average_daily_usage).toBeGreaterThan(0);
      expect(analytics.efficiency_score).toBeGreaterThanOrEqual(0);
      expect(analytics.efficiency_score).toBeLessThanOrEqual(1);
      expect(['growing', 'stable', 'declining']).toContain(analytics.usage_trend);
    });

    it('debería generar proyecciones realistas', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
      const result = await getUsageSearch.operation.perform(z, bundle);

      const projections = result[0].projections;
      expect(projections.days_until_limit).toBeGreaterThanOrEqual(0);
      expect(projections.projected_end_of_month_usage).toBeGreaterThan(0);
      expect(typeof projections.will_exceed_limit).toBe('boolean');
    });

    it('debería generar recomendaciones contextuales', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
      const result = await getUsageSearch.operation.perform(z, bundle);

      const recommendations = result[0].recommendations;
      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        expect(recommendations[0]).toMatchObject({
          type: expect.any(String),
          priority: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
        });
      }
    });

    it('debería generar alertas apropiadas', async () => {
      z.request.mockResolvedValue(createMockResponse({ json: mockUsageResponse }));
      const result = await getUsageSearch.operation.perform(z, bundle);

      const alerts = result[0].alerts;
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach(alert => {
        expect(alert).toMatchObject({
          type: expect.any(String),
          message: expect.any(String),
          severity: expect.any(String),
          action_required: expect.any(Boolean),
        });
      });
    });
  });

  describe('📝 Sample y OutputFields', () => {
    it('debería tener un sample válido', () => {
      const sample = getUsageSearch.operation.sample;

      expect(sample).toHaveProperty('plan');
      expect(sample).toHaveProperty('usage_today');
      expect(sample).toHaveProperty('analytics');
      expect(sample).toHaveProperty('projections');
      expect(sample).toHaveProperty('recommendations');
      expect(sample).toHaveProperty('alerts');
      expect(sample).toHaveProperty('action_urls');
    });

    it('debería tener outputFields completos', () => {
      const outputFields = getUsageSearch.operation.outputFields;
      const outputKeys = outputFields.map(field => field.key);

      // Campos básicos
      expect(outputKeys).toContain('plan');
      expect(outputKeys).toContain('usage_today');
      expect(outputKeys).toContain('daily_limit');
      expect(outputKeys).toContain('remaining_today');

      // Analytics
      expect(outputKeys).toContain('analytics__average_daily_usage');
      expect(outputKeys).toContain('analytics__peak_usage_day');
      expect(outputKeys).toContain('analytics__efficiency_score');

      // Proyecciones
      expect(outputKeys).toContain('projections__days_until_limit');
      expect(outputKeys).toContain('projections__will_exceed_limit');

      // URLs de acción
      expect(outputKeys).toContain('action_urls__upgrade_plan');
      expect(outputKeys).toContain('action_urls__usage_dashboard');

      // Recomendaciones y alertas (primer elemento)
      expect(outputKeys).toContain('recommendations[0]__type');
      expect(outputKeys).toContain('alerts[0]__type');
    });
  });
});

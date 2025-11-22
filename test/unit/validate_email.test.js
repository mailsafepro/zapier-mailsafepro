const validateEmailTrigger = require('../../triggers/validate_email');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');
const { mockEmailValidationResponse, mockErrorResponses } = require('../mocks/api-responses');

describe('Email Validation Trigger', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('inputFields', () => {
    it('should have correct input field structure', () => {
      const inputFields = validateEmailTrigger.operation.inputFields;

      expect(inputFields).toBeInstanceOf(Array);
      expect(inputFields[0]).toMatchObject({
        key: 'email',
        type: 'string',
        required: true,
        label: '📧 Email a validar',
      });
    });
  });

  describe('perform', () => {
    it('should validate email successfully with API Key', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        check_smtp: true,
        include_raw_dns: false,
        validation_timeout: 30,
      };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      // Verificar que el resultado tiene los campos calculados
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        email: 'test@example.com',
        valid: true,
        status: 'deliverable',
        deliverability_status: 'high',
        risk_level: 'low',
        quality_tier: 'excellent',
        is_high_risk: false,
        is_premium_provider: true,
        has_security_records: true,
      });

      // Verificar que se llamó a la API correctamente
      expect(z.request).toHaveBeenCalledWith({
        url: 'https://api.mailsafepro.com/v1/validate/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zapier-Integration/2.0.0',
          'X-Client-Version': '2.0.0',
          'X-API-Key': 'sk_test_key',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          check_smtp: true,
          include_raw_dns: false,
        }),
        timeout: 30000,
      });
    });

    it('should validate email successfully with JWT', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      bundle.authData = { jwt: 'valid.jwt.token' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      // Verificar estructura básica
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('valid');
      expect(result[0]).toHaveProperty('deliverability_status');

      // Verificar que se usó JWT
      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid.jwt.token',
          }),
        })
      );
    });

    it('should handle rate limiting', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[429]));

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de tasa excedido. Por favor espere antes de realizar más validaciones'
      );
    });

    it('should handle authentication errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[401]));

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Autenticación inválida. Verifique su API Key o JWT Token'
      );
    });

    it('should handle validation errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[400]));

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Solicitud inválida: verifique el formato del email'
      );
    });

    it('should handle invalid API response format', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { invalid: 'response' }, // Missing email field
        })
      );

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'La respuesta de la API no incluye el campo email'
      );
    });

    it('should handle network errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockRejectedValue(new Error('Network error'));

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Network error'
      );
    });

    it('should calculate deliverability_status correctly', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const riskyResponse = {
        ...mockEmailValidationResponse,
        status: 'risky',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: riskyResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].deliverability_status).toBe('medium');
    });

    it('should calculate risk_level correctly', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const highRiskResponse = {
        ...mockEmailValidationResponse,
        risk_score: 0.85,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: highRiskResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].risk_level).toBe('high');
      expect(result[0].is_high_risk).toBe(true);
    });

    it('should calculate quality_tier correctly', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const lowQualityResponse = {
        ...mockEmailValidationResponse,
        quality_score: 0.3,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: lowQualityResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].quality_tier).toBe('poor');
    });

    it('should fail when email is missing', async () => {
      bundle.inputData = {
        email: '   ', // solo espacios
        validation_timeout: 30,
      };

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'El campo email es requerido'
      );
    });

    it('should fail when email format is invalid', async () => {
      bundle.inputData = {
        email: 'invalid-email',
        validation_timeout: 30,
      };

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Formato de email inválido'
      );
    });

    it('should handle 403 plan limitation errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 403,
          json: { detail: 'Plan limitation' },
        })
      );

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Acceso denegado. Su plan no incluye esta funcionalidad'
      );
    });

    it('should handle 404 endpoint not found errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 404,
          json: { detail: 'Not found' },
        })
      );

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Endpoint no encontrado. Contacte al soporte técnico'
      );
    });

    it('should handle unknown HTTP status errors', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 418,
          json: { detail: 'I am a teapot' },
        })
      );

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Error inesperado: 418 - I am a teapot'
      );
    });

    it('should handle non-object API response', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: null, // no es un objeto
        })
      );

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Respuesta inválida del servidor'
      );
    });

    it('should handle validation timeout errors (ETIMEDOUT)', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 45, // 45 segundos -> 45000 ms
      };

      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';

      z.request.mockRejectedValue(timeoutError);

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Timeout de validación (45000ms). El servicio puede estar ocupado. Intente con un timeout mayor.'
      );
    });

    it('should handle network connectivity errors (ECONNREFUSED)', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const netError = new Error('Connection refused');
      netError.code = 'ECONNREFUSED';

      z.request.mockRejectedValue(netError);

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'No se puede conectar al servicio de validación. Verifique su conexión a internet.'
      );
    });

    it('should clamp validation_timeout to minimum 15 seconds', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 5, // menor que 15 -> se clampa a 15
      };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      await validateEmailTrigger.operation.perform(z, bundle);

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.timeout).toBe(15000);
    });

    it('should clamp validation_timeout to maximum 60 seconds', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 120, // mayor que 60 -> se clampa a 60
      };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      await validateEmailTrigger.operation.perform(z, bundle);

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.timeout).toBe(60000);
    });

    it('should set medium risk_level for mid risk_score', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const mediumRiskResponse = {
        ...mockEmailValidationResponse,
        risk_score: 0.5, // entre 0.3 y 0.7
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mediumRiskResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].risk_level).toBe('medium');
      expect(result[0].is_high_risk).toBe(false);
    });

    it('should set low deliverability_status for undeliverable emails', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const undeliverableResponse = {
        ...mockEmailValidationResponse,
        status: 'undeliverable',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: undeliverableResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].deliverability_status).toBe('low');
    });

    it('should set has_security_records to false when SPF and DKIM are not valid', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const noSecurityResponse = {
        ...mockEmailValidationResponse,
        dns_security: {
          spf: { status: 'invalid' },
          dkim: { status: 'invalid' },
          dmarc: mockEmailValidationResponse.dns_security.dmarc,
        },
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: noSecurityResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0].has_security_records).toBe(false);
    });

    it('should include validated_at timestamp in response', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      const result = await validateEmailTrigger.operation.perform(z, bundle);

      expect(result[0]).toHaveProperty('validated_at');
      expect(result[0].validated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle DNS resolution errors (ENOTFOUND)', async () => {
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      const dnsError = new Error('DNS resolution failed');
      dnsError.code = 'ENOTFOUND';

      z.request.mockRejectedValue(dnsError);

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'No se puede conectar al servicio de validación. Verifique su conexión a internet.'
      );
    });
  });

  describe('sample', () => {
    it('should have valid sample data structure', () => {
      const sample = validateEmailTrigger.operation.sample;

      // Verificar campos básicos
      expect(sample).toHaveProperty('email');
      expect(sample).toHaveProperty('valid');
      expect(sample).toHaveProperty('status');
      expect(sample).toHaveProperty('detail');

      // Verificar campos de puntuación
      expect(sample).toHaveProperty('risk_score');
      expect(sample).toHaveProperty('quality_score');
      expect(sample).toHaveProperty('processing_time');

      // Verificar campos calculados
      expect(sample).toHaveProperty('deliverability_status');
      expect(sample).toHaveProperty('risk_level');
      expect(sample).toHaveProperty('quality_tier');

      // Verificar flags
      expect(sample).toHaveProperty('is_high_risk');
      expect(sample).toHaveProperty('is_premium_provider');
      expect(sample).toHaveProperty('has_security_records');

      // Verificar objetos anidados
      expect(sample).toHaveProperty('provider_analysis');
      expect(sample).toHaveProperty('smtp_validation');
      expect(sample).toHaveProperty('dns_security');
      expect(sample).toHaveProperty('spam_trap_check');
      expect(sample).toHaveProperty('metadata');
    });

    it('should have correct data types in sample', () => {
      const sample = validateEmailTrigger.operation.sample;

      expect(typeof sample.email).toBe('string');
      expect(typeof sample.valid).toBe('boolean');
      expect(typeof sample.risk_score).toBe('number');
      expect(typeof sample.quality_score).toBe('number');
      expect(typeof sample.is_high_risk).toBe('boolean');
    });
  });

  describe('outputFields', () => {
    it('should have correct output field structure', () => {
      const outputFields = validateEmailTrigger.operation.outputFields;

      expect(outputFields).toBeInstanceOf(Array);

      // Verificar campos principales con estructura correcta
      expect(outputFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'email',
            label: '📧 Email validado',
            type: 'string',
          }),
          expect.objectContaining({
            key: 'valid',
            label: '✅ Válido',
            type: 'boolean',
          }),
          expect.objectContaining({
            key: 'risk_score',
            label: '⚠️ Puntuación de riesgo (0-1)',
            type: 'number',
          }),
          expect.objectContaining({
            key: 'quality_score',
            label: '⭐ Puntuación de calidad (0-1)',
            type: 'number',
          }),
        ])
      );
    });

    it('should include calculated fields in output', () => {
      const outputFields = validateEmailTrigger.operation.outputFields;

      const outputKeys = outputFields.map(field => field.key);

      expect(outputKeys).toContain('deliverability_status');
      expect(outputKeys).toContain('risk_level');
      expect(outputKeys).toContain('quality_tier');
      expect(outputKeys).toContain('is_high_risk');
      expect(outputKeys).toContain('is_premium_provider');
      expect(outputKeys).toContain('has_security_records');
    });

    it('should have labels for all output fields', () => {
      const outputFields = validateEmailTrigger.operation.outputFields;

      outputFields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field.label).toBeTruthy();
      });
    });

    it('should include validated_at field in output', () => {
      const outputFields = validateEmailTrigger.operation.outputFields;
      const outputKeys = outputFields.map(field => field.key);

      expect(outputKeys).toContain('validated_at');
    });
  });
});

const batchValidateCreate = require('../../creates/batch_validate');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');
const { mockBatchCreateResponse, mockErrorResponses } = require('../mocks/api-responses');

describe('Batch Validation Create', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = {
      ...mockZapier,
      request: jest.fn(),
    };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('inputFields', () => {
    it('should have correct input field structure', () => {
      const inputFields = batchValidateCreate.operation.inputFields;

      expect(inputFields).toBeInstanceOf(Array);
      expect(inputFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'input_method',
            label: '📥 Método de Entrada',
            required: true,
          }),
          expect.objectContaining({
            key: 'emails',
            label: '📧 Lista de Emails',
            required: false,
          }),
          expect.objectContaining({
            key: 'file_url',
            label: '🔗 URL de Archivo',
            required: false,
          }),
        ])
      );
    });

    it('should have correct input method choices', () => {
      const inputFields = batchValidateCreate.operation.inputFields;
      const inputMethodField = inputFields.find(field => field.key === 'input_method');

      expect(inputMethodField.choices).toEqual({
        text_list: '📝 Lista de textos (emails separados por comas)',
        file_url: '🔗 URL de archivo remoto',
        direct_emails: '👥 Array de emails directo',
      });
    });
  });

  describe('perform', () => {
    it('should validate batch with email list successfully', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test1@example.com, test2@example.com',
        check_smtp: true,
        priority: 'normal',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      const result = await batchValidateCreate.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        job_id: mockBatchCreateResponse.job_id,
        status: mockBatchCreateResponse.status,
        input_method: 'text_list',
        total_emails_estimated: 2,
      });

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.url).toBe('https://api.mailsafepro.com/v1/validate/batch');
      expect(requestConfig.method).toBe('POST');
      expect(requestConfig.timeout).toBe(45000);

      const requestBody = JSON.parse(requestConfig.body);
      expect(requestBody.emails).toEqual(['test1@example.com', 'test2@example.com']);
      expect(requestBody.check_smtp).toBe(true);
      expect(requestBody.priority).toBe('normal');
    });

    it('should validate batch with file URL successfully', async () => {
      bundle.inputData = {
        input_method: 'file_url',
        file_url: 'https://example.com/emails.csv',
        file_column: 'email',
        priority: 'normal',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      const result = await batchValidateCreate.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        job_id: mockBatchCreateResponse.job_id,
        status: mockBatchCreateResponse.status,
        input_method: 'file_url',
        total_emails_estimated: 100,
      });

      const requestBody = JSON.parse(z.request.mock.calls[0][0].body);
      expect(requestBody.file_url).toBe('https://example.com/emails.csv');
      expect(requestBody.column).toBe('email');
    });

    it('should handle missing input method', async () => {
      bundle.inputData = {}; // No input_method provided

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'El método de entrada es requerido'
      );
    });

    it('should handle empty email list for text_list method', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: '', // Empty email list
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'La lista de emails no puede estar vacía'
      );
    });

    it('should handle invalid file URL', async () => {
      bundle.inputData = {
        input_method: 'file_url',
        file_url: 'invalid-url', // Invalid URL
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'URL de archivo inválida'
      );
    });

    it('should handle invalid email format in list', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'invalid-email, valid@example.com', // One invalid email
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      // This should still work as invalid emails are filtered out
      const result = await batchValidateCreate.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(z.request).toHaveBeenCalled();
      // The request should only contain the valid email
      const requestBody = JSON.parse(z.request.mock.calls[0][0].body);
      expect(requestBody.emails).toEqual(['valid@example.com']);
    });

    it('should handle empty email list after processing', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'invalid-email, another-invalid', // Only invalid emails
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'No se encontraron emails válidos en la lista proporcionada'
      );
    });

    it('should handle rate limiting', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[429]));

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de tasa excedido'
      );
    });

    it('should handle authentication errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[401]));

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Autenticación inválida o expirada'
      );
    });

    it('should handle network timeout errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(networkError);

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Timeout en la conexión con el servicio de validación'
      );
    });

    it('should handle server errors with custom message', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 500,
          json: { detail: 'Custom error message' },
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Custom error message'
      );
    });

    it('should handle batch size exceeded', async () => {
      // Create a string with more than 1000 emails
      const manyEmails = Array.from({ length: 1001 }, (_, i) => `test${i}@example.com`).join(', ');

      bundle.inputData = {
        input_method: 'text_list',
        emails: manyEmails,
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Límite excedido: 1001 emails'
      );
    });

    it('should handle empty email array for direct_emails method', async () => {
      bundle.inputData = {
        input_method: 'direct_emails',
        email_array: [], // Empty array
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'El array de emails no puede estar vacío'
      );
    });

    it('should handle missing file URL for file_url method', async () => {
      bundle.inputData = {
        input_method: 'file_url',
        file_url: '', // Empty file URL
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'La URL del archivo es requerida'
      );
    });

    it('should validate batch with direct_emails successfully', async () => {
      bundle.inputData = {
        input_method: 'direct_emails',
        email_array: [' user1@example.com ', 'invalid-email', 'user2@example.com '],
        check_smtp: false,
        include_raw_dns: true,
        priority: 'high',
        callback_url: 'https://example.com/callback',
        batch_name: 'Batch de prueba',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      const result = await batchValidateCreate.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        job_id: mockBatchCreateResponse.job_id,
        status: mockBatchCreateResponse.status,
        input_method: 'direct_emails',
        total_emails_estimated: 2,
      });

      const requestBody = JSON.parse(z.request.mock.calls[0][0].body);
      expect(requestBody.emails).toEqual(['user1@example.com', 'user2@example.com']);
      expect(requestBody.check_smtp).toBe(false);
      expect(requestBody.include_raw_dns).toBe(true);
      expect(requestBody.priority).toBe('high');
      expect(requestBody.callback_url).toBe('https://example.com/callback');
      expect(requestBody.batch_name).toBe('Batch de prueba');
    });

    it('should handle unsupported input method', async () => {
      bundle.inputData = {
        input_method: 'unsupported_method',
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Método de entrada no soportado'
      );
    });

    it('should handle invalid file URL protocol', async () => {
      bundle.inputData = {
        input_method: 'file_url',
        file_url: 'ftp://example.com/emails.csv',
      };

      try {
        await batchValidateCreate.operation.perform(z, bundle);
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect(error.message).toContain('URL de archivo inválida');
      }
    });

    it('should handle 400 bad request errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[400]));

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Solicitud mal formada. Verifique los parámetros y formatos.'
      );
    });

    it('should handle 403 plan upgrade required errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 403,
          json: { detail: 'This feature requires PREMIUM plan' },
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Esta funcionalidad requiere un plan superior'
      );
    });

    it('should handle 403 generic forbidden errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(createMockResponse(mockErrorResponses[403]));

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Acceso denegado. No tiene permisos para esta operación.'
      );
    });

    it('should handle 413 payload too large errors from server', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 413,
          json: { detail: 'Payload Too Large' },
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'El lote es demasiado grande. Reduzca el número de emails o use un archivo.'
      );
    });

    it('should handle 429 with custom Retry-After header', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 429,
          headers: { 'retry-after': '120' },
          json: { detail: 'Rate limit exceeded', error_type: 'RATE_LIMIT' },
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de tasa excedido. Por favor espere 120 segundos antes de intentar otro lote.'
      );
    });

    it('should handle unexpected server status codes', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 418,
          json: { detail: 'I am a teapot' },
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Error inesperado del servidor: 418 - I am a teapot'
      );
    });

    it('should handle ECONNREFUSED network errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      const networkError = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(networkError);

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'No se puede conectar al servicio de validación. Verifique su conexión a internet.'
      );
    });

    it('should handle generic network errors', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      const networkError = new Error('Some network issue');
      networkError.code = 'UNKNOWN_CODE';
      z.request.mockRejectedValue(networkError);

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Error de red: Some network issue'
      );
    });

    it('should enrich metadata correctly for file_url batches', async () => {
      bundle.inputData = {
        input_method: 'file_url',
        file_url: 'https://example.com/emails.csv',
        file_column: 'email',
        check_smtp: true,
        include_raw_dns: true,
        priority: 'high',
        callback_url: 'https://example.com/callback',
        batch_name: 'Leads Q1',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: { job_id: 'batch_custom_123', status: 'queued' },
        })
      );

      const [result] = await batchValidateCreate.operation.perform(z, bundle);

      expect(result.job_id).toBe('batch_custom_123');
      expect(result.input_method).toBe('file_url');
      expect(result.total_emails_estimated).toBe(100); // valor por defecto para archivos
      expect(result.validation_options).toEqual({
        check_smtp: true,
        include_raw_dns: true,
        priority: 'high',
      });
      expect(result.can_poll_status).toBe(true);
      expect(result.recommended_poll_interval).toBe(60); // high priority
      expect(result.callback_url).toBe('https://example.com/callback');
      expect(result.batch_name).toBe('Leads Q1');
      expect(result.tracking_url).toBe(
        'https://api.mailsafepro.com/v1/validate/batch/batch_custom_123/status'
      );
      expect(result.results_url).toBe(
        'https://api.mailsafepro.com/v1/validate/batch/batch_custom_123/results'
      );
      expect(result.submitted_at).toBeDefined();
      expect(result.estimated_completion_time).toBeDefined();
    });

    it('should include both API key and JWT headers when available', async () => {
      bundle = createMockBundle({
        authData: {
          apiKey: 'sk_test_custom_api_key',
          jwt: 'custom.jwt.token',
        },
        inputData: {
          input_method: 'text_list',
          emails: 'test@example.com',
        },
      });

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      await batchValidateCreate.operation.perform(z, bundle);

      const requestConfig = z.request.mock.calls[0][0];
      expect(requestConfig.headers['X-API-Key']).toBe('sk_test_custom_api_key');
      expect(requestConfig.headers.Authorization).toBe('Bearer custom.jwt.token');
      expect(requestConfig.headers['User-Agent']).toBe('Zapier-Batch-Integration/2.0.0');
      expect(requestConfig.headers['X-Client-Version']).toBe('2.0.0');
    });

    it('should handle email list with various separators', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test1@example.com; test2@example.com\ntest3@example.com,test4@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      await batchValidateCreate.operation.perform(z, bundle);

      const requestBody = JSON.parse(z.request.mock.calls[0][0].body);
      expect(requestBody.emails).toEqual([
        'test1@example.com',
        'test2@example.com',
        'test3@example.com',
        'test4@example.com',
      ]);
    });

    it('should calculate estimated completion time correctly', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test1@example.com, test2@example.com, test3@example.com',
        check_smtp: true,
        priority: 'high',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      const [result] = await batchValidateCreate.operation.perform(z, bundle);

      expect(result.estimated_completion_time).toBeDefined();
      // Should be a future timestamp
      const completionTime = new Date(result.estimated_completion_time);
      expect(completionTime.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle response without job_id', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: { status: 'processing' }, // Missing job_id
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'La respuesta del servidor no incluye ID de trabajo'
      );
    });

    it('should handle non-object API response', async () => {
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 202,
          json: null, // Invalid response
        })
      );

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Respuesta inválida del servidor de validación'
      );
    });
  });

  describe('sample', () => {
    it('should have valid sample data structure', () => {
      const sample = batchValidateCreate.operation.sample;

      expect(sample).toBeInstanceOf(Object);
      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('status');
      expect(sample).toHaveProperty('submitted_at');
      expect(sample).toHaveProperty('input_method');
      expect(sample).toHaveProperty('total_emails_estimated');
      expect(sample).toHaveProperty('validation_options');
      expect(sample).toHaveProperty('tracking_url');
      expect(sample).toHaveProperty('results_url');
      expect(sample).toHaveProperty('can_poll_status');
      expect(sample).toHaveProperty('recommended_poll_interval');
    });

    it('should have correct data types in sample', () => {
      const sample = batchValidateCreate.operation.sample;

      expect(typeof sample.job_id).toBe('string');
      expect(typeof sample.status).toBe('string');
      expect(typeof sample.input_method).toBe('string');
      expect(typeof sample.total_emails_estimated).toBe('number');
      expect(typeof sample.can_poll_status).toBe('boolean');
      expect(typeof sample.recommended_poll_interval).toBe('number');
    });
  });

  describe('outputFields', () => {
    it('should have correct output field structure', () => {
      const outputFields = batchValidateCreate.operation.outputFields;

      expect(outputFields).toBeInstanceOf(Array);
      expect(outputFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'job_id',
            label: '🆔 ID del Trabajo Batch',
            type: 'string',
          }),
          expect.objectContaining({
            key: 'status',
            label: '📊 Estado del Procesamiento',
            type: 'string',
          }),
          expect.objectContaining({
            key: 'submitted_at',
            label: '📅 Fecha de Envío',
            type: 'datetime',
          }),
          expect.objectContaining({
            key: 'estimated_completion_time',
            label: '⏱️ Tiempo Estimado de Finalización',
            type: 'datetime',
          }),
          expect.objectContaining({
            key: 'input_method',
            label: '📥 Método de Entrada Utilizado',
            type: 'string',
          }),
        ])
      );
    });

    it('should include all validation options fields', () => {
      const outputFields = batchValidateCreate.operation.outputFields;
      const outputKeys = outputFields.map(field => field.key);

      expect(outputKeys).toContain('validation_options__check_smtp');
      expect(outputKeys).toContain('validation_options__include_raw_dns');
      expect(outputKeys).toContain('validation_options__priority');
    });

    it('should include tracking and results URLs', () => {
      const outputFields = batchValidateCreate.operation.outputFields;
      const outputKeys = outputFields.map(field => field.key);

      expect(outputKeys).toContain('tracking_url');
      expect(outputKeys).toContain('results_url');
      expect(outputKeys).toContain('callback_url');
    });

    it('should have labels for all output fields', () => {
      const outputFields = batchValidateCreate.operation.outputFields;

      outputFields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field.label).toBeTruthy();
      });
    });
  });
});

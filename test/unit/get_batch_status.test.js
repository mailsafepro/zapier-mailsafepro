/**
 * @module GetBatchStatusSearchTests
 * @description Comprehensive tests for get batch status search
 */

const getBatchStatusSearch = require('../../searches/get_batch_status');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Get Batch Status Search', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(getBatchStatusSearch.key).toBe('get_batch_status');
      expect(getBatchStatusSearch.noun).toBe('Estado de Batch');
      expect(getBatchStatusSearch.display.label).toContain('Get Batch Status');
    });
  });

  describe('inputFields', () => {
    it('should have job_id as required field with dynamic dropdown', () => {
      const jobIdField = getBatchStatusSearch.operation.inputFields.find(f => f.key === 'job_id');
      expect(jobIdField).toBeDefined();
      expect(jobIdField.required).toBe(true);
      expect(jobIdField.dynamic).toBe('batch_list_dropdown.id.name');
    });
  });

  describe('perform', () => {
    it('should get batch status successfully', async () => {
      bundle.inputData = { job_id: 'batch_123456', include_partial_results: true };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { job_id: 'batch_123456', status: 'processing', total_emails: 100, processed_emails: 50 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/jobs/batch_123456',
          method: 'GET'
        })
      );

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('job_id', 'batch_123456');
      expect(result[0]).toHaveProperty('progress_percentage', '50.00');
      expect(result[0]).toHaveProperty('is_processing', true);
    });

    it('should throw error when job_id is missing', async () => {
      bundle.inputData = { job_id: '' };
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('El ID del batch es requerido');
    });

    it('should handle 400 error', async () => {
      bundle.inputData = { job_id: 'invalid_id' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 400, json: { detail: 'Invalid ID' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('ID de batch inválido');
    });

    it('should handle 401 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'invalid_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 401, json: { detail: 'Unauthorized' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Autenticación inválida');
    });

    it('should handle 404 error', async () => {
      bundle.inputData = { job_id: 'batch_nonexistent' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 404, json: { detail: 'Not found' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Batch no encontrado');
    });

    it('should handle 429 rate limit error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 429, json: { detail: 'Rate limited' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Límite de consultas excedido');
    });

    it('should handle invalid response', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: null }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Respuesta inválida');
    });

    it('should handle ETIMEDOUT error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Timeout al consultar estado');
    });

    it('should set correct status flags for queued status', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'queued', total_emails: 100, processed_emails: 0 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].is_queued).toBe(true);
      expect(result[0].is_processing).toBe(false);
      expect(result[0].status_display).toBe('📋 En Cola');
    });

    it('should set correct status flags for completed status', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'completed', total_emails: 100, processed_emails: 100 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].is_complete).toBe(true);
      expect(result[0].status_display).toBe('✅ Completado');
    });

    it('should set correct status flags for failed status', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'failed', total_emails: 100, processed_emails: 50 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].is_complete).toBe(true);
      expect(result[0].status_display).toBe('❌ Fallido');
    });

    it('should handle zero total_emails', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'queued', total_emails: 0, processed_emails: 0 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].progress_percentage).toBe(0);
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = getBatchStatusSearch.operation.sample;
      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('status');
      expect(sample).toHaveProperty('progress_percentage');
    });
  });

  describe('additional coverage', () => {
    it('should handle 403 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 403, json: { detail: 'Forbidden' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('No tiene permisos');
    });

    it('should handle 500 server error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 500, json: { detail: 'Internal error' } }));
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('Error del servidor');
    });

    it('should handle ECONNREFUSED error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(connError);
      await expect(getBatchStatusSearch.operation.perform(z, bundle)).rejects.toThrow('No se puede conectar al servicio');
    });

    it('should handle cancelled status', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'cancelled', total_emails: 100, processed_emails: 25 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].is_complete).toBe(true);
      expect(result[0].status_display).toBe('🛑 Cancelado');
    });

    it('should handle partial status', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'partial', total_emails: 100, processed_emails: 80 }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].status_display).toBe('⚠️ Parcialmente Completado');
    });

    it('should calculate time remaining correctly', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const futureTime = new Date(Date.now() + 300000).toISOString();
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'processing', total_emails: 100, processed_emails: 50, estimated_completion: futureTime }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0]).toHaveProperty('time_remaining_seconds');
      expect(result[0]).toHaveProperty('time_remaining_display');
    });

    it('should handle past estimated_completion', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const pastTime = new Date(Date.now() - 60000).toISOString();
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'processing', total_emails: 100, processed_emails: 99, estimated_completion: pastTime }
      }));
      const result = await getBatchStatusSearch.operation.perform(z, bundle);
      expect(result[0].time_remaining_seconds).toBe(0);
      expect(result[0].time_remaining_display).toBe('Completando...');
    });

    it('should use JWT auth when provided', async () => {
      bundle.inputData = { job_id: 'batch_789' };
      bundle.authData = { jwt: 'valid.jwt.token' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { status: 'completed', total_emails: 100, processed_emails: 100 }
      }));
      await getBatchStatusSearch.operation.perform(z, bundle);
      expect(z.request).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid.jwt.token' })
      }));
    });
  });
});
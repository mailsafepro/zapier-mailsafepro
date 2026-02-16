/**
 * @module CancelBatchCreateTests
 * @description Comprehensive tests for cancel batch action
 */

const cancelBatchCreate = require('../../creates/cancel_batch');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Cancel Batch Create', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(cancelBatchCreate.key).toBe('cancel_batch');
      expect(cancelBatchCreate.noun).toBe('Cancelar Batch');
      expect(cancelBatchCreate.display.label).toContain('Cancel Batch');
    });
  });

  describe('inputFields', () => {
    it('should have job_id as required field with dynamic dropdown', () => {
      const jobIdField = cancelBatchCreate.operation.inputFields.find(f => f.key === 'job_id');
      expect(jobIdField).toBeDefined();
      expect(jobIdField.required).toBe(true);
      expect(jobIdField.dynamic).toBe('batch_list_dropdown.id.name');
    });

    it('should have preserve_partial_results field', () => {
      const preserveField = cancelBatchCreate.operation.inputFields.find(f => f.key === 'preserve_partial_results');
      expect(preserveField).toBeDefined();
      expect(preserveField.type).toBe('boolean');
      expect(preserveField.default).toBe('true');
    });
  });

  describe('perform', () => {
    it('should cancel batch successfully', async () => {
      bundle.inputData = { job_id: 'batch_123456', reason: 'No longer needed', preserve_partial_results: true };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: { job_id: 'batch_123456', status: 'cancelled' } }));
      const result = await cancelBatchCreate.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/jobs/batch_123456/cancel',
          method: 'POST'
        })
      );

      expect(result).toHaveProperty('job_id', 'batch_123456');
      expect(result).toHaveProperty('final_status', 'cancelled');
    });

    it('should throw error when job_id is missing', async () => {
      bundle.inputData = { job_id: '' };
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('El ID del batch es requerido');
    });

    it('should handle 400 error', async () => {
      bundle.inputData = { job_id: 'invalid_batch' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 400, json: { detail: 'Invalid batch' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('ID de batch inválido');
    });

    it('should handle 401 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'invalid_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 401, json: { detail: 'Unauthorized' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('Autenticación inválida');
    });

    it('should handle 403 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 403, json: { detail: 'Forbidden' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('No tiene permisos');
    });

    it('should handle 404 error', async () => {
      bundle.inputData = { job_id: 'batch_nonexistent' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 404, json: { detail: 'Not found' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('Batch no encontrado');
    });

    it('should handle 409 error', async () => {
      bundle.inputData = { job_id: 'batch_completed' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 409, json: { detail: 'Already completed' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('ya está completado o cancelado');
    });

    it('should handle 429 rate limit error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 429, json: { detail: 'Rate limited' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('Límite de solicitudes excedido');
    });

    it('should handle 500 server error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 500, json: { detail: 'Internal error' } }));
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('Error del servidor');
    });

    it('should handle ETIMEDOUT error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('Timeout al cancelar batch');
    });

    it('should handle ECONNREFUSED error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(connError);
      await expect(cancelBatchCreate.operation.perform(z, bundle)).rejects.toThrow('No se puede conectar al servicio');
    });

    it('should use JWT auth when provided', async () => {
      bundle.inputData = { job_id: 'batch_789' };
      bundle.authData = { jwt: 'valid.jwt.token' };
      z.request.mockResolvedValue(createMockResponse({ status: 202, json: { status: 'cancelled' } }));
      const result = await cancelBatchCreate.operation.perform(z, bundle);
      expect(result.final_status).toBe('cancelled');
      expect(z.request).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid.jwt.token' })
      }));
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = cancelBatchCreate.operation.sample;
      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('cancelled_at');
      expect(sample).toHaveProperty('final_status', 'cancelled');
    });
  });

  describe('outputFields', () => {
    it('should have all required output fields', () => {
      const keys = cancelBatchCreate.operation.outputFields.map(f => f.key);
      expect(keys).toContain('job_id');
      expect(keys).toContain('cancelled_at');
      expect(keys).toContain('final_status');
    });
  });
});

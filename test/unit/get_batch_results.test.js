/**
 * @module GetBatchResultsSearchTests
 * @description Comprehensive tests for get batch results search
 */

const getBatchResultsSearch = require('../../searches/get_batch_results');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Get Batch Results Search', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(getBatchResultsSearch.key).toBe('get_batch_results');
      expect(getBatchResultsSearch.noun).toBe('Resultados de Batch');
      expect(getBatchResultsSearch.display.label).toContain('Get Batch Results');
    });
  });

  describe('inputFields', () => {
    it('should have job_id as required field with dynamic dropdown', () => {
      const jobIdField = getBatchResultsSearch.operation.inputFields.find(f => f.key === 'job_id');
      expect(jobIdField).toBeDefined();
      expect(jobIdField.required).toBe(true);
      expect(jobIdField.dynamic).toBe('batch_list_dropdown.id.name');
    });

    it('should have filter_status field with correct choices', () => {
      const filterField = getBatchResultsSearch.operation.inputFields.find(f => f.key === 'filter_status');
      expect(filterField).toBeDefined();
      expect(filterField.choices).toHaveProperty('all');
      expect(filterField.choices).toHaveProperty('valid');
      expect(filterField.choices).toHaveProperty('invalid');
    });
  });

  describe('perform', () => {
    it('should get batch results successfully', async () => {
      bundle.inputData = { job_id: 'batch_123456', filter_status: 'all', page: 1, page_size: 50 };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { page: 1, page_size: 50, total: 100, results: [{ email: 'test@example.com', status: 'valid' }] }
      }));
      const result = await getBatchResultsSearch.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/jobs/batch_123456/results',
          method: 'GET'
        })
      );

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('job_id', 'batch_123456');
      expect(result[0]).toHaveProperty('pagination');
      expect(result[0]).toHaveProperty('results');
    });

    it('should throw error when job_id is missing', async () => {
      bundle.inputData = { job_id: '' };
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('El ID del batch es requerido');
    });

    it('should handle 400 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 400, json: { detail: 'Invalid params' } }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Parámetros de consulta inválidos');
    });

    it('should handle 401 error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'invalid_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 401, json: { detail: 'Unauthorized' } }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Autenticación inválida');
    });

    it('should handle 404 error', async () => {
      bundle.inputData = { job_id: 'batch_nonexistent' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 404, json: { detail: 'Not found' } }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Batch no encontrado');
    });

    it('should handle 409 error (batch not complete)', async () => {
      bundle.inputData = { job_id: 'batch_processing' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 409, json: { detail: 'Not complete' } }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('El batch aún no ha completado');
    });

    it('should handle 429 rate limit error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 429, json: { detail: 'Rate limited' } }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Límite de consultas excedido');
    });

    it('should handle invalid response', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: null }));
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Respuesta inválida');
    });

    it('should handle ETIMEDOUT error', async () => {
      bundle.inputData = { job_id: 'batch_123' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);
      await expect(getBatchResultsSearch.operation.perform(z, bundle)).rejects.toThrow('Timeout al obtener resultados');
    });

    it('should enrich results with calculated fields', async () => {
      bundle.inputData = { job_id: 'batch_123', page: 1, page_size: 10 };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: {
          total: 50,
          results: [
            { email: 'low@example.com', status: 'valid', risk_score: 0.1, quality_score: 0.95 },
            { email: 'high@example.com', status: 'invalid', risk_score: 0.9, quality_score: 0.2 }
          ]
        }
      }));
      const result = await getBatchResultsSearch.operation.perform(z, bundle);
      expect(result[0].results[0].risk_level).toBe('low');
      expect(result[0].results[0].quality_tier).toBe('excellent');
      expect(result[0].results[0].is_safe_to_send).toBe(true);
      expect(result[0].results[1].risk_level).toBe('high');
      expect(result[0].results[1].quality_tier).toBe('poor');
    });

    it('should calculate pagination correctly', async () => {
      bundle.inputData = { job_id: 'batch_123', page: 2, page_size: 25 };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 200,
        json: { page: 2, page_size: 25, total: 100, results: [] }
      }));
      const result = await getBatchResultsSearch.operation.perform(z, bundle);
      expect(result[0].pagination.current_page).toBe(2);
      expect(result[0].pagination.total_pages).toBe(4);
      expect(result[0].pagination.has_next_page).toBe(true);
      expect(result[0].pagination.has_previous_page).toBe(true);
    });

    it('should clamp page_size to maximum 100', async () => {
      bundle.inputData = { job_id: 'batch_123', page_size: 500 };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: { total: 10, results: [] } }));
      await getBatchResultsSearch.operation.perform(z, bundle);
      expect(z.request).toHaveBeenCalledWith(expect.objectContaining({
        params: expect.objectContaining({ page_size: 100 })
      }));
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = getBatchResultsSearch.operation.sample;
      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('pagination');
      expect(sample).toHaveProperty('results');
      expect(sample).toHaveProperty('export_urls');
    });
  });
});

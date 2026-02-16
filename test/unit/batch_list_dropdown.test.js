/**
 * @module BatchListDropdownTests
 * @description Comprehensive tests for batch list dropdown trigger
 */

const batchListDropdown = require('../../triggers/batch_list_dropdown');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Batch List Dropdown Trigger', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(batchListDropdown.key).toBe('batch_list_dropdown');
      expect(batchListDropdown.noun).toBe('Batch');
      expect(batchListDropdown.display.label).toBe('Batch List');
      expect(batchListDropdown.display.description).toBeDefined();
    });

    it('should be hidden', () => {
      expect(batchListDropdown.display.hidden).toBe(true);
    });
  });

  describe('perform', () => {
    it('should fetch batch list successfully with API Key', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: {
            batches: [
              { job_id: 'batch_1', batch_name: 'Batch 1', status: 'completed', total_emails: 100 },
              { job_id: 'batch_2', batch_name: 'Batch 2', status: 'processing', total_emails: 50 },
            ],
          },
        })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id', 'batch_1');
      expect(result[0]).toHaveProperty('job_id', 'batch_1');
      expect(result[0]).toHaveProperty('name', 'Batch 1 (completed) - 100 emails');
    });

    it('should fetch batch list successfully with JWT', async () => {
      bundle.authData = { jwt: 'valid.jwt.token' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { batches: [{ job_id: 'batch_jwt', batch_name: 'JWT Batch', status: 'completed', total_emails: 25 }] },
        })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].id).toBe('batch_jwt');
      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid.jwt.token',
          }),
        })
      );
    });

    it('should return sample data on API error', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 500, json: { detail: 'Server error' } })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('batch_sample_123456');
      expect(result[0].name).toBe('Sample Batch (100 emails)');
    });

    it('should return sample data on 401 error', async () => {
      bundle.authData = { apiKey: 'invalid_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 401, json: { detail: 'Unauthorized' } })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].id).toBe('batch_sample_123456');
    });

    it('should return sample data on 403 error', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 403, json: { detail: 'Forbidden' } })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].id).toBe('batch_sample_123456');
    });

    it('should handle response without batches wrapper', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: [
            { job_id: 'batch_direct', batch_name: 'Direct Batch', status: 'completed', total_emails: 75 },
          ],
        })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].id).toBe('batch_direct');
    });

    it('should handle batch without batch_name', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { batches: [{ job_id: 'batch_no_name', status: 'completed', total_emails: 50 }] },
        })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].name).toBe('Unnamed Batch (completed) - 50 emails');
    });

    it('should handle batch without total_emails', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { batches: [{ job_id: 'batch_no_count', batch_name: 'No Count', status: 'queued' }] },
        })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result[0].name).toBe('No Count (queued) - 0 emails');
    });

    it('should make request with correct parameters', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: { batches: [] } })
      );

      await batchListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/validate/batch/history',
          method: 'GET',
          params: { limit: 50, status: 'all' },
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            'X-API-Key': 'sk_test_key',
          }),
          timeout: 15000,
        })
      );
    });

    it('should handle empty batches array', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: { batches: [] } })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result).toEqual([]);
    });

    it('should handle null json response', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: null })
      );

      const result = await batchListDropdown.operation.perform(z, bundle);

      expect(result).toEqual([]);
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = batchListDropdown.operation.sample;

      expect(sample).toHaveProperty('id');
      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('name');
      expect(sample.id).toBe(sample.job_id);
    });
  });

  describe('outputFields', () => {
    it('should have all required output fields', () => {
      const outputFields = batchListDropdown.operation.outputFields;
      const keys = outputFields.map(f => f.key);

      expect(keys).toContain('id');
      expect(keys).toContain('job_id');
      expect(keys).toContain('name');
    });

    it('should have labels and types for all fields', () => {
      batchListDropdown.operation.outputFields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
      });
    });
  });
});

/**
 * @module BatchWebhookTriggerTests
 * @description Comprehensive tests for batch webhook trigger
 */

const batchWebhookTrigger = require('../../triggers/batch_webhook');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Batch Webhook Trigger', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(batchWebhookTrigger.key).toBe('batch_complete_webhook');
      expect(batchWebhookTrigger.noun).toBe('Batch Completado');
      expect(batchWebhookTrigger.display.label).toContain('Batch Validation Complete');
      expect(batchWebhookTrigger.display.description).toBeDefined();
    });

    it('should be a hook type trigger', () => {
      expect(batchWebhookTrigger.operation.type).toBe('hook');
    });
  });

  describe('inputFields', () => {
    it('should have correct input field structure', () => {
      const inputFields = batchWebhookTrigger.operation.inputFields;
      expect(inputFields).toBeInstanceOf(Array);
      expect(inputFields.length).toBe(3);
    });

    it('should have filter_status field with correct choices', () => {
      const filterField = batchWebhookTrigger.operation.inputFields.find(
        f => f.key === 'filter_status'
      );
      expect(filterField).toBeDefined();
      expect(filterField.type).toBe('string');
      expect(filterField.required).toBe(false);
      expect(filterField.choices).toHaveProperty('all');
      expect(filterField.choices).toHaveProperty('completed');
      expect(filterField.choices).toHaveProperty('partial');
      expect(filterField.choices).toHaveProperty('failed');
      expect(filterField.default).toBe('all');
    });

    it('should have min_emails field', () => {
      const minEmailsField = batchWebhookTrigger.operation.inputFields.find(
        f => f.key === 'min_emails'
      );
      expect(minEmailsField).toBeDefined();
      expect(minEmailsField.type).toBe('integer');
      expect(minEmailsField.default).toBe('1');
    });

    it('should have include_results_summary field', () => {
      const summaryField = batchWebhookTrigger.operation.inputFields.find(
        f => f.key === 'include_results_summary'
      );
      expect(summaryField).toBeDefined();
      expect(summaryField.type).toBe('boolean');
      expect(summaryField.default).toBe('true');
    });
  });

  describe('performSubscribe', () => {
    it('should subscribe webhook successfully with API Key', async () => {
      bundle.targetUrl = 'https://hooks.zapier.com/test/123';
      bundle.inputData = {
        filter_status: 'completed',
        min_emails: 10,
        include_results_summary: true,
      };
      bundle.authData = { apiKey: 'sk_test_key' };
      bundle.meta = { zap: { id: 'zap_123' } };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { id: 'webhook_123', target_url: bundle.targetUrl },
        })
      );

      const result = await batchWebhookTrigger.operation.performSubscribe(z, bundle);

      expect(result).toHaveProperty('id', 'webhook_123');
      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/webhooks',
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'sk_test_key',
          }),
        })
      );
    });

    it('should subscribe webhook successfully with JWT', async () => {
      bundle.targetUrl = 'https://hooks.zapier.com/test/123';
      bundle.inputData = {};
      bundle.authData = { jwt: 'valid.jwt.token' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { id: 'webhook_456' },
        })
      );

      const result = await batchWebhookTrigger.operation.performSubscribe(z, bundle);

      expect(result).toHaveProperty('id', 'webhook_456');
      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid.jwt.token',
          }),
        })
      );
    });

    it('should use default values when inputData is empty', async () => {
      bundle.targetUrl = 'https://hooks.zapier.com/test/123';
      bundle.inputData = {};
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { id: 'webhook_789' },
        })
      );

      await batchWebhookTrigger.operation.performSubscribe(z, bundle);

      const requestBody = z.request.mock.calls[0][0].body;
      expect(requestBody.filters.status).toBe('all');
      expect(requestBody.filters.min_emails).toBe(1);
      expect(requestBody.options.include_results_summary).toBe(true);
    });

    it('should throw error on subscribe failure', async () => {
      bundle.targetUrl = 'https://hooks.zapier.com/test/123';
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 400,
          json: { detail: 'Invalid webhook configuration' },
        })
      );

      await expect(
        batchWebhookTrigger.operation.performSubscribe(z, bundle)
      ).rejects.toThrow('Invalid webhook configuration');
    });

    it('should handle missing zap id in meta', async () => {
      bundle.targetUrl = 'https://hooks.zapier.com/test/123';
      bundle.inputData = {};
      bundle.authData = { apiKey: 'sk_test_key' };
      bundle.meta = {};

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { id: 'webhook_abc' },
        })
      );

      await batchWebhookTrigger.operation.performSubscribe(z, bundle);

      const requestBody = z.request.mock.calls[0][0].body;
      expect(requestBody.metadata.zap_id).toBe('unknown');
    });
  });

  describe('performUnsubscribe', () => {
    it('should unsubscribe webhook successfully', async () => {
      bundle.subscribeData = { id: 'webhook_123' };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: { success: true } })
      );

      const result = await batchWebhookTrigger.operation.performUnsubscribe(z, bundle);

      expect(result).toEqual({ success: true, webhook_id: 'webhook_123' });
      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/webhooks/webhook_123',
          method: 'DELETE',
        })
      );
    });

    it('should handle webhook_id in subscribeData', async () => {
      bundle.subscribeData = { webhook_id: 'webhook_456' };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: { success: true } })
      );

      const result = await batchWebhookTrigger.operation.performUnsubscribe(z, bundle);

      expect(result.webhook_id).toBe('webhook_456');
    });

    it('should handle missing webhook ID gracefully', async () => {
      bundle.subscribeData = {};
      bundle.authData = { apiKey: 'sk_test_key' };

      const result = await batchWebhookTrigger.operation.performUnsubscribe(z, bundle);

      expect(result).toEqual({ success: true, message: 'No webhook to unsubscribe' });
      expect(z.console.warn).toHaveBeenCalledWith('No webhook ID found for unsubscribe');
    });

    it('should handle 404 error gracefully', async () => {
      bundle.subscribeData = { id: 'webhook_nonexistent' };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 404, json: { detail: 'Not found' } })
      );

      const result = await batchWebhookTrigger.operation.performUnsubscribe(z, bundle);

      expect(result.success).toBe(true);
    });

    it('should log error on non-404 failure', async () => {
      bundle.subscribeData = { id: 'webhook_123' };
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 500, json: { detail: 'Server error' } })
      );

      await batchWebhookTrigger.operation.performUnsubscribe(z, bundle);

      expect(z.console.error).toHaveBeenCalled();
    });
  });

  describe('perform', () => {
    it('should process valid webhook payload', async () => {
      bundle.cleanedRequest = {
        job_id: 'batch_123',
        status: 'completed',
        batch_name: 'Test Batch',
        total_emails: 100,
        results_summary: {
          total: 100,
          valid: 85,
          invalid: 10,
          risky: 5,
        },
      };

      const result = await batchWebhookTrigger.operation.perform(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('job_id', 'batch_123');
      expect(result[0]).toHaveProperty('received_at');
      expect(result[0]).toHaveProperty('webhook_source', 'mailsafepro');
      expect(result[0]).toHaveProperty('success_rate', '85.00');
      expect(result[0]).toHaveProperty('risk_rate', '5.00');
      expect(result[0]).toHaveProperty('invalid_rate', '10.00');
      expect(result[0]).toHaveProperty('action_urls');
    });

    it('should return empty array for invalid payload', async () => {
      bundle.cleanedRequest = null;

      const result = await batchWebhookTrigger.operation.perform(z, bundle);

      expect(result).toEqual([]);
      expect(z.console.warn).toHaveBeenCalled();
    });

    it('should return empty array for payload without job_id', async () => {
      bundle.cleanedRequest = { status: 'completed' };

      const result = await batchWebhookTrigger.operation.perform(z, bundle);

      expect(result).toEqual([]);
    });

    it('should handle payload without results_summary', async () => {
      bundle.cleanedRequest = {
        job_id: 'batch_456',
        status: 'completed',
      };

      const result = await batchWebhookTrigger.operation.perform(z, bundle);

      expect(result[0]).toHaveProperty('job_id', 'batch_456');
      expect(result[0]).not.toHaveProperty('success_rate');
    });

    it('should handle zero total in results_summary', async () => {
      bundle.cleanedRequest = {
        job_id: 'batch_789',
        results_summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          risky: 0,
        },
      };

      const result = await batchWebhookTrigger.operation.perform(z, bundle);

      expect(result[0].success_rate).toBe(0);
      expect(result[0].risk_rate).toBe(0);
      expect(result[0].invalid_rate).toBe(0);
    });
  });

  describe('performList', () => {
    it('should fetch recent batches successfully', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: {
            batches: [
              {
                job_id: 'batch_1',
                batch_name: 'Batch 1',
                completed_at: '2024-01-15T10:00:00Z',
                results_summary: { total: 100, valid: 90 },
              },
              {
                job_id: 'batch_2',
                batch_name: 'Batch 2',
                completed_at: '2024-01-14T10:00:00Z',
                results_summary: { total: 50, valid: 40 },
              },
            ],
          },
        })
      );

      const result = await batchWebhookTrigger.operation.performList(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/jobs',
          method: 'GET'
        })
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('job_id', 'batch_1');
      expect(result[0]).toHaveProperty('success_rate', '90.00');
      expect(result[0]).toHaveProperty('action_urls');
    });

    it('should return sample data on API error', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({ status: 500, json: { detail: 'Server error' } })
      );

      const result = await batchWebhookTrigger.operation.performList(z, bundle);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].job_id).toBe('batch_sample_123456');
    });

    it('should handle response without batches wrapper', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: [
            { job_id: 'batch_direct', results_summary: { total: 10, valid: 8 } },
          ],
        })
      );

      const result = await batchWebhookTrigger.operation.performList(z, bundle);

      expect(result[0].job_id).toBe('batch_direct');
    });

    it('should handle batch without results_summary', async () => {
      bundle.authData = { apiKey: 'sk_test_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 200,
          json: { batches: [{ job_id: 'batch_no_summary' }] },
        })
      );

      const result = await batchWebhookTrigger.operation.performList(z, bundle);

      expect(result[0].success_rate).toBe('0');
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = batchWebhookTrigger.operation.sample;

      expect(sample).toHaveProperty('job_id');
      expect(sample).toHaveProperty('status', 'completed');
      expect(sample).toHaveProperty('batch_name');
      expect(sample).toHaveProperty('total_emails');
      expect(sample).toHaveProperty('results_summary');
      expect(sample).toHaveProperty('success_rate');
      expect(sample).toHaveProperty('action_urls');
    });
  });

  describe('outputFields', () => {
    it('should have all required output fields', () => {
      const outputFields = batchWebhookTrigger.operation.outputFields;
      const keys = outputFields.map(f => f.key);

      expect(keys).toContain('job_id');
      expect(keys).toContain('status');
      expect(keys).toContain('batch_name');
      expect(keys).toContain('total_emails');
      expect(keys).toContain('success_rate');
      expect(keys).toContain('received_at');
    });

    it('should have labels for all fields', () => {
      batchWebhookTrigger.operation.outputFields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
      });
    });
  });
});

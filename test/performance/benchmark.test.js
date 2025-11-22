/**
 * @module PerformanceBenchmarks
 * @description Performance benchmark tests for MailSafePro Zapier Integration
 */

const authentication = require('../../authentication');
const validateEmailTrigger = require('../../triggers/validate_email');
const batchValidateCreate = require('../../creates/batch_validate');
const getUsageSearch = require('../../searches/get_usage');
const { createMockBundle, createMockResponse } = require('../mocks/zapier-mocks');
const {
  mockEmailValidationResponse,
  mockBatchCreateResponse,
  mockUsageResponse,
  mockAuthResponse,
} = require('../mocks/api-responses');

describe('Performance Benchmarks', () => {
  let z;
  let bundle;
  const PERFORMANCE_THRESHOLDS = {
    auth: 500, // ms
    singleValidation: 2000, // ms
    batchSubmit: 500, // ms
    usageQuery: 500, // ms
  };

  beforeEach(() => {
    z = {
      request: jest.fn(),
      console: {
        log: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      },
      errors: {
        Error: jest.fn(msg => new Error(msg)),
        RefreshAuthError: jest.fn(msg => {
          const err = new Error(msg);
          err.name = 'RefreshAuthError';
          return err;
        }),
      },
    };
    bundle = createMockBundle();
  });

  describe('Authentication Performance', () => {
    it('should authenticate with API Key in < 500ms', async () => {
      bundle.inputData = { apiKey: 'sk_test_valid_api_key_1234567890123456' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: { valid: true } }));

      const start = Date.now();
      await authentication.getSessionKey(z, bundle);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth);
      console.log(`✓ API Key auth: ${duration}ms`);
    });

    it('should authenticate with JWT in < 500ms', async () => {
      bundle.inputData = { email: 'test@example.com', password: 'validpassword123' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: mockAuthResponse }));

      const start = Date.now();
      await authentication.getSessionKey(z, bundle);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth);
      console.log(`✓ JWT auth: ${duration}ms`);
    });
  });

  describe('Single Email Validation Performance', () => {
    it('should validate email in < 2000ms', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = { email: 'test@example.com', validation_timeout: 30 };
      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: mockEmailValidationResponse })
      );

      const start = Date.now();
      await validateEmailTrigger.operation.perform(z, bundle);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleValidation);
      console.log(`✓ Single validation: ${duration}ms`);
    });

    it('should maintain p95 latency < 1500ms over 100 requests', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = { email: 'test@example.com' };
      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: mockEmailValidationResponse })
      );

      const latencies = [];
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await validateEmailTrigger.operation.perform(z, bundle);
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      expect(p95).toBeLessThan(1500);
      console.log(`Latency stats - p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms`);
    });
  });

  describe('Batch Validation Performance', () => {
    it('should submit batch in < 500ms', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'test1@example.com, test2@example.com',
      };
      z.request.mockResolvedValue(
        createMockResponse({ status: 202, json: mockBatchCreateResponse })
      );

      const start = Date.now();
      await batchValidateCreate.operation.perform(z, bundle);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchSubmit);
      console.log(`✓ Batch submit: ${duration}ms`);
    });
  });

  describe('Usage Query Performance', () => {
    it('should fetch usage data in < 500ms', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = {
        time_range: 'today',
        include_projections: true,
        include_recommendations: true,
      };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: mockUsageResponse }));

      const start = Date.now();
      await getUsageSearch.operation.perform(z, bundle);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.usageQuery);
      console.log(`✓ Usage query: ${duration}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = { email: 'test@example.com' };
      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: mockEmailValidationResponse })
      );

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        await validateEmailTrigger.operation.perform(z, bundle);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercentage = (memoryIncrease / initialMemory) * 100;

      // Memory increase should be < 50% for 1000 operations
      expect(increasePercentage).toBeLessThan(50);
      console.log(`Memory increase: ${increasePercentage.toFixed(2)}%`);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests efficiently', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };
      bundle.inputData = { email: 'test@example.com' };
      z.request.mockResolvedValue(
        createMockResponse({ status: 200, json: mockEmailValidationResponse })
      );

      const start = Date.now();
      const promises = Array(10)
        .fill(null)
        .map(() => validateEmailTrigger.operation.perform(z, bundle));

      await Promise.all(promises);
      const duration = Date.now() - start;

      // 10 concurrent requests should complete in < 3000ms
      expect(duration).toBeLessThan(3000);
      console.log(`✓ 10 concurrent requests: ${duration}ms`);
    });
  });
});

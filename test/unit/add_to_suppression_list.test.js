/**
 * @module AddToSuppressionListCreateTests
 * @description Comprehensive tests for add to suppression list action
 */

const addToSuppressionListCreate = require('../../creates/add_to_suppression_list');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Add To Suppression List Create', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(addToSuppressionListCreate.key).toBe('add_to_suppression_list');
      expect(addToSuppressionListCreate.noun).toBe('Suppressed Email');
      expect(addToSuppressionListCreate.display.label).toBe('Add to Suppression List');
    });
  });

  describe('inputFields', () => {
    it('should have email as required field', () => {
      const emailField = addToSuppressionListCreate.operation.inputFields.find(f => f.key === 'email');
      expect(emailField).toBeDefined();
      expect(emailField.required).toBe(true);
    });

    it('should have list_id field with dynamic dropdown', () => {
      const listIdField = addToSuppressionListCreate.operation.inputFields.find(f => f.key === 'list_id');
      expect(listIdField).toBeDefined();
      expect(listIdField.dynamic).toBe('suppression_list_dropdown.id.name');
      expect(listIdField.default).toBe('default');
    });
  });

  describe('perform', () => {
    it('should add email to suppression list successfully', async () => {
      bundle.inputData = { email: 'blocked@example.com', list_id: 'marketing', reason: 'spam_trap', permanent: true };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({
        status: 201,
        json: { id: 'supp_123', email: 'blocked@example.com', list_id: 'marketing' }
      }));
      const result = await addToSuppressionListCreate.operation.perform(z, bundle);
      expect(result).toHaveProperty('id', 'supp_123');
      expect(result).toHaveProperty('suppressed_at');
      expect(result).toHaveProperty('is_permanent', true);
    });

    it('should throw error when email is missing', async () => {
      bundle.inputData = { email: '' };
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email is required');
    });

    it('should throw error for invalid email format', async () => {
      bundle.inputData = { email: 'invalid-email' };
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid email format');
    });

    it('should handle 400 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 400, json: { detail: 'Invalid request' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid request parameters');
    });

    it('should handle 401 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'invalid_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 401, json: { detail: 'Unauthorized' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Authentication failed');
    });

    it('should handle 403 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 403, json: { detail: 'Forbidden' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 409 error (already suppressed)', async () => {
      bundle.inputData = { email: 'already@suppressed.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 409, json: { detail: 'Already exists' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email already in suppression list');
    });

    it('should handle 429 rate limit error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 429, json: { detail: 'Rate limited' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 500 server error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 500, json: { detail: 'Internal error' } }));
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Server error');
    });

    it('should handle ETIMEDOUT error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Connection timeout');
    });

    it('should handle ECONNREFUSED error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(connError);
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Cannot connect to service');
    });

    it('should handle generic network error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const genericError = new Error('Unknown network issue');
      z.request.mockRejectedValue(genericError);
      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Network error');
    });

    it('should use default values when not provided', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: { id: 'supp_789' } }));
      await addToSuppressionListCreate.operation.perform(z, bundle);
      const requestBody = z.request.mock.calls[0][0].body;
      expect(requestBody.list_id).toBe('default');
      expect(requestBody.reason).toBe('other');
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = addToSuppressionListCreate.operation.sample;
      expect(sample).toHaveProperty('id');
      expect(sample).toHaveProperty('email');
      expect(sample).toHaveProperty('list_id');
      expect(sample).toHaveProperty('suppressed_at');
    });
  });
});

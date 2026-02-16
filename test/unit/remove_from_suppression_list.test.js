/**
 * @module RemoveFromSuppressionListCreateTests
 * @description Comprehensive tests for remove from suppression list action
 */

const removeFromSuppressionListCreate = require('../../creates/remove_from_suppression_list');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');

describe('Remove From Suppression List Create', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = { ...mockZapier };
    bundle = createMockBundle();
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('should have correct display properties', () => {
      expect(removeFromSuppressionListCreate.key).toBe('remove_from_suppression_list');
      expect(removeFromSuppressionListCreate.noun).toBe('Removed Email');
      expect(removeFromSuppressionListCreate.display.label).toBe('Remove From Suppression List');
    });
  });

  describe('inputFields', () => {
    it('should have email as required field', () => {
      const emailField = removeFromSuppressionListCreate.operation.inputFields.find(f => f.key === 'email');
      expect(emailField).toBeDefined();
      expect(emailField.required).toBe(true);
    });

    it('should have list_id field with dynamic dropdown', () => {
      const listIdField = removeFromSuppressionListCreate.operation.inputFields.find(f => f.key === 'list_id');
      expect(listIdField).toBeDefined();
      expect(listIdField.dynamic).toBe('suppression_list_dropdown.id.name');
      expect(listIdField.default).toBe('default');
    });
  });

  describe('perform', () => {
    it('should remove email from suppression list successfully', async () => {
      bundle.inputData = { email: 'unblocked@example.com', list_id: 'marketing', reason: 'User reactivated' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: { success: true } }));
      const result = await removeFromSuppressionListCreate.operation.perform(z, bundle);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('email', 'unblocked@example.com');
      expect(result).toHaveProperty('removed_at');
    });

    it('should throw error when email is missing', async () => {
      bundle.inputData = { email: '' };
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email is required');
    });

    it('should throw error for invalid email format', async () => {
      bundle.inputData = { email: 'invalid-email' };
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid email format');
    });

    it('should handle 400 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 400, json: { detail: 'Invalid request' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid request parameters');
    });

    it('should handle 401 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'invalid_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 401, json: { detail: 'Unauthorized' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Authentication failed');
    });

    it('should handle 403 error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 403, json: { detail: 'Forbidden' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 404 error (not found)', async () => {
      bundle.inputData = { email: 'notfound@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 404, json: { detail: 'Not found' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email not found in suppression list');
    });

    it('should handle 429 rate limit error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 429, json: { detail: 'Rate limited' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 500 server error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 500, json: { detail: 'Internal error' } }));
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Server error');
    });

    it('should handle ETIMEDOUT error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      z.request.mockRejectedValue(timeoutError);
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Connection timeout');
    });

    it('should handle ECONNREFUSED error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      z.request.mockRejectedValue(connError);
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Cannot connect to service');
    });

    it('should handle generic network error', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      const genericError = new Error('Unknown network issue');
      z.request.mockRejectedValue(genericError);
      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Network error');
    });

    it('should use default list_id when not provided', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { apiKey: 'sk_test_key' };
      z.request.mockResolvedValue(createMockResponse({ status: 200, json: {} }));
      const result = await removeFromSuppressionListCreate.operation.perform(z, bundle);
      expect(result.list_id).toBe('default');
    });

    it('should use JWT auth when provided', async () => {
      bundle.inputData = { email: 'test@example.com' };
      bundle.authData = { jwt: 'valid.jwt.token' };
      z.request.mockResolvedValue(createMockResponse({ status: 204, json: {} }));
      const result = await removeFromSuppressionListCreate.operation.perform(z, bundle);
      expect(result.success).toBe(true);
      expect(z.request).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid.jwt.token' })
      }));
    });
  });

  describe('sample', () => {
    it('should have valid sample data', () => {
      const sample = removeFromSuppressionListCreate.operation.sample;
      expect(sample).toHaveProperty('success', true);
      expect(sample).toHaveProperty('email');
      expect(sample).toHaveProperty('list_id');
      expect(sample).toHaveProperty('removed_at');
    });
  });
});

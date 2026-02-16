/**
 * Unit tests for suppression list actions
 */

const addToSuppressionListCreate = require('../../creates/add_to_suppression_list');
const removeFromSuppressionListCreate = require('../../creates/remove_from_suppression_list');
const { createMockBundle } = require('../mocks/zapier-mocks');

describe('Suppression List Actions', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = {
      request: jest.fn(),
      errors: {
        Error: jest.fn((msg, code, status) => {
          const error = new Error(msg);
          error.code = code;
          error.status = status;
          return error;
        }),
        RateLimitError: jest.fn(msg => {
          const error = new Error(msg);
          error.name = 'RateLimitError';
          return error;
        }),
      },
    };
    bundle = createMockBundle();
  });

  describe('Add to Suppression List', () => {
    it('should add email to suppression list successfully', async () => {
      bundle.inputData = {
        email: 'blocked@example.com',
        list_id: 'default',
        reason: 'spam_trap',
        notes: 'Honeypot detected',
        permanent: false,
      };

      const mockResponse = {
        status: 201,
        json: {
          id: 'supp_123',
          email: 'blocked@example.com',
          list_id: 'default',
          reason: 'spam_trap',
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await addToSuppressionListCreate.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith({
        url: 'https://api.mailsafepro.es/suppression/add',
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: {
          email: 'blocked@example.com',
          list_id: 'default',
          reason: 'spam_trap',
          notes: 'Honeypot detected',
          permanent: false,
        },
        timeout: 10000,
      });

      expect(result.id).toBe('supp_123');
      expect(result.suppressed_at).toBeDefined();
      expect(result.is_permanent).toBe(false);
    });

    it('should validate email format', async () => {
      bundle.inputData = {
        email: 'invalid-email',
      };

      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid email format');
    });

    it('should require email', async () => {
      bundle.inputData = {};

      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email is required');
    });

    it('should handle already suppressed error (409)', async () => {
      bundle.inputData = {
        email: 'already@example.com',
      };

      const mockResponse = {
        status: 409,
        json: { error: 'Email already suppressed' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email already in suppression list');
    });

    it('should handle rate limit', async () => {
      bundle.inputData = {
        email: 'test@example.com',
      };

      const mockResponse = {
        status: 429,
        json: { error: 'Rate limit exceeded' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      await expect(addToSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Remove from Suppression List', () => {
    it('should remove email from suppression list successfully', async () => {
      bundle.inputData = {
        email: 'previously-blocked@example.com',
        list_id: 'default',
        reason: 'User reactivated account',
      };

      const mockResponse = {
        status: 200,
        json: {
          success: true,
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await removeFromSuppressionListCreate.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith({
        url: 'https://api.mailsafepro.es/suppression/remove',
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: {
          email: 'previously-blocked@example.com',
          list_id: 'default',
          reason: 'User reactivated account',
        },
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.email).toBe('previously-blocked@example.com');
      expect(result.removed_at).toBeDefined();
    });

    it('should validate email format', async () => {
      bundle.inputData = {
        email: 'invalid-email',
      };

      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Invalid email format');
    });

    it('should require email', async () => {
      bundle.inputData = {};

      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email is required');
    });

    it('should handle not found error (404)', async () => {
      bundle.inputData = {
        email: 'not-found@example.com',
      };

      const mockResponse = {
        status: 404,
        json: { error: 'Email not found' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Email not found in suppression list');
    });

    it('should handle rate limit', async () => {
      bundle.inputData = {
        email: 'test@example.com',
      };

      const mockResponse = {
        status: 429,
        json: { error: 'Rate limit exceeded' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      await expect(removeFromSuppressionListCreate.operation.perform(z, bundle)).rejects.toThrow('Rate limit exceeded');
    });
  });
});

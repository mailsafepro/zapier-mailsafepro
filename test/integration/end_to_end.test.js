// Mock global de jwt-decode para E2E
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

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
const { jwtDecode } = require('jwt-decode');

describe('End-to-End Integration Tests', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = {
      request: jest.fn(),
      console: {
        log: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      },
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
        RefreshAuthError: jest.fn(msg => {
          const error = new Error(msg);
          error.name = 'RefreshAuthError';
          return error;
        }),
      },
    };
    bundle = createMockBundle();
    // Clear only z.request mock, not jwt-decode
    z.request.mockClear();

    // Setup jwtDecode mock
    jwtDecode.mockImplementation(_token => ({
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora en el futuro
      sub: 'user_123',
      email: 'user@example.com',
    }));
  });

  describe('Complete User Flow', () => {
    it('should handle complete authentication → validation → batch → usage flow', async () => {
      // 1. Authentication with API Key
      bundle.inputData = { apiKey: 'sk_test_valid_api_key_1234567890123456' };
      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: { valid: true },
        })
      );

      const authResult = await authentication.getSessionKey(z, bundle);
      expect(authResult.authMethod).toBe('api_key');

      // 2. Single email validation
      bundle.authData = { apiKey: 'sk_test_valid_api_key_1234567890123456' };
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      const validationResult = await validateEmailTrigger.operation.perform(z, bundle);
      expect(validationResult[0].valid).toBe(true);

      // 3. Batch validation
      bundle.inputData = {
        input_method: 'text_list',
        emails: 'batch1@example.com, batch2@example.com',
        validation_timeout: 30,
      };
      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 202,
          json: mockBatchCreateResponse,
        })
      );

      const [batchResult] = await batchValidateCreate.operation.perform(z, bundle);
      expect(batchResult.job_id).toBe('batch_test_123456');

      // 4. Usage metrics
      bundle.inputData = {
        time_range: 'today',
        include_projections: true,
        include_recommendations: true,
      };
      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockUsageResponse,
        })
      );

      const usageResult = await getUsageSearch.operation.perform(z, bundle);
      expect(usageResult[0].plan).toBe('PREMIUM');

      expect(z.request).toHaveBeenCalledTimes(4);
    });

    it('should handle JWT authentication flow with token refresh', async () => {
      // Setup JWT authentication
      bundle.inputData = {
        email: 'user@example.com',
        password: 'validpassword123',
      };

      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockAuthResponse,
        })
      );

      const authResult = await authentication.getSessionKey(z, bundle);
      expect(authResult.authMethod).toBe('jwt');

      // Test token refresh
      bundle.authData = {
        jwt: 'old.jwt.token',
        refreshToken: 'valid.refresh.token',
        email: 'user@example.com',
      };

      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockAuthResponse,
        })
      );

      const refreshResult = await authentication.refreshAccessToken(z, bundle);

      expect(refreshResult.jwt).toBe(mockAuthResponse.access_token);
      expect(refreshResult.refreshToken).toBe(mockAuthResponse.refresh_token);
      expect(refreshResult.authMethod).toBe('jwt');
    });

    it('should handle error recovery flow', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };

      // Simulate server error
      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 503,
          json: {
            detail: 'Service temporarily unavailable',
          },
        })
      );

      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        /Servicio temporalmente no disponible/
      );
    });

    it('should handle complete JWT authentication flow with email validation', async () => {
      // 1. JWT Authentication
      bundle.inputData = {
        email: 'test@example.com',
        password: 'validpassword123',
      };

      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockAuthResponse,
        })
      );

      const authResult = await authentication.getSessionKey(z, bundle);
      expect(authResult.authMethod).toBe('jwt');

      // 2. Use JWT for email validation
      bundle.authData = {
        jwt: mockAuthResponse.access_token,
        email: 'test@example.com',
      };
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      z.request.mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          json: mockEmailValidationResponse,
        })
      );

      const validationResult = await validateEmailTrigger.operation.perform(z, bundle);
      expect(validationResult[0].valid).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle rate limiting across multiple operations', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 429,
          json: {
            detail: 'Rate limit exceeded',
          },
        })
      );

      // Test rate limiting on email validation
      bundle.inputData = {
        email: 'test@example.com',
        validation_timeout: 30,
      };

      await expect(validateEmailTrigger.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de tasa excedido'
      );

      // Test rate limiting on usage query
      bundle.inputData = {
        time_range: 'today',
        include_projections: true,
        include_recommendations: true,
      };

      await expect(getUsageSearch.operation.perform(z, bundle)).rejects.toThrow(
        'Límite de consultas excedido'
      );
    });

    it('should handle authentication expiration flow', async () => {
      bundle.authData = {
        jwt: 'expired.jwt.token',
        refreshToken: 'invalid.refresh.token',
        email: 'user@example.com',
      };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 401,
          json: { detail: 'Refresh token expirado o inválido' },
        })
      );

      await expect(authentication.refreshAccessToken(z, bundle)).rejects.toThrow(
        'Refresh token expirado o inválido'
      );
    });

    it('should handle invalid API key scenario', async () => {
      bundle.inputData = { apiKey: 'sk_test_invalid_key_1234567890123456' }; // 32 chars but invalid

      z.request.mockResolvedValue(
        createMockResponse({
          status: 401,
          json: { detail: 'Invalid API key' },
        })
      );

      await expect(authentication.getSessionKey(z, bundle)).rejects.toThrow(
        'API Key inválida o revocada'
      );
    });

    it('should handle batch validation errors gracefully', async () => {
      bundle.authData = { apiKey: 'sk_test_valid_key' };

      z.request.mockResolvedValue(
        createMockResponse({
          status: 400,
          json: { detail: 'Invalid request format' },
        })
      );

      bundle.inputData = {
        input_method: 'text_list',
        emails: 'valid@example.com', // At least one valid email
        validation_timeout: 30,
      };

      await expect(batchValidateCreate.operation.perform(z, bundle)).rejects.toThrow(
        'Solicitud mal formada'
      );
    });
  });

  describe('Data Validation Scenarios', () => {
    it('should validate all single-email formats correctly', async () => {
      const testEmails = [
        'valid@example.com',
        'user.name@sub.domain.co.uk',
        'test+tag@example.com',
      ];

      bundle.authData = { apiKey: 'sk_test_valid_key' };

      for (const email of testEmails) {
        z.request.mockResolvedValueOnce(
          createMockResponse({
            status: 200,
            json: { ...mockEmailValidationResponse, email },
          })
        );

        bundle.inputData = {
          email,
          validation_timeout: 30,
        };
        const result = await validateEmailTrigger.operation.perform(z, bundle);
        expect(result[0].email).toBe(email);
      }
    });

    it('should validate all batch input formats correctly', async () => {
      const batchFormats = [
        'email1@test.com, email2@test.com',
        'email1@test.com;email2@test.com',
        'email1@test.com\nemail2@test.com',
      ];

      bundle.authData = { apiKey: 'sk_test_valid_key' };

      for (const format of batchFormats) {
        z.request.mockResolvedValueOnce(
          createMockResponse({
            status: 202,
            json: mockBatchCreateResponse,
          })
        );

        bundle.inputData = { input_method: 'text_list', emails: format };
        const [result] = await batchValidateCreate.operation.perform(z, bundle);

        expect(result.job_id).toBe('batch_test_123456');
      }
    });
  });
});

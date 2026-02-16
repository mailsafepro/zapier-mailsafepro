/**
 * Unit tests for find_email search
 */

const findEmailSearch = require('../../searches/find_email');
const { createMockBundle } = require('../mocks/zapier-mocks');

describe('Find Email Search', () => {
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

  it('should find email validation successfully', async () => {
    bundle.inputData = {
      email: 'found@example.com',
      check_cache_only: true,
    };

    const mockResponse = {
      status: 200,
      json: {
        email: 'found@example.com',
        valid: true,
        status: 'deliverable',
        risk_score: 0.05,
        quality_score: 0.98,
        validated_at: '2024-01-15T10:00:00.000Z',
        cache_used: true,
        provider_analysis: {
          provider: 'gmail',
          reputation: 0.95,
        },
      },
    };

    z.request.mockResolvedValueOnce(mockResponse);

    const result = await findEmailSearch.operation.perform(z, bundle);

    expect(z.request).toHaveBeenCalledWith({
      url: 'https://api.mailsafepro.es/validate/email',
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: {
        email: 'found@example.com',
        check_cache: true,
      },
      timeout: 30000,
    });

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('found@example.com');
    expect(result[0].valid).toBe(true);
    expect(result[0].risk_level).toBe('low');
    expect(result[0].quality_tier).toBe('excellent');
    expect(result[0].is_high_risk).toBe(false);
    expect(result[0].is_premium_provider).toBe(true);
    expect(result[0].found_in_cache).toBe(true);
    expect(result[0].searched_at).toBeDefined();
  });

  it('should return empty array when email not found (404)', async () => {
    bundle.inputData = {
      email: 'notfound@example.com',
    };

    const mockResponse = {
      status: 404,
      json: { error: 'Not found in cache' },
    };

    z.request.mockResolvedValueOnce(mockResponse);

    const result = await findEmailSearch.operation.perform(z, bundle);

    expect(result).toEqual([]);
  });

  it('should validate email format', async () => {
    bundle.inputData = {
      email: 'invalid-email-format',
    };

    await expect(findEmailSearch.operation.perform(z, bundle)).rejects.toThrow('Invalid email format');
  });

  it('should require email', async () => {
    bundle.inputData = {};

    await expect(findEmailSearch.operation.perform(z, bundle)).rejects.toThrow('Email is required');
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

    await expect(findEmailSearch.operation.perform(z, bundle)).rejects.toThrow('Rate limit exceeded');
  });

  it('should calculate risk levels correctly', async () => {
    bundle.inputData = {
      email: 'test@example.com',
    };

    const testCases = [
      { risk_score: 0.1, expected_level: 'low' },
      { risk_score: 0.5, expected_level: 'medium' },
      { risk_score: 0.8, expected_level: 'high' },
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        status: 200,
        json: {
          email: 'test@example.com',
          valid: true,
          risk_score: testCase.risk_score,
          quality_score: 0.9,
          validated_at: '2024-01-15T10:00:00.000Z',
          cache_used: true,
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await findEmailSearch.operation.perform(z, bundle);
      expect(result[0].risk_level).toBe(testCase.expected_level);
    }
  });

  it('should calculate quality tiers correctly', async () => {
    bundle.inputData = {
      email: 'test@example.com',
    };

    const testCases = [
      { quality_score: 0.9, expected_tier: 'excellent' },
      { quality_score: 0.7, expected_tier: 'good' },
      { quality_score: 0.5, expected_tier: 'fair' },
      { quality_score: 0.3, expected_tier: 'poor' },
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        status: 200,
        json: {
          email: 'test@example.com',
          valid: true,
          risk_score: 0.1,
          quality_score: testCase.quality_score,
          validated_at: '2024-01-15T10:00:00.000Z',
          cache_used: true,
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await findEmailSearch.operation.perform(z, bundle);
      expect(result[0].quality_tier).toBe(testCase.expected_tier);
    }
  });

  it('should mark high risk emails correctly', async () => {
    bundle.inputData = {
      email: 'test@example.com',
    };

    const testCases = [
      { risk_score: 0.6, expected_high_risk: false },
      { risk_score: 0.7, expected_high_risk: true },
      { risk_score: 0.9, expected_high_risk: true },
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        status: 200,
        json: {
          email: 'test@example.com',
          valid: true,
          risk_score: testCase.risk_score,
          quality_score: 0.9,
          validated_at: '2024-01-15T10:00:00.000Z',
          cache_used: true,
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await findEmailSearch.operation.perform(z, bundle);
      expect(result[0].is_high_risk).toBe(testCase.expected_high_risk);
    }
  });

  it('should identify premium providers correctly', async () => {
    bundle.inputData = {
      email: 'test@example.com',
    };

    const testCases = [
      { reputation: 0.75, expected_premium: false },
      { reputation: 0.8, expected_premium: true },
      { reputation: 0.95, expected_premium: true },
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        status: 200,
        json: {
          email: 'test@example.com',
          valid: true,
          risk_score: 0.1,
          quality_score: 0.9,
          validated_at: '2024-01-15T10:00.000Z',
          cache_used: true,
          provider_analysis: {
            provider: 'test-provider',
            reputation: testCase.reputation,
          },
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await findEmailSearch.operation.perform(z, bundle);
      expect(result[0].is_premium_provider).toBe(testCase.expected_premium);
    }
  });
});

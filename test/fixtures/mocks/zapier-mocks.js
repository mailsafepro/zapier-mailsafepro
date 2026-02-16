const createMockBundle = () => ({
  authData: {
    apiKey: 'sk_test_key_123456789012345678901234567',
    jwt: 'valid.jwt.token_123',
    refreshToken: 'valid.refresh.token_456',
    email: 'test@example.com',
    expiresAt: Date.now() + 3600000,
    authMethod: 'api_key'
  },
  inputData: {},
  meta: {
    frontend: 'zapier',
    zapier: '17',
    bundle: {
      authData: {
        apiKey: 'sk_test_key_123456789012345678901234567'
      }
    }
  }
});

const createMockResponse = (data = {}) => ({
  status: 200,
  json: {
    ...data
  }
});

const mockZapier = {
  request: jest.fn().mockResolvedValue(createMockResponse()),
  requestAll: jest.fn().mockResolvedValue([createMockResponse()]),
  console: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  errors: {
    Error: jest.fn((message, key, status = null) => {
      const error = new Error(message);
      if (key) error.key = key;
      if (status) error.status = status;
      throw error;
    }),
    Error: jest.fn((message, key) => {
      const error = new Error(message);
      if (key) error.key = key;
      throw error;
    }),
    RefreshAuthError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'RefreshAuthError';
      throw error;
    }),
    ExpiredAuthError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'ExpiredAuthError';
      throw error;
    }),
    HaltedError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'HaltedError';
      throw error;
    }),
    throttled: jest.fn(message => {
      const error = new Error(message);
      error.name = 'throttled';
      throw error;
    }),
    RateLimitError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'RateLimitError';
      error.status = 429;
      throw error;
    })
  },
  bundle: {
    authData: createMockBundle().authData,
    inputData: createMockBundle().inputData,
    meta: createMockBundle().meta
  }
};

module.exports = {
  createMockBundle,
  createMockResponse,
  mockZapier
};

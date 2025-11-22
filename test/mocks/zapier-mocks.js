const createMockBundle = (overrides = {}) => ({
  authData: {
    apiKey: 'sk_test_mocked_api_key_123456789012',
    jwt: 'mocked.jwt.token.xyz',
    refreshToken: 'mocked.refresh.token.abc',
    email: 'test@mailsafepro.com',
    expiresAt: Date.now() + 3600000,
    authMethod: 'api_key',
  },
  inputData: {},
  meta: {
    requestId: 'test_req_123456',
    attemptNumber: 0,
  },
  ...overrides,
});

const createMockResponse = (overrides = {}) => ({
  status: 200,
  headers: {
    'content-type': 'application/json',
    'x-request-id': 'test_req_123456',
  },
  json: {},
  // Forma abreviada de método → evita error object-shorthand
  getContent() {
    return this.json;
  },
  ...overrides,
});

// === Clases de error de mock compatibles con `new z.errors.X(...)` ===

class MockZapierError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'Error';
  }
}

class MockRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

class MockRefreshAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RefreshAuthError';
  }
}

class MockThrottledError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ThrottledError';
  }
}

class MockExpiredAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExpiredAuthError';
  }
}

const mockZapier = {
  request: jest.fn(),
  console: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  errors: {
    // Se usan igual que en Zapier real: new z.errors.Error(...), etc.
    Error: MockZapierError,
    RateLimitError: MockRateLimitError,
    RefreshAuthError: MockRefreshAuthError,
    ThrottledError: MockThrottledError,
    ExpiredAuthError: MockExpiredAuthError,
  },
};

module.exports = {
  createMockBundle,
  createMockResponse,
  mockZapier,
};

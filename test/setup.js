// Global test setup
process.env.NODE_ENV = 'test';

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Zapier environment
global.z = {
  console: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  errors: {
    Error: jest.fn((message, code, status) => {
      const error = new Error(message);
      error.code = code;
      error.status = status;
      return error;
    }),
    RateLimitError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'RateLimitError';
      return error;
    }),
    RefreshAuthError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'RefreshAuthError';
      return error;
    }),
    ThrottledError: jest.fn(message => {
      const error = new Error(message);
      error.name = 'ThrottledError';
      return error;
    }),
  },
  request: jest.fn(),
};

// Mock JWT decode
jest.mock('jwt-decode', () =>
  jest.fn(() => ({
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora en el futuro
    sub: 'user_123',
    email: 'user@example.com',
  }))
);

// Mock crypto para evitar errores en Jest
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mocked_hash_value'),
    })),
  })),
  randomBytes: jest.fn(size => ({
    toString: jest.fn(() => '0'.repeat(size * 2)), // Mock para random hex
  })),
  getRandomValues: jest.fn(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
}));

// Mock zapier-platform-core para evitar errores de importación
jest.mock('zapier-platform-core', () => ({
  version: '18.0.1',
  createAppHandler: jest.fn(),
  methods: {
    createApp: jest.fn(),
  },
}));

// Mock para evitar problemas con timers en tests
jest.useFakeTimers();

// Mock para process.hrtime para evitar errores en algunos módulos
process.hrtime = jest.fn(() => [0, 0]);

// Mock para Buffer si es necesario
global.Buffer = require('buffer').Buffer;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test timeout
jest.setTimeout(30000);

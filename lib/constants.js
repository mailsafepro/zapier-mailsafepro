/**
 * @module Constants
 * @description Shared constants for MailSafePro Zapier Integration
 */

const CONFIG = {
  version: '2.0.0',
  apiVersion: 'v1',
  baseUrl: 'https://api.mailsafepro.es',

  timeouts: {
    auth: 12000,
    test: 10000,
    refresh: 8000,
    default: 30000,
  },

  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },

  rateLimit: {
    throttleDelay: 1000,
    maxThrottleAttempts: 5,
  },

  logging: {
    enabled: process.env.NODE_ENV !== 'test',
    includeHeaders: false,
    maxBodyLength: 500,
  },

  jwt: {
    refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes
  },

  apiKey: {
    minLength: 32,
    pattern: /^[a-zA-Z0-9_-]{32,}$/,
  },
};

const SENSITIVE_KEYS = [
  'password',
  'apikey',
  'api_key',
  'token',
  'authorization',
  'refresh_token',
  'secret',
  'key',
];

const ERROR_MESSAGES = {
  auth: {
    noMethod: 'Authentication method not provided. Use API Key OR Email+Password.',
    invalidApiKey: 'Invalid or revoked API Key',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Your session has expired. Please reconnect your account.',
    refreshFailed: "Your session expired and couldn't be refreshed. Please reconnect your account.",
  },
  validation: {
    invalidEmail: 'Invalid email format',
    invalidFormat: 'Invalid format',
    missingRequired: 'Missing required field',
  },
  server: {
    internalError: 'Internal server error',
    serviceUnavailable: 'Service temporarily unavailable',
    timeout: 'Request timed out',
  },
  rateLimit: {
    exceeded: 'Rate limit exceeded. Retrying in {{delay}} seconds...',
  },
};

const PLANS = {
  FREE: {
    dailyLimit: 100,
    batchSize: 10,
    smtpChecks: false,
  },
  PREMIUM: {
    dailyLimit: 10000,
    batchSize: 100,
    smtpChecks: true,
  },
  ENTERPRISE: {
    dailyLimit: 100000,
    batchSize: 1000,
    smtpChecks: true,
  },
};

module.exports = {
  CONFIG,
  SENSITIVE_KEYS,
  ERROR_MESSAGES,
  PLANS,
};

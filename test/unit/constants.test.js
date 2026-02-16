/**
 * @module ConstantsTest
 * @description Tests for shared constants module
 */

const { CONFIG, SENSITIVE_KEYS, ERROR_MESSAGES, PLANS } = require('../../lib/constants');

describe('Constants Module', () => {
  describe('CONFIG', () => {
    it('should have correct version', () => {
      expect(CONFIG.version).toBe('2.0.0');
    });

    it('should have correct API version', () => {
      expect(CONFIG.apiVersion).toBe('v1');
    });

    it('should have correct base URL', () => {
      expect(CONFIG.baseUrl).toBe('https://api.mailsafepro.es');
    });

    describe('timeouts', () => {
      it('should have auth timeout', () => {
        expect(CONFIG.timeouts.auth).toBe(12000);
      });

      it('should have test timeout', () => {
        expect(CONFIG.timeouts.test).toBe(10000);
      });

      it('should have refresh timeout', () => {
        expect(CONFIG.timeouts.refresh).toBe(8000);
      });

      it('should have default timeout', () => {
        expect(CONFIG.timeouts.default).toBe(30000);
      });
    });

    describe('retry', () => {
      it('should have max attempts', () => {
        expect(CONFIG.retry.maxAttempts).toBe(3);
      });

      it('should have base delay', () => {
        expect(CONFIG.retry.baseDelay).toBe(1000);
      });

      it('should have max delay', () => {
        expect(CONFIG.retry.maxDelay).toBe(10000);
      });

      it('should have retryable statuses', () => {
        expect(CONFIG.retry.retryableStatuses).toEqual([408, 429, 500, 502, 503, 504]);
      });
    });

    describe('rateLimit', () => {
      it('should have throttle delay', () => {
        expect(CONFIG.rateLimit.throttleDelay).toBe(1000);
      });

      it('should have max throttle attempts', () => {
        expect(CONFIG.rateLimit.maxThrottleAttempts).toBe(5);
      });
    });

    describe('logging', () => {
      it('should be disabled in test environment', () => {
        expect(CONFIG.logging.enabled).toBe(false);
      });

      it('should not include headers by default', () => {
        expect(CONFIG.logging.includeHeaders).toBe(false);
      });

      it('should have max body length', () => {
        expect(CONFIG.logging.maxBodyLength).toBe(500);
      });
    });

    describe('jwt', () => {
      it('should have refresh before expiry time', () => {
        expect(CONFIG.jwt.refreshBeforeExpiry).toBe(5 * 60 * 1000);
      });
    });

    describe('apiKey', () => {
      it('should have min length', () => {
        expect(CONFIG.apiKey.minLength).toBe(32);
      });

      it('should have valid pattern', () => {
        expect(CONFIG.apiKey.pattern).toBeInstanceOf(RegExp);
        expect(CONFIG.apiKey.pattern.test('abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
        expect(CONFIG.apiKey.pattern.test('short')).toBe(false);
      });
    });
  });

  describe('SENSITIVE_KEYS', () => {
    it('should be an array', () => {
      expect(Array.isArray(SENSITIVE_KEYS)).toBe(true);
    });

    it('should contain password', () => {
      expect(SENSITIVE_KEYS).toContain('password');
    });

    it('should contain apikey', () => {
      expect(SENSITIVE_KEYS).toContain('apikey');
    });

    it('should contain api_key', () => {
      expect(SENSITIVE_KEYS).toContain('api_key');
    });

    it('should contain token', () => {
      expect(SENSITIVE_KEYS).toContain('token');
    });

    it('should contain authorization', () => {
      expect(SENSITIVE_KEYS).toContain('authorization');
    });

    it('should contain refresh_token', () => {
      expect(SENSITIVE_KEYS).toContain('refresh_token');
    });

    it('should contain secret', () => {
      expect(SENSITIVE_KEYS).toContain('secret');
    });

    it('should contain key', () => {
      expect(SENSITIVE_KEYS).toContain('key');
    });
  });

  describe('ERROR_MESSAGES', () => {
    describe('auth', () => {
      it('should have noMethod message', () => {
        expect(ERROR_MESSAGES.auth.noMethod).toBeDefined();
        expect(typeof ERROR_MESSAGES.auth.noMethod).toBe('string');
      });

      it('should have invalidApiKey message', () => {
        expect(ERROR_MESSAGES.auth.invalidApiKey).toBeDefined();
      });

      it('should have invalidCredentials message', () => {
        expect(ERROR_MESSAGES.auth.invalidCredentials).toBeDefined();
      });

      it('should have sessionExpired message', () => {
        expect(ERROR_MESSAGES.auth.sessionExpired).toBeDefined();
      });

      it('should have refreshFailed message', () => {
        expect(ERROR_MESSAGES.auth.refreshFailed).toBeDefined();
      });
    });

    describe('validation', () => {
      it('should have invalidEmail message', () => {
        expect(ERROR_MESSAGES.validation.invalidEmail).toBeDefined();
      });

      it('should have invalidFormat message', () => {
        expect(ERROR_MESSAGES.validation.invalidFormat).toBeDefined();
      });

      it('should have missingRequired message', () => {
        expect(ERROR_MESSAGES.validation.missingRequired).toBeDefined();
      });
    });

    describe('server', () => {
      it('should have internalError message', () => {
        expect(ERROR_MESSAGES.server.internalError).toBeDefined();
      });

      it('should have serviceUnavailable message', () => {
        expect(ERROR_MESSAGES.server.serviceUnavailable).toBeDefined();
      });

      it('should have timeout message', () => {
        expect(ERROR_MESSAGES.server.timeout).toBeDefined();
      });
    });

    describe('rateLimit', () => {
      it('should have exceeded message with placeholder', () => {
        expect(ERROR_MESSAGES.rateLimit.exceeded).toContain('{{delay}}');
      });
    });
  });

  describe('PLANS', () => {
    describe('FREE', () => {
      it('should have daily limit of 100', () => {
        expect(PLANS.FREE.dailyLimit).toBe(100);
      });

      it('should have batch size of 10', () => {
        expect(PLANS.FREE.batchSize).toBe(10);
      });

      it('should not have SMTP checks', () => {
        expect(PLANS.FREE.smtpChecks).toBe(false);
      });
    });

    describe('PREMIUM', () => {
      it('should have daily limit of 10000', () => {
        expect(PLANS.PREMIUM.dailyLimit).toBe(10000);
      });

      it('should have batch size of 100', () => {
        expect(PLANS.PREMIUM.batchSize).toBe(100);
      });

      it('should have SMTP checks', () => {
        expect(PLANS.PREMIUM.smtpChecks).toBe(true);
      });
    });

    describe('ENTERPRISE', () => {
      it('should have daily limit of 100000', () => {
        expect(PLANS.ENTERPRISE.dailyLimit).toBe(100000);
      });

      it('should have batch size of 1000', () => {
        expect(PLANS.ENTERPRISE.batchSize).toBe(1000);
      });

      it('should have SMTP checks', () => {
        expect(PLANS.ENTERPRISE.smtpChecks).toBe(true);
      });
    });
  });
});

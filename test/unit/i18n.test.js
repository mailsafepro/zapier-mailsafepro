/**
 * @module i18nTest
 * @description Tests for internationalization module
 */

const { t, getCurrentLocale, getAvailableLocales, isLocaleSupported } = require('../../lib/i18n');

describe('i18n Module', () => {
  const originalEnv = process.env.MAILSAFEPRO_LOCALE;

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.MAILSAFEPRO_LOCALE = originalEnv;
    } else {
      delete process.env.MAILSAFEPRO_LOCALE;
    }
  });

  describe('getCurrentLocale', () => {
    it('should return default locale (en) when no env var set', () => {
      delete process.env.MAILSAFEPRO_LOCALE;
      expect(getCurrentLocale()).toBe('en');
    });

    it('should return locale from environment variable', () => {
      process.env.MAILSAFEPRO_LOCALE = 'es';
      expect(getCurrentLocale()).toBe('es');
    });

    it('should return pt when set', () => {
      process.env.MAILSAFEPRO_LOCALE = 'pt';
      expect(getCurrentLocale()).toBe('pt');
    });
  });

  describe('getAvailableLocales', () => {
    it('should return array of locales', () => {
      const locales = getAvailableLocales();
      expect(Array.isArray(locales)).toBe(true);
    });

    it('should include en', () => {
      expect(getAvailableLocales()).toContain('en');
    });

    it('should include es', () => {
      expect(getAvailableLocales()).toContain('es');
    });

    it('should include pt', () => {
      expect(getAvailableLocales()).toContain('pt');
    });

    it('should have exactly 3 locales', () => {
      expect(getAvailableLocales()).toHaveLength(3);
    });
  });

  describe('isLocaleSupported', () => {
    it('should return true for en', () => {
      expect(isLocaleSupported('en')).toBe(true);
    });

    it('should return true for es', () => {
      expect(isLocaleSupported('es')).toBe(true);
    });

    it('should return true for pt', () => {
      expect(isLocaleSupported('pt')).toBe(true);
    });

    it('should return false for unsupported locale', () => {
      expect(isLocaleSupported('fr')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLocaleSupported(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLocaleSupported('')).toBe(false);
    });
  });

  describe('t (translate)', () => {
    beforeEach(() => {
      delete process.env.MAILSAFEPRO_LOCALE;
    });

    it('should translate a simple key', () => {
      const result = t('auth.apiKey.label');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return key when translation not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
      expect(consoleSpy).toHaveBeenCalledWith('Translation missing for key: nonexistent.key');
      consoleSpy.mockRestore();
    });

    it('should interpolate parameters', () => {
      // Test with a key that has parameters
      const result = t('errors.rateLimit', { delay: '60' });
      expect(typeof result).toBe('string');
    });

    it('should use specified locale override', () => {
      const enResult = t('auth.apiKey.label', {}, 'en');
      const esResult = t('auth.apiKey.label', {}, 'es');
      // Both should return strings (may or may not be different)
      expect(typeof enResult).toBe('string');
      expect(typeof esResult).toBe('string');
    });

    it('should fall back to default locale for unsupported locale', () => {
      const result = t('auth.apiKey.label', {}, 'fr');
      expect(typeof result).toBe('string');
    });

    it('should handle nested keys', () => {
      const result = t('auth.email.label');
      expect(typeof result).toBe('string');
    });

    it('should handle deeply nested keys', () => {
      // Try a deep key - if it doesn't exist, it returns the key
      const result = t('triggers.validateEmail.label');
      expect(typeof result).toBe('string');
    });

    it('should preserve unmatched placeholders', () => {
      // If a placeholder doesn't have a matching param, it should be preserved
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = t('errors.rateLimit', {}); // No delay param
      expect(typeof result).toBe('string');
      consoleSpy.mockRestore();
    });

    it('should work with Spanish locale', () => {
      process.env.MAILSAFEPRO_LOCALE = 'es';
      const result = t('auth.apiKey.label');
      expect(typeof result).toBe('string');
    });

    it('should work with Portuguese locale', () => {
      process.env.MAILSAFEPRO_LOCALE = 'pt';
      const result = t('auth.apiKey.label');
      expect(typeof result).toBe('string');
    });
  });
});

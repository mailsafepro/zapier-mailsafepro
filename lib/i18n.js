/**
 * @module i18n
 * @description Internationalization utility for MailSafePro Zapier Integration
 * Supports: English (en), Spanish (es), Portuguese (pt)
 */

const en = require('../locales/en.json');
const es = require('../locales/es.json');
const pt = require('../locales/pt.json');

const locales = { en, es, pt };
const defaultLocale = 'en';

/**
 * Get current locale from environment or default
 * @returns {string} - Locale code (en, es, pt)
 */
const getCurrentLocale = () => {
  return process.env.MAILSAFEPRO_LOCALE || defaultLocale;
};

/**
 * Translate a key to current locale
 * @param {string} key - Translation key (e.g., 'auth.apiKey.label')
 * @param {Object} params - Optional parameters for interpolation
 * @param {string} locale - Optional locale override
 * @returns {string} - Translated string
 */
const t = (key, params = {}, locale = null) => {
  const currentLocale = locale || getCurrentLocale();
  const translation = getNestedValue(locales[currentLocale] || locales[defaultLocale], key);

  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  return interpolate(translation, params);
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-separated path (e.g., 'auth.apiKey.label')
 * @returns {*} - Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Interpolate parameters into translation string
 * @param {string} str - String with {{param}} placeholders
 * @param {Object} params - Parameters to interpolate
 * @returns {string} - Interpolated string
 */
const interpolate = (str, params) => {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
};

/**
 * Get all available locales
 * @returns {Array<string>} - Array of locale codes
 */
const getAvailableLocales = () => {
  return Object.keys(locales);
};

/**
 * Check if locale is supported
 * @param {string} locale - Locale code to check
 * @returns {boolean} - True if supported
 */
const isLocaleSupported = locale => {
  return locale in locales;
};

module.exports = {
  t,
  getCurrentLocale,
  getAvailableLocales,
  isLocaleSupported,
};

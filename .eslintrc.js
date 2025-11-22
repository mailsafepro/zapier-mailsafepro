/**
 * @file ESLint Configuration - Enterprise Grade
 * @description ESLint configuration for MailSafePro Zapier Integration
 * Enforces code quality, security patterns, and maintainability standards
 * @version 1.0.0
 */

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    // Code Quality Rules
    'prettier/prettier': 'error',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // Security Rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Best Practices
    'consistent-return': 'error',
    curly: ['error', 'multi-line'],
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'object-shorthand': 'error',

    // Error Handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Zapier Specific Rules
    'no-process-env': 'off', // Zapier uses process.env extensively

    // Complexity Rules
    complexity: ['warn', 15],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 4],
  },
  overrides: [
    {
      // Configuration files
      files: ['.eslintrc.js', '.prettierrc.js'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Test files (if added later)
      files: ['**/__tests__/**/*', '**/*.test.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        'max-nested-callbacks': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js', '*.bundle.js'],
};

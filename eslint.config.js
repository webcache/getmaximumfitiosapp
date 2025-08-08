// Legacy ESLint config for better compatibility
module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
  },
  ignorePatterns: [
    'dist/',
    '.expo/',
    'android/',
    'ios/',
    '**/*.d.ts',
    'babel.config.js',
    'metro.config.js'
  ]
};

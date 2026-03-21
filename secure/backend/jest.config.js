/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  restoreMocks: true,
  // Increase timeout for integration tests that call bcrypt
  testTimeout: 15000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'validators/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
};

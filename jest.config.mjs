/**
 * Jest configuration for the Captus backend.
 *
 * Uses Node's native ESM via --experimental-vm-modules (see package.json).
 * No Babel / transform needed; all source files use .js + "type":"module".
 */
export default {
  testEnvironment: 'node',

  // No transform — ESM modules are loaded natively.
  transform: {},

  // Discover tests inside src/**/__tests__ and the top-level __tests__ folder.
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.js',
    '<rootDir>/__tests__/**/*.test.js',
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/db/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Verbose output so each test name is visible in CI logs.
  verbose: true,
};

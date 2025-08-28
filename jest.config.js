/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],

  // TypeScript configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
        },
      },
    ],
  },

  // Module resolution - Fixed with correct Jest property name
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    // Handle .js imports for TypeScript files
    '^(\\.\\.?\\/.*)\\.(js|jsx)$': '$1',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/shared/**/*.ts',
    '!src/shared/**/*.d.ts',
    '!src/shared/**/index.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Coverage thresholds - relaxed for early development stage
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 25,
      lines: 35,
      statements: 35,
    },
    'src/shared/types/': {
      branches: 5,
      functions: 20,
      lines: 30,
      statements: 30,
    },
  },

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],

  // Timeout
  testTimeout: 10000,

  // Verbose output for CI
  verbose: true,
};

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  
  // TypeScript configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022'
      }
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/shared/**/*.ts',
    '!src/shared/**/*.d.ts',
    '!src/shared/**/index.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // Coverage thresholds - require 100% for interface files
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/shared/types/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/shared/schemas/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],
  
  // Timeout
  testTimeout: 10000,
  
  // Verbose output for CI
  verbose: true
};
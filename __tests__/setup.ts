/**
 * Jest test setup file
 * 
 * This file is run before each test suite to configure the testing environment
 * for TypeScript interfaces and provider abstractions.
 */

// Global test timeout for async operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset console mocks before each test
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore original console methods after each test
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities for interface validation - made ambient
declare module '@jest/types' {
  namespace Global {
    interface Matchers<R> {
      toBeValidResult(): R;
      toBeValidProviderInterface(): R;
    }
  }
}

// Custom Jest matchers for Result pattern validation
expect.extend({
  toBeValidResult(received: unknown) {
    const pass = typeof received === 'object' && 
                 received !== null && 
                 'success' in received &&
                 typeof (received as any).success === 'boolean';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid Result type`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid Result type with 'success' boolean property`,
        pass: false,
      };
    }
  },

  toBeValidProviderInterface(received: unknown) {
    const pass = typeof received === 'object' && 
                 received !== null && 
                 'name' in received &&
                 'version' in received &&
                 typeof (received as any).name === 'string' &&
                 typeof (received as any).version === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid Provider interface`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid Provider interface with 'name' and 'version' string properties`,
        pass: false,
      };
    }
  },
});

// Test environment configuration
process.env.NODE_ENV = 'test';

// Suppress specific warnings that are expected in test environment
const originalWarnings = process.emitWarning;
process.emitWarning = (warning, options) => {
  // Suppress deprecation warnings from dependencies during testing
  if (typeof warning === 'string' && warning.includes('better-sqlite3')) {
    return;
  }
  if (typeof warning === 'object' && warning.name === 'DeprecationWarning') {
    return;
  }
  originalWarnings.call(process, warning, options);
};
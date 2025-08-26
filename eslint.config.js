/** @type {import('eslint').Linter.Config[]} */
const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript source files configuration
  {
    files: ['src/**/*.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly',
        document: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
        typescript: {},
      },
    },
    rules: {
      /* --- High-value: fail CI --- */
      'no-unreachable': 'error',
      'no-undef': 'error',
      eqeqeq: ['error', 'smart'],
      'import/no-unresolved': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/await-thenable': 'error',

      /* --- Useful but non-blocking --- */
      'no-console': 'warn',
      'no-return-await': 'warn',
      complexity: ['warn', 12],
      'max-lines-per-function': ['warn', 140],

      /* --- Cleanup (autofix + warn) --- */
      'unused-imports/no-unused-imports': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Test files configuration
  {
    files: [
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // Type definition files - allow unused parameters
  {
    files: ['**/*.types.ts', '**/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },

  // TypeScript config files (no project needed)
  {
    files: ['*.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // Don't use project for config files
      },
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
    },
  },

  // Configuration files (CommonJS)
  {
    files: ['*.config.js', '.eslintrc.js', 'eslint.config.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      'dist/',
      'dist-*/',
      'build/',
      'out/',
      'coverage/',
      'node_modules/',
      '*.min.js',
      '*.d.ts',
      '**/generated/**',
      '**/*.snap',
      'PRPs/',
      'git',
    ],
  },
];

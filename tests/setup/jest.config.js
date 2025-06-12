module.exports = {
  // Root directory for Jest to look for tests and modules
  rootDir: '../../',
  
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/node_modules/**',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module paths for easier imports
  moduleDirectories: ['node_modules', 'server'],
  
  // Transform configuration (if needed for ES modules)
  transform: {},
  
  // Coverage thresholds - simplified to only global thresholds
  coverageThreshold: {
    global: {
      branches: 39,
      functions: 68,
      lines: 68,
      statements: 63
    }
  }
};
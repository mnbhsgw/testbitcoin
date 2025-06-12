#!/usr/bin/env node

/**
 * Bitcoin Arbitrage Monitoring System - Test Runner
 * 
 * This script provides a comprehensive test runner with different test modes:
 * - Unit tests: Test individual components in isolation
 * - Integration tests: Test API endpoints and WebSocket functionality  
 * - Performance tests: Test system performance and load handling
 * - Full test suite: Run all tests with coverage
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test configuration
const testConfig = {
  jestConfig: path.join(__dirname, 'setup', 'jest.config.js'),
  coverageDir: path.join(__dirname, '..', 'coverage'),
  logFile: path.join(__dirname, '..', 'test-results.log')
};

// Helper function to log with colors
function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  const coloredMessage = `${colors[color]}${message}${colors.reset}`;
  console.log(`[${timestamp}] ${coloredMessage}`);
  
  // Also log to file
  fs.appendFileSync(testConfig.logFile, `[${timestamp}] ${message}\n`);
}

// Helper function to run Jest with specific configuration
function runJest(args = [], description = '') {
  return new Promise((resolve, reject) => {
    log(`Starting ${description}...`, 'cyan');
    
    const jestArgs = [
      '--config', testConfig.jestConfig,
      '--forceExit',
      ...args
    ];
    
    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        log(`${description} completed successfully`, 'green');
        resolve(code);
      } else {
        log(`${description} failed with exit code ${code}`, 'red');
        resolve(code); // Don't reject, let caller handle
      }
    });
    
    jest.on('error', (error) => {
      log(`Error running ${description}: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Test suite definitions
const testSuites = {
  unit: {
    description: 'Unit Tests',
    args: ['--testPathPatterns=tests/unit'],
    env: { SKIP_REAL_API_TESTS: 'true' }
  },
  
  integration: {
    description: 'Integration Tests',
    args: ['--testPathPatterns=tests/integration'],
    env: { SKIP_REAL_API_TESTS: 'true' }
  },
  
  performance: {
    description: 'Performance Tests', 
    args: ['--testPathPatterns=tests/performance', '--testTimeout=60000'],
    env: { SKIP_REAL_API_TESTS: 'true' }
  },
  
  'external-api': {
    description: 'External API Tests (Live)',
    args: ['--testPathPatterns=external-apis.test.js'],
    env: { SKIP_REAL_API_TESTS: 'false' }
  },
  
  coverage: {
    description: 'Full Test Suite with Coverage',
    args: ['--coverage', '--coverageReporters=text', '--coverageReporters=html'],
    env: { SKIP_REAL_API_TESTS: 'true' }
  },
  
  watch: {
    description: 'Watch Mode',
    args: ['--watch', '--testPathPatterns=tests/unit'],
    env: { SKIP_REAL_API_TESTS: 'true' }
  }
};

// Get command line arguments at the top level
const args = process.argv.slice(2);

// Main test runner function
async function runTests() {
  const testType = args[0] || 'unit';
  
  // Clear previous log file
  if (fs.existsSync(testConfig.logFile)) {
    fs.unlinkSync(testConfig.logFile);
  }
  
  log('Bitcoin Arbitrage Monitoring System - Test Runner', 'bright');
  log('=====================================================', 'bright');
  
  // Show available test types if invalid argument
  if (!testSuites[testType]) {
    log('Invalid test type. Available options:', 'yellow');
    Object.keys(testSuites).forEach(type => {
      log(`  ${type}: ${testSuites[type].description}`, 'blue');
    });
    log('\nUsage: node test-runner.js [test-type]', 'yellow');
    log('Example: node test-runner.js unit', 'yellow');
    process.exit(1);
  }
  
  const suite = testSuites[testType];
  
  // Check if server should be running for integration tests
  if (testType === 'integration' || testType === 'performance') {
    log('NOTE: For integration and performance tests, make sure the server is running:', 'yellow');
    log('  npm run dev', 'blue');
    log('  or npm run server', 'blue');
    log('');
  }
  
  // Set environment variables
  Object.assign(process.env, suite.env);
  
  try {
    // Check for Jest installation
    try {
      require('jest');
    } catch (error) {
      log('Jest not found. Installing...', 'yellow');
      await runCommand('npm', ['install', '--save-dev', 'jest']);
    }
    
    // Create coverage directory if it doesn't exist
    if (!fs.existsSync(testConfig.coverageDir)) {
      fs.mkdirSync(testConfig.coverageDir, { recursive: true });
    }
    
    // Run the tests
    const exitCode = await runJest(suite.args, suite.description);
    
    // Summary
    log('', 'reset');
    log('Test Summary:', 'bright');
    log('=============', 'bright');
    
    if (exitCode === 0) {
      log('✅ All tests passed!', 'green');
      
      // Show coverage info if generated
      if (suite.args.includes('--coverage')) {
        const coverageFile = path.join(testConfig.coverageDir, 'lcov-report', 'index.html');
        if (fs.existsSync(coverageFile)) {
          log(`📊 Coverage report: file://${coverageFile}`, 'blue');
        }
      }
    } else {
      log('❌ Some tests failed', 'red');
      log(`📋 Check log file: ${testConfig.logFile}`, 'blue');
    }
    
    // Show next steps
    log('', 'reset');
    log('Next steps:', 'bright');
    if (testType === 'unit') {
      log('  Run integration tests: node test-runner.js integration', 'blue');
    } else if (testType === 'integration') {
      log('  Run performance tests: node test-runner.js performance', 'blue');
    } else if (testType === 'performance') {
      log('  Run full coverage: node test-runner.js coverage', 'blue');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Helper function to run commands
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' });
    proc.on('close', resolve);
    proc.on('error', reject);
  });
}

// Additional utility functions
const utils = {
  // Check if server is running
  async checkServer(url = 'http://localhost:3001') {
    try {
      const axios = require('axios');
      await axios.get(`${url}/api/prices`, { timeout: 2000 });
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Clean up test artifacts
  cleanup() {
    const artifactsToClean = [
      path.join(__dirname, '..', 'coverage'),
      path.join(__dirname, '..', '*.log')
    ];
    
    artifactsToClean.forEach(pattern => {
      // Simple cleanup - in real implementation you'd use glob
      if (fs.existsSync(pattern)) {
        if (fs.statSync(pattern).isDirectory()) {
          fs.rmSync(pattern, { recursive: true, force: true });
        } else {
          fs.unlinkSync(pattern);
        }
      }
    });
    
    log('Cleaned up test artifacts', 'green');
  },
  
  // Generate test report
  generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      // Add more metadata as needed
    };
    
    const reportPath = path.join(__dirname, '..', 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`Test report generated: ${reportPath}`, 'blue');
  }
};

// Handle command line arguments for utilities
if (args.includes('--cleanup')) {
  utils.cleanup();
  process.exit(0);
}

if (args.includes('--check-server')) {
  utils.checkServer().then(running => {
    if (running) {
      log('✅ Server is running', 'green');
      process.exit(0);
    } else {
      log('❌ Server is not running', 'red');
      process.exit(1);
    }
  });
  return;
}

// Run the main test function
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testSuites, utils };
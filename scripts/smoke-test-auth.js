/**
 * Smoke Test: Auth Flow
 * 
 * Tests:
 * - GET /login returns 200
 * - GET /signup returns 200
 * 
 * Usage:
 * node scripts/smoke-test-auth.js
 * 
 * Prerequisites:
 * - Next.js dev server running on http://localhost:3000
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test cases
const tests = [
  {
    name: 'GET /login',
    path: '/login',
    expectedStatus: 200,
  },
  {
    name: 'GET /signup',
    path: '/signup',
    expectedStatus: 200,
  },
];

// Run tests
async function runTests() {
  console.log('🧪 Starting Smoke Test: Auth Flow');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const result = await makeRequest(test.path);
      
      if (result.statusCode === test.expectedStatus) {
        console.log(`✅ PASS: ${test.name} (${result.statusCode})\n`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Expected: ${test.expectedStatus}`);
        console.log(`   Got: ${result.statusCode}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('━'.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
    process.exit(1);
  } else {
    console.log('\n✨ All tests passed!');
    process.exit(0);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/');
    return true;
  } catch (_error) {
    console.error('❌ Cannot connect to server at', BASE_URL);
    console.error('   Please start the dev server first: npm run dev');
    process.exit(1);
  }
}

// Main
(async () => {
  await checkServer();
  await runTests();
})();

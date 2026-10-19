/**
 * Architecture Feasibility Spike Test Runner
 * Verifies the cross-origin browser-to-Apps-Script security, envelope,
 * token verification, and error contracts using synthetic data.
 */

const assert = require('assert');
const { doPost } = require('./apps-script-spike');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    return false;
  }
}

console.log('Running Phase 1 Architecture Feasibility Spike Tests:');
let passed = 0;
let total = 0;

total++;
if (runTest('Valid authorized admin request returns success envelope', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'system.health',
        requestId: 'req_test_01',
        identityToken: 'mock_token_for_admin@example.com',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.status, 'ok');
  assert.strictEqual(body.apiVersion, '1');
  assert.strictEqual(body.error, null);
})) passed++;

total++;
if (runTest('auth.verifySession returns verified administrator identity', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'auth.verifySession',
        requestId: 'req_test_02',
        identityToken: 'mock_token_for_admin@example.com',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.authenticated, true);
  assert.strictEqual(body.data.displayIdentity, 'admin@example.com');
})) passed++;

total++;
if (runTest('Missing identity token is rejected with UNAUTHORIZED', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'system.health',
        requestId: 'req_test_03',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  assert.strictEqual(body.data, null);
})) passed++;

total++;
if (runTest('Expired identity token is rejected with UNAUTHORIZED', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'system.health',
        requestId: 'req_test_04',
        identityToken: 'expired_token',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'UNAUTHORIZED');
})) passed++;

total++;
if (runTest('Valid identity token for non-admin email is rejected with FORBIDDEN', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'system.health',
        requestId: 'req_test_05',
        identityToken: 'mock_token_for_stranger@example.com',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'FORBIDDEN');
})) passed++;

total++;
if (runTest('Unknown operation is rejected with UNKNOWN_OPERATION', () => {
  const req = {
    postData: {
      contents: JSON.stringify({
        apiVersion: '1',
        operation: 'forbidden.hackSpreadsheet',
        requestId: 'req_test_06',
        identityToken: 'mock_token_for_admin@example.com',
        payload: {}
      })
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'UNKNOWN_OPERATION');
})) passed++;

total++;
if (runTest('Malformed request body is safely rejected with INVALID_REQUEST', () => {
  const req = {
    postData: {
      contents: '{ broken json'
    }
  };
  const res = doPost(req);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'INVALID_REQUEST');
})) passed++;

console.log(`\nSpike test summary: ${passed}/${total} passed.`);
if (passed !== total) {
  process.exit(1);
}

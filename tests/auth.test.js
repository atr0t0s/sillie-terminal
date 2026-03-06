const { describe, it } = require('node:test');
const assert = require('node:assert');

const TEST_TOKEN = 'test-secret-token-12345';

const auth = require('../server/auth');

describe('auth', () => {
  it('validates correct token from query string', () => {
    assert.ok(auth.validateRequest('/?token=' + TEST_TOKEN, TEST_TOKEN));
  });
  it('rejects missing token', () => {
    assert.ok(!auth.validateRequest('/', TEST_TOKEN));
  });
  it('rejects wrong token', () => {
    assert.ok(!auth.validateRequest('/?token=wrong', TEST_TOKEN));
  });
  it('validates token from WebSocket upgrade URL', () => {
    assert.ok(auth.validateRequest('/ws?token=' + TEST_TOKEN, TEST_TOKEN));
  });
});

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { verifyGithubSignature } from './githubWebhookVerify.mjs';

test('rejects missing secret', () => {
  assert.equal(verifyGithubSignature(Buffer.from('{}'), 'sha256=ab', ''), false);
});

test('rejects bad header shape', () => {
  assert.equal(verifyGithubSignature(Buffer.from('{}'), 'md5=abc', 's'), false);
  assert.equal(verifyGithubSignature(Buffer.from('{}'), undefined, 's'), false);
});

test('accepts valid signature', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"ref":"refs/heads/main"}');
  const sig =
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyGithubSignature(body, sig, secret), true);
});

test('rejects tampered body', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"ref":"refs/heads/main"}');
  const sig =
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyGithubSignature(Buffer.from('{"ref":"oops"}'), sig, secret), false);
});

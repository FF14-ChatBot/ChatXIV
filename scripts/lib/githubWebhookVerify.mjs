import crypto from 'node:crypto';

/**
 * Verify GitHub webhook `X-Hub-Signature-256` (HMAC SHA-256 of raw body).
 * @param {Buffer} rawBody
 * @param {string | undefined} signature256Header
 * @param {string} secret
 * @returns {boolean}
 */
export function verifyGithubSignature(rawBody, signature256Header, secret) {
  if (!secret || typeof signature256Header !== 'string' || !signature256Header.startsWith('sha256=')) {
    return false;
  }
  const receivedHex = signature256Header.slice('sha256='.length);
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = Buffer.from(receivedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (received.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(received, expected);
}

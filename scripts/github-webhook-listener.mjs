/**
 * GitHub `push` webhooks: verify HMAC, fast-forward clone to `origin/main`.
 * Intended behind a tunnel + Access on a dedicated hostname.
 *
 * Env: `GITHUB_WEBHOOK_SECRET` (required); optional `PORT`, `WEBHOOK_PATH`, `GITHUB_REPO_FULL_NAME` — `.env.example`.
 * Logs verified push JSON bodies and all HTTP responses to stderr (local dev only).
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncFromOriginMain } from './lib/gitSyncFromOriginMain.mjs';
import { verifyGithubSignature } from './lib/githubWebhookVerify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 8790);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhooks/github';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const REPO_FULL = (process.env.GITHUB_REPO_FULL_NAME || '').trim();
const MAX_BODY_BYTES = Number(process.env.WEBHOOK_MAX_BODY_BYTES || 1024 * 1024);

if (!SECRET) {
  process.stderr.write(
    '[webhook] Set GITHUB_WEBHOOK_SECRET (same value as GitHub webhook secret).\n'
  );
  process.exit(1);
}

function deliveryPrefix(deliveryTag) {
  return deliveryTag ? `${deliveryTag} ` : '';
}

/**
 * @param {string} deliveryTag
 * @param {number} status
 * @param {string} body
 */
function logHttpResponse(deliveryTag, status, body) {
  const text = String(body);
  const oneLine = text.replace(/\r?\n/g, '\\n');
  const cap = 800;
  const shown = oneLine.length > cap ? `${oneLine.slice(0, cap)}…` : oneLine;
  process.stderr.write(
    `[webhook] ${deliveryPrefix(deliveryTag)}→ HTTP ${status} ${shown}\n`
  );
}

/**
 * @param {string} deliveryTag
 * @param {string} rawUtf8
 */
function logRequestBodyRaw(deliveryTag, rawUtf8) {
  process.stderr.write(`[webhook] ${deliveryPrefix(deliveryTag)}← raw body: ${rawUtf8}\n`);
}

/**
 * @param {string} deliveryTag
 * @param {Record<string, unknown>} payload
 */
function logPushRequestSummary(deliveryTag, payload) {
  const repo = payload.repository?.full_name ?? '?';
  const ref = payload.ref ?? '?';
  const after = typeof payload.after === 'string' ? payload.after.slice(0, 12) : '?';
  process.stderr.write(
    `[webhook] ${deliveryPrefix(deliveryTag)}← push ${repo} ${ref} after=${after}\n`
  );
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

/** @param {import('node:http').ServerResponse} res */
function sendAndLog(res, deliveryTag, status, body, headers = {}) {
  logHttpResponse(deliveryTag, status, body);
  send(res, status, body, headers);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    logHttpResponse('', 200, 'ok\n');
    return send(res, 200, 'ok\n');
  }

  let pathname = '/';
  try {
    pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname.replace(/\/$/, '') || '/';
  } catch {
    logHttpResponse('', 400, 'Bad URL\n');
    return send(res, 400, 'Bad URL\n');
  }
  const expected = WEBHOOK_PATH.replace(/\/$/, '') || '/';
  if (req.method !== 'POST' || pathname !== expected) {
    logHttpResponse('', 404, 'Not found\n');
    return send(res, 404, 'Not found\n');
  }

  const deliveryId = req.headers['x-github-delivery'];
  const deliveryTag =
    typeof deliveryId === 'string' ? deliveryId : Array.isArray(deliveryId) ? deliveryId[0] : '';

  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    process.stderr.write(
      `[webhook] ${deliveryPrefix(deliveryTag)}ignored (event: ${String(event)})\n`
    );
    return sendAndLog(res, deliveryTag, 202, 'Ignored (not a push event)\n');
  }

  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY_BYTES) {
    return sendAndLog(res, deliveryTag, 413, 'Payload too large\n');
  }

  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        return sendAndLog(res, deliveryTag, 413, 'Payload too large\n');
      }
      chunks.push(chunk);
    }
  } catch {
    return sendAndLog(res, deliveryTag, 400, 'Bad request\n');
  }

  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['x-hub-signature-256'];
  if (!verifyGithubSignature(rawBody, Array.isArray(sig) ? sig[0] : sig, SECRET)) {
    process.stderr.write(
      `[webhook] ${deliveryPrefix(deliveryTag)}401 invalid signature (check GITHUB_WEBHOOK_SECRET matches GitHub webhook secret)\n`
    );
    return sendAndLog(res, deliveryTag, 401, 'Invalid signature\n');
  }

  const rawUtf8 = rawBody.toString('utf8');
  logRequestBodyRaw(deliveryTag, rawUtf8);

  let payload;
  try {
    payload = JSON.parse(rawUtf8);
  } catch {
    return sendAndLog(res, deliveryTag, 400, 'Invalid JSON\n');
  }

  logPushRequestSummary(deliveryTag, payload);

  if (payload.ref !== 'refs/heads/main') {
    process.stderr.write(
      `[webhook] ${deliveryPrefix(deliveryTag)}ignored branch ${payload.ref}\n`
    );
    return sendAndLog(res, deliveryTag, 200, 'OK (ignored branch)\n');
  }

  if (REPO_FULL && payload.repository?.full_name !== REPO_FULL) {
    process.stderr.write(
      `[webhook] ${deliveryPrefix(deliveryTag)}ignored repo ${payload.repository?.full_name} (want ${REPO_FULL})\n`
    );
    return sendAndLog(res, deliveryTag, 200, 'OK (ignored repository)\n');
  }

  try {
    process.stderr.write(
      `[webhook] ${deliveryPrefix(deliveryTag)}running sync + build:cdm + build:backend\n`
    );
    const result = syncFromOriginMain(repoRoot);
    return sendAndLog(res, deliveryTag, 200, `${result.message}\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[webhook] ${deliveryPrefix(deliveryTag)}sync failed: ${msg}\n`);
    return sendAndLog(res, deliveryTag, 500, `Sync failed: ${msg}\n`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(
    `[webhook] Listening on http://127.0.0.1:${PORT}${WEBHOOK_PATH} (GET /health for probes)\n`
  );
});

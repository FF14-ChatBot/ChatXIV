/**
 * GitHub `push` webhooks: verify HMAC, fast-forward clone to `origin/main`.
 * Intended behind a tunnel + Access on a dedicated hostname.
 *
 * Env: `GITHUB_WEBHOOK_SECRET` (required); optional `PORT`, `WEBHOOK_PATH`, `GITHUB_REPO_FULL_NAME` — `.env.example`.
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

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    return send(res, 200, 'ok\n');
  }

  let pathname = '/';
  try {
    pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname.replace(/\/$/, '') || '/';
  } catch {
    return send(res, 400, 'Bad URL\n');
  }
  const expected = WEBHOOK_PATH.replace(/\/$/, '') || '/';
  if (req.method !== 'POST' || pathname !== expected) {
    return send(res, 404, 'Not found\n');
  }

  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    return send(res, 202, 'Ignored (not a push event)\n');
  }

  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY_BYTES) {
    return send(res, 413, 'Payload too large\n');
  }

  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        return send(res, 413, 'Payload too large\n');
      }
      chunks.push(chunk);
    }
  } catch {
    return send(res, 400, 'Bad request\n');
  }

  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['x-hub-signature-256'];
  if (!verifyGithubSignature(rawBody, Array.isArray(sig) ? sig[0] : sig, SECRET)) {
    return send(res, 401, 'Invalid signature\n');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return send(res, 400, 'Invalid JSON\n');
  }

  if (payload.ref !== 'refs/heads/main') {
    return send(res, 200, 'OK (ignored branch)\n');
  }

  if (REPO_FULL && payload.repository?.full_name !== REPO_FULL) {
    return send(res, 200, 'OK (ignored repository)\n');
  }

  try {
    const result = syncFromOriginMain(repoRoot);
    return send(res, 200, `${result.message}\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[webhook] sync failed: ${msg}\n`);
    return send(res, 500, `Sync failed: ${msg}\n`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(
    `[webhook] Listening on http://127.0.0.1:${PORT}${WEBHOOK_PATH} (GET /health for probes)\n`
  );
});

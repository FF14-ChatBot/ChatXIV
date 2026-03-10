import { REDACT } from '../config/constants.js';

/** Per-request API call log for debug UI. Redaction required so keys never reach the client (TR-19a). */

const SENSITIVE_HEADERS = new Set<string>(REDACT.HEADER_NAMES);

export interface DebugApiCallEntry {
  name: string;
  request: { method: string; url: string; headers?: Record<string, string>; body?: unknown };
  response: { status: number; headers?: Record<string, string>; body?: unknown };
}

const captureStore = new Map<number, DebugApiCallEntry[]>();

function redactHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers || Object.keys(headers).length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    // Query params often carry API keys; redact so they never appear in debug UI.
    for (const p of REDACT.QUERY_PARAMS) {
      if (u.searchParams.has(p)) u.searchParams.set(p, '[redacted]');
    }
    return u.toString();
  } catch {
    return url;
  }
}

let nextRunId = 0;
export function createRunId(): number {
  return ++nextRunId;
}

export function initRun(runId: number): void {
  captureStore.set(runId, []);
}

export function clearRun(runId: number): void {
  captureStore.delete(runId);
}

export function recordCall(runId: number, entry: DebugApiCallEntry): void {
  const entries = captureStore.get(runId);
  if (!entries) return;
  entries.push({
    ...entry,
    request: {
      ...entry.request,
      url: redactUrl(entry.request.url),
      headers: redactHeaders(entry.request.headers),
    },
    response: {
      ...entry.response,
      headers: redactHeaders(entry.response.headers),
    },
  });
}

export function getCalls(runId: number): DebugApiCallEntry[] {
  const entries = captureStore.get(runId) ?? [];
  return entries.map((e) => ({ ...e }));
}

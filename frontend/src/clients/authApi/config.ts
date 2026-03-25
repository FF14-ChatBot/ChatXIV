/**
 * Auth endpoints always use same-origin (empty base URL) so the session cookie
 * — scoped to the page's host — is included automatically.
 *
 * Dev: Vite proxies `/v1/auth/*` to localhost:3000.
 * Prod: reverse proxy (Cloudflare, nginx) routes `/v1/auth/*` to the backend.
 */
export function getAuthApiBaseUrl(): string {
  return '';
}

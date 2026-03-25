/**
 * Base URL for auth endpoints.
 *
 * - When `VITE_CHATXIV_BACKEND_URL` is set (e.g. `https://api.chatxiv.com`),
 *   auth calls go directly to that origin (cross-origin with `credentials: 'include'`).
 * - When unset, falls back to same-origin (`''`) so Vite's dev proxy handles routing.
 */
export function getAuthApiBaseUrl(): string {
  const base = import.meta.env.VITE_CHATXIV_BACKEND_URL as string | undefined;
  if (base !== undefined && base !== '') return base.replace(/\/$/, '');
  return '';
}

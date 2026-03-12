/**
 * Allowed CORS origins. Version-controlled so no env is required;
 * add or remove origins here and deploy.
 */
export const ALLOWED_CORS_ORIGINS: readonly string[] = [
  'https://chatxiv.com',
  'https://www.chatxiv.com',
  'http://localhost:5173',
];

export function getCorsOrigin(): string[] {
  return [...ALLOWED_CORS_ORIGINS];
}

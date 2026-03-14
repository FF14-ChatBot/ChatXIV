export function getChatxivApiBaseUrl(env?: { VITE_CHATXIV_BACKEND_URL?: string }): string {
  const base = (env ?? import.meta.env).VITE_CHATXIV_BACKEND_URL as string | undefined;
  if (base !== undefined && base !== '') return base.replace(/\/$/, '');
  return '';
}

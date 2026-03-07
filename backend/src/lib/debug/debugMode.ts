import { ENV_KEYS } from '../config/constants.js';

/** Gate for per-message debug payload (TR-28). Off by default so credentials never leak in production. */
export const debugMode = {
  isEnabled(): boolean {
    const raw = process.env[ENV_KEYS.DEBUG_MODE];
    if (raw === undefined || raw === '') return false;
    return raw.toLowerCase() === 'true' || raw === '1';
  },
};

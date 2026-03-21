import { getDebugMode } from '../config/env.js';

/** Gate for per-message debug payload (TR-28). Off by default so credentials never leak in production. */
export const debugMode = {
  isEnabled(): boolean {
    return getDebugMode();
  },
};

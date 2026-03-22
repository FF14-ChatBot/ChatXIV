import { describe, it, expect, afterEach } from 'vitest';
import { isPrelaunchRedirectEnabled } from '@/config/appEnv';

describe('appEnv', () => {
  const originalProd = import.meta.env.PROD;
  const originalPrelaunch = import.meta.env.VITE_APP_PRELAUNCH_REDIRECT;

  afterEach(() => {
    import.meta.env.PROD = originalProd;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = originalPrelaunch;
  });

  it('isPrelaunchRedirectEnabled is true only in production with flag', () => {
    import.meta.env.PROD = false;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    expect(isPrelaunchRedirectEnabled()).toBe(false);

    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = undefined;
    expect(isPrelaunchRedirectEnabled()).toBe(false);

    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    expect(isPrelaunchRedirectEnabled()).toBe(true);
  });
});

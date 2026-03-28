import { describe, expect, it } from 'vitest';
import { getDeployEnvironment } from '@/lib/config/deployEnvironment';

describe('getDeployEnvironment', () => {
  const originalDeploy = import.meta.env.VITE_DEPLOY_ENV;
  const originalMode = import.meta.env.MODE;

  function restore(): void {
    import.meta.env.VITE_DEPLOY_ENV = originalDeploy;
    import.meta.env.MODE = originalMode;
  }

  it('returns trimmed VITE_DEPLOY_ENV when set', () => {
    import.meta.env.VITE_DEPLOY_ENV = '  beta  ';
    import.meta.env.MODE = 'production';
    expect(getDeployEnvironment()).toBe('beta');
    restore();
  });

  it('falls back to MODE when VITE_DEPLOY_ENV is unset', () => {
    delete (import.meta.env as { VITE_DEPLOY_ENV?: string }).VITE_DEPLOY_ENV;
    import.meta.env.MODE = 'test';
    expect(getDeployEnvironment()).toBe('test');
    restore();
  });

  it('falls back to MODE when VITE_DEPLOY_ENV is empty or whitespace', () => {
    import.meta.env.VITE_DEPLOY_ENV = '   ';
    import.meta.env.MODE = 'production';
    expect(getDeployEnvironment()).toBe('production');
    restore();
  });
});

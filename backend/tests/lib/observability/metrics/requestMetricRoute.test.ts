import { describe, it, expect } from 'vitest';
import {
  resolveExpressTemplateRoute,
  shouldSkipMetricRoute,
} from '@src/lib/observability/metrics/requestMetricRoute.js';

describe('resolveExpressTemplateRoute', () => {
  it('joins baseUrl and route pattern when a route matched', () => {
    expect(
      resolveExpressTemplateRoute({
        baseUrl: '/v1/admin',
        path: '/ignored',
        route: { path: '/flags/:name' },
      })
    ).toBe('/v1/admin/flags/:name');
  });

  it('uses baseUrl when middleware served the request without a matched route (e.g. static)', () => {
    expect(
      resolveExpressTemplateRoute({
        baseUrl: '/v1/admin/docs',
        path: '/swagger-ui.css',
        route: undefined,
      })
    ).toBe('/v1/admin/docs');
  });

  it('uses req.path when baseUrl is empty and no route', () => {
    expect(
      resolveExpressTemplateRoute({
        baseUrl: '',
        path: '/favicon.ico',
        route: undefined,
      })
    ).toBe('/favicon.ico');
  });
});

describe('shouldSkipMetricRoute', () => {
  it('skips health and Swagger doc mounts', () => {
    expect(shouldSkipMetricRoute('/health')).toBe(true);
    expect(shouldSkipMetricRoute('/v1/docs')).toBe(true);
    expect(shouldSkipMetricRoute('/v1/admin/docs')).toBe(true);
  });

  it('does not skip API routes', () => {
    expect(shouldSkipMetricRoute('/v1/flags')).toBe(false);
    expect(shouldSkipMetricRoute('/v1/admin/flags/:name')).toBe(false);
  });
});

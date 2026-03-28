import {
  createReactRouterV7Options,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import type { Observability } from './types.js';

export interface FaroObservabilityConfig {
  readonly collectorUrl: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly environment: string;
  readonly sessionSamplingRate?: number;
}

export function createFaroObservability(config: FaroObservabilityConfig): Observability {
  const { collectorUrl, appName, appVersion, environment, sessionSamplingRate = 1 } = config;

  const faro = initializeFaro({
    url: collectorUrl,
    app: {
      name: appName,
      version: appVersion,
      environment,
    },
    sessionTracking: {
      samplingRate: sessionSamplingRate,
      persistent: true,
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
      new ReactIntegration({
        router: createReactRouterV7Options({
          createRoutesFromChildren,
          matchRoutes,
          Routes,
          useLocation,
          useNavigationType,
        }),
      }),
    ],
  });

  return {
    pushError(error: Error, context?: Record<string, string>): void {
      faro.api.pushError(error, { context });
    },
    pushLog(message: string, context?: Record<string, string>): void {
      faro.api.pushLog([message], { context });
    },
    setUser(userId: string, attributes?: Record<string, string>): void {
      faro.api.setUser({ id: userId, attributes });
    },
    resetUser(): void {
      faro.api.resetUser();
    },
  };
}

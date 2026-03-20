import type { FeatureFlagService } from './types.js';

let instance: FeatureFlagService | null = null;

/** Set the feature flag service (called by DI container on boot). Required before first use. */
export function setFeatureFlagService(service: FeatureFlagService): void {
  instance = service;
}

/** Get the current feature flag service. Throws if setFeatureFlagService() has not been called. */
export function getFeatureFlagService(): FeatureFlagService {
  if (instance === null) {
    throw new Error(
      'Feature flag service not initialized. Ensure the DI container is imported (e.g. from app.ts) so setFeatureFlagService() runs.'
    );
  }
  return instance;
}

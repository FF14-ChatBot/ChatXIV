import type { DependencyContainer } from 'tsyringe';
import { container } from '@src/lib/di/container.js';
import { closeAppDatabase } from '@src/lib/persistence/sqlite/appDatabaseSingleton.js';

/** Close SQLite and clear TSyringe registrations so `register()` can run again in the next test. */
export function resetBackendContainerForTests(): void {
  closeAppDatabase();
  (container as DependencyContainer).reset();
}

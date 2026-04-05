/**
 * Vitest setup: runs once before all test files.
 * TSyringe (used by injectable middleware) requires reflect-metadata first.
 *
 * Vitest sets `NODE_ENV=test` (Node/Jest/Vitest convention). Application stage still comes from
 * `getNodeEnv()`, which maps `test` (and legacy `dev`) to logical `development`.
 */
import 'reflect-metadata';

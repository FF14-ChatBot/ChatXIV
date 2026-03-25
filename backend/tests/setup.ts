/**
 * Vitest setup: runs once before all test files.
 * TSyringe (used by injectable middleware) requires reflect-metadata first.
 */
import 'reflect-metadata';

process.env.NODE_ENV ??= 'test';

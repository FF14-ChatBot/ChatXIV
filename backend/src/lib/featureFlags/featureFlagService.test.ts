import { describe, it, expect, beforeEach } from 'vitest';
import { createFeatureFlagService } from './featureFlagService.js';
import { createInMemoryFeatureFlagStore } from './inMemoryFeatureFlagStore.js';
import type { FeatureFlagService } from './types.js';
import { AppError } from '../errors/AppError.js';

describe('lib/featureFlags/featureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = createFeatureFlagService(createInMemoryFeatureFlagStore());
  });

  describe('getAll', () => {
    it('returns empty array when no flags exist', async () => {
      expect(await service.getAll()).toEqual([]);
    });

    it('returns entries with metadata', async () => {
      await service.setFlag('a', true);
      await service.setFlag('b', false);
      const entries = await service.getAll();
      expect(entries).toHaveLength(2);
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'a', enabled: true }),
          expect.objectContaining({ name: 'b', enabled: false }),
        ])
      );
      expect(entries[0].updatedAt).toBeTruthy();
    });
  });

  describe('getEntry', () => {
    it('returns stored entry with updatedAt', async () => {
      await service.setFlag('x', true);
      const entry = await service.getEntry('x');
      expect(entry).toEqual(
        expect.objectContaining({ name: 'x', enabled: true, updatedAt: expect.any(String) })
      );
    });

    it('returns enabled false without updatedAt when name is missing', async () => {
      expect(await service.getEntry('missing')).toEqual({ name: 'missing', enabled: false });
    });
  });

  describe('setFlag', () => {
    it('creates a new flag and returns the entry', async () => {
      const entry = await service.setFlag('new-flag', true);
      expect(entry.name).toBe('new-flag');
      expect(entry.enabled).toBe(true);
      expect(entry.updatedAt).toBeTruthy();
    });

    it('updates an existing flag', async () => {
      await service.setFlag('toggle', true);
      const entry = await service.setFlag('toggle', false);
      expect(entry.enabled).toBe(false);
    });
  });

  describe('removeFlag', () => {
    it('removes an existing flag', async () => {
      await service.setFlag('to-delete', true);
      await service.removeFlag('to-delete');
      expect(await service.getEntry('to-delete')).toEqual({ name: 'to-delete', enabled: false });
    });

    it('throws AppError for non-existent flag', async () => {
      await expect(service.removeFlag('nope')).rejects.toThrow(AppError);
      await expect(service.removeFlag('nope')).rejects.toMatchObject({ status: 400 });
    });
  });
});

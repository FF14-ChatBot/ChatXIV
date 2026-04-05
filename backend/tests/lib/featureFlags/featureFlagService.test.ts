import { describe, it, expect, beforeEach } from 'vitest';
import { createFeatureFlagService } from '@src/lib/featureFlags/featureFlagService.js';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createSqliteFeatureFlagStore } from '@src/lib/featureFlags/sqliteFeatureFlagStore.js';

describe('lib/featureFlags/featureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    const db = openSqliteDatabase(':memory:');
    runMigrations(db);
    service = createFeatureFlagService(createSqliteFeatureFlagStore(db));
  });

  describe('list', () => {
    it('returns empty first page when no flags exist', async () => {
      expect(await service.list(1, 50)).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });
    });

    it('returns entries with metadata sorted by name', async () => {
      await service.setFlag('b', false);
      await service.setFlag('a', true);
      const page = await service.list(1, 50);
      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(2);
      expect(page.items[0]?.name).toBe('a');
      expect(page.items[1]?.name).toBe('b');
      expect(page.items[0]?.updatedAt).toBeTruthy();
    });

    it('pages by offset', async () => {
      await service.setFlag('c', true);
      await service.setFlag('a', false);
      await service.setFlag('b', true);
      const p1 = await service.list(1, 2);
      expect(p1.items.map((e) => e.name)).toEqual(['a', 'b']);
      expect(p1.total).toBe(3);
      const p2 = await service.list(2, 2);
      expect(p2.items.map((e) => e.name)).toEqual(['c']);
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

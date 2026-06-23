import { describe, it, expect } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { XivApiLanguage } from '@src/lib/xivapi/types.js';
import {
  isXivApiResolverCategory,
  mapXivApiSearchToChunks,
  normalizeXivApiLanguage,
  wikiStubCategories,
  XivApiResolverCategories,
  xivApiSearchSourceCitation,
} from '@src/lib/knowledge/resolvers/xivApiResolverSupport.js';

describe('xivApiResolverSupport', () => {
  it('normalizeXivApiLanguage defaults to English', () => {
    expect(normalizeXivApiLanguage()).toBe(XivApiLanguage.En);
    expect(normalizeXivApiLanguage('  ')).toBe(XivApiLanguage.En);
    expect(normalizeXivApiLanguage('unknown-locale')).toBe(XivApiLanguage.En);
  });

  it('normalizeXivApiLanguage maps supported locales', () => {
    expect(normalizeXivApiLanguage('ja')).toBe(XivApiLanguage.Ja);
    expect(normalizeXivApiLanguage('DE')).toBe(XivApiLanguage.De);
    expect(normalizeXivApiLanguage('fr')).toBe(XivApiLanguage.Fr);
    expect(normalizeXivApiLanguage('chs')).toBe(XivApiLanguage.Chs);
    expect(normalizeXivApiLanguage('cht')).toBe(XivApiLanguage.Cht);
    expect(normalizeXivApiLanguage('kr')).toBe(XivApiLanguage.Kr);
  });

  it('wikiStubCategories excludes XIVAPI-backed and uncategorized categories', () => {
    const wikiCategories = wikiStubCategories();
    for (const category of XivApiResolverCategories) {
      expect(wikiCategories).not.toContain(category);
    }
    expect(wikiCategories).not.toContain(UsageCategory.UNCATEGORIZED);
    expect(wikiCategories.length).toBeGreaterThan(0);
  });

  it('isXivApiResolverCategory identifies XIVAPI-backed categories', () => {
    expect(isXivApiResolverCategory(UsageCategory.ITEMS)).toBe(true);
    expect(isXivApiResolverCategory(UsageCategory.OTHER)).toBe(false);
  });

  it('mapXivApiSearchToChunks formats row text and citation metadata', () => {
    const chunks = mapXivApiSearchToChunks(
      {
        results: [
          {
            score: 9,
            sheet: 'Item',
            row_id: 123,
            fields: { Name: 'Potion' },
            transient: { Description: 'Restores HP.' },
          },
        ],
        schema: 's',
        version: '2025.01.01',
      },
      xivApiSearchSourceCitation('2025.01.01')
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('[Item #123]');
    expect(chunks[0].text).toContain('Potion');
    expect(chunks[0].text).toContain('Restores HP.');
    expect(chunks[0].source.sourceName).toBe('XIVAPI');
    expect(chunks[0].source.patchOrDate).toBe('2025.01.01');
    expect(chunks[0].score).toBe(9);
  });

  it('mapXivApiSearchToChunks omits blank field values', () => {
    const chunks = mapXivApiSearchToChunks(
      {
        results: [{ score: 1, sheet: 'Quest', row_id: 1, fields: { Name: '   ' } }],
        schema: 's',
        version: 'v1',
      },
      xivApiSearchSourceCitation()
    );

    expect(chunks[0]?.text).toBe('[Quest #1]');
  });
});

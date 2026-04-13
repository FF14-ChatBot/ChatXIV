import { describe, it, expect } from 'vitest';
import { Languages } from '@chatxiv/cdm';
import { resolveKeywordLanguage } from '@src/lib/classification/keywordLanguage.js';

describe('resolveKeywordLanguage', () => {
  it('defaults missing or blank language to English', () => {
    expect(resolveKeywordLanguage(undefined)).toBe(Languages.En);
    expect(resolveKeywordLanguage(null)).toBe(Languages.En);
    expect(resolveKeywordLanguage('')).toBe(Languages.En);
    expect(resolveKeywordLanguage('   ')).toBe(Languages.En);
  });

  it('accepts en and common BCP 47 variants', () => {
    expect(resolveKeywordLanguage('en')).toBe(Languages.En);
    expect(resolveKeywordLanguage('EN')).toBe(Languages.En);
    expect(resolveKeywordLanguage('en-US')).toBe(Languages.En);
    expect(resolveKeywordLanguage('en_GB')).toBe(Languages.En);
  });

  it('returns null for locales without keyword rules yet', () => {
    expect(resolveKeywordLanguage('ja')).toBe(null);
    expect(resolveKeywordLanguage('ja-JP')).toBe(null);
    expect(resolveKeywordLanguage('de')).toBe(null);
  });
});

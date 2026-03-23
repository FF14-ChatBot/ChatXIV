import { describe, expect, it } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { normalizePopularPromptsToSlides } from '@/lib/starterPrompts/normalizePopularPrompts';

describe('normalizePopularPromptsToSlides', () => {
  it('builds slides of three from up to nine valid cards', () => {
    const raw = Array.from({ length: 9 }, (_, i) => ({
      category: UsageCategory.RAIDING,
      prompt: `p${i}`,
    }));
    const slides = normalizePopularPromptsToSlides(raw);
    expect(slides).toHaveLength(3);
    expect(slides[0]?.items).toHaveLength(3);
    expect(slides[1]?.id).toBe('popular-1');
    expect(slides[2]?.items[2]?.prompt).toBe('p8');
  });

  it('skips invalid entries and partial trailing groups', () => {
    const raw = [
      { category: UsageCategory.MSQ, prompt: 'one' },
      {},
      { category: 'not-a-category', prompt: 'two' },
      { category: UsageCategory.PATCH_NOTES, prompt: 'three' },
      { category: UsageCategory.SETTINGS, prompt: 'four' },
    ];
    const slides = normalizePopularPromptsToSlides(raw);
    expect(slides).toHaveLength(1);
    expect(slides[0]?.items.map((c) => c.prompt)).toEqual(['one', 'three', 'four']);
  });

  it('returns empty when nothing valid', () => {
    expect(normalizePopularPromptsToSlides([])).toEqual([]);
    expect(normalizePopularPromptsToSlides([null, 'x', { foo: 1 }])).toEqual([]);
  });

  it('ignores entries beyond nine', () => {
    const raw = Array.from({ length: 12 }, (_, i) => ({
      category: UsageCategory.RAIDING,
      prompt: `p${i}`,
    }));
    const slides = normalizePopularPromptsToSlides(raw);
    expect(slides).toHaveLength(3);
    expect(slides[2]?.items[2]?.prompt).toBe('p8');
  });

  it('joins multi-category labels and uses first category emoji', () => {
    const slides = normalizePopularPromptsToSlides([
      {
        categories: [UsageCategory.ITEMS, UsageCategory.VENDORS],
        prompt: 'Where can I buy this item?',
      },
      { category: UsageCategory.MSQ, prompt: 'Where am I in MSQ?' },
      { category: UsageCategory.RAIDING, prompt: 'Explain this raid mechanic' },
    ]);

    expect(slides).toHaveLength(1);
    expect(slides[0]?.items[0]?.category).toBe('ITEMS & VENDORS');
    expect(slides[0]?.items[0]?.emoji).toBe('📦');
  });
});

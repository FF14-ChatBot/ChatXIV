import { describe, expect, it } from 'vitest';
import { normalizePopularPromptsToSlides } from '@/lib/starterPrompts/normalizePopularPrompts';

describe('normalizePopularPromptsToSlides', () => {
  it('builds slides of three from up to nine valid cards', () => {
    const raw = Array.from({ length: 9 }, (_, i) => ({
      emoji: `${i}`,
      category: `c${i}`,
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
      { emoji: '📜', category: 'A', prompt: 'one' },
      {},
      { emoji: '', category: 'B', prompt: 'two' },
      { emoji: '📋', category: 'C', prompt: 'three' },
      { emoji: '📋', category: 'D', prompt: 'four' },
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
      emoji: 'x',
      category: 'c',
      prompt: `p${i}`,
    }));
    const slides = normalizePopularPromptsToSlides(raw);
    expect(slides).toHaveLength(3);
    expect(slides[2]?.items[2]?.prompt).toBe('p8');
  });
});

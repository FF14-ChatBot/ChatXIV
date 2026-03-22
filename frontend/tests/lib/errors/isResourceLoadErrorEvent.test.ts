import { describe, expect, it } from 'vitest';
import { isResourceLoadErrorEvent } from '@/lib/errors/isResourceLoadErrorEvent';

function asErrorEvent(target: EventTarget | null): ErrorEvent {
  return { target } as ErrorEvent;
}

describe('isResourceLoadErrorEvent', () => {
  it('returns true for subresource element targets', () => {
    expect(isResourceLoadErrorEvent(asErrorEvent(document.createElement('script')))).toBe(true);
    expect(isResourceLoadErrorEvent(asErrorEvent(document.createElement('link')))).toBe(true);
    expect(isResourceLoadErrorEvent(asErrorEvent(document.createElement('img')))).toBe(true);
    expect(isResourceLoadErrorEvent(asErrorEvent(document.createElement('iframe')))).toBe(true);
  });

  it('returns false for window, document, and null', () => {
    expect(isResourceLoadErrorEvent(asErrorEvent(window))).toBe(false);
    expect(isResourceLoadErrorEvent(asErrorEvent(document))).toBe(false);
    expect(isResourceLoadErrorEvent(asErrorEvent(null))).toBe(false);
  });

  it('returns false for arbitrary elements', () => {
    expect(isResourceLoadErrorEvent(asErrorEvent(document.createElement('div')))).toBe(false);
  });
});

import { Languages, type Language } from '@chatxiv/cdm';

/**
 * Maps request `language` (e.g. `en`, `en-US`) to a keyword ruleset, or `null` when we should
 * not run English patterns (forces uncategorized for the keyword stage unless another locale matches).
 *
 * Undefined / empty string defaults to English so existing clients without `language` keep behavior.
 */
export function resolveKeywordLanguage(language?: string | null): Language | null {
  const raw = language?.trim();
  if (!raw) {
    return Languages.En;
  }
  const primary = raw.split(/[-_]/)[0]?.toLowerCase();
  if (!primary) {
    return Languages.En;
  }
  if (primary === Languages.En) {
    return Languages.En;
  }
  return null;
}

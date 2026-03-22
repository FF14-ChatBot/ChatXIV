/**
 * Script/link/img (etc.) load failures dispatch a bubbling `error` that reaches `window`.
 * Those are not app bugs; the shell should not replace the whole UI for them.
 */
export function isResourceLoadErrorEvent(e: ErrorEvent): boolean {
  const t = e.target;
  if (t == null || t === window || t === document) {
    return false;
  }
  if (!(t instanceof Element)) {
    return false;
  }
  switch (t.tagName) {
    case 'SCRIPT':
    case 'LINK':
    case 'IMG':
    case 'IFRAME':
    case 'VIDEO':
    case 'AUDIO':
    case 'SOURCE':
    case 'TRACK':
      return true;
    default:
      return false;
  }
}

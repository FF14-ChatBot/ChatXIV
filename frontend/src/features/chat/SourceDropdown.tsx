import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { SourceCitation } from '@chatxiv/cdm';
import { useSourceMeta } from '../../hooks/useSourceMeta';
import styles from './SourceDropdown.module.css';

interface SourceDropdownProps {
  readonly sources: readonly SourceCitation[] | undefined;
}

export function SourceDropdown({ sources }: SourceDropdownProps) {
  const items = useSourceMeta(sources);
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  if (items.length === 0) return null;

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        id={triggerId}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <BookOpen size={12} aria-hidden />
        <span>Source</span>
        <Chevron size={11} aria-hidden />
      </button>

      {open && (
        <ul id={panelId} role="listbox" className={styles.panel}>
          {items.map((item, i) => (
            <li key={i} role="option" className={styles.sourceItem} aria-selected={false}>
              <span className={styles.sourceBullet} aria-hidden>
                &bull;
              </span>
              <div className={styles.sourceBody}>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={styles.sourceName}>{item.label}</span>
                )}
                {item.patchOrDate && (
                  <div className={styles.sourceMeta}>Last updated: {item.patchOrDate}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

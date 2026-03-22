import styles from './MammetLucideMark.module.css';

interface MammetLucideMarkProps {
  readonly className?: string;
}

/** Inline SVG for theme `currentColor`. Keep paths in sync with `src/assets/mammet-lucide.svg`. */
export function MammetLucideMark({ className }: MammetLucideMarkProps) {
  return (
    <span className={className ? `${styles.root} ${className}` : styles.root} aria-hidden>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className={styles.svg}
        aria-hidden
      >
        <g stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 9.25 19.2 7.5 22 h9 L 14.75 19.2" />
          <rect x="4.5" y="4.2" width="15" height="12.3" rx="3.5" />
          <path d="M 9.25 4.2 L 9.25 3.05 Q 12 0.55 14.75 3.05 L 14.75 4.2" />
          <path d="M 8 16.5 L 9.25 19.2 M 16 16.5 L 14.75 19.2 M 12 16.5 V 19.2" />
          <path d="M 8.375 20.6 L 7.275 19.5 Q 6.55 19.28 6.44 19.16" />
          <path d="M 15.625 20.6 L 16.725 19.5 Q 17.45 19.28 17.56 19.16" />
        </g>
        <rect x="6.65" y="7.92" width="2" height="6.15" fill="currentColor" />
        <rect x="15.35" y="7.92" width="2" height="6.15" fill="currentColor" />
      </svg>
    </span>
  );
}

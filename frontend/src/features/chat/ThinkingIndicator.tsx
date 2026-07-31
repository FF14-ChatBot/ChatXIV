import styles from './ThinkingIndicator.module.css';

export function ThinkingIndicator() {
  return (
    <div className={styles.assistantRow}>
      <div className={styles.bubble} role="status" aria-live="polite" aria-label="Thinking">
        <span className={styles.pulsate}>Thinking</span>
      </div>
    </div>
  );
}

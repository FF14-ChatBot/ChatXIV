import { useCallback, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './ChatInput.module.css';

const COMPOSER_MAX_PX = 160;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      queueMicrotask(syncHeight);
    },
    [onChange, syncHeight]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <textarea
          ref={textareaRef}
          className={styles.field}
          rows={1}
          placeholder="Ask me anything about the critically acclaimed MMORPG FFXIV"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        <Button size="icon" onClick={onSend} aria-label="Send message" type="button">
          <Send />
        </Button>
      </div>
    </div>
  );
}

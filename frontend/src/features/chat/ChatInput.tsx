import { useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
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
          className={styles.field}
          rows={1}
          placeholder="Ask me anything about FFXIV."
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

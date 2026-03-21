import { Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <Input
          type="text"
          placeholder="Ask me anything about FFXIV!"
          className={styles.inputField}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button size="icon" onClick={onSend} aria-label="Send message">
          <Send />
        </Button>
      </div>
    </div>
  );
}

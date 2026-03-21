import type { Message } from '../../types/chat';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className={styles.wrapper}>
      {messages.map((message) => (
        <div key={message.id} className={message.role === 'user' ? styles.user : styles.assistant}>
          <p className={styles.bubbleText}>{message.text}</p>
        </div>
      ))}
    </div>
  );
}

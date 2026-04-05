import { MessageRole, type Message } from '../../types/chat';
import { MessageFeedbackBar } from './MessageFeedbackBar';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className={styles.wrapper}>
      {messages.map((message) =>
        message.role === MessageRole.User ? (
          <div key={message.id} className={styles.user}>
            <p className={styles.bubbleText}>{message.text}</p>
          </div>
        ) : (
          <div key={message.id} className={styles.assistantRow}>
            <div className={styles.assistant}>
              <p className={styles.bubbleText}>{message.text}</p>
            </div>
            <MessageFeedbackBar messageId={message.id} />
          </div>
        )
      )}
    </div>
  );
}

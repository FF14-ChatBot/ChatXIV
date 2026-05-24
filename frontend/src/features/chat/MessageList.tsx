import { ConversationRole } from '@chatxiv/cdm';
import type { Message } from '../../types/chat';
import { MessageFeedbackBar } from './MessageFeedbackBar';
import { SourceDropdown } from './SourceDropdown';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className={styles.wrapper}>
      {messages.map((message) =>
        message.role === ConversationRole.User ? (
          <div key={message.id} className={styles.user}>
            <p className={styles.bubbleText}>{message.text}</p>
          </div>
        ) : (
          <div key={message.id} className={styles.assistantRow}>
            <div className={styles.assistant}>
              <p className={styles.bubbleText}>{message.text}</p>
            </div>
            <div className={styles.footerRow}>
              <SourceDropdown sources={message.sources} />
              {message.sources && message.sources.length > 0 && (
                <span className={styles.separator} aria-hidden>
                  |
                </span>
              )}
              <MessageFeedbackBar messageId={message.id} />
            </div>
          </div>
        )
      )}
    </div>
  );
}

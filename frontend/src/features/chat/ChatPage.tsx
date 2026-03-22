import { useCallback } from 'react';
import { useChatSession } from './ChatSessionContext';
import { useChatConversation } from '../../hooks/useChatConversation';
import { WelcomePanel } from './WelcomePanel';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const { sessionGeneration } = useChatSession();
  const { messages, inputValue, setInputValue, sendMessage } =
    useChatConversation(sessionGeneration);

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.container}>
      {hasMessages ? (
        <>
          <div className={styles.messageArea}>
            <MessageList messages={messages} />
          </div>
          {/* AdSense (or similar): inject async script + ins.adsbygoogle inside this region per publisher docs. */}
          <aside className={styles.adSlot} aria-label="Advertisement" />
        </>
      ) : (
        <div className={styles.emptyColumn}>
          <div className={styles.emptyStack}>
            <WelcomePanel onPromptSubmit={sendMessage} />
            <aside className={styles.adSlot} aria-label="Advertisement" />
          </div>
        </div>
      )}

      <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
    </div>
  );
}

import { useCallback } from 'react';
import { useChatConversationContext } from './ChatConversationContext';
import { WelcomePanel } from './WelcomePanel';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatAdSlot } from './ChatAdSlot';
import styles from './ChatPage.module.css';
import { AdsensePlacement } from '../../lib/adsense/adsenseConfig';

export function ChatPage() {
  const { messages, inputValue, setInputValue, sendMessage } = useChatConversationContext();

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
          <ChatAdSlot placement={AdsensePlacement.Messages} className={styles.adSlot} />
        </>
      ) : (
        <div className={styles.emptyColumn}>
          <div className={styles.emptyStack}>
            <WelcomePanel onPromptSubmit={sendMessage} />
            <ChatAdSlot placement={AdsensePlacement.Welcome} className={styles.adSlot} />
          </div>
        </div>
      )}

      <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
    </div>
  );
}

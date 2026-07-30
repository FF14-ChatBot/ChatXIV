import { useCallback, useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { useChatConversationContext } from './ChatConversationContext';
import { WelcomePanel } from './WelcomePanel';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatAdSlot } from './ChatAdSlot';
import styles from './ChatPage.module.css';
import { AdsensePlacement } from '../../lib/adsense/adsenseConfig';

export function ChatPage() {
  const { messages, inputValue, setInputValue, sendMessage, isSending } =
    useChatConversationContext();
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const hasMessages = messages.length > 0;

  useLayoutEffect(() => {
    if (!hasMessages) {
      return;
    }
    const el = mainScrollRef.current;
    /* v8 ignore start -- ref is always set for this div after commit */
    if (el === null) {
      return;
    }
    /* v8 ignore end */
    el.scrollTop = el.scrollHeight;
  }, [hasMessages, messages]);

  return (
    <div className={styles.container}>
      {hasMessages ? (
        <div className={styles.threadColumn}>
          <ChatAdSlot
            placement={AdsensePlacement.Messages}
            className={clsx(styles.adSlot, styles.adSlotThread)}
          />
          <div
            ref={mainScrollRef}
            data-testid="chat-scroll-region"
            className={clsx(styles.mainScroll, styles.mainScrollThread)}
          >
            <div className={styles.messageScrollPad}>
              <MessageList messages={messages} isSending={isSending} />
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={mainScrollRef}
          data-testid="chat-scroll-region"
          className={clsx(styles.mainScroll, styles.mainScrollWelcome)}
        >
          <div className={styles.welcomeStack}>
            <WelcomePanel onPromptSubmit={sendMessage} />
            <ChatAdSlot
              placement={AdsensePlacement.Welcome}
              className={clsx(styles.adSlot, styles.adSlotWelcome)}
            />
          </div>
        </div>
      )}

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isSending}
      />
    </div>
  );
}

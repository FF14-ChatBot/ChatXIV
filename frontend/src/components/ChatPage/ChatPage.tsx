import { useState } from 'react';
import type { Message } from '../../types/chat';
import { WelcomePanel } from './WelcomePanel';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: inputValue,
      role: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botMessage: Message = {
        id: crypto.randomUUID(),
        text: "I'm MammetBot! This is a demo response. In a real implementation, I would provide helpful information about FFXIV!",
        role: 'assistant',
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.container}>
      <div className={hasMessages ? styles.messageArea : styles.messageAreaEmpty}>
        {hasMessages ? (
          <MessageList messages={messages} />
        ) : (
          <WelcomePanel onSearchSelect={setInputValue} />
        )}
      </div>

      <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
    </div>
  );
}

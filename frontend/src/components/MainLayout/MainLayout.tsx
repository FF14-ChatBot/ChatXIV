import { ReactNode } from 'react';
import { ChatConversationProvider } from '../../features/chat/ChatConversationContext';
import { ChatDiscardGuard } from '../../features/chat/ChatDiscardGuard';
import { ChatSessionProvider } from '../../features/chat/ChatSessionContext';
import { Header } from '../Header/Header';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ChatSessionProvider>
      <ChatConversationProvider>
        <ChatDiscardGuard>
          <div className={styles.layout}>
            <Header />
            <main className={styles.main}>{children}</main>
            <footer className={styles.footer}>
              <p className={styles.footerText}>
                ChatXIV may produce inaccurate information. Please provide feedback and verify with
                official sources.
              </p>
            </footer>
          </div>
        </ChatDiscardGuard>
      </ChatConversationProvider>
    </ChatSessionProvider>
  );
}

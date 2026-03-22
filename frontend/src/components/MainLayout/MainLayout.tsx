import { ReactNode } from 'react';
import { ChatSessionProvider } from '../../features/chat/ChatSessionContext';
import { Header } from '../Header/Header';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ChatSessionProvider>
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
    </ChatSessionProvider>
  );
}

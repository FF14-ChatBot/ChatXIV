import { ReactNode } from 'react';
import { ChatDiscardGuardStub } from '../../features/chat/ChatDiscardGuard';
import { Header } from '../Header/Header';
import styles from './AppShell.module.css';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ChatDiscardGuardStub>
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
    </ChatDiscardGuardStub>
  );
}

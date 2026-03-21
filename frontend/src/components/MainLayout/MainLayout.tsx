import { ReactNode } from 'react';
import { Header } from '../Header/Header';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
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
  );
}

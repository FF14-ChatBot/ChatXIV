import { Link } from 'react-router-dom';
import styles from './NotAvailablePage.module.css';

export function NotAvailablePage() {
  const homeLinkVisible = !(
    import.meta.env.PROD === true && import.meta.env.VITE_APP_PRELAUNCH_REDIRECT === 'true'
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.lead}>
          ChatXIV is not available yet. Check back later, or verify you opened the correct URL.
        </p>
        {homeLinkVisible ? (
          <p className={styles.actions}>
            <Link to="/" className={styles.homeLink}>
              Return to ChatXIV
            </Link>
          </p>
        ) : null}
        <p className={styles.hint}>If you believe this is a mistake, contact the site owner.</p>
      </main>
    </div>
  );
}

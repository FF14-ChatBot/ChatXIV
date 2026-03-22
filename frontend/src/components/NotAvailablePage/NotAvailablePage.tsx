import { Link } from 'react-router-dom';
import constructionMammet from './construction-mammet.png';
import styles from './NotAvailablePage.module.css';

export function NotAvailablePage() {
  const homeLinkVisible = !(
    import.meta.env.PROD === true && import.meta.env.VITE_APP_PRELAUNCH_REDIRECT === 'true'
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <img
          src={constructionMammet}
          alt="A small robotic construction mammet wearing a yellow hard hat and a glowing blue screen face, gesturing with open arms."
          className={styles.mascot}
        />
        <h1 className={styles.title}>Uh-oh. Page not found!</h1>
        <p className={styles.lead}>
          This page is not available yet. Check back later, or verify you opened the correct URL.
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

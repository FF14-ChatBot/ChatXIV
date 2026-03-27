import { Link, Navigate } from 'react-router-dom';
import { OutlineButton } from '../../components/ui/Button';
import { useAuth } from './AuthProvider';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.lead} role="status">
            Checking your session…
          </p>
        </div>
      </div>
    );
  }

  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lead}>Sign in with your account to continue.</p>
        <OutlineButton type="button" size="default" onClick={login}>
          Continue to sign in
        </OutlineButton>
        <p className={styles.hint}>
          <Link to="/unavailable">Back to site notice</Link>
        </p>
      </div>
    </div>
  );
}

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { ColorMode } from '../../theme/themeConstants';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === ColorMode.Light ? 'dark' : 'light'} mode`}
    >
      {theme === ColorMode.Light ? (
        <Moon className={styles.icon} />
      ) : (
        <Sun className={styles.icon} />
      )}
    </button>
  );
}

import { MessageSquarePlus, MoreVertical, Bot } from 'lucide-react';
import { OutlineButton } from '../ui/Button';
import { GhostButton } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <div className={styles.logo}>
          <MessageSquarePlus className={styles.logoIcon} />
          <span className={styles.logoText}>ChatXIV</span>
        </div>

        <div className={styles.brand}>
          <Bot className={styles.brandIcon} />
          <span className={styles.brandText}>MammetBot</span>
        </div>

        <nav className={styles.nav} aria-label="App actions">
          <ThemeToggle />

          <OutlineButton size="sm">
            <MessageSquarePlus className={styles.newChatIcon} />
            New Chat
          </OutlineButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <GhostButton size="icon" aria-label="More options">
                <MoreVertical />
              </GhostButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem>About</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquarePlus, MoreVertical } from 'lucide-react';
import { MammetLucideMark } from '../MammetLucideMark/MammetLucideMark';
import { OutlineButton } from '../ui/Button';
import { GhostButton } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { useChatSession } from '../../features/chat/ChatSessionContext';
import { useTheme } from '../../hooks/useTheme';
import dropdownMenuStyles from '../ui/DropdownMenu/DropdownMenu.module.css';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

export function Header() {
  const { pathname } = useLocation();
  const { themePreset, setThemePreset } = useTheme();
  const { startNewChat } = useChatSession();

  const goHome = useCallback(() => {
    startNewChat();
  }, [startNewChat]);

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <Link to="/" className={styles.lockup} onClick={goHome} aria-label="ChatXIV home">
          <div className={styles.lockupMark} aria-hidden="true">
            <MammetLucideMark className={styles.lockupIcon} />
          </div>
          <span className={styles.lockupTitle}>ChatXIV</span>
        </Link>

        <Link
          to="/"
          className={styles.homeLink}
          onClick={goHome}
          aria-label="Home"
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          Home
        </Link>

        <nav className={styles.nav} aria-label="App actions">
          <ThemeToggle />

          <OutlineButton type="button" size="sm" onClick={startNewChat}>
            <MessageSquarePlus className={styles.newChatIcon} />
            New Chat
          </OutlineButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <GhostButton size="icon" aria-label="More options">
                <MoreVertical />
              </GhostButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={dropdownMenuStyles.contentAlignEnd}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger chevronSide="leading">Themes</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={dropdownMenuStyles.contentAlignEnd}>
                  <DropdownMenuCheckboxItem
                    checked={themePreset === 'island'}
                    onCheckedChange={(checked) =>
                      setThemePreset(checked === true ? 'island' : 'none')
                    }
                  >
                    Island
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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

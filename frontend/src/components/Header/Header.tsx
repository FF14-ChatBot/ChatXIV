import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { MammetLucideMark } from '../MammetLucideMark/MammetLucideMark';
import { OutlineButton } from '../ui/Button';
import { GhostButton } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { useChatDiscardGuard } from '../../features/chat/ChatDiscardGuard';
import { useProductNavigation } from '../../context/ProductNavigationContext';
import { useAuth } from '../../features/auth/AuthProvider';
import { useTheme } from '../../hooks/useTheme';
import dropdownMenuStyles from '../ui/DropdownMenu/DropdownMenu.module.css';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

const COMPACT_HEADER_NAV_MQ = '(max-width: 639px)';

function getInitials(displayName?: string, email?: string): string {
  if (displayName) {
    return displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export function Header() {
  const { pathname } = useLocation();
  const { homeHref } = useProductNavigation();
  const { themePreset, setThemePreset } = useTheme();
  const { requestStartNewChat, onHomeNavigationClick } = useChatDiscardGuard();
  const { user, login, logout } = useAuth();
  const hideChatActions = pathname === '/unavailable' || pathname === '/login';
  const [compactNav, setCompactNav] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(COMPACT_HEADER_NAV_MQ);
    const sync = () => setCompactNav(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <Link
          to={homeHref}
          className={styles.lockup}
          onClick={onHomeNavigationClick}
          aria-label="ChatXIV home"
        >
          <div className={styles.lockupMark} aria-hidden="true">
            <MammetLucideMark className={styles.lockupIcon} />
          </div>
          <span className={styles.lockupTitle}>ChatXIV</span>
        </Link>

        <Link
          to={homeHref}
          className={styles.homeLink}
          onClick={onHomeNavigationClick}
          aria-label="Home"
          aria-current={pathname === homeHref ? 'page' : undefined}
        >
          Home
        </Link>

        <nav className={styles.nav} aria-label="App actions">
          <ThemeToggle />

          {!hideChatActions ? (
            <OutlineButton
              type="button"
              size="sm"
              onClick={requestStartNewChat}
              aria-label={compactNav ? 'New chat' : undefined}
            >
              <MessageSquarePlus className={styles.newChatIcon} aria-hidden />
              <span className={styles.newChatLabel} aria-hidden={compactNav}>
                New Chat
              </span>
            </OutlineButton>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {user ? (
                <button type="button" className={styles.avatarButton} aria-label="User menu">
                  <span className={styles.avatarInitials}>
                    {getInitials(user.displayName, user.email)}
                  </span>
                </button>
              ) : (
                <GhostButton size="icon" aria-label="More options">
                  <MoreVertical />
                </GhostButton>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={dropdownMenuStyles.contentAlignEnd}>
              {user && (
                <>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user.displayName ?? user.email}</span>
                    {user.displayName && user.email && (
                      <span className={styles.userEmail}>{user.email}</span>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger chevronSide="leading">Themes</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={dropdownMenuStyles.contentAlignEnd}>
                  <DropdownMenuCheckboxItem
                    checked={themePreset === 'island'}
                    onCheckedChange={(checked) =>
                      setThemePreset(checked === true ? 'island' : 'none')
                    }
                  >
                    Island Sanctuary
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem>About</DropdownMenuItem>
              {user ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void logout()}>
                    <LogOut className={styles.menuIcon} aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={login}>
                    <LogIn className={styles.menuIcon} aria-hidden />
                    Sign in
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

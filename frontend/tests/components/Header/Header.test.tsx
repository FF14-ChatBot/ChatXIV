import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatSessionProvider, useChatSession } from '@/features/chat/ChatSessionContext';
import { Header } from '@/components/Header/Header';
import { ThemeProvider } from '@/hooks/useTheme';
import type { AuthState } from '@/features/auth/AuthProvider';

const mockAuth: AuthState = {
  user: null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
  refresh: vi.fn(() => Promise.resolve()),
};

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function SessionGenerationProbe() {
  const { sessionGeneration } = useChatSession();
  return <span data-testid="session-generation">{sessionGeneration}</span>;
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <ChatSessionProvider>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </ChatSessionProvider>
    </MemoryRouter>
  );
}

describe('Header', () => {
  beforeEach(() => {
    mockAuth.user = null;
    mockAuth.loading = false;
    mockAuth.login = vi.fn();
    mockAuth.logout = vi.fn(() => Promise.resolve());
  });

  it('renders brand, home link, and theme controls', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /chatxiv home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it('starts a new chat when the lockup or Home link is clicked', () => {
    render(
      <MemoryRouter>
        <ChatSessionProvider>
          <ThemeProvider>
            <SessionGenerationProbe />
            <Header />
          </ThemeProvider>
        </ChatSessionProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('session-generation')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('link', { name: /chatxiv home/i }));
    expect(screen.getByTestId('session-generation')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('link', { name: /^home$/i }));
    expect(screen.getByTestId('session-generation')).toHaveTextContent('2');
  });

  it('toggles Island Sanctuary preset from the Themes submenu', async () => {
    renderHeader();
    const moreButton = screen.getByRole('button', { name: /more options/i });
    moreButton.focus();
    await act(async () => {
      fireEvent.keyDown(moreButton, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /themes/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /themes/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('menuitemcheckbox', { name: /island sanctuary/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /island sanctuary/i }));
    await waitFor(() => {
      expect(document.documentElement.dataset.themePreset).toBe('island');
    });
  });
});

describe('Header auth UI', () => {
  beforeEach(() => {
    mockAuth.user = null;
    mockAuth.loading = false;
    mockAuth.login = vi.fn();
    mockAuth.logout = vi.fn(() => Promise.resolve());
  });

  it('shows "More options" trigger when user is not authenticated', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument();
  });

  it('shows user avatar button when authenticated', () => {
    mockAuth.user = {
      id: 'u1',
      displayName: 'Warrior of Light',
      email: 'wol@eorzea.com',
      isAdmin: false,
    };
    renderHeader();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    expect(screen.getByText('WO')).toBeInTheDocument();
  });

  it('shows "Sign out" in the dropdown when authenticated', async () => {
    mockAuth.user = { id: 'u1', displayName: 'Warrior', isAdmin: false };
    renderHeader();
    const avatarBtn = screen.getByRole('button', { name: /user menu/i });
    avatarBtn.focus();
    await act(async () => {
      fireEvent.keyDown(avatarBtn, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  it('shows "Sign in" in the dropdown when not authenticated', async () => {
    renderHeader();
    const moreButton = screen.getByRole('button', { name: /more options/i });
    moreButton.focus();
    await act(async () => {
      fireEvent.keyDown(moreButton, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});

describe('Header matchMedia (compact nav)', () => {
  type MediaListener = (e: { matches: boolean }) => void;
  let matches: boolean;
  let listeners: MediaListener[];
  let removeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matches = false;
    listeners = [];
    mockAuth.user = null;
    mockAuth.loading = false;
    removeSpy = vi.fn((_: string, cb: MediaListener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => {
        expect(query).toBe('(max-width: 639px)');
        return {
          get matches() {
            return matches;
          },
          media: query,
          addEventListener: (_event: string, cb: MediaListener) => {
            listeners.push(cb);
          },
          removeEventListener: removeSpy,
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses aria-label for New chat when the compact media query matches', () => {
    matches = true;
    renderHeader();
    expect(screen.getByRole('button', { name: /^new chat$/i })).toBeInTheDocument();
  });

  it('removes the media query listener on unmount', () => {
    matches = false;
    const { unmount } = renderHeader();
    expect(window.matchMedia).toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

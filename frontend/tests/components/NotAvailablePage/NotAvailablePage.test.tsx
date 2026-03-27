import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser } from '@chatxiv/cdm';
import { NotAvailablePage } from '@/components/NotAvailablePage/NotAvailablePage';
import { ThemeProvider } from '@/hooks/useTheme';

const auth = vi.hoisted(() => ({
  user: null as AuthUser | null,
  loading: false,
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    login: vi.fn(),
    logout: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve()),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('NotAvailablePage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
  });

  function renderPage(showHomeLink: boolean) {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotAvailablePage showHomeLink={showHomeLink} />
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('shows return link when showHomeLink is true', () => {
    renderPage(true);
    expect(screen.getByRole('link', { name: /return to chatxiv/i })).toHaveAttribute('href', '/');
  });

  it('shows sign-in link when gated and there is no session', () => {
    renderPage(false);
    expect(screen.queryByRole('link', { name: /return to chatxiv/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
  });

  it('hides sign-in link while auth is loading', () => {
    auth.loading = true;
    renderPage(false);
    expect(screen.queryByRole('link', { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it('hides sign-in link when the user is signed in', () => {
    auth.user = { id: 'u1', displayName: 'Test', isAdmin: false };
    renderPage(false);
    expect(screen.queryByRole('link', { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});

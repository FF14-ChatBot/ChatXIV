import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthUser } from '@chatxiv/cdm';
import { LoginPage } from '@/features/auth/LoginPage';
import { ThemeProvider } from '@/hooks/useTheme';

const login = vi.fn();

const auth = vi.hoisted(() => ({
  user: null as AuthUser | null,
  loading: false,
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    login,
    logout: vi.fn(() => Promise.resolve()),
    refresh: vi.fn(() => Promise.resolve()),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderLoginAtLoginRoute() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="home-root">Home</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    login.mockClear();
  });

  it('shows a session check while auth is loading', () => {
    auth.loading = true;
    renderLoginAtLoginRoute();
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
    expect(screen.queryByRole('button', { name: /continue to sign in/i })).not.toBeInTheDocument();
  });

  it('redirects home when already signed in', () => {
    auth.user = { id: 'u1', displayName: 'Test', isAdmin: false };
    renderLoginAtLoginRoute();
    expect(screen.getByTestId('home-root')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it('invokes auth login when the primary button is clicked', () => {
    renderLoginAtLoginRoute();
    fireEvent.click(screen.getByRole('button', { name: /continue to sign in/i }));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('links back to the site notice', () => {
    renderLoginAtLoginRoute();
    expect(screen.getByRole('link', { name: /back to site notice/i })).toHaveAttribute(
      'href',
      '/unavailable'
    );
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { setAuthApiClient } from '@/clients/authApi/instance';
import type { AuthApiClient } from '@/clients/authApi/types';
import type { AuthMeResponse } from '@chatxiv/cdm';

function AuthProbe() {
  const { user, loading, login, logout, refresh } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? (user.email ?? user.id) : 'null'}</span>
      <button data-testid="login" onClick={login}>
        Login
      </button>
      <button data-testid="logout" onClick={() => void logout()}>
        Logout
      </button>
      <button data-testid="refresh" onClick={() => void refresh()}>
        Refresh
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  let mockClient: AuthApiClient;
  let fetchMeImpl: () => Promise<AuthMeResponse | null>;

  beforeEach(() => {
    fetchMeImpl = () => Promise.resolve(null);
    mockClient = {
      fetchMe: vi.fn(() => fetchMeImpl()),
      logout: vi.fn(() => Promise.resolve()),
      getLoginUrl: vi.fn(() => '/v1/auth/login'),
    };
    setAuthApiClient(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading initially then resolves to null when unauthenticated', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(mockClient.fetchMe).toHaveBeenCalledTimes(1);
  });

  it('provides user after fetchMe resolves with a user', async () => {
    fetchMeImpl = () =>
      Promise.resolve({
        user: { id: 'u1', email: 'warrior@eorzea.com', isAdmin: false },
      });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('warrior@eorzea.com');
  });

  it('sets user to null when fetchMe throws', async () => {
    fetchMeImpl = () => Promise.reject(new Error('network error'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('login navigates to the login URL', async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: '' },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.location, 'href', {
      set: assignSpy,
      configurable: true,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    fireEvent.click(screen.getByTestId('login'));
    expect(assignSpy).toHaveBeenCalledWith('/v1/auth/login');
  });

  it('logout clears the user', async () => {
    fetchMeImpl = () =>
      Promise.resolve({
        user: { id: 'u1', email: 'warrior@eorzea.com', isAdmin: false },
      });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('warrior@eorzea.com');
    });

    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
    expect(mockClient.logout).toHaveBeenCalledTimes(1);
  });

  it('refresh sets loading and refetches the user', async () => {
    let resolveSecond!: (value: AuthMeResponse | null) => void;
    let fetchCalls = 0;
    fetchMeImpl = () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return Promise.resolve({
          user: { id: 'u1', email: 'warrior@eorzea.com', isAdmin: false },
        });
      }
      return new Promise<AuthMeResponse | null>((resolve) => {
        resolveSecond = resolve;
      });
    };

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(mockClient.fetchMe).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId('refresh'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    await act(async () => {
      resolveSecond({
        user: { id: 'u1', email: 'warrior@eorzea.com', isAdmin: false },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(mockClient.fetchMe).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('user')).toHaveTextContent('warrior@eorzea.com');
  });

  it('logout clears user even when the API call fails', async () => {
    fetchMeImpl = () =>
      Promise.resolve({
        user: { id: 'u1', email: 'warrior@eorzea.com', isAdmin: false },
      });
    (mockClient.logout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('server error'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('warrior@eorzea.com');
    });

    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  it('useAuth throws when used outside of AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    consoleSpy.mockRestore();
  });
});

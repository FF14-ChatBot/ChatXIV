import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { ThemeProvider } from '@/hooks/useTheme';

describe('App', () => {
  const originalProd = import.meta.env.PROD;
  const originalPrelaunch = import.meta.env.VITE_APP_PRELAUNCH_REDIRECT;

  afterEach(() => {
    import.meta.env.PROD = originalProd;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = originalPrelaunch;
  });

  it('renders the app with header and chat page', () => {
    import.meta.env.PROD = false;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = undefined;
    render(
      <MemoryRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });

  it('redirects home to unavailable when prelaunch redirect is enabled in production', () => {
    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });

  it('still serves /unavailable when prelaunch redirect is enabled', () => {
    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    render(
      <MemoryRouter initialEntries={['/unavailable']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
  });

  it('renders not available page at /unavailable in development', () => {
    import.meta.env.PROD = false;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = undefined;
    render(
      <MemoryRouter initialEntries={['/unavailable']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

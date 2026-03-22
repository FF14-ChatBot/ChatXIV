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

  it('shows unavailable page when prelaunch redirect is enabled in production', () => {
    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });
});

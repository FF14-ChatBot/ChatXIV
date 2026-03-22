import { describe, expect, it, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotAvailablePage } from '@/components/NotAvailablePage/NotAvailablePage';
import { ThemeProvider } from '@/hooks/useTheme';

describe('NotAvailablePage', () => {
  const originalProd = import.meta.env.PROD;
  const originalPrelaunch = import.meta.env.VITE_APP_PRELAUNCH_REDIRECT;

  afterEach(() => {
    import.meta.env.PROD = originalProd;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = originalPrelaunch;
  });

  it('shows return link when prelaunch gate is off', () => {
    import.meta.env.PROD = false;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = undefined;
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotAvailablePage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /return to chatxiv/i })).toHaveAttribute('href', '/');
  });

  it('hides return link when prelaunch gate is on in production', () => {
    import.meta.env.PROD = true;
    import.meta.env.VITE_APP_PRELAUNCH_REDIRECT = 'true';
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotAvailablePage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: /return to chatxiv/i })).not.toBeInTheDocument();
  });
});

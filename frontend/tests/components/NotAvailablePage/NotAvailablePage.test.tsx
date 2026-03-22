import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotAvailablePage } from '@/components/NotAvailablePage/NotAvailablePage';
import { ThemeProvider } from '@/hooks/useTheme';

describe('NotAvailablePage', () => {
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

  it('hides return link when showHomeLink is false', () => {
    renderPage(false);
    expect(screen.queryByRole('link', { name: /return to chatxiv/i })).not.toBeInTheDocument();
  });
});

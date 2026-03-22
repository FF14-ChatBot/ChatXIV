import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '@/App';
import { ThemeProvider } from '@/hooks/useTheme';

describe('App', () => {
  function renderApp(options: { initialEntries?: string[]; isProductLive?: boolean } = {}) {
    const { initialEntries, isProductLive = true } = options;
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider>
          <App isProductLive={isProductLive} />
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('renders the app with header and chat page when product is live', () => {
    renderApp();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });

  it('redirects home to unavailable when product is not live', () => {
    renderApp({ initialEntries: ['/'], isProductLive: false });
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });

  it('still serves /unavailable when product is not live', () => {
    renderApp({ initialEntries: ['/unavailable'], isProductLive: false });
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /return to chatxiv/i })).not.toBeInTheDocument();
  });

  it('renders not available page at /unavailable when product is live', () => {
    renderApp({ initialEntries: ['/unavailable'] });
    expect(screen.getByRole('heading', { name: /uh-oh\. page not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to chatxiv/i })).toBeInTheDocument();
  });
});

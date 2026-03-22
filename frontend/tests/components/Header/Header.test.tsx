import { describe, expect, it } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatSessionProvider, useChatSession } from '@/features/chat/ChatSessionContext';
import { Header } from '@/components/Header/Header';
import { ThemeProvider } from '@/hooks/useTheme';

function SessionGenerationProbe() {
  const { sessionGeneration } = useChatSession();
  return <span data-testid="session-generation">{sessionGeneration}</span>;
}

describe('Header', () => {
  it('renders brand, home link, and theme controls', () => {
    render(
      <MemoryRouter>
        <ChatSessionProvider>
          <ThemeProvider>
            <Header />
          </ThemeProvider>
        </ChatSessionProvider>
      </MemoryRouter>
    );
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

  it('toggles Island preset from the Themes submenu', async () => {
    render(
      <MemoryRouter>
        <ChatSessionProvider>
          <ThemeProvider>
            <Header />
          </ThemeProvider>
        </ChatSessionProvider>
      </MemoryRouter>
    );
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
      expect(screen.getByRole('menuitemcheckbox', { name: /island/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /island/i }));
    await waitFor(() => {
      expect(document.documentElement.dataset.themePreset).toBe('island');
    });
  });
});

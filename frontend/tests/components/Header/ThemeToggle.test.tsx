import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/Header/ThemeToggle';
import { ThemeProvider } from '@/hooks/useTheme';

describe('ThemeToggle', () => {
  it('toggles aria-label based on theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole('button');
    const label = btn.getAttribute('aria-label');
    expect(label).toMatch(/switch to (dark|light) mode/i);
    fireEvent.click(btn);
    const next = screen.getByRole('button').getAttribute('aria-label');
    expect(next).toMatch(/switch to (dark|light) mode/i);
    expect(next).not.toBe(label);
  });
});

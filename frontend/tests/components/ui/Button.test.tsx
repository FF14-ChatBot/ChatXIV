import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button/Button';
import {
  IconButton,
  GhostButton,
  OutlineButton,
  DestructiveButton,
  SecondaryButton,
  LinkButton,
} from '@/components/ui/Button';

describe('Button', () => {
  it('renders default variant', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('applies variant and size classes via props', () => {
    render(
      <Button variant="outline" size="lg" data-testid="btn">
        X
      </Button>
    );
    expect(screen.getByTestId('btn')).toBeInTheDocument();
  });

  it('supports asChild to render Slot', () => {
    render(
      <Button asChild variant="link">
        <a href="/test">Link</a>
      </Button>
    );
    expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute('href', '/test');
  });
});

describe('Button variant components', () => {
  it('renders IconButton', () => {
    render(<IconButton aria-label="icon">I</IconButton>);
    expect(screen.getByRole('button', { name: 'icon' })).toBeInTheDocument();
  });

  it('renders GhostButton', () => {
    render(<GhostButton>G</GhostButton>);
    expect(screen.getByRole('button', { name: 'G' })).toBeInTheDocument();
  });

  it('renders OutlineButton', () => {
    render(<OutlineButton>O</OutlineButton>);
    expect(screen.getByRole('button', { name: 'O' })).toBeInTheDocument();
  });

  it('renders DestructiveButton', () => {
    render(<DestructiveButton>D</DestructiveButton>);
    expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument();
  });

  it('renders SecondaryButton', () => {
    render(<SecondaryButton>S</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
  });

  it('renders LinkButton', () => {
    render(<LinkButton>L</LinkButton>);
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
  });
});

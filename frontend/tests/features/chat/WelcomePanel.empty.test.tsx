import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WelcomePanel } from '@/features/chat/WelcomePanel';

vi.mock('@/hooks/useStarterPromptSlides', () => ({
  useStarterPromptSlides: () => [],
}));

describe('WelcomePanel (no slides)', () => {
  it('renders nothing when the slide list is empty', () => {
    const { container } = render(<WelcomePanel onPromptSubmit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

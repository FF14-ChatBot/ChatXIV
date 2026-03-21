import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomePanel } from '@/components/ChatPage/WelcomePanel';

describe('WelcomePanel', () => {
  it('calls onSearchSelect when a sample card is clicked', () => {
    const onSearchSelect = vi.fn();
    render(<WelcomePanel onSearchSelect={onSearchSelect} />);

    fireEvent.click(screen.getByText('What is BiS for Melee DPS in UCoB?'));
    expect(onSearchSelect).toHaveBeenCalledWith('What is BiS for Melee DPS in UCoB?');
  });
});

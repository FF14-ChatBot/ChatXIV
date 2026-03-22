import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MammetLucideMark } from '@/components/MammetLucideMark/MammetLucideMark';

describe('MammetLucideMark', () => {
  it('renders the SVG', () => {
    const { container } = render(<MammetLucideMark />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('merges optional className onto the root span', () => {
    const { container } = render(<MammetLucideMark className="custom-mark" />);
    const span = container.firstElementChild;
    expect(span?.className).toMatch(/custom-mark/);
  });
});

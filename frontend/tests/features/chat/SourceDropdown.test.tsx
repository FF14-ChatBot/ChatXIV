import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceDropdown } from '@/features/chat/SourceDropdown';
import type { SourceCitation } from '@chatxiv/cdm';

const FULL_SOURCE: SourceCitation = {
  sourceName: 'The Lodestone',
  sourceUrl: 'https://lodestone.example.com',
  patchOrDate: 'Patch 7.1',
};

const MINIMAL_SOURCE: SourceCitation = {
  sourceName: 'XIVAPI',
};

describe('SourceDropdown', () => {
  it('renders nothing when sources is undefined', () => {
    const { container } = render(<SourceDropdown sources={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when sources is empty', () => {
    const { container } = render(<SourceDropdown sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a trigger button with "Source" text', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    expect(screen.getByRole('button', { name: /source/i })).toBeInTheDocument();
  });

  it('trigger has aria-expanded false when closed', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    const trigger = screen.getByRole('button', { name: /source/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the dropdown panel on click', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    const trigger = screen.getByRole('button', { name: /source/i });

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders source name as link when url is present', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));

    const link = screen.getByRole('link', { name: 'The Lodestone' });
    expect(link).toHaveAttribute('href', 'https://lodestone.example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders source name as plain text when url is absent', () => {
    render(<SourceDropdown sources={[MINIMAL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));

    expect(screen.getByText('XIVAPI')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'XIVAPI' })).not.toBeInTheDocument();
  });

  it('renders patch/date metadata when present', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));

    expect(screen.getByText('Last updated: Patch 7.1')).toBeInTheDocument();
  });

  it('does not render metadata line when patch/date is absent', () => {
    render(<SourceDropdown sources={[MINIMAL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));

    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
  });

  it('closes the dropdown on second click (toggle)', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    const trigger = screen.getByRole('button', { name: /source/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the dropdown on Escape key', () => {
    render(<SourceDropdown sources={[FULL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the dropdown on click outside', () => {
    render(
      <div>
        <SourceDropdown sources={[FULL_SOURCE]} />
        <button type="button">Outside</button>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /source/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders multiple sources in the panel', () => {
    render(<SourceDropdown sources={[FULL_SOURCE, MINIMAL_SOURCE]} />);
    fireEvent.click(screen.getByRole('button', { name: /source/i }));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });
});

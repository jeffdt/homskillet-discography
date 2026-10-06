import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TopBar from '../components/TopBar';

describe('TopBar', () => {
  it('shows the logo and one pressed-state button per panel', () => {
    render(<TopBar panels={{ open: ['albums'] }} onToggle={() => {}} />);
    expect(screen.getByText('HOMSKILLET')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Albums' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: 'Mixer' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(screen.getByRole('button', { name: 'Stage' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About' })).toBeTruthy();
  });

  it('toggles panels', () => {
    const onToggle = vi.fn();
    render(<TopBar panels={{ open: [] }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stage' }));
    expect(onToggle).toHaveBeenCalledWith('stage');
  });

  it('hides the logo while the title screen shows its own', () => {
    render(<TopBar panels={{ open: [] }} onToggle={() => {}} showLogo={false} />);
    expect(screen.getByText('HOMSKILLET').style.visibility).toBe('hidden');
  });
});

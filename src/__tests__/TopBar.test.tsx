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
    expect(screen.getByRole('button', { name: 'Visuals' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About' })).toBeTruthy();
  });

  it('toggles panels', () => {
    const onToggle = vi.fn();
    render(<TopBar panels={{ open: [] }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visuals' }));
    expect(onToggle).toHaveBeenCalledWith('stage');
  });

  it('hides the logo while the title screen shows its own', () => {
    render(<TopBar panels={{ open: [] }} onToggle={() => {}} showLogo={false} />);
    const logo = screen.getByText('HOMSKILLET').closest('.TopBar-logo') as HTMLElement;
    expect(logo.style.visibility).toBe('hidden');
  });

  it('glides the logo in from the title position once it appears', () => {
    const animate = vi.fn();
    (HTMLElement.prototype as any).animate = animate;
    const takeLogoHandoff = vi.fn(() => ({ left: 300, top: 400, height: 100 }));
    try {
      const { rerender } = render(
        <TopBar
          panels={{ open: [] }}
          onToggle={() => {}}
          showLogo={false}
          takeLogoHandoff={takeLogoHandoff}
        />
      );
      expect(takeLogoHandoff).not.toHaveBeenCalled();
      rerender(
        <TopBar
          panels={{ open: [] }}
          onToggle={() => {}}
          showLogo
          takeLogoHandoff={takeLogoHandoff}
        />
      );
      expect(takeLogoHandoff).toHaveBeenCalledTimes(1);
      expect(animate).toHaveBeenCalledTimes(1);
      expect(animate.mock.calls[0][0][0].transform).toMatch(/^translate\(300px, 400px\)/);
    } finally {
      delete (HTMLElement.prototype as any).animate;
    }
  });
});

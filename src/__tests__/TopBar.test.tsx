import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TopBar from '../components/TopBar';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

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
    expect(screen.getByRole('button', { name: 'Visualizer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Interface' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About' })).toBeTruthy();
  });

  it('toggles panels', () => {
    const onToggle = vi.fn();
    render(<TopBar panels={{ open: [] }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visualizer' }));
    expect(onToggle).toHaveBeenCalledWith('stage');
    fireEvent.click(screen.getByRole('button', { name: 'Interface' }));
    expect(onToggle).toHaveBeenCalledWith('interface');
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

describe('TopBar pulse', () => {
  function renderPulsing(pulsing: boolean) {
    const data = createTestAudioData();
    data.source.frame.mixSpectrum.fill(0.5);
    data.frameLoop.setPlaying(true);
    render(
      withAudioData(
        data.value,
        <TopBar panels={{ open: [] }} onToggle={() => {}} pulsing={pulsing} />
      )
    );
    const logo = screen.getByText('HOMSKILLET').closest('.TopBar-logo') as HTMLElement;
    const run = () =>
      act(() => {
        for (let i = 0; i < 30; i++) data.scheduler.tick((i * 1000) / 60);
      });
    return { data, logo, run };
  }

  it('swells the logo with the music while playing', () => {
    const { logo, run } = renderPulsing(true);
    run();
    expect(Number(logo.style.getPropertyValue('--pulse-intensity'))).toBeGreaterThan(0);
  });

  it('holds the logo still while not playing', () => {
    const { logo, run } = renderPulsing(false);
    run();
    expect(logo.style.getPropertyValue('--pulse-intensity')).toBe('0');
  });

  it('holds the logo still when the pulse is off', () => {
    const { data, logo, run } = renderPulsing(true);
    act(() => data.pulse.setEnabled(false));
    run();
    expect(logo.style.getPropertyValue('--pulse-intensity')).toBe('0');
  });
});

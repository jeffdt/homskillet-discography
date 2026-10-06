import React, { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { FrameDraw, VoiceInfo } from '../audio/data/contract';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { usePulseTarget } from '../hooks/usePulseTarget';
import { useVoices } from '../hooks/useVoices';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

function Drawer({ draw, enabled = true }: { draw: FrameDraw; enabled?: boolean }) {
  useFrameLoop('test-drawer', draw, { enabled });
  return null;
}

function VoiceNames() {
  const voices = useVoices();
  return <p>{voices.map((voice) => voice.name).join(',') || 'none'}</p>;
}

function Glow({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  usePulseTarget(ref, '--glow', active);
  return <div ref={ref} data-testid="glow" />;
}

const voice = (index: number, name: string): VoiceInfo => ({
  index,
  name,
  chip: '2A03',
  muted: false,
  soloed: false,
  audible: true,
});

describe('useFrameLoop', () => {
  it('registers while mounted and enabled, and always calls the latest draw', () => {
    const data = createTestAudioData();
    data.frameLoop.setPlaying(true);
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = render(withAudioData(data.value, <Drawer draw={first} />));
    act(() => data.scheduler.tick(0));
    expect(first).toHaveBeenCalledTimes(1);
    rerender(withAudioData(data.value, <Drawer draw={second} />));
    act(() => data.scheduler.tick(16));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    rerender(withAudioData(data.value, <Drawer draw={second} enabled={false} />));
    expect(data.frameLoop.isRunning()).toBe(false);
    rerender(withAudioData(data.value, <Drawer draw={second} />));
    expect(data.frameLoop.isRunning()).toBe(true);
    unmount();
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});

describe('useVoices', () => {
  it('follows onVoicesChanged', () => {
    const data = createTestAudioData();
    render(withAudioData(data.value, <VoiceNames />));
    expect(screen.getByText('none')).toBeTruthy();
    act(() => data.source.setVoices([voice(0, 'Square 1'), voice(2, 'Triangle')]));
    expect(screen.getByText('Square 1,Triangle')).toBeTruthy();
  });
});

describe('usePulseTarget', () => {
  it('pulses while active and writes 0 while inactive', () => {
    const data = createTestAudioData();
    data.source.frame.mixSpectrum.fill(0.4);
    data.frameLoop.setPlaying(true);
    const { rerender } = render(withAudioData(data.value, <Glow active />));
    act(() => {
      for (let i = 0; i < 30; i++) data.scheduler.tick((i * 1000) / 60);
    });
    const glow = screen.getByTestId('glow');
    expect(Number(glow.style.getPropertyValue('--glow'))).toBeGreaterThan(0.9);
    rerender(withAudioData(data.value, <Glow active={false} />));
    expect(glow.style.getPropertyValue('--glow')).toBe('0');
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});

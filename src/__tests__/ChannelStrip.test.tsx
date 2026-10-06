import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ChannelStrip, { channelColor } from '../components/mixer/ChannelStrip';
import { FLAT_SCOPE_PATH } from '../components/mixer/scopeMath';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';
import { voiceInfo } from './helpers/voices';

function renderStrip(
  voice = voiceInfo(2, 'Triangle'),
  handlers = { mute: vi.fn(), solo: vi.fn() }
) {
  const data = createTestAudioData();
  data.frameLoop.setPlaying(true);
  const view = render(
    withAudioData(
      data.value,
      <ul>
        <ChannelStrip voice={voice} onToggleMute={handlers.mute} onToggleSolo={handlers.solo} />
      </ul>
    )
  );
  const strip = view.container.querySelector('li.ChannelStrip') as HTMLElement;
  const path = view.container.querySelector('svg.ChannelStrip-scope path') as SVGPathElement;
  const fill = view.container.querySelector('.ChannelStrip-meter-fill') as HTMLElement;
  return { data, view, strip, path, fill, handlers };
}

describe('ChannelStrip', () => {
  it('shows the name and the channel color with an accent fallback', () => {
    const { strip } = renderStrip();
    expect(screen.getByText('Triangle')).toBeTruthy();
    expect(channelColor(2)).toBe('var(--ch-2, var(--accent))');
    expect(strip.style.getPropertyValue('--strip-color')).toBe('var(--ch-2, var(--accent))');
  });

  it('has visible Mute and Solo buttons that report their state', () => {
    const { handlers } = renderStrip(voiceInfo(2, 'Triangle', { muted: true, audible: false }));
    const mute = screen.getByRole('button', { name: 'Mute Triangle' });
    const solo = screen.getByRole('button', { name: 'Solo Triangle' });
    expect(mute.textContent).toBe('Mute');
    expect(solo.textContent).toBe('Solo');
    expect(mute.getAttribute('aria-pressed')).toBe('true');
    expect(solo.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(mute);
    fireEvent.click(solo);
    expect(handlers.mute).toHaveBeenCalledWith(2);
    expect(handlers.solo).toHaveBeenCalledWith(2);
  });

  it('draws a channel that is not heard as a ghost', () => {
    const heard = renderStrip();
    expect(heard.strip.classList.contains('ChannelStrip--ghost')).toBe(false);
    heard.view.unmount();
    const ghost = renderStrip(voiceInfo(2, 'Triangle', { audible: false }));
    expect(ghost.strip.classList.contains('ChannelStrip--ghost')).toBe(true);
    expect(screen.getByText('not heard')).toBeTruthy();
  });

  it('starts flat and draws the scope and meter from the frame', () => {
    const { data, path, fill } = renderStrip();
    expect(path.getAttribute('d')).toBe(FLAT_SCOPE_PATH);
    data.source.frame.voices[2].waveform.fill(0.5);
    data.source.frame.voices[2].rms = 1;
    data.scheduler.tick(16);
    expect(path.getAttribute('d')!.startsWith('M0 8.5L1 8.5')).toBe(true);
    expect(fill.style.getPropertyValue('--level')).toBe('1.00');
  });

  it('keeps drawing a muted channel from its pre-mute waveform', () => {
    const { data, path } = renderStrip(voiceInfo(2, 'Triangle', { muted: true, audible: false }));
    data.source.frame.voices[2].waveform.fill(-1);
    data.scheduler.tick(16);
    expect(path.getAttribute('d')!.startsWith('M0 31L')).toBe(true);
  });

  it('skips DOM writes when nothing changed', () => {
    const { data, path, fill } = renderStrip();
    data.source.frame.voices[2].waveform.fill(0.25);
    data.source.frame.voices[2].rms = 0.5;
    data.scheduler.tick(16);
    const setAttribute = vi.spyOn(path, 'setAttribute');
    const setProperty = vi.spyOn(fill.style, 'setProperty');
    data.scheduler.tick(32);
    expect(setAttribute).not.toHaveBeenCalled();
    expect(setProperty).not.toHaveBeenCalled();
  });

  it('keeps its drawing when React re-renders it for a mute change', () => {
    const { data, view, path } = renderStrip();
    data.source.frame.voices[2].waveform.fill(0.5);
    data.scheduler.tick(16);
    const drawn = path.getAttribute('d');
    view.rerender(
      withAudioData(
        data.value,
        <ul>
          <ChannelStrip
            voice={voiceInfo(2, 'Triangle', { muted: true, audible: false })}
            onToggleMute={vi.fn()}
            onToggleSolo={vi.fn()}
          />
        </ul>
      )
    );
    expect(path.getAttribute('d')).toBe(drawn);
  });

  it('stops drawing when removed', () => {
    const { data, view } = renderStrip();
    expect(data.frameLoop.isRunning()).toBe(true);
    view.unmount();
    expect(data.frameLoop.isRunning()).toBe(false);
  });

  it('holds its last drawing while paused and draws again on resume', () => {
    const { data, path, fill } = renderStrip();
    data.source.frame.voices[2].waveform.fill(0.5);
    data.source.frame.voices[2].rms = 1;
    data.scheduler.tick(16);
    const drawnPath = path.getAttribute('d');
    const drawnLevel = fill.style.getPropertyValue('--level');
    expect(drawnLevel).toBe('1.00');

    data.frameLoop.setPlaying(false);
    data.source.frame.voices[2].waveform.fill(-1);
    data.source.frame.voices[2].rms = 0;
    data.scheduler.tick(32);
    expect(path.getAttribute('d')).toBe(drawnPath);
    expect(fill.style.getPropertyValue('--level')).toBe(drawnLevel);

    data.frameLoop.setPlaying(true);
    data.scheduler.tick(48);
    expect(path.getAttribute('d')!.startsWith('M0 31L')).toBe(true);
    expect(fill.style.getPropertyValue('--level')).toBe('0.00');
  });
});

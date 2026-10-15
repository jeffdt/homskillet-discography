import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadDialog from '../components/DownloadDialog';
import { ToastContext } from '../components/ToastProvider';
import { UserContext } from '../components/UserProvider';
import { ExportRequest } from '../audio/export/exportTypes';
import { saveBlob } from '../audio/export/exportTrack';
import { PlaybackState } from '../types/playback';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';
import { voiceInfo } from './helpers/voices';

vi.mock('../audio/export/exportTrack', () => ({ saveBlob: vi.fn(), exportTrack: vi.fn() }));

const playback: PlaybackState = {
  ready: true,
  ejected: false,
  paused: false,
  songUrl: '/music/Bazaar/groove.nsf',
  durationMs: 180000,
  tempo: 1,
  numVoices: 3,
  voiceMask: [true, true, true],
  voiceNames: ['Square 1', 'Square 2', 'Triangle'],
  voiceGroups: [],
  paramDefs: [],
  paramValues: { subbass: 0, stereoWidth: 1 },
  playerKey: 'gme',
  volume: 100,
  shuffle: false,
  repeat: false,
  stubMode: false,
};

const VOICES = [voiceInfo(0, 'Square 1'), voiceInfo(1, 'Square 2'), voiceInfo(2, 'Triangle')];

function setup(
  overrides: { playback?: Partial<PlaybackState>; settings?: Record<string, any> } = {}
) {
  const audio = createTestAudioData();
  audio.source.setVoices(VOICES);
  const updateSettings = vi.fn();
  const enqueueToast = vi.fn();
  const onClose = vi.fn();
  const requests: ExportRequest[] = [];
  const signals: AbortSignal[] = [];
  let settle = {
    resolve: (_blob: Blob) => {},
    reject: (_error: unknown) => {},
  };
  const exporter = vi.fn((request: ExportRequest, options: { signal?: AbortSignal } = {}) => {
    requests.push(request);
    signals.push(options.signal!);
    return new Promise<Blob>((resolve, reject) => {
      settle = { resolve, reject };
    });
  });
  const settings = { showPlayerSettings: true, channelPalette: 'x', ...overrides.settings };
  globalThis.fetch = vi.fn(async () => new Response(new ArrayBuffer(16))) as any;
  render(
    withAudioData(
      audio.value,
      <UserContext.Provider value={{ settings, updateSettings, replaceSettings: vi.fn() }}>
        <ToastContext.Provider
          value={{
            enqueueToast,
            clearCurrentToast: vi.fn(),
            currentToast: undefined,
            toastCount: 0,
          }}
        >
          <DownloadDialog
            title="Groove"
            album="Bazaar"
            songUrl={playback.songUrl!}
            playback={{ ...playback, ...overrides.playback }}
            settings={settings}
            onClose={onClose}
            exporter={exporter as any}
          />
        </ToastContext.Provider>
      </UserContext.Provider>
    )
  );
  return {
    audio,
    updateSettings,
    enqueueToast,
    onClose,
    exporter,
    requests,
    signals,
    resolve: (blob: Blob) => settle.resolve(blob),
    reject: (error: unknown) => settle.reject(error),
  };
}

const lengthField = () => screen.getByLabelText('Length') as HTMLInputElement;
const downloadButton = () => screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement;

beforeEach(() => vi.mocked(saveBlob).mockClear());

describe('DownloadDialog', () => {
  it('prefills the length with the duration plus the end fade', () => {
    setup();
    expect(lengthField().value).toBe('3:04');
  });

  it('marks its backdrop as a modal layer so open panels ignore presses in it', () => {
    setup();
    expect(screen.getByRole('dialog').parentElement!.hasAttribute('data-modal-layer')).toBe(true);
  });

  it('hides the mix choice when nothing differs from the original', () => {
    setup();
    expect(screen.queryByRole('radio', { name: 'My mix' })).toBeNull();
  });

  it('shows the mix choice and summary when the mix differs', () => {
    setup({ playback: { tempo: 1.1 } });
    expect((screen.getByRole('radio', { name: 'My mix' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Speed 110%')).toBeTruthy();
  });

  it('updates the summary live when voices change', () => {
    const { audio } = setup();
    act(() =>
      audio.source.setVoices([
        VOICES[0],
        VOICES[1],
        voiceInfo(2, 'Triangle', { muted: true, audible: false }),
      ])
    );
    expect(screen.getByText('Triangle muted')).toBeTruthy();
  });

  it('warns about long WAVs without disabling Download', () => {
    setup({ settings: { downloadFormat: 'wav' } });
    fireEvent.change(lengthField(), { target: { value: '5:01' } });
    expect(screen.getByRole('status').textContent).toContain('Long WAV');
    expect(downloadButton().disabled).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: 'MP3' }));
    expect(screen.queryByText(/Long WAV/)).toBeNull();
  });

  it.each(['abc', '3:75', '', '0:04', '10:01'])('disables Download for %j', (value) => {
    setup();
    fireEvent.change(lengthField(), { target: { value } });
    expect(downloadButton().disabled).toBe(true);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('blocks a silent mix but still allows the original', () => {
    const { audio } = setup();
    act(() =>
      audio.source.setVoices([
        voiceInfo(0, 'Square 1', { soloed: true, muted: true, audible: false }),
        voiceInfo(1, 'Square 2', { audible: false }),
        voiceInfo(2, 'Triangle', { audible: false }),
      ])
    );
    expect(downloadButton().disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      'Every voice is silent in your mix. Unmute one, or choose Original.'
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Original' }));
    expect(downloadButton().disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('remembers the chosen format', () => {
    const { updateSettings } = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'WAV' }));
    expect(updateSettings).toHaveBeenCalledWith({ downloadFormat: 'wav' });
  });

  it('exports the mix captured at Download, then saves and toasts', async () => {
    const { audio, requests, resolve, enqueueToast, onClose } = setup({
      playback: { tempo: 1.5 },
    });
    fireEvent.change(lengthField(), { target: { value: '0:10' } });
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    act(() => audio.source.setVoices([voiceInfo(0, 'Square 1', { muted: true, audible: false })]));
    expect(requests[0]).toMatchObject({
      format: 'mp3',
      lengthMs: 10000,
      path: '/music/Bazaar/groove.nsf',
      tags: { title: 'Groove (custom mix)', artist: 'homskillet', album: 'Bazaar' },
    });
    expect(requests[0].settings.tempo).toBe(1.5);
    expect(requests[0].levels.gains.slice(0, 3)).toEqual([1, 1, 1]);
    await act(async () => resolve(new Blob(['x'])));
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'homskillet - Groove (custom mix).mp3');
    expect(enqueueToast).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('exports the original when chosen', async () => {
    const { requests } = setup({ playback: { tempo: 1.5 } });
    fireEvent.click(screen.getByRole('radio', { name: 'Original' }));
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    expect(requests[0].settings.tempo).toBe(1);
    expect(requests[0].tags.title).toBe('Groove');
  });

  it('cancels on Escape: aborts, never saves or toasts', async () => {
    const { signals, onClose, enqueueToast, reject } = setup();
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(signals[0].aborted).toBe(true);
    expect(onClose).toHaveBeenCalled();
    await act(async () => reject(new DOMException('Export cancelled', 'AbortError')));
    expect(saveBlob).not.toHaveBeenCalled();
    expect(enqueueToast).not.toHaveBeenCalled();
  });

  it('cancels on Escape even when focus has left the dialog', async () => {
    const { signals, onClose } = setup();
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    (document.activeElement as HTMLElement | null)?.blur();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(signals[0].aborted).toBe(true);
    expect(onClose).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps page shortcuts from acting while it is open', () => {
    setup();
    (document.activeElement as HTMLElement | null)?.blur();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ['mp3', 'Generating MP3…'],
    ['wav', 'Generating WAV…'],
  ])('says what it is generating while the %s renders', async (format, text) => {
    const { resolve } = setup({ settings: { downloadFormat: format } });
    expect(screen.queryByText(text)).toBeNull();
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    expect(screen.getByText(text)).toBeTruthy();
    await act(async () => resolve(new Blob(['x'])));
  });

  it('moves focus to Cancel when rendering starts', async () => {
    setup();
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('wraps Tab focus inside the dialog', () => {
    setup();
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const first = radios.find((radio) => radio.checked)!;
    downloadButton().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(downloadButton());
  });

  it('shows an error inline and allows a retry', async () => {
    const { reject, exporter } = setup();
    await act(async () => {
      fireEvent.click(downloadButton());
    });
    await act(async () => reject(new Error('gme_load_data failed')));
    expect(screen.getByRole('alert').textContent).toContain('gme_load_data failed');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    expect(exporter).toHaveBeenCalledTimes(2);
  });
});

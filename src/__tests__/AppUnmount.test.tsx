import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../components/App';

const { engine, pending, attach } = vi.hoisted(() => ({
  engine: { kind: 'worklet', context: {}, dispose: vi.fn(), setVolume: vi.fn(), on: vi.fn() },
  pending: { resolve: (_engine: unknown) => {} },
  attach: vi.fn(),
}));

vi.mock('../audio/engine/createAudioEngine', () => ({
  createUnlockedAudioContext: () => ({}),
  createAudioEngine: () =>
    new Promise((resolve) => {
      pending.resolve = resolve;
    }),
}));
vi.mock('../audio/data/createAudioData', () => ({
  createAudioData: () => ({
    source: { attach },
    frameLoop: { setPlaying: vi.fn() },
    dispose: vi.fn(),
  }),
}));
vi.mock('../components/AppShell', () => ({ default: () => null }));

describe('App unmount while the audio engine is starting', () => {
  it('disposes the late engine instead of attaching it to the disposed source', async () => {
    const { unmount } = render(<App />);
    unmount();
    pending.resolve(engine);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(attach).not.toHaveBeenCalled();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });
});

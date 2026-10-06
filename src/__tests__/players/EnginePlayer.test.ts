// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../../audio/engine/AudioEngine';
import { LoadSupersededError } from '../../audio/errors';
import { TrackInfo } from '../../audio/types';
import EnginePlayer from '../../players/EnginePlayer';

const TRACK: TrackInfo = {
  metadata: { title: 'Parkour', game: 'SuperFORE!' },
  durationMs: 180000,
  voices: [
    { index: 0, name: 'Square 1' },
    { index: 1, name: 'Saw Wave' },
  ],
  gmeVoiceCount: 2,
};

function fakeEngine() {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const engine = {
    kind: 'stub',
    load: vi.fn(() => Promise.resolve(TRACK)),
    stop: vi.fn(),
    setPaused: vi.fn(),
    seek: vi.fn(),
    isSeeking: vi.fn(() => false),
    getPositionMs: vi.fn(() => 1234),
    setTempo: vi.fn(),
    setStereoWidth: vi.fn(),
    setSubBass: vi.fn(),
    setLoopForever: vi.fn(),
    getVoiceMix: vi.fn(),
    setVoiceMix: vi.fn(),
    setVolume: vi.fn(),
    readTaps: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      (listeners[event] = listeners[event] || []).push(callback);
      return () => {};
    }),
  };
  const fire = (event: string, ...args: unknown[]) =>
    (listeners[event] || []).forEach((callback) => callback(...args));
  return { engine, fire, player: new EnginePlayer(engine as unknown as AudioEngine) };
}

describe('EnginePlayer', () => {
  it('keeps the gme player key and GME formats', () => {
    const { player } = fakeEngine();
    expect(player.playerKey).toBe('gme');
    expect(player.canPlay('NSFE')).toBe(true);
    expect(player.getParamDefs().map((d) => d.id)).toEqual(['subbass', 'stereoWidth']);
  });

  it('loads with persisted settings and reports the new track', async () => {
    const { engine, player } = fakeEngine();
    const updates: any[] = [];
    player.on('playerStateUpdate', (state) => updates.push(state));
    await player.loadData(new Uint8Array(4), '/SuperFORE!/parkour.nsf', {
      tempo: 1.25,
      'gme.subbass': 0.4,
      'gme.stereoWidth': 0.6,
    });
    expect(engine.load).toHaveBeenCalledWith(expect.any(Uint8Array), '/SuperFORE!/parkour.nsf', {
      tempo: 1.25,
      stereoWidth: 0.6,
      subBass: 0.4,
      loopForever: false,
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      isStopped: false,
      isPaused: false,
      durationMs: 180000,
      numVoices: 2,
      voiceNames: ['Square 1', 'Saw Wave'],
      voiceMask: [true, true],
      tempo: 1.25,
      metadata: TRACK.metadata,
      positionMs: 1234,
    });
    expect(player.isPlaying()).toBe(true);
  });

  it('ignores a superseded load', async () => {
    const { engine, player } = fakeEngine();
    engine.load.mockImplementationOnce(() => Promise.reject(new LoadSupersededError()));
    const updates = vi.fn();
    player.on('playerStateUpdate', updates);
    await expect(player.loadData(new Uint8Array(4), '/A/1.nsf', {})).resolves.toBeUndefined();
    expect(updates).not.toHaveBeenCalled();
  });

  it('a failed load throws without reporting a stop', async () => {
    const { engine, player } = fakeEngine();
    engine.load.mockImplementationOnce(() => Promise.reject(new Error('bad file')));
    const updates = vi.fn();
    player.on('playerStateUpdate', updates);
    await expect(player.loadData(new Uint8Array(4), '/A/bad.nsf', {})).rejects.toThrow('bad file');
    expect(updates).not.toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
  });

  it('reports a stop when the engine says the track ended', async () => {
    const { fire, player } = fakeEngine();
    await player.loadData(new Uint8Array(4), '/A/1.nsf', {});
    const updates: any[] = [];
    player.on('playerStateUpdate', (state) => updates.push(state));
    fire('ended');
    expect(updates).toEqual([{ isStopped: true }]);
    expect(player.isPlaying()).toBe(false);
  });

  it('leaves engine errors to the app instead of emitting playerError', () => {
    const { fire, player } = fakeEngine();
    const errors = vi.fn();
    player.on('playerError', errors);
    fire('error', 'boom');
    expect(errors).not.toHaveBeenCalled();
  });

  it('maps the voice mask to mutes', async () => {
    const { engine, player } = fakeEngine();
    await player.loadData(new Uint8Array(4), '/A/1.nsf', {});
    player.setVoiceMask([true, false]);
    expect(engine.setVoiceMix).toHaveBeenCalledWith({
      muted: [false, true, false, false, false, false, false, false],
      soloed: [false, false, false, false, false, false, false, false],
    });
    expect(player.getVoiceMask()).toEqual([true, false]);
  });

  it('forwards pause, suspend, seek, tempo, lock and params', async () => {
    const { engine, player } = fakeEngine();
    await player.loadData(new Uint8Array(4), '/A/1.nsf', {});
    expect(player.togglePause()).toBe(true);
    expect(engine.setPaused).toHaveBeenLastCalledWith(true);
    player.seekMs(5000);
    expect(engine.seek).toHaveBeenCalledWith(5000);
    player.setTempo(1.5);
    expect(engine.setTempo).toHaveBeenCalledWith(1.5);
    expect(player.getTempo()).toBe(1.5);
    player.setLocked(true);
    expect(engine.setLoopForever).toHaveBeenCalledWith(true);
    player.setParameter('subbass', '1.5');
    expect(engine.setSubBass).toHaveBeenLastCalledWith(1.5);
    player.setParameter('stereoWidth', 0.25);
    expect(engine.setStereoWidth).toHaveBeenLastCalledWith(0.25);
    player.suspend();
    expect(engine.setPaused).toHaveBeenLastCalledWith(true);
  });

  it('stop stops the engine and reports it', async () => {
    const { engine, player } = fakeEngine();
    await player.loadData(new Uint8Array(4), '/A/1.nsf', {});
    const updates: any[] = [];
    player.on('playerStateUpdate', (state) => updates.push(state));
    player.stop();
    expect(engine.stop).toHaveBeenCalled();
    expect(updates).toEqual([{ isStopped: true }]);
    expect(player.getDurationMs()).toBe(0);
  });
});

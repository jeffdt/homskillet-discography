// @vitest-environment node
import { describe, expect, it } from 'vitest';
import Player from '../../players/Player';
import { PlayerMetadata } from '../../types/player';

class TestPlayer extends Player {
  constructor() {
    super();
    this.playerKey = 'test';
    this.fileExtensions = ['nsf', 'nsfe'];
    this.paramDefs = [{ id: 'gain', label: 'Gain', type: 'number', defaultValue: 0.5 }];
  }
  async loadData(): Promise<void> {
    this.resume();
  }
  stop(): void {
    this.suspend();
  }
  isPlaying(): boolean {
    return !this.paused && !this.stopped;
  }
  getTempo(): number {
    return 1;
  }
  setTempo(): void {}
  getDurationMs(): number {
    return 1000;
  }
  getPositionMs(): number {
    return 0;
  }
  seekMs(): void {}
  getVoiceName(index: number): string | undefined {
    return ['A', 'B'][index];
  }
  getVoiceMask(): boolean[] {
    return [true, true];
  }
  setVoiceMask(): void {}
  getNumVoices(): number {
    return 2;
  }
  getMetadata(): PlayerMetadata {
    return { title: 'T' };
  }
  getParameter(id: string): any {
    return this.params[id];
  }
  setParameter(id: string, value: any): void {
    this.params[id] = value;
  }
}

describe('Player state machine', () => {
  it('starts stopped and paused', () => {
    const player = new TestPlayer();
    expect(player.isPaused()).toBe(true);
    expect(player.getBasePlayerState().isStopped).toBe(true);
  });

  it('plays after loading, pauses and unpauses with togglePause', async () => {
    const player = new TestPlayer();
    await player.loadData();
    expect(player.isPlaying()).toBe(true);
    expect(player.togglePause()).toBe(true);
    expect(player.isPlaying()).toBe(false);
    expect(player.togglePause()).toBe(false);
    expect(player.isPlaying()).toBe(true);
  });

  it('ignores togglePause while stopped', () => {
    const player = new TestPlayer();
    expect(player.togglePause()).toBe(true);
    expect(player.togglePause()).toBe(true);
    expect(player.isPlaying()).toBe(false);
  });

  it('returns to stopped on stop, and suspend also pauses', async () => {
    const player = new TestPlayer();
    await player.loadData();
    player.stop();
    expect(player.getBasePlayerState()).toMatchObject({ isStopped: true, isPaused: true });
  });

  it('tracks the lock state', () => {
    const player = new TestPlayer();
    expect(player.getIsLocked()).toBe(false);
    player.setLocked(true);
    expect(player.getIsLocked()).toBe(true);
    player.setLocked(false);
    expect(player.getIsLocked()).toBe(false);
  });

  it('matches file extensions case-insensitively', () => {
    const player = new TestPlayer();
    expect(player.canPlay('NSF')).toBe(true);
    expect(player.canPlay('nsfe')).toBe(true);
    expect(player.canPlay('mid')).toBe(false);
  });

  it('resolves params: transient, then persisted, then default', () => {
    const player = new TestPlayer();
    expect(player.resolveParamValue('gain', 0.9, { 'test.gain': 0.1 })).toBe(0.9);
    expect(player.resolveParamValue('gain', undefined, { 'test.gain': 0.1 })).toBe(0.1);
    expect(player.resolveParamValue('gain', undefined, {})).toBe(0.5);
    player.resolveParamValues({ 'test.gain': 0.2 });
    expect(player.getParamValues()).toEqual({ gain: 0.2 });
  });

  it('builds the base state the Sequencer forwards', async () => {
    const player = new TestPlayer();
    await player.loadData();
    expect(player.getBasePlayerState()).toMatchObject({
      metadata: { title: 'T' },
      durationMs: 1000,
      numVoices: 2,
      voiceNames: ['A', 'B'],
      voiceMask: [true, true],
      isStopped: false,
      isPaused: false,
    });
  });
});

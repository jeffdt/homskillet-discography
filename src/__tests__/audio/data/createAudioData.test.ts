// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createAudioData } from '../../../audio/data/createAudioData';
import { ManualScheduler } from '../../helpers/frameHarness';

describe('createAudioData', () => {
  it('starts with nothing to draw', () => {
    const data = createAudioData({ scheduler: new ManualScheduler() });
    data.frameLoop.setPlaying(true);
    expect(data.frameLoop.isRunning()).toBe(false);
    expect(data.source.getVoices()).toEqual([]);
  });

  it('reads every voice spectrum each frame when asked to, until disposed', () => {
    const scheduler = new ManualScheduler();
    const data = createAudioData({ scheduler, forceVoiceSpectra: true });
    const reads = [0, 0];
    const frame = {
      voiceCount: 2,
      voices: reads.map((_, v) => ({
        get spectrum() {
          reads[v]++;
          return new Float32Array(0);
        },
      })),
    };
    vi.spyOn(data.source, 'readFrame').mockReturnValue(frame as any);
    data.frameLoop.setPlaying(true);
    expect(data.frameLoop.isRunning()).toBe(true);
    scheduler.tick(0);
    expect(reads).toEqual([1, 1]);
    scheduler.tick(16);
    expect(reads).toEqual([2, 2]);
    data.dispose();
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});

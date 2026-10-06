// @vitest-environment node
import { describe, expect, it } from 'vitest';
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
    data.frameLoop.setPlaying(true);
    expect(data.frameLoop.isRunning()).toBe(true);
    scheduler.tick(0);
    data.dispose();
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});

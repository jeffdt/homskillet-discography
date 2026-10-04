// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { framesToReach } from '../../audio/render/seekPlan';

describe('framesToReach', () => {
  it('converts song time to output frames at tempo 1', () => {
    expect(framesToReach(0, 1000, 1, 48000)).toBe(48000);
  });

  it('needs fewer output frames at faster tempos and more at slower ones', () => {
    expect(framesToReach(0, 1000, 2, 48000)).toBe(24000);
    expect(framesToReach(0, 1000, 0.5, 48000)).toBe(96000);
  });

  it('does not round exact results up', () => {
    expect(framesToReach(4, 30000, 1.5, 48000)).toBe(959872);
  });

  it('always asks for at least one frame', () => {
    expect(framesToReach(1000, 1000, 1, 48000)).toBe(1);
  });
});

import { smoothToward } from '../audio/data/levels';

/** Ripple tuning (the Interface panel's time slider ripple settings). */
export interface RippleSettings {
  /** Tallest ripple in px, reached by the hardest hits. */
  heightPx: number;
  /** How fast a ripple travels back down the played bar. */
  speedPxPerSec: number;
  /** 0..100: higher starts ripples on smaller jumps in level. */
  sensitivity: number;
}

export const DEFAULT_RIPPLE_SETTINGS: RippleSettings = {
  heightPx: 6,
  speedPxPerSec: 120,
  sensitivity: 50,
};

/** Distance between wave crests in a ripple. */
export const RIPPLE_WAVELENGTH_PX = 14;
/** After a hit, no new ripple starts for this long, so one hit makes one ripple. */
export const HIT_LOCKOUT_MS = 120;
/** Time constant of the running average a hit must jump above. */
const AVERAGE_MS = 400;
/** The recent peak a jump is measured against falls by 1/e every this many ms... */
const PEAK_MS = 4000;
/** ...and never counts as lower than this, so near-silence does not ripple on noise. */
const PEAK_FLOOR = 0.02;
/** A ripple's height falls by 1/e every this many ms. */
const DECAY_MS = 700;
/** Width of a ripple's envelope (Gaussian sigma). */
const ENVELOPE_PX = RIPPLE_WAVELENGTH_PX * 0.6;
/** A ripple is removed once its whole envelope has passed x = 0... */
const TAIL_PX = ENVELOPE_PX * 3;
/** ...or once it is shorter than this. */
const MIN_HEIGHT_PX = 0.05;
/** Most ripples alive at once; older ones are dropped first. */
const MAX_RIPPLES = 8;

/**
 * How big a jump above the running average starts a ripple, as a fraction of the recent peak
 * level. Relative to the peak so quiet and loud tracks ripple at similar rates (measured
 * 2026-10-16 over the catalog: at 50, most tracks ripple 0.5 to 2.5 times a second).
 */
export function requiredFraction(sensitivity: number): number {
  const s = Math.min(Math.max(sensitivity, 0), 100) / 100;
  return 0.6 - 0.5 * s;
}

/** One ripple; frontX and ageMs advance with RippleField.step. */
export interface Ripple {
  frontX: number;
  ageMs: number;
  /** Starting height in px, before decay. */
  amplitude: number;
}

/**
 * Beat ripples for the time slider. Each frame takes the unsmoothed pulse level and the playhead
 * x; a level that jumps far enough above its own running average, measured against the recent
 * peak, starts a ripple at the playhead, which then travels left as a decaying wave packet.
 * displacement(x) is the sum of every live ripple.
 */
export class RippleField {
  private settings: RippleSettings;
  private list: Ripple[] = [];
  private average: number | null = null;
  private peak = 0;
  private lockoutMs = 0;

  constructor(settings: RippleSettings = DEFAULT_RIPPLE_SETTINGS) {
    this.settings = settings;
  }

  configure(settings: RippleSettings): void {
    this.settings = settings;
  }

  get ripples(): readonly Ripple[] {
    return this.list;
  }

  /** Ages every ripple by dtMs, then starts one at playheadX if level is a hit. Returns whether it did. */
  step(level: number, playheadX: number, dtMs: number): boolean {
    const { speedPxPerSec, heightPx, sensitivity } = this.settings;
    this.list = this.list.filter((ripple) => {
      ripple.ageMs += dtMs;
      ripple.frontX -= (speedPxPerSec * dtMs) / 1000;
      return ripple.frontX > -TAIL_PX && this.heightOf(ripple) > MIN_HEIGHT_PX;
    });
    this.lockoutMs = Math.max(0, this.lockoutMs - dtMs);
    this.peak = Math.max(level, this.peak * Math.exp(-dtMs / PEAK_MS));

    if (this.average === null) {
      this.average = level;
      return false;
    }
    const jump = level - this.average;
    this.average = smoothToward(this.average, level, dtMs, AVERAGE_MS, AVERAGE_MS);
    const required = requiredFraction(sensitivity) * Math.max(this.peak, PEAK_FLOOR);
    if (jump < required || this.lockoutMs > 0) return false;

    const strength = Math.min(Math.max(jump / (2 * required), 0.5), 1);
    this.list.push({
      frontX: playheadX,
      ageMs: 0,
      amplitude: heightPx * strength,
    });
    if (this.list.length > MAX_RIPPLES) this.list.shift();
    this.lockoutMs = HIT_LOCKOUT_MS;
    return true;
  }

  /** Vertical offset in px at x: every live ripple's decaying sine packet, added together. */
  displacement(x: number): number {
    let sum = 0;
    for (const ripple of this.list) {
      const d = x - ripple.frontX;
      if (d > TAIL_PX || d < -TAIL_PX) continue;
      const envelope = Math.exp(-(d * d) / (2 * ENVELOPE_PX * ENVELOPE_PX));
      sum += this.heightOf(ripple) * envelope * Math.sin((2 * Math.PI * d) / RIPPLE_WAVELENGTH_PX);
    }
    return sum;
  }

  /** Removes every ripple; the next level restarts the running average. */
  clear(): void {
    this.list = [];
    this.average = null;
    this.peak = 0;
    this.lockoutMs = 0;
  }

  private heightOf(ripple: Ripple): number {
    return ripple.amplitude * Math.exp(-ripple.ageMs / DECAY_MS);
  }
}

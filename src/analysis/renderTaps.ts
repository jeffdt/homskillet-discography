import { TAP_DECIMATION, TAP_RING } from '../audio/constants';
import { ChipRenderer } from '../audio/render/ChipRenderer';
import { TapRing } from '../audio/taps/TapRing';
import { ChipCore, RendererSettings, TrackInfo } from '../audio/types';

/** Output rate the analysis renders at, the app's usual context rate. */
export const ANALYSIS_SAMPLE_RATE = 48000;
/** Tap samples per second at that rate. */
export const ANALYSIS_TAP_RATE = ANALYSIS_SAMPLE_RATE / TAP_DECIMATION;
/** One analysis frame is one 60 fps video frame. */
export const ANALYSIS_FRAME_MS = 1000 / 60;
/** Output frames rendered per analysis frame. */
export const FRAME_OUTPUT_FRAMES = ANALYSIS_SAMPLE_RATE / 60;

const SETTINGS: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };
const RING_MASK = TAP_RING - 1;

/** A loaded track rendered headless one 60 fps frame at a time, taps in a TapRing. */
export class TapRender {
  readonly info: TrackInfo;
  readonly taps = new TapRing();
  private readonly renderer: ChipRenderer;
  private readonly left = new Float32Array(FRAME_OUTPUT_FRAMES);
  private readonly right = new Float32Array(FRAME_OUTPUT_FRAMES);
  private lastWriteIndex = 0;

  constructor(core: ChipCore, bytes: Uint8Array, path: string) {
    this.renderer = new ChipRenderer(core, ANALYSIS_SAMPLE_RATE, () => {}, this.taps);
    this.info = this.renderer.load(bytes, '/' + path, SETTINGS);
  }

  /** Frames to analyze: the whole track, or maxSeconds of it. */
  frameCount(maxSeconds = Infinity): number {
    // The epsilon keeps whole seconds whole: 3000 / (1000 / 60) is 179.99999999999997 in floats.
    return Math.floor(Math.min(this.info.durationMs, maxSeconds * 1000) / ANALYSIS_FRAME_MS + 1e-9);
  }

  /** Renders one frame and returns how many new tap samples it wrote per voice. */
  step(): number {
    this.renderer.render(this.left, this.right);
    const writeIndex = this.taps.writeIndex;
    const fresh = (writeIndex - this.lastWriteIndex) | 0;
    this.lastWriteIndex = writeIndex;
    return fresh;
  }

  /** Voice v's tap sample `back` samples before the newest (0 is the newest). */
  sample(voice: number, back: number): number {
    return this.taps.samples[voice * TAP_RING + ((this.taps.writeIndex - 1 - back) & RING_MASK)];
  }

  /** Copies voice v's newest dest.length tap samples into dest, oldest first. */
  copyNewest(voice: number, dest: Float32Array): void {
    const n = dest.length;
    for (let i = 0; i < n; i++) dest[i] = this.sample(voice, n - 1 - i);
  }
}

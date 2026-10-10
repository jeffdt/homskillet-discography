import { VOICE_PAIRS } from '../audio/constants';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { Rgb, parseHexColor } from './color';

/** Voices quieter than this (VoiceData.rms) are skipped, so their spectra are never computed. */
export const SILENT_VOICE_RMS = 0.001;
/** Bin colors move toward their target with this time constant, which hides frame-to-frame flicker. */
export const COLOR_SMOOTHING_MS = 50;
/**
 * Bin colors weight each voice by spectrum^8 (power^4): the loudest voice in a bin dominates and a
 * quieter one tints it. Measured 2026-10-10: power^2 let quiet spill gray every overlap.
 */
export const AVERAGE_WEIGHT_POWER = 8;

/**
 * Decides each spectrum bin's color from the voices sounding in it (spec 5.5): the channel colors
 * of the audible voices, averaged with power^4 weights so the loudest voice dominates, then
 * stretched back to the voices' mean saturation. The mix spectrum still
 * decides how loud the bin is; this only decides its color. Muted and unsoloed voices add nothing
 * and their spectra are never computed. A bin no audible voice reaches keeps its last color.
 */
export class BinColorizer {
  private readonly colors: Float32Array;
  private readonly channelRgb = new Float32Array(VOICE_PAIRS * 3);
  private readonly channelChroma = new Float32Array(VOICE_PAIRS);
  private readonly audible = new Uint8Array(VOICE_PAIRS);
  private readonly activeVoices = new Int32Array(VOICE_PAIRS);
  private readonly activeSpectra: Float32Array[] = [];

  constructor(
    private readonly bins: number,
    private readonly fallback: Rgb
  ) {
    this.colors = new Float32Array(bins * 3);
    for (let v = 0; v < VOICE_PAIRS; v++) this.setChannelRgb(v, fallback);
    this.reset();
  }

  /** Channel colors as '#rrggbb', indexed by voice; unparsable entries use the fallback. */
  setChannelColors(colors: readonly string[]): void {
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const rgb = (colors.length && parseHexColor(colors[v % colors.length])) || this.fallback;
      this.setChannelRgb(v, rgb);
    }
  }

  private setChannelRgb(v: number, rgb: Rgb): void {
    this.channelRgb.set(rgb, v * 3);
    this.channelChroma[v] = Math.max(...rgb) - Math.min(...rgb);
  }

  /** Which voices are heard (VoiceInfo.audible); voices not listed are not. */
  setVoices(voices: readonly VoiceInfo[]): void {
    this.audible.fill(0);
    voices.forEach((voice) => {
      if (voice.index >= 0 && voice.index < VOICE_PAIRS)
        this.audible[voice.index] = voice.audible ? 1 : 0;
    });
  }

  /** Every bin back to the fallback color. */
  reset(): void {
    for (let b = 0; b < this.bins; b++) this.colors.set(this.fallback, b * 3);
  }

  /** Updates and returns r, g, b (0..255) per bin, interleaved. Reused: read it before the next update. */
  update(frame: VoiceFrame, dtMs: number): Float32Array {
    const alpha = dtMs > 0 ? 1 - Math.exp(-dtMs / COLOR_SMOOTHING_MS) : 1;
    const spectra = this.activeSpectra;
    spectra.length = 0;
    const voiceCount = Math.min(frame.voiceCount, VOICE_PAIRS);
    for (let v = 0; v < voiceCount; v++) {
      if (!this.audible[v]) continue;
      const voice = frame.voices[v];
      if (!(voice.rms >= SILENT_VOICE_RMS)) continue;
      this.activeVoices[spectra.length] = v;
      spectra.push(voice.spectrum);
    }
    const count = spectra.length;
    if (count === 0) return this.colors;
    const rgb = this.channelRgb;
    const colors = this.colors;
    for (let b = 0; b < this.bins; b++) {
      let total = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      let chroma = 0;
      for (let k = 0; k < count; k++) {
        const s = spectra[k][b];
        const s2 = s * s;
        const s4 = s2 * s2;
        // Spectra hold square-rooted amplitudes: s^8 is power^4 (AVERAGE_WEIGHT_POWER).
        const weight = s4 * s4;
        const v = this.activeVoices[k];
        const c = v * 3;
        total += weight;
        red += weight * rgb[c];
        green += weight * rgb[c + 1];
        blue += weight * rgb[c + 2];
        chroma += weight * this.channelChroma[v];
      }
      if (!(total > 0)) continue;
      red /= total;
      green /= total;
      blue /= total;
      // Averaging different hues loses saturation; stretch the average away from its brightest
      // channel until its chroma matches the voices' mean chroma (never past black).
      const max = Math.max(red, green, blue);
      const spread = max - Math.min(red, green, blue);
      if (spread > 1) {
        const stretch = Math.min(chroma / total, max) / spread;
        red = max - (max - red) * stretch;
        green = max - (max - green) * stretch;
        blue = max - (max - blue) * stretch;
      }
      const o = b * 3;
      colors[o] += (red - colors[o]) * alpha;
      colors[o + 1] += (green - colors[o + 1]) * alpha;
      colors[o + 2] += (blue - colors[o + 2]) * alpha;
    }
    spectra.length = 0;
    return colors;
  }
}

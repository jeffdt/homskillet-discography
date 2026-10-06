import { VOICE_PAIRS } from '../constants';
import { TapHistory } from '../taps/TapHistory';
import { SpectrumCore } from '../types';
import { alignmentDelay } from './alignment';
import { SpectrumLayout, VoiceData, VoiceFrame } from './contract';
import {
  MAX_ALIGN_DELAY_SAMPLES,
  MIX_INPUT_SAMPLES,
  MIX_SCALE,
  RMS_ATTACK_MS,
  RMS_RELEASE_MS,
  RMS_SAMPLES,
  VOICE_FFT_SIZE,
  WAVEFORM_SAMPLES,
} from './constants';
import { rmsOfNewest, smoothToward } from './levels';
import { FftSpectrumAnalyzer, MixAnalyzer, createMixAnalyzer } from './spectra';

/** One voice's reused slice of the frame. */
class VoiceSlot implements VoiceData {
  readonly waveform = new Float32Array(WAVEFORM_SAMPLES);
  rms = 0;

  constructor(
    private readonly frame: AnalysisFrame,
    private readonly index: number
  ) {}

  get spectrum(): Float32Array {
    return this.frame.voiceSpectrum(this.index);
  }
}

/**
 * The VoiceFrame TapAudioDataSource hands out. update() copies waveforms and levels each frame;
 * spectra are computed only when a consumer reads them, at most once per frame.
 */
export class AnalysisFrame implements VoiceFrame {
  time = 0;
  sampleRate = 0;
  voiceCount = 0;
  readonly voices: VoiceSlot[];
  private version = 0;
  private history: TapHistory | null = null;
  private endIndex = 0;
  private gains: ArrayLike<number> = [];
  private core: SpectrumCore | null = null;
  private readonly mixOut: Float32Array;
  private mixVersion = -1;
  private readonly voiceOut: Float32Array[];
  private readonly voiceVersion: Float64Array;
  private readonly mixInput = new Float32Array(MIX_INPUT_SAMPLES);
  private readonly voiceInput = new Float32Array(VOICE_FFT_SIZE);
  private mixAnalyzer: MixAnalyzer | null = null;
  private mixAnalyzerCore: SpectrumCore | null = null;
  private voiceAnalyzer: FftSpectrumAnalyzer | null = null;

  constructor(private readonly layout: SpectrumLayout) {
    this.voices = Array.from({ length: VOICE_PAIRS }, (_, v) => new VoiceSlot(this, v));
    this.mixOut = new Float32Array(layout.bins);
    this.voiceOut = Array.from({ length: VOICE_PAIRS }, () => new Float32Array(layout.bins));
    this.voiceVersion = new Float64Array(VOICE_PAIRS).fill(-1);
  }

  get mixSpectrum(): Float32Array {
    if (this.mixVersion !== this.version) {
      this.mixVersion = this.version;
      this.computeMix();
    }
    return this.mixOut;
  }

  /** Voice v's spectrum for this frame, computed on first use. */
  voiceSpectrum(v: number): Float32Array {
    if (this.voiceVersion[v] !== this.version) {
      this.voiceVersion[v] = this.version;
      this.computeVoice(v);
    }
    return this.voiceOut[v];
  }

  /** Lines the window up with `audible`, refreshes waveforms and levels, and marks spectra stale. */
  update(
    history: TapHistory,
    audible: number,
    gains: ArrayLike<number>,
    dtMs: number,
    core: SpectrumCore | null
  ): void {
    this.version++;
    this.history = history;
    this.gains = gains;
    this.core = core;
    const rate = history.sampleRate;
    const delay = alignmentDelay(history.newestContextTime, audible, rate, MAX_ALIGN_DELAY_SAMPLES);
    this.endIndex = (history.writeIndex - delay) | 0;
    this.time = rate > 0 ? history.newestContextTime - delay / rate : 0;
    this.sampleRate = rate;
    this.voiceCount = history.voiceCount;
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const slot = this.voices[v];
      let target = 0;
      if (v < this.voiceCount) {
        history.copyRange(v, this.endIndex, slot.waveform);
        target = rmsOfNewest(slot.waveform, RMS_SAMPLES);
      } else {
        slot.waveform.fill(0);
      }
      slot.rms = smoothToward(slot.rms, target, dtMs, RMS_ATTACK_MS, RMS_RELEASE_MS);
    }
  }

  /** A silent frame, used while no engine is attached. */
  clear(): void {
    this.version++;
    this.history = null;
    this.time = 0;
    this.sampleRate = 0;
    this.voiceCount = 0;
    for (const slot of this.voices) {
      slot.waveform.fill(0);
      slot.rms = 0;
    }
  }

  /** Frees the CQT buffers in the spectrum core. */
  dispose(): void {
    if (this.mixAnalyzer) this.mixAnalyzer.dispose();
    this.mixAnalyzer = null;
  }

  private computeMix(): void {
    const history = this.history;
    if (!history || !(this.sampleRate > 0)) {
      this.mixOut.fill(0);
      return;
    }
    if (
      !this.mixAnalyzer ||
      this.mixAnalyzer.sampleRate !== this.sampleRate ||
      this.mixAnalyzerCore !== this.core
    ) {
      this.dispose();
      this.mixAnalyzer = createMixAnalyzer(this.core, this.layout, this.sampleRate);
      this.mixAnalyzerCore = this.core;
    }
    history.mixRange(this.endIndex, this.gains, MIX_SCALE, this.mixInput);
    this.mixAnalyzer.analyze(this.mixInput, this.mixOut);
  }

  private computeVoice(v: number): void {
    const history = this.history;
    const out = this.voiceOut[v];
    if (!history || !(this.sampleRate > 0) || v >= this.voiceCount) {
      out.fill(0);
      return;
    }
    if (!this.voiceAnalyzer || this.voiceAnalyzer.sampleRate !== this.sampleRate) {
      this.voiceAnalyzer = new FftSpectrumAnalyzer(this.layout, this.sampleRate);
    }
    history.copyRange(v, this.endIndex, this.voiceInput);
    this.voiceAnalyzer.analyze(this.voiceInput, out);
  }
}

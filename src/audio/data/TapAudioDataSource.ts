import { VOICE_PAIRS } from '../constants';
import { AudioEngine } from '../engine/AudioEngine';
import { computeVoiceGains } from '../render/voiceGains';
import { LoadedTrack, VoiceMix } from '../types';
import { audibleTime } from './alignment';
import { AnalysisFrame } from './AnalysisFrame';
import { AudioDataSource, SpectrumLayout, VoiceFrame, VoiceInfo } from './contract';
import { MAX_FRAME_DT_MS } from './constants';
import { createSpectrumLayout } from './spectrumLayout';
import { buildVoiceInfos } from './voiceInfos';

/**
 * AudioDataSource over an AudioEngine's taps. Before attach() and after detach() it reports no
 * voices and a silent frame, so the UI can register consumers before the engine exists.
 */
export class TapAudioDataSource implements AudioDataSource {
  private engine: AudioEngine | null = null;
  private unsubscribes: (() => void)[] = [];
  private track: LoadedTrack | null = null;
  private mix: VoiceMix = { muted: [], soloed: [] };
  private readonly gains = new Float32Array(VOICE_PAIRS).fill(1);
  private voices: VoiceInfo[] = [];
  private readonly listeners = new Set<(voices: VoiceInfo[]) => void>();
  private readonly layout = createSpectrumLayout();
  private readonly frame = new AnalysisFrame(this.layout);
  private lastReadMs: number | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  /** Starts reading from engine (replacing any earlier one) and publishes its voices. */
  attach(engine: AudioEngine): void {
    this.detach();
    this.engine = engine;
    this.unsubscribes = [
      engine.on('loaded', (track) => {
        this.track = track;
        this.publish();
      }),
      engine.on('unloaded', () => {
        this.track = null;
        this.publish();
      }),
      engine.on('voiceMixChanged', (mix) => {
        this.setMix(mix);
        this.publish();
      }),
    ];
    this.track = engine.getLoadedTrack();
    this.setMix(engine.getVoiceMix());
    this.publish();
  }

  /** Stops reading from the engine; voices become [] and frames silent. */
  detach(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
    const wasAttached = this.engine !== null;
    this.engine = null;
    this.track = null;
    this.lastReadMs = null;
    if (wasAttached) this.publish();
  }

  getVoices(): VoiceInfo[] {
    return this.voices;
  }

  onVoicesChanged(cb: (voices: VoiceInfo[]) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  getSpectrumLayout(): SpectrumLayout {
    return this.layout;
  }

  readFrame(): VoiceFrame {
    const nowMs = this.now();
    const dtMs =
      this.lastReadMs === null
        ? 0
        : Math.min(Math.max(nowMs - this.lastReadMs, 0), MAX_FRAME_DT_MS);
    this.lastReadMs = nowMs;
    const engine = this.engine;
    if (!engine) {
      this.frame.clear();
      return this.frame;
    }
    this.frame.update(
      engine.readTapHistory(),
      audibleTime(engine.context, nowMs),
      this.gains,
      dtMs,
      engine.spectrumCore
    );
    return this.frame;
  }

  /** Detaches and frees the analyzers. */
  dispose(): void {
    this.detach();
    this.frame.dispose();
    this.listeners.clear();
  }

  private setMix(mix: VoiceMix): void {
    this.mix = mix;
    computeVoiceGains(mix.muted, mix.soloed, this.gains);
  }

  private publish(): void {
    this.voices = buildVoiceInfos(this.track, this.mix);
    this.listeners.forEach((listener) => listener(this.voices));
  }
}

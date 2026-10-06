import { VOICE_PAIRS } from '../../audio/constants';
import { SPECTRUM_BINS, WAVEFORM_SAMPLES } from '../../audio/data/constants';
import { AudioDataSource, VoiceFrame, VoiceInfo } from '../../audio/data/contract';
import { FrameScheduler } from '../../audio/data/FrameLoop';
import { createSpectrumLayout } from '../../audio/data/spectrumLayout';

/** A FrameScheduler driven by hand: tick(time) runs every pending frame callback. */
export class ManualScheduler implements FrameScheduler {
  private next = 1;
  private readonly pending = new Map<number, (timeMs: number) => void>();
  private readonly visibility = new Set<() => void>();
  private hidden = false;

  request(callback: (timeMs: number) => void): number {
    const handle = this.next++;
    this.pending.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.pending.delete(handle);
  }

  isHidden(): boolean {
    return this.hidden;
  }

  onVisibilityChange(listener: () => void): () => void {
    this.visibility.add(listener);
    return () => {
      this.visibility.delete(listener);
    };
  }

  /** Frame callbacks waiting to run. */
  get scheduled(): number {
    return this.pending.size;
  }

  /** Runs the callbacks pending now (not ones they schedule) at timeMs. */
  tick(timeMs: number): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    callbacks.forEach((callback) => callback(timeMs));
  }

  /** Changes visibility and notifies listeners, like a visibilitychange event. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.visibility.forEach((listener) => listener());
  }
}

/** An AudioDataSource that returns one fixed, editable frame and counts reads. */
export class StaticAudioDataSource implements AudioDataSource {
  readonly layout = createSpectrumLayout();
  readonly frame = {
    time: 0,
    sampleRate: 24000,
    voiceCount: 0,
    voices: Array.from({ length: VOICE_PAIRS }, () => ({
      waveform: new Float32Array(WAVEFORM_SAMPLES),
      rms: 0,
      spectrum: new Float32Array(SPECTRUM_BINS),
    })),
    mixSpectrum: new Float32Array(SPECTRUM_BINS),
  };
  reads = 0;
  private voices: VoiceInfo[] = [];
  private readonly listeners = new Set<(voices: VoiceInfo[]) => void>();

  readFrame(): VoiceFrame {
    this.reads++;
    return this.frame;
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

  getSpectrumLayout() {
    return this.layout;
  }

  /** Replaces the voices and notifies listeners. */
  setVoices(voices: VoiceInfo[]): void {
    this.voices = voices;
    this.listeners.forEach((listener) => listener(voices));
  }
}

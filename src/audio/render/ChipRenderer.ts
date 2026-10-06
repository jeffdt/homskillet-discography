import SubBass from '../../effects/SubBass';
import {
  DECLICK_MS,
  END_FADE_MS,
  INTERLEAVED_CHANNELS,
  RENDER_CHUNK_FRAMES,
  SEEK_CHUNK_FRAMES,
  SEEK_SPEED,
  VOICE_PAIRS,
} from '../constants';
import { TapRing } from '../taps/TapRing';
import { ChipCore, RendererSettings, TrackInfo } from '../types';
import { openMultiChannelEmu, readTrackInfo } from './emu';
import { GainRamp } from './GainRamp';
import { applyStereoCrossfeed, mixVoicePairs } from './mixVoicePairs';
import { framesToReach } from './seekPlan';

/** Things the renderer reports to its host while rendering. */
export type RendererEvent =
  | { type: 'ended' }
  | { type: 'seeked'; seekId: number; positionMs: number };

/**
 * Renders a GME multi-channel emulator into stereo float output: per-voice gains (mute/solo),
 * stereo crossfeed, SubBass, declick ramps for pause and seek, an end-of-track fade, and seeks
 * spread across render calls. The same code runs in the AudioWorklet and in the ScriptProcessor
 * fallback.
 */
export class ChipRenderer {
  /** Frames passed to gme_play since the track (re)started. Tests use it to line seeks up with continuous playback. */
  emulatedFrames = 0;

  private emu = 0;
  private readonly renderBuffer: number;
  private readonly seekScratch: number;
  private readonly currentGains = new Float32Array(VOICE_PAIRS).fill(1);
  private readonly targetGains = new Float32Array(VOICE_PAIRS).fill(1);
  private readonly declick = new GainRamp();
  private readonly endFade = new GainRamp();
  private readonly declickFrames: number;
  private readonly endFadeFrames: number;
  private subBassFilter: SubBass;
  private settings: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };
  private durationMs = 0;
  private paused = false;
  private ended = false;
  private endFadeStarted = false;
  private seekTargetMs: number | null = null;
  private seekId = 0;
  private seekFramesRemaining: number | null = null;

  constructor(
    private readonly core: ChipCore,
    private readonly sampleRate: number,
    private readonly onEvent: (event: RendererEvent) => void,
    private readonly taps: TapRing | null = null
  ) {
    this.renderBuffer = core._malloc(RENDER_CHUNK_FRAMES * INTERLEAVED_CHANNELS * 2);
    this.seekScratch = core._malloc(SEEK_CHUNK_FRAMES * INTERLEAVED_CHANNELS * 2);
    this.declickFrames = Math.round((DECLICK_MS / 1000) * sampleRate);
    this.endFadeFrames = Math.round((END_FADE_MS / 1000) * sampleRate);
    this.subBassFilter = new SubBass(sampleRate);
  }

  get loaded(): boolean {
    return this.emu !== 0;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isSeeking(): boolean {
    return this.seekTargetMs !== null;
  }

  /** Song position in ms (tempo-scaled); the seek target while a seek is running. */
  get positionMs(): number {
    if (this.seekTargetMs !== null) return this.seekTargetMs;
    return this.emu ? this.core._gme_tell_scaled(this.emu) : 0;
  }

  /** Opens and starts a track, replacing any loaded one (and dropping a pending seek without a `seeked` event). Throws if GME rejects the file. */
  load(bytes: Uint8Array, filepath: string, settings: RendererSettings): TrackInfo {
    this.unload();
    const core = this.core;
    const emu = openMultiChannelEmu(core, bytes, this.sampleRate);
    // Silence detection must stay off: in multi-channel mode it corrupts the per-voice output
    // (measured 23632 LSB off stereo mode on echo.nsf). Tracks therefore end at their duration.
    core._gme_ignore_silence(emu, 1);
    core._gme_set_tempo(emu, settings.tempo);
    core._gme_set_stereo_depth(emu, settings.stereoWidth);
    if (core._gme_start_track(emu, 0) !== 0) {
      core._gme_delete(emu);
      throw new Error('gme_start_track failed');
    }
    const info = readTrackInfo(core, emu, filepath);
    this.emu = emu;
    this.settings = { ...settings };
    this.durationMs = info.durationMs;
    this.paused = false;
    this.ended = false;
    this.endFadeStarted = false;
    this.seekTargetMs = null;
    this.seekFramesRemaining = null;
    this.emulatedFrames = 0;
    this.declick.reset(1);
    this.endFade.reset(1);
    this.currentGains.set(this.targetGains);
    this.taps?.clear();
    this.subBassFilter = new SubBass(this.sampleRate);
    return info;
  }

  /** Deletes the emulator; output becomes silence. Any pending seek is dropped without a `seeked` event. */
  unload(): void {
    if (this.emu) this.core._gme_delete(this.emu);
    this.emu = 0;
    this.seekTargetMs = null;
    this.seekFramesRemaining = null;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    // While seeking, finishSeek decides whether to fade back in.
    if (this.seekTargetMs !== null) return;
    this.declick.rampTo(paused ? 0 : 1, this.declickFrames);
  }

  setTempo(tempo: number): void {
    this.settings.tempo = tempo;
    if (this.emu) this.core._gme_set_tempo(this.emu, tempo);
    // A running seek re-plans its frame count at the new tempo.
    this.seekFramesRemaining = null;
  }

  setStereoWidth(stereoWidth: number): void {
    this.settings.stereoWidth = stereoWidth;
    if (this.emu) this.core._gme_set_stereo_depth(this.emu, stereoWidth);
  }

  setSubBass(amount: number): void {
    this.settings.subBass = amount;
  }

  setLoopForever(loopForever: boolean): void {
    this.settings.loopForever = loopForever;
    if (loopForever && this.endFadeStarted && !this.ended) {
      this.endFadeStarted = false;
      this.endFade.rampTo(1, this.declickFrames);
    }
  }

  /** Sets the target gain of each voice pair (length VOICE_PAIRS); changes ramp in mixVoicePairs. */
  setGains(gains: ArrayLike<number>): void {
    this.targetGains.set(gains);
  }

  /** Starts (or retargets) a seek. The output fades out, then the seek runs across render calls. */
  seek(targetMs: number, seekId: number): void {
    if (!this.emu || this.ended) {
      this.onEvent({ type: 'seeked', seekId, positionMs: this.positionMs });
      return;
    }
    this.seekTargetMs = Math.max(0, targetMs);
    this.seekId = seekId;
    this.seekFramesRemaining = null;
    this.declick.rampTo(0, this.declickFrames);
  }

  /** Renders left.length frames into left/right. */
  render(left: Float32Array, right: Float32Array): void {
    for (let offset = 0; offset < left.length; offset += RENDER_CHUNK_FRAMES) {
      this.renderChunk(left, right, offset, Math.min(RENDER_CHUNK_FRAMES, left.length - offset));
    }
  }

  private renderChunk(
    left: Float32Array,
    right: Float32Array,
    offset: number,
    frames: number
  ): void {
    const end = offset + frames;
    if (!this.emu || this.ended) {
      left.fill(0, offset, end);
      right.fill(0, offset, end);
      return;
    }
    if ((this.paused || this.seekTargetMs !== null) && this.declick.isSilent()) {
      left.fill(0, offset, end);
      right.fill(0, offset, end);
      if (this.seekTargetMs !== null) this.advanceSeek(frames);
      return;
    }
    const core = this.core;
    core._gme_play(this.emu, frames * INTERLEAVED_CHANNELS, this.renderBuffer);
    this.emulatedFrames += frames;
    // Re-read HEAP16 every chunk: memory growth replaces the view.
    const heap = core.HEAP16;
    const base = this.renderBuffer >> 1;
    this.taps?.write(heap, base, frames);
    mixVoicePairs(heap, base, frames, this.currentGains, this.targetGains, left, right, offset);
    applyStereoCrossfeed(left, right, offset, frames, this.settings.stereoWidth);
    if (this.settings.subBass > 0) this.applySubBass(left, right, offset, frames);
    this.declick.apply(left, right, offset, frames);
    this.endFade.apply(left, right, offset, frames);
    this.checkEnd();
  }

  private applySubBass(
    left: Float32Array,
    right: Float32Array,
    offset: number,
    frames: number
  ): void {
    const amount = this.settings.subBass;
    for (let i = offset; i < offset + frames; i++) {
      const sub = this.subBassFilter.process((left[i] + right[i]) * 0.5) * amount;
      left[i] += sub;
      right[i] += sub;
    }
  }

  // Seeks render into a scratch buffer with gme_play: sample-exact at every tempo. gme_seek_scaled
  // is inexact in one shot and hangs in small steps at tempo above 1 in multi-channel mode.
  private advanceSeek(renderedFrames: number): void {
    const core = this.core;
    let remaining = this.seekFramesRemaining ?? this.planSeek();
    let budget = renderedFrames * SEEK_SPEED;
    while (remaining > 0 && budget > 0 && !core._gme_track_ended(this.emu)) {
      const n = Math.min(remaining, budget, SEEK_CHUNK_FRAMES);
      core._gme_play(this.emu, n * INTERLEAVED_CHANNELS, this.seekScratch);
      this.emulatedFrames += n;
      remaining -= n;
      budget -= n;
    }
    this.seekFramesRemaining = remaining;
    if (core._gme_track_ended(this.emu)) {
      this.finishSeek();
      this.markEnded();
    } else if (remaining === 0) {
      this.finishSeek();
    }
  }

  /** Restarts the track for a backward seek, then returns how many frames reach the target. */
  private planSeek(): number {
    const core = this.core;
    const target = this.seekTargetMs as number;
    if (target < core._gme_tell_scaled(this.emu)) {
      core._gme_start_track(this.emu, 0);
      this.emulatedFrames = 0;
    }
    const tell = core._gme_tell_scaled(this.emu);
    return target > tell ? framesToReach(tell, target, this.settings.tempo, this.sampleRate) : 0;
  }

  private finishSeek(): void {
    this.seekTargetMs = null;
    this.seekFramesRemaining = null;
    this.endFadeStarted = false;
    this.endFade.reset(1);
    if (!this.paused) this.declick.rampTo(1, this.declickFrames);
    this.onEvent({
      type: 'seeked',
      seekId: this.seekId,
      positionMs: this.core._gme_tell_scaled(this.emu),
    });
  }

  private markEnded(): void {
    if (this.ended) return;
    // The track can end during the declick fade-out of a seek; answer the seek before ending.
    if (this.seekTargetMs !== null) this.finishSeek();
    this.ended = true;
    this.onEvent({ type: 'ended' });
  }

  private checkEnd(): void {
    const core = this.core;
    if (core._gme_track_ended(this.emu)) {
      this.markEnded();
      return;
    }
    if (this.endFadeStarted) {
      if (this.endFade.isSilent()) this.markEnded();
      return;
    }
    if (!this.settings.loopForever && core._gme_tell_scaled(this.emu) >= this.durationMs) {
      this.endFadeStarted = true;
      this.endFade.rampTo(0, this.endFadeFrames);
    }
  }
}

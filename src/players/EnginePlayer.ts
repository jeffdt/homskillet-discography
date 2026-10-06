import autoBind from 'auto-bind';
import { VOICE_PAIRS } from '../audio/constants';
import { AudioEngine } from '../audio/engine/AudioEngine';
import { LoadSupersededError } from '../audio/errors';
import { TrackInfo } from '../audio/types';
import { PlayerMetadata, PlayerParamDef } from '../types/player';
import Player from './Player';

const FILE_EXTENSIONS = ['nsf', 'nsfe', 'spc', 'ay', 'gbs'];

const PARAM_DEFS: PlayerParamDef[] = [
  {
    id: 'subbass',
    label: 'Bass Boost',
    hint: 'Synthetically enhance bass frequencies beyond original hardware capabilities',
    type: 'number',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 0.0,
  },
  {
    id: 'stereoWidth',
    label: 'Stereo Width',
    hint: 'Simulated stereo effect. Note: Some songs sound wack.',
    type: 'number',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 1.0,
  },
];

/**
 * The app's only Player. Drives an AudioEngine (AudioWorklet, ScriptProcessor or stub) and keeps
 * the Player contract that the Sequencer and the current UI rely on.
 */
export default class EnginePlayer extends Player {
  private trackInfo: TrackInfo | null = null;
  private tempo = 1;
  private voiceMask: boolean[] = [];

  constructor(private readonly engine: AudioEngine) {
    super();
    autoBind(this);
    this.playerKey = 'gme';
    this.fileExtensions = FILE_EXTENSIONS;
    this.paramDefs = PARAM_DEFS;
    engine.on('ended', this.handleEnded);
  }

  async loadData(
    data: Uint8Array,
    filepath: string,
    persistedSettings: Record<string, any>
  ): Promise<void> {
    this.resolveParamValues(persistedSettings);
    this.tempo = persistedSettings.tempo || 1;
    let info: TrackInfo;
    try {
      info = await this.engine.load(data, filepath, {
        tempo: this.tempo,
        stereoWidth: this.params.stereoWidth ?? 1,
        subBass: this.params.subbass ?? 0,
        loopForever: this.isLocked,
      });
    } catch (e) {
      // A newer load replaced this one; that load reports its own state.
      if (e instanceof LoadSupersededError) return;
      // No isStopped here: the Sequencer's error handler advances exactly once.
      this.trackInfo = null;
      super.suspend();
      throw e;
    }
    this.trackInfo = info;
    this.voiceMask = new Array(info.voices.length).fill(true);
    this.resume();
    this.emit('playerStateUpdate', { ...this.getBasePlayerState(), isStopped: false });
  }

  stop(): void {
    this.suspend();
    this.engine.stop();
    this.trackInfo = null;
    this.emit('playerStateUpdate', { isStopped: true });
  }

  suspend(): void {
    super.suspend();
    this.engine.setPaused(true);
  }

  togglePause(): boolean {
    const paused = super.togglePause();
    this.engine.setPaused(paused);
    return paused;
  }

  setLocked(locked: boolean): void {
    super.setLocked(locked);
    this.engine.setLoopForever(locked);
  }

  isPlaying(): boolean {
    return !this.paused && !this.stopped;
  }

  getTempo(): number {
    return this.tempo;
  }

  setTempo(tempo: number): void {
    this.tempo = tempo;
    this.engine.setTempo(tempo);
  }

  getDurationMs(): number {
    return this.trackInfo?.durationMs ?? 0;
  }

  getPositionMs(): number {
    return this.engine.getPositionMs();
  }

  seekMs(positionMs: number): void {
    this.engine.seek(positionMs);
  }

  getMetadata(): PlayerMetadata {
    return this.trackInfo?.metadata ?? {};
  }

  getNumVoices(): number {
    return this.trackInfo?.voices.length ?? 0;
  }

  getVoiceName(index: number): string | undefined {
    return this.trackInfo?.voices[index]?.name;
  }

  getVoiceMask(): boolean[] {
    return this.voiceMask;
  }

  setVoiceMask(voiceMask: boolean[]): void {
    this.voiceMask = [...voiceMask];
    this.engine.setVoiceMix({
      muted: Array.from({ length: VOICE_PAIRS }, (_, i) => voiceMask[i] === false),
      soloed: new Array(VOICE_PAIRS).fill(false),
    });
  }

  getParameter(id: string): any {
    return this.params[id];
  }

  setParameter(id: string, value: any): void {
    const numeric = parseFloat(value);
    switch (id) {
      case 'subbass':
        this.params.subbass = numeric;
        this.engine.setSubBass(numeric);
        break;
      case 'stereoWidth':
        this.params.stereoWidth = numeric;
        this.engine.setStereoWidth(numeric);
        break;
      default:
        console.warn('EnginePlayer has no parameter with id "%s".', id);
    }
  }

  private handleEnded(): void {
    this.suspend();
    this.emit('playerStateUpdate', { isStopped: true });
  }
}

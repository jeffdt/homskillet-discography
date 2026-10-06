import EventEmitter from 'events';
import { BasePlayerState, PlayerMetadata, PlayerParamDef } from '../types/player';

//
// Player can be viewed as a state machine with
// 3 states (playing, paused, stopped) and 5 transitions
// (open, pause, unpause, seek, stop).
// If the player has reached end of the song,
// it is in the terminal "stopped" state and is
// no longer playable:
//                         ╭– (seek) –╮
//                         ^          v
//  ┌─ ─ ─ ─ ─┐         ┌─────────────────┐            ┌─────────┐
//  │ stopped │–(open)–>│     playing     │––(stop)–––>│ stopped │
//  └ ─ ─ ─ ─ ┘         └─────────────────┘            └─────────┘
//                        | ┌────────┐ ^
//                (pause) ╰>│ paused │–╯ (unpause)
//                          └────────┘
//
// "stopped" is synonymous with closed/empty.
//

/** Base class for players: the state machine, lock, file matching and parameter resolution. */
export default abstract class Player extends EventEmitter {
  playerKey: string | null = null;
  protected paused = true;
  protected stopped = true;
  protected isLocked = false;
  protected fileExtensions: string[] = [];
  protected paramDefs: PlayerParamDef[] = [];
  protected params: Record<string, any> = {};
  protected infoTexts: string[] = [];

  abstract loadData(
    data: Uint8Array,
    filepath: string,
    persistedSettings: Record<string, any>
  ): Promise<void>;
  abstract stop(): void;
  abstract isPlaying(): boolean;
  abstract getTempo(): number;
  abstract setTempo(tempo: number): void;
  abstract getDurationMs(): number;
  abstract getPositionMs(): number;
  abstract seekMs(positionMs: number): void;
  abstract getVoiceName(index: number): string | undefined;
  abstract getVoiceMask(): boolean[];
  abstract setVoiceMask(voiceMask: boolean[]): void;
  abstract getNumVoices(): number;
  abstract getMetadata(): PlayerMetadata;
  abstract getParameter(id: string): any;
  abstract setParameter(id: string, value: any): void;

  /** Flips paused while a track is open; a no-op while stopped. Returns the paused state. */
  togglePause(): boolean {
    if (this.stopped) return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  resume(): void {
    this.stopped = false;
    this.paused = false;
  }

  suspend(): void {
    this.stopped = true;
    this.paused = true;
  }

  setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  getIsLocked(): boolean {
    return this.isLocked;
  }

  canPlay(fileExtension: string): boolean {
    return this.fileExtensions.indexOf(fileExtension.toLowerCase()) !== -1;
  }

  getVoiceNames(): (string | undefined)[] {
    const names: (string | undefined)[] = [];
    for (let i = 0; i < this.getNumVoices(); i++) names.push(this.getVoiceName(i));
    return names;
  }

  getVoiceGroups(): any[] {
    return [];
  }

  getInfoTexts(): string[] {
    return this.infoTexts;
  }

  getParamDefs(): PlayerParamDef[] {
    return this.paramDefs;
  }

  getParamDefault(paramId: string): any {
    return this.paramDefs.find((p) => p.id === paramId)?.defaultValue;
  }

  /** Transient value first, then the user's persisted ("pinned") value, then the default. */
  resolveParamValue(paramId: string, transientValue: any, persistedSettings: any): any {
    if (transientValue !== undefined && transientValue !== null) return transientValue;
    const persistedKey = `${this.playerKey}.${paramId}`;
    if (
      persistedSettings &&
      Object.prototype.hasOwnProperty.call(persistedSettings, persistedKey)
    ) {
      return persistedSettings[persistedKey];
    }
    return this.getParamDefault(paramId);
  }

  resolveParamValues(persistedSettings: any): void {
    for (const paramDef of this.paramDefs) {
      const resolved = this.resolveParamValue(paramDef.id, undefined, persistedSettings);
      if (this.getParameter(paramDef.id) === resolved) continue;
      if (resolved !== undefined) this.setParameter(paramDef.id, resolved);
    }
  }

  getParamValues(): Record<string, any> {
    const values: Record<string, any> = {};
    for (const def of this.paramDefs) values[def.id] = this.getParameter(def.id);
    return values;
  }

  getBasePlayerState(): BasePlayerState {
    return {
      metadata: this.getMetadata(),
      durationMs: this.getDurationMs(),
      positionMs: this.getPositionMs(),
      numVoices: this.getNumVoices(),
      paramDefs: this.getParamDefs(),
      paramValues: this.getParamValues(),
      tempo: this.getTempo(),
      voiceMask: this.getVoiceMask(),
      voiceNames: this.getVoiceNames(),
      voiceGroups: this.getVoiceGroups(),
      infoTexts: this.getInfoTexts(),
      isStopped: this.stopped,
      isPaused: this.paused,
    };
  }
}

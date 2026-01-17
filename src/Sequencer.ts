import promisify from './promisify-xhr';
import { CATALOG_PREFIX } from './config';
import shuffle from 'lodash/shuffle';
import EventEmitter from 'events';
import autoBind from 'auto-bind';
import { pathJoin } from './util';
import { IPlayer } from './types/player';
import {
  SHUFFLE_OFF,
  SHUFFLE_ON,
  ShuffleMode,
  SequencerState,
  LocalFilesManager,
} from './types/sequencer';

// Re-export constants for backward compatibility
export { SHUFFLE_OFF, SHUFFLE_ON, NUM_SHUFFLE_MODES, SHUFFLE_LABELS } from './types/sequencer';

export default class Sequencer extends EventEmitter {
  private player: IPlayer | null = null;
  private players: IPlayer[];
  private localFilesManager: LocalFilesManager;
  private getSettings: () => any;
  private currIdx: number = 0;
  private context: string[] | null = null;
  private currUrl: string | null = null;
  private shuffle: ShuffleMode = SHUFFLE_OFF;
  private shuffleOrder: number[] = [];
  private songRequest: XMLHttpRequest | null = null;
  private isLocked: boolean = false;

  constructor(players: IPlayer[], localFilesManager: LocalFilesManager, getSettings: () => any) {
    super();
    autoBind(this);

    this.player = null;
    this.players = players;
    this.localFilesManager = localFilesManager;
    this.getSettings = getSettings;

    this.currIdx = 0;
    this.context = null;
    this.currUrl = null;
    this.shuffle = SHUFFLE_OFF;
    this.shuffleOrder = [];
    this.songRequest = null;

    this.players.forEach((player) => {
      player.on('playerStateUpdate', this.handlePlayerStateUpdate);
      player.on('playerError', this.handlePlayerError);
    });
  }

  private handlePlayerError(e: Error | string): void {
    this.emit('playerError', e);
    if (this.context) {
      this.nextSong();
    } else {
      this.emit('sequencerStateUpdate', { isEjected: true });
    }
  }

  private handlePlayerStateUpdate(playerState: SequencerState): void {
    const { isStopped } = playerState;
    console.debug(
      'Sequencer.handlePlayerStateUpdate(isStopped=%s, isLocked=%s)',
      isStopped,
      this.isLocked
    );

    if (isStopped) {
      this.currUrl = null;
      // Only advance if NOT locked
      if (this.context && !this.isLocked) {
        this.nextSong();
      }
    } else {
      this.emit('sequencerStateUpdate', {
        url: this.currUrl,
        hasPlayer: true,
        // TODO: combine isEjected and hasPlayer
        isEjected: false,
        ...playerState,
      });
    }
  }

  playContext(context: string[], index: number = 0): void {
    this.currIdx = index;
    this.context = context;
    if (this.shuffle === SHUFFLE_ON) {
      this.setShuffle(this.shuffle);
    }
    this.playCurrentSong();
  }

  private playCurrentSong(): void {
    let idx = this.currIdx;
    if (this.shuffle === SHUFFLE_ON) {
      idx = this.shuffleOrder[idx];
      console.log('Shuffle (%s): %s', this.currIdx, idx);
    }
    this.playSong(this.context![idx]);
  }

  playSonglist(urls: string[]): void {
    this.playContext(urls, 0);
  }

  toggleShuffle(): void {
    this.setShuffle(!this.shuffle as ShuffleMode);
  }

  setShuffle(shuff: ShuffleMode): void {
    this.shuffle = shuff;
    if (this.shuffle === SHUFFLE_ON && this.context) {
      // Generate a new shuffle order.
      // Insert current play index at the beginning.
      this.shuffleOrder = [
        this.currIdx,
        ...shuffle(this.context.map((_, i) => i).filter((i) => i !== this.currIdx)),
      ];
      this.currIdx = 0;
    } else if (this.shuffleOrder) {
      // Restore linear play sequence at current shuffle position.
      if (this.shuffleOrder[this.currIdx] !== null) {
        this.currIdx = this.shuffleOrder[this.currIdx];
      }
    }
  }

  setLocked(locked: boolean): void {
    this.isLocked = locked;
    // Inform the current player about lock state
    if (this.player) {
      this.player.setLocked(locked);
    }
  }

  private advanceSong(direction: number): void {
    if (this.context == null) return;

    this.currIdx += direction;

    if (this.currIdx < 0 || this.currIdx >= this.context.length) {
      console.debug(
        'Sequencer.advanceSong(direction=%s) %s passed end of context length %s',
        direction,
        this.currIdx,
        this.context.length
      );
      this.currIdx = 0;
      this.context = null;
      this.player!.stop();
      this.player = null;
      this.emit('sequencerStateUpdate', { isEjected: true });
    } else {
      this.playCurrentSong();
    }
  }

  nextSong(): void {
    this.advanceSong(1);
  }

  prevSong(): void {
    this.advanceSong(-1);
  }

  getPlayer(): IPlayer | null {
    return this.player;
  }

  getCurrContext(): string[] | null {
    return this.context;
  }

  getCurrIdx(): number {
    return this.shuffle ? this.shuffleOrder[this.currIdx] : this.currIdx;
  }

  getCurrUrl(): string | null {
    return this.currUrl;
  }

  playSong(url: string): void {
    if (this.player !== null) {
      this.player.suspend();
    }

    // Find a player that can play this filetype
    const ext = url.split('.').pop()!.toLowerCase();
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].canPlay(ext)) {
        this.player = this.players[i];
        break;
      }
    }
    if (this.player === null) {
      this.emit('playerError', `The file format ".${ext}" was not recognized.`);
      return;
    }

    if (url.startsWith('local/')) {
      const buffer = this.localFilesManager.read(url);
      this.currUrl = null;
      this.playSongBuffer(url, buffer);
    } else {
      // Normalize url - paths are assumed to live under CATALOG_PREFIX
      // Don't add prefix if URL is already absolute (starts with http or /)
      if (!url.startsWith('http') && !url.startsWith('/')) {
        url = pathJoin(CATALOG_PREFIX, url);
      }

      // Fetch the song file (cancelable request)
      // Cancel any outstanding request so that playback doesn't happen out of order
      if (this.songRequest) this.songRequest.abort();
      this.songRequest = promisify(new XMLHttpRequest());
      this.songRequest.responseType = 'arraybuffer';
      this.songRequest.open('GET', url);
      this.songRequest
        .send()
        .then((xhr) => xhr.response)
        .then((buffer) => {
          this.currUrl = url;
          const filepath = url.replace(CATALOG_PREFIX, '');
          this.playSongBuffer(filepath, buffer);
        })
        .catch((e: any) => {
          this.handlePlayerError(e.message || `HTTP ${e.status} ${e.statusText} ${url}`);
        });
    }
  }

  playSongFile(filepath: string, songData: ArrayBuffer): void {
    if (this.player !== null) {
      this.player.suspend();
    }

    const ext = filepath.split('.').pop()!.toLowerCase();

    // Find a player that can play this filetype
    const player = this.players.find((player) => player.canPlay(ext));
    if (player == null) {
      this.emit('playerError', `The file format ".${ext}" was not recognized.`);
      return;
    } else {
      this.player = player;
    }

    this.context = [];
    this.currUrl = null;
    this.playSongBuffer(filepath, songData);
  }

  private async playSongBuffer(filepath: string, buffer: ArrayBuffer): Promise<void> {
    let uint8Array: Uint8Array;
    uint8Array = new Uint8Array(buffer);
    const persistedSettings = this.getSettings();
    try {
      await this.player!.loadData(uint8Array, filepath, persistedSettings);
    } catch (e: any) {
      this.handlePlayerError(`Unable to play ${filepath} (${e.message}).`);
    }
    const numVoices = this.player!.getNumVoices();
    this.player!.setVoiceMask([...Array(numVoices)].fill(true));
  }
}

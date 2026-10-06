import React, { useContext } from 'react';
import autoBindReact from 'auto-bind/react';
import isMobile from 'ismobilejs';
import clamp from 'lodash/clamp';

import ChipCore from '../chip-core';
import ChipCoreStub from '../chip-core-stub';
import { MAX_VOICES, MAX_SAMPLE_RATE, REPLACE_STATE_ON_SEEK } from '../config';
import { unlockAudioContext } from '../util';
import Sequencer, { SHUFFLE_OFF, SHUFFLE_ON } from '../Sequencer';

import GMEPlayer from '../players/GMEPlayer';
import { UI_PALETTES } from '../config/uiPalettes';
import { updateAccentColors } from '../util/cssVariables';

import AppShell from './AppShell';
import { ToastLevels } from './Toast';
import { UserContext } from './UserProvider';
import { ToastContext } from './ToastProvider';
import { AudioPulseProvider } from '../contexts/AudioPulseContext';
import { AppProps, AppState } from '../types/app';
import { SequencerState } from '../types/sequencer';
import { AudioGraph, PlaybackControls, PlaybackState } from '../types/playback';

const publicUrl = import.meta.env.BASE_URL;
const BASE_URL = publicUrl && publicUrl !== '/' ? publicUrl : document.location.origin;

/**
 * Owns the audio graph, chip-core, the Sequencer and playback state, and hands AppShell
 * a PlaybackState snapshot plus stable PlaybackControls.
 */
class App extends React.Component<AppProps, AppState> {
  private chipCore: any;
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  private playerNode: ScriptProcessorNode;
  private sequencer!: Sequencer;
  private mediaSessionAudio?: HTMLAudioElement;
  private audioGraph: AudioGraph | null = null;
  private controls: PlaybackControls;

  constructor(props: AppProps) {
    super(props);
    autoBindReact(this);

    this.attachMediaKeyHandlers();
    (window as any).ChipPlayer = this;

    // ===== Audio wiring: sub-project 2 replaces this region with AudioEngine =====
    // Initialize audio graph
    // ┌────────────┐      ┌────────────┐      ┌─────────────┐
    // │ playerNode ├─────>│  gainNode  ├─────>│ destination │
    // └────────────┘      └────────────┘      └─────────────┘

    // Smaller buffer for mobile devices. 'interactive' yields 128 samples on iOS/Android.
    const latencyHint = isMobile.any ? 'interactive' : 'playback';
    let audioCtx =
      (this.audioCtx =
      (window as any).audioCtx =
        new ((window as any).AudioContext || (window as any).webkitAudioContext)({
          latencyHint,
        }));

    // Limit the sample rate if needed
    if (audioCtx.sampleRate > MAX_SAMPLE_RATE) {
      console.warn(
        'AudioContext default sample rate was too high (%s). Limiting to %s.',
        audioCtx.sampleRate,
        MAX_SAMPLE_RATE
      );
      let targetRate = audioCtx.sampleRate;
      while (targetRate > MAX_SAMPLE_RATE) {
        targetRate /= 2;
      }
      audioCtx =
        this.audioCtx =
        (window as any).audioCtx =
          new ((window as any).AudioContext || (window as any).webkitAudioContext)({
            latencyHint,
            sampleRate: targetRate,
          });
    }

    const bufferSize = Math.max(
      // Make sure script node bufferSize is at least baseLatency
      Math.pow(2, Math.ceil(Math.log2((audioCtx.baseLatency || 0.001) * audioCtx.sampleRate))),
      2048
    );
    const gainNode = (this.gainNode = audioCtx.createGain());
    gainNode.gain.value = 1;
    gainNode.connect(audioCtx.destination);
    const playerNode = (this.playerNode = audioCtx.createScriptProcessor(bufferSize, 0, 2));
    playerNode.connect(gainNode);

    unlockAudioContext(audioCtx);
    console.log(
      'Sample rate: %d hz. Base latency: %d. Buffer size: %d.',
      audioCtx.sampleRate,
      audioCtx.baseLatency * audioCtx.sampleRate,
      bufferSize
    );
    // ===== End audio wiring =====

    const { shuffle, repeat } = props.userContext.settings;
    this.state = {
      loading: true,
      paused: true,
      ejected: true,
      currentSongMetadata: {},
      currentSongNumVoices: 0,
      currentSongDurationMs: 1,
      currentSongPositionMs: 0,
      tempo: 1,
      voiceMask: Array(MAX_VOICES).fill(true),
      voiceNames: Array(MAX_VOICES).fill(''),
      voiceGroups: [],
      songUrl: null,
      volume: 100,
      shuffle: shuffle ? SHUFFLE_ON : SHUFFLE_OFF,
      isLocked: !!repeat,
      hasPlayer: false,
      paramDefs: [],
      paramValues: {},
    };

    this.controls = {
      playTracks: this.playTracks,
      togglePause: this.togglePause,
      prevTrack: this.prevSong,
      nextTrack: this.nextSong,
      seekToFraction: this.handleTimeSliderChange,
      seekToMs: this.seekToMs,
      seekRelative: this.seekRelative,
      getPositionMs: this.getPositionMs,
      setTempo: this.handleTempoChange,
      setSpeedRelative: this.setSpeedRelative,
      setVoiceMask: this.handleSetVoiceMask,
      setParam: this.handleParamChange,
      pinParam: this.handlePinParam,
      setVolume: this.handleVolumeChange,
      setShuffle: this.handleSetShuffle,
      setRepeat: this.handleSetRepeat,
      resumeAudio: this.resumeAudio,
    };

    this.initChipCore(audioCtx, playerNode, bufferSize);
  }

  // ===== Audio wiring (continued): engine startup, media session, sequencer state =====

  async initChipCore(audioCtx: AudioContext, playerNode: ScriptProcessorNode, bufferSize: number) {
    // Load the chip-core Emscripten runtime

    try {
      this.chipCore = await ChipCore({
        // Look for .wasm file in web root, not the same location as the app bundle (static/js).
        locateFile: (path: string, prefix: string) => {
          const url =
            path.endsWith('.wasm') || path.endsWith('.wast')
              ? `${BASE_URL}/${path}`
              : prefix + path;
          return url;
        },
        print: (msg: string) => console.debug('[stdout] ' + msg),
        printErr: (msg: string) => console.debug('[stderr] ' + msg),
      });
    } catch (e) {
      // Fallback to stub mode if chip-core fails to load
      console.warn('Failed to load chip-core, falling back to stub mode:', e);
      try {
        this.chipCore = await ChipCoreStub();
        this.props.toastContext.enqueueToast(
          'Running in STUB MODE - no actual audio playback. UI development only.',
          ToastLevels.WARNING
        );
      } catch (stubError) {
        // If even the stub fails, we're in trouble
        this.setState({ loading: false });
        this.props.toastContext.enqueueToast(
          'Error loading player engine. Old browser?',
          ToastLevels.ERROR
        );
        return;
      }
    }

    // Get debug from location.search
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug');
    // Create GME player only
    const players = [GMEPlayer].map(
      (P) => new P(this.chipCore, audioCtx.sampleRate, bufferSize, debug)
    );
    players.forEach((p) => {
      p.audioNode = this.playerNode;
    });

    // Set up the central audio processing callback. This is where the magic happens.
    playerNode.onaudioprocess = (e) => {
      const channels = [];
      for (let i = 0; i < e.outputBuffer.numberOfChannels; i++) {
        channels.push(e.outputBuffer.getChannelData(i));
      }
      for (let player of players) {
        if (player.stopped) continue;
        player.processAudio(channels);
      }
    };

    // Populate all mounted IDBFS file systems from IndexedDB.
    this.chipCore.FS.syncfs(true, (err: any) => {
      if (err) {
        console.log('Error populating FS from indexeddb.', err);
      }
      players.forEach((player) => player.handleFileSystemReady());
    });

    this.sequencer = new Sequencer(players, null, () => this.props.userContext.settings);
    this.sequencer.on('sequencerStateUpdate', this.handleSequencerStateUpdate);
    this.sequencer.on('playerError', (message: string) =>
      this.props.toastContext.enqueueToast(message, ToastLevels.ERROR)
    );

    this.sequencer.setShuffle(this.state.shuffle);
    this.sequencer.setLocked(this.state.isLocked);
    this.audioGraph = { audioCtx, sourceNode: playerNode, chipCore: this.chipCore };
    this.setState({ loading: false });
  }

  static mapSequencerStateToAppState(sequencerState: SequencerState): Partial<AppState> {
    const map: Record<string, string> = {
      ejected: 'isEjected',
      paused: 'isPaused',
      currentSongMetadata: 'metadata',
      currentSongNumVoices: 'numVoices',
      currentSongPositionMs: 'positionMs',
      currentSongDurationMs: 'durationMs',
      tempo: 'tempo',
      voiceNames: 'voiceNames',
      voiceMask: 'voiceMask',
      voiceGroups: 'voiceGroups',
      songUrl: 'url',
      hasPlayer: 'hasPlayer',
      // TODO: Move to a separate paramStateUpdate?
      paramDefs: 'paramDefs',
      paramValues: 'paramValues',
    };
    const appState: any = {};
    for (let prop in map) {
      const seqProp = map[prop];
      if (seqProp in sequencerState) {
        appState[prop] = (sequencerState as any)[seqProp];
      }
    }
    return appState;
  }

  attachMediaKeyHandlers() {
    if ('mediaSession' in navigator) {
      console.log('Attaching Media Key event handlers.');

      // Limitations of MediaSession: there must always be an active audio element.
      // See https://bugs.chromium.org/p/chromium/issues/detail?id=944538
      //     https://github.com/GoogleChrome/samples/issues/637
      this.mediaSessionAudio = document.createElement('audio');
      this.mediaSessionAudio.src = BASE_URL + '/5-seconds-of-silence.mp3';
      this.mediaSessionAudio.loop = true;
      this.mediaSessionAudio.volume = 0;

      (navigator as any).mediaSession.setActionHandler('play', () => this.togglePause());
      (navigator as any).mediaSession.setActionHandler('pause', () => this.togglePause());
      (navigator as any).mediaSession.setActionHandler('previoustrack', () => this.prevSong());
      (navigator as any).mediaSession.setActionHandler('nexttrack', () => this.nextSong());
      (navigator as any).mediaSession.setActionHandler('seekbackward', () =>
        this.seekRelative(-5000)
      );
      (navigator as any).mediaSession.setActionHandler('seekforward', () =>
        this.seekRelative(5000)
      );
    }
  }

  handleSequencerStateUpdate(sequencerState: SequencerState) {
    const { isEjected } = sequencerState;
    console.debug('App.handleSequencerStateUpdate(isEjected=%s)', isEjected);

    if (isEjected) {
      this.setState({
        ejected: true,
        currentSongMetadata: {},
        currentSongNumVoices: 0,
        currentSongPositionMs: 0,
        currentSongDurationMs: 1,
        songUrl: null,
      });
      // TODO: Disabled to support scroll restoration.
      // updateQueryString({ play: undefined });

      if ('mediaSession' in navigator) {
        this.mediaSessionAudio?.pause();

        (navigator as any).mediaSession.playbackState = 'none';
        if ('MediaMetadata' in window) {
          (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({});
        }
      }
    } else {
      const player = this.sequencer.getPlayer();

      const metadata = player!.getMetadata();

      if ('mediaSession' in navigator) {
        this.mediaSessionAudio?.play();

        if ('MediaMetadata' in window) {
          (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
            title: metadata.title || metadata.formatted?.title,
            artist: metadata.artist || metadata.formatted?.subtitle,
            album: metadata.game,
            artwork: [],
          });
        }
      }

      this.setState({
        ...App.mapSequencerStateToAppState(sequencerState),
      });
    }
  }

  // ===== End audio wiring =====

  // ===== Playback commands (exposed to the shell as PlaybackControls) =====

  /** Plays the given track hrefs starting at index, as one play context. */
  playTracks(hrefs: string[], index = 0) {
    if (!this.sequencer) {
      console.warn('Sequencer not ready yet, cannot play');
      return;
    }
    this.sequencer.playContext(hrefs, index);
  }

  /** Skips to the previous track. */
  prevSong() {
    if (!this.sequencer) return;
    this.sequencer.prevSong();
  }

  /** Skips to the next track. */
  nextSong() {
    if (!this.sequencer) return;
    this.sequencer.nextSong();
  }

  togglePause() {
    if (this.state.ejected || !this.sequencer.getPlayer()) return;

    const paused = this.sequencer.getPlayer()!.togglePause();
    if ('mediaSession' in navigator) {
      if (paused) {
        this.mediaSessionAudio?.pause();
      } else {
        this.mediaSessionAudio?.play();
      }
    }
    this.setState({ paused: paused });
  }

  handleTimeSliderChange(event: any) {
    if (!this.sequencer?.getPlayer()) return;

    const pos = event.target ? event.target.value : event;
    const seekMs = Math.floor(pos * this.state.currentSongDurationMs);

    this.seekRelativeInner(seekMs);

    if (REPLACE_STATE_ON_SEEK) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('t', seekMs.toString());
      const stateUrl = '?' + searchParams.toString().replace(/%20/g, '+').replace(/%2F/g, '/');
      window.history.replaceState(null, '', stateUrl);
    }
  }

  seekRelative(ms: number) {
    if (!this.sequencer?.getPlayer()) return;

    const durationMs = this.state.currentSongDurationMs;
    const seekMs = clamp(this.sequencer.getPlayer()!.getPositionMs() + ms, 0, durationMs);

    this.seekRelativeInner(seekMs);
  }

  /** Seeks to an absolute position, clamped to the current track. */
  seekToMs(ms: number) {
    if (!this.sequencer?.getPlayer()) return;
    this.seekRelativeInner(clamp(ms, 0, this.state.currentSongDurationMs));
  }

  seekRelativeInner(seekMs: number) {
    this.sequencer.getPlayer()!.seekMs(seekMs);
    this.setState({
      currentSongPositionMs: seekMs, // Smooth
    });
    setTimeout(() => {
      if (this.sequencer.getPlayer()!.isPlaying()) {
        this.setState({
          currentSongPositionMs: this.sequencer.getPlayer()!.getPositionMs(), // Accurate
        });
      }
    }, 100);
  }

  /** Current playback position in milliseconds, or 0 with no player. */
  getPositionMs(): number {
    const player = this.sequencer?.getPlayer();
    return player ? player.getPositionMs() : 0;
  }

  handleSetVoiceMask(voiceMask: boolean[]) {
    if (!this.sequencer?.getPlayer()) return;

    this.sequencer.getPlayer()!.setVoiceMask(voiceMask);
    this.setState({ voiceMask: [...voiceMask] });
  }

  handleTempoChange(event: any) {
    if (!this.sequencer?.getPlayer()) return;

    const value = parseFloat(event.target ? event.target.value : event) || 1.0;
    this.sequencer.getPlayer()!.setTempo(value);
    this.setState({
      tempo: value,
    });

    const { settings, updateSettings } = this.props.userContext;
    const persistedKey = 'tempo';
    if (settings[persistedKey] != null) {
      updateSettings({ [persistedKey]: value });
    }
  }

  handleParamChange(id: string, value: any) {
    if (!this.sequencer?.getPlayer()) return;
    const player = this.sequencer.getPlayer()!;
    (player as any).setParameter(id, value);
    this.setState((prevState) => ({
      paramValues: { ...prevState.paramValues, [id]: value },
    }));

    const { settings, updateSettings } = this.props.userContext;
    const persistedKey = `${player.playerKey}.${id}`;
    if (settings[persistedKey] != null) {
      updateSettings({ [persistedKey]: value });
    }
  }

  handlePinParam(persistedKey: string, currentValue: any) {
    const { settings, replaceSettings } = this.props.userContext;
    const newSettings = { ...settings };

    if (newSettings[persistedKey] != null) {
      delete newSettings[persistedKey];
    } else {
      newSettings[persistedKey] = currentValue;
    }

    replaceSettings(newSettings);
  }

  setSpeedRelative(delta: number) {
    if (!this.sequencer?.getPlayer()) return;

    const tempo = clamp(this.state.tempo + delta, 0.1, 2);
    this.sequencer.getPlayer()!.setTempo(tempo);
    this.setState({
      tempo: tempo,
    });
  }

  handleVolumeChange(volume: number) {
    this.setState({ volume });
    this.gainNode.gain.value = Math.max(0, Math.min(2, volume * 0.01));
  }

  /** Turns shuffle on or off and persists the choice. */
  handleSetShuffle(on: boolean) {
    const shuffle = on ? SHUFFLE_ON : SHUFFLE_OFF;
    this.setState({ shuffle });
    if (this.sequencer) this.sequencer.setShuffle(shuffle);
    this.props.userContext.updateSettings({ shuffle: on });
  }

  /** Turns single-track repeat on or off and persists the choice. */
  handleSetRepeat(on: boolean) {
    this.setState({ isLocked: on });
    if (this.sequencer) this.sequencer.setLocked(on);
    this.props.userContext.updateSettings({ repeat: on });
  }

  /** Resumes a suspended AudioContext; must be called inside a user gesture. */
  resumeAudio() {
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  // ===== End playback commands =====

  componentDidMount() {
    // Apply saved UI palette on mount
    const { uiPalette = 0 } = this.props.userContext.settings;
    const palette = UI_PALETTES[uiPalette];
    updateAccentColors(palette.accent, palette.accentDark);
  }

  componentDidUpdate(prevProps: AppProps) {
    // Update accent colors when UI palette changes
    const prevPalette = prevProps.userContext.settings.uiPalette ?? 0;
    const currentPalette = this.props.userContext.settings.uiPalette ?? 0;

    if (prevPalette !== currentPalette) {
      const palette = UI_PALETTES[currentPalette];
      updateAccentColors(palette.accent, palette.accentDark);
    }
  }

  render() {
    const { settings } = this.props.userContext;
    const player = this.state.hasPlayer && this.sequencer ? this.sequencer.getPlayer() : null;
    const playback: PlaybackState = {
      ready: !this.state.loading && !!this.sequencer,
      ejected: this.state.ejected,
      paused: this.state.paused,
      songUrl: this.state.songUrl,
      durationMs: this.state.currentSongDurationMs,
      tempo: this.state.tempo,
      numVoices: this.state.currentSongNumVoices,
      voiceMask: this.state.voiceMask,
      voiceNames: this.state.voiceNames,
      voiceGroups: this.state.voiceGroups,
      paramDefs: this.state.paramDefs,
      paramValues: this.state.paramValues,
      playerKey: player ? player.playerKey : null,
      volume: this.state.volume,
      shuffle: this.state.shuffle === SHUFFLE_ON,
      repeat: this.state.isLocked,
    };

    return (
      <AudioPulseProvider
        audioCtx={this.audioCtx}
        sourceNode={this.playerNode}
        paused={this.state.paused}
        ejected={this.state.ejected}
        enabled={settings.audioReactivePulse ?? true}
      >
        <AppShell playback={playback} controls={this.controls} audioGraph={this.audioGraph} />
      </AudioPulseProvider>
    );
  }
}

/** Injects the user and toast contexts as props, since class components only support one context. */
const AppWithContext = (props: any) => {
  const userContext = useContext(UserContext);
  const toastContext = useContext(ToastContext);
  return <App {...props} userContext={userContext} toastContext={toastContext} />;
};

export default AppWithContext;

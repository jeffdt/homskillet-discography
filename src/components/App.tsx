import React, { useContext } from 'react';
import autoBindReact from 'auto-bind/react';
import isMobile from 'ismobilejs';
import clamp from 'lodash/clamp';
import { Route, Switch, withRouter } from 'react-router-dom';

import ChipCore from '../chip-core';
import {
  API_BASE,
  CATALOG_PREFIX,
  IS_PRODUCTION,
  MAX_VOICES,
  MAX_SAMPLE_RATE,
  PUBLIC_URL,
  REPLACE_STATE_ON_SEEK,
} from '../config';
import {
  getMetadataUrlForCatalogUrl,
  pathJoin,
  titlesFromMetadata,
  unlockAudioContext,
} from '../util';
import requestCache from '../RequestCache';
import { handleShufflePlayLogic } from '../handleShufflePlayLogic';
import Sequencer, {
  NUM_REPEAT_MODES,
  NUM_SHUFFLE_MODES,
  REPEAT_OFF,
  SHUFFLE_OFF,
} from '../Sequencer';

import GMEPlayer from '../players/GMEPlayer';
import { UI_PALETTES } from '../config/uiPalettes';
import { updateAccentColors } from '../util/cssVariables';

import AppFooter from './AppFooter';
import AppHeader from './AppHeader';
import Browse from './Browse';
import Visualizer from './Visualizer';
import Toast, { ToastLevels } from './Toast';
import MessageBox from './MessageBox';
import Settings from './Settings';
import TabBar from './TabBar';
import SongDisplay from './SongDisplay';
import { UserContext } from './UserProvider';
import { ToastContext } from './ToastProvider';
import { AudioPulseProvider } from '../contexts/AudioPulseContext';
import { AppProps, AppState, TabType } from '../types/app';
import { SequencerState } from '../types/sequencer';
import { PlayContext } from '../types/catalog';

const publicUrl = import.meta.env.BASE_URL;
const BASE_URL = publicUrl && publicUrl !== '/' ? publicUrl : document.location.origin;

// Browser-compatible path.dirname replacement
function dirname(filepath: string): string {
  const lastSlash = filepath.lastIndexOf('/');
  return lastSlash === -1 ? '.' : filepath.substring(0, lastSlash) || '/';
}

class App extends React.Component<AppProps, AppState> {
  private chipCore: any;
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  private playerNode: ScriptProcessorNode;
  private sequencer!: Sequencer;
  private contentAreaRef: React.RefObject<HTMLDivElement>;
  private listRef: React.RefObject<any>;
  private playContexts: Record<string, PlayContext>;
  private mediaSessionAudio?: HTMLAudioElement;

  constructor(props: AppProps) {
    super(props);
    autoBindReact(this);

    this.attachMediaKeyHandlers();
    this.contentAreaRef = React.createRef();
    this.listRef = React.createRef(); // react-virtualized List component ref
    this.playContexts = {};
    (window as any).ChipPlayer = this;

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

    this.state = {
      loading: true,
      paused: true,
      ejected: true,
      currentSongMetadata: {},
      currentSongNumVoices: 0,
      currentSongNumSubtunes: 0,
      currentSongSubtune: 0,
      currentSongDurationMs: 1,
      currentSongPositionMs: 0,
      tempo: 1,
      voiceMask: Array(MAX_VOICES).fill(true),
      voiceNames: Array(MAX_VOICES).fill(''),
      voiceGroups: [],
      imageUrl: null,
      infoTexts: [],
      showInfo: false,
      songUrl: null,
      volume: 100,
      repeat: REPEAT_OFF,
      shuffle: SHUFFLE_OFF,
      directories: {},
      hasPlayer: false,
      paramDefs: [],
      paramValues: {},
      activeTab: 'browser' as TabType,
    };

    this.initChipCore(audioCtx, playerNode, bufferSize);
  }

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
      // Browser doesn't support WASM (Safari in iOS Simulator)
      this.setState({ loading: false });
      this.props.toastContext.enqueueToast(
        'Error loading player engine. Old browser?',
        ToastLevels.ERROR
      );
      return;
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

    // TODO: Move to separate processUrlParams method.
    const urlSearchParams = new URLSearchParams(window.location.search);
    const playParam = urlSearchParams.get('play');
    if (playParam) {
      // Treat play params as "transient command" and strip them after starting playback.
      // See comment in Browse.js for more about why a sticky play param is not a good idea.
      const playPath = playParam;
      const subtune = urlSearchParams.get('subtune')
        ? parseInt(urlSearchParams.get('subtune')!, 10)
        : 0;
      const time = urlSearchParams.get('t') ? parseInt(urlSearchParams.get('t')!, 10) : 0;
      urlSearchParams.delete('play');
      urlSearchParams.delete('subtune');
      urlSearchParams.delete('t');
      const qs = urlSearchParams.toString();
      const search = qs ? `?${qs}` : '';
      // Navigate to song's containing folder. History comes from withRouter().
      const dirPath = dirname(playPath);
      this.fetchDirectory(dirPath).then(() => {
        this.props.history.replace(`${pathJoin('/', dirPath)}${search}`);
        // Convert play path to href (context contains full hrefs)
        const playHref = pathJoin(CATALOG_PREFIX, playPath);
        const index = this.playContexts[dirPath].indexOf(playHref);

        this.playContext(this.playContexts[dirPath], index, subtune);

        if (time) {
          setTimeout(() => {
            if (this.sequencer.getPlayer()) {
              this.sequencer.getPlayer()!.seekMs(time);
            }
          }, 100);
        }
      });
    }

    this.setState({ loading: false });
  }

  static mapSequencerStateToAppState(sequencerState: SequencerState): Partial<AppState> {
    const map: Record<string, string> = {
      ejected: 'isEjected',
      paused: 'isPaused',
      currentSongSubtune: 'subtune',
      currentSongMetadata: 'metadata',
      currentSongNumVoices: 'numVoices',
      currentSongPositionMs: 'positionMs',
      currentSongDurationMs: 'durationMs',
      currentSongNumSubtunes: 'numSubtunes',
      tempo: 'tempo',
      voiceNames: 'voiceNames',
      voiceMask: 'voiceMask',
      voiceGroups: 'voiceGroups',
      songUrl: 'url',
      hasPlayer: 'hasPlayer',
      // TODO: Move to a separate paramStateUpdate?
      paramDefs: 'paramDefs',
      paramValues: 'paramValues',
      infoTexts: 'infoTexts',
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

    document.addEventListener('keydown', (e) => {
      // Keyboard shortcuts: tricky to get it just right and keep the browser behavior intact.
      // The order of switch-cases matters. More privileged keys appear at the top.
      // More restricted keys appear at the bottom, after various input focus states are filtered out.
      if (e.ctrlKey || e.metaKey) return; // avoid browser keyboard shortcuts

      switch (e.key) {
        case 'Escape':
          this.setState({ showInfo: false });
          (e.target as HTMLElement).blur();
          break;
        default:
      }

      if (
        (e.target as HTMLElement).tagName === 'INPUT' &&
        (e.target as HTMLInputElement).type === 'text'
      )
        return; // text input has focus

      switch (e.key) {
        case ' ':
          this.togglePause();
          e.preventDefault();
          break;
        case '-':
          this.setSpeedRelative(-0.1);
          break;
        case '_':
          this.setSpeedRelative(-0.01);
          break;
        case '=':
          this.setSpeedRelative(0.1);
          break;
        case '+':
          this.setSpeedRelative(0.01);
          break;
        default:
      }

      if (
        (e.target as HTMLElement).tagName === 'INPUT' &&
        (e.target as HTMLInputElement).type === 'range'
      )
        return; // a range slider has focus

      switch (e.key) {
        case 'ArrowLeft':
          this.seekRelative(-5000);
          e.preventDefault();
          break;
        case 'ArrowRight':
          this.seekRelative(5000);
          e.preventDefault();
          break;
        default:
      }
    });
  }

  playContext(context: PlayContext, index = 0, subtune = 0) {
    if (!this.sequencer) {
      console.warn('Sequencer not ready yet, cannot play');
      return;
    }
    this.sequencer.playContext(context, index, subtune);
  }

  prevSong() {
    if (!this.sequencer) return;
    this.sequencer.prevSong();
  }

  nextSong() {
    if (!this.sequencer) return;
    this.sequencer.nextSong();
  }

  prevSubtune() {
    if (!this.sequencer) return;
    this.sequencer.prevSubtune();
  }

  nextSubtune() {
    if (!this.sequencer) return;
    this.sequencer.nextSubtune();
  }

  handleSequencerStateUpdate(sequencerState: SequencerState) {
    const { isEjected } = sequencerState;
    console.debug('App.handleSequencerStateUpdate(isEjected=%s)', isEjected);

    if (isEjected) {
      this.setState({
        ejected: true,
        currentSongSubtune: 0,
        currentSongMetadata: {},
        currentSongNumVoices: 0,
        currentSongPositionMs: 0,
        currentSongDurationMs: 1,
        currentSongNumSubtunes: 0,
        imageUrl: null,
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
      const url = this.sequencer.getCurrUrl();
      // TODO: this is messy. imageUrl comes asynchronously from the /metadata request.
      //       Title, artist, etc. come synchronously from player.getMetadata().
      //       ...but these are also emitted with playerStateUpdate.
      //       It would be better to incorporate imageUrl into playerStateUpdate.
      if (!url) {
        this.setState({ imageUrl: null });
      } else if (url !== this.state.songUrl) {
        const metadataUrl = getMetadataUrlForCatalogUrl(url);
        // TODO: Disabled to support scroll restoration.
        // const filepath = url.replace(CATALOG_PREFIX, '');
        // updateQueryString({ play: filepath, t: undefined });
        // TODO: move fetch metadata to Player when it becomes event emitter
        requestCache
          .fetchCached(metadataUrl)
          .then((response: any) => {
            const { imageUrl, infoTexts, md5 } = response;
            const newInfoTexts = [...this.state.infoTexts, ...infoTexts];
            const newShowInfo = this.state.showInfo && newInfoTexts.length > 0;
            this.setState({ imageUrl, infoTexts: newInfoTexts, md5, showInfo: newShowInfo } as any);

            if ('mediaSession' in navigator) {
              // Clear artwork if imageUrl is null.
              (navigator as any).mediaSession.metadata.artwork =
                imageUrl == null
                  ? []
                  : [
                      {
                        src: imageUrl,
                        sizes: '512x512',
                      },
                    ];
            }
          })
          .catch((e: any) => {
            this.setState({ imageUrl: null });
          });
      }

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
    if (!this.sequencer.getPlayer()) return;

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
    if (!this.sequencer.getPlayer()) return;

    const durationMs = this.state.currentSongDurationMs;
    const seekMs = clamp(this.sequencer.getPlayer()!.getPositionMs() + ms, 0, durationMs);

    this.seekRelativeInner(seekMs);
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

  handleSetVoiceMask(voiceMask: boolean[]) {
    if (!this.sequencer.getPlayer()) return;

    this.sequencer.getPlayer()!.setVoiceMask(voiceMask);
    this.setState({ voiceMask: [...voiceMask] });
  }

  handleTempoChange(event: any) {
    if (!this.sequencer.getPlayer()) return;

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
    if (!this.sequencer.getPlayer()) return;
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
    if (!this.sequencer.getPlayer()) return;

    const tempo = clamp(this.state.tempo + delta, 0.1, 2);
    this.sequencer.getPlayer()!.setTempo(tempo);
    this.setState({
      tempo: tempo,
    });
  }

  handleShufflePlay(path: string) {
    handleShufflePlayLogic(path, this.pathToHref, (items) => this.sequencer.playContext(items));
  }

  handleCycleShuffle() {
    const shuffle = (this.state.shuffle + 1) % NUM_SHUFFLE_MODES;
    this.setState({ shuffle });
    this.sequencer.setShuffle(shuffle);
  }

  handleSongClick(url: string | null, context?: PlayContext, index?: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      if (context && index !== undefined) {
        this.playContext(context, index);
      } else if (url) {
        this.sequencer.playSonglist([url]);
      }
    };
  }

  handleVolumeChange(volume: number) {
    this.setState({ volume });
    this.gainNode.gain.value = Math.max(0, Math.min(2, volume * 0.01));
  }

  handleCycleRepeat() {
    // TODO: Handle dropped file repeat
    const repeat = (this.state.repeat + 1) % NUM_REPEAT_MODES;
    this.setState({ repeat });
    this.sequencer.setRepeat(repeat);
  }

  toggleInfo() {
    this.setState({
      showInfo: !this.state.showInfo,
    });
  }

  directoryListingToContext(items: any[]): PlayContext {
    return items.filter((item) => item.type === 'file').map((item) => item.href); // Use the href that was already built in fetchDirectory
  }

  pathToHref(path: string): string {
    const prefix = IS_PRODUCTION ? `${PUBLIC_URL}/music` : CATALOG_PREFIX;
    return pathJoin(prefix, path.replace('%', '%25').replace('#', '%23'));
  }

  fetchDirectory(path: string): Promise<void> {
    const slashPath = pathJoin('/', path);
    // Load from static directories.json (both dev and production)
    const fetchPromise = fetch(`${PUBLIC_URL}/directories.json`)
      .then((response) => response.json())
      .then((directories: any) => directories[slashPath] || []);

    return fetchPromise.then((items: any[]) => {
      items.forEach((item) => {
        // Convert timestamp 1704067200 to ISO date 2024-01-01
        item.mtime = new Date(item.mtime * 1000).toISOString().split('T')[0];
        item.name = item.path.split('/').pop();
        // XXX: Escape immediately: the escaped URL is considered canonical.
        //      The URL must be decoded for display from here on out.
        item.path.replace('%', '%25').replace('#', '%23');
        if (item.type === 'file') {
          // In production, prepend PUBLIC_URL to the music path
          const prefix = IS_PRODUCTION ? `${PUBLIC_URL}/music` : CATALOG_PREFIX;
          item.href = pathJoin(prefix, item.path);
        } else {
          item.href = pathJoin('/', item.path);
        }
      });

      // Build play context AFTER href is set
      this.playContexts[path] = this.directoryListingToContext(items);

      if (path !== '') {
        // No '..' at top level browse path.
        // Use substring, not slice, to pass through strings that don't contain any '/'.
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        items.unshift({
          type: 'directory',
          path: parentPath,
          href: pathJoin('/', parentPath),
          name: '..',
        });
      }

      const directories = {
        ...this.state.directories,
        [path]: items,
      };
      this.setState({ directories });
    });
  }

  getCurrentSongLink(withSubtune = false): string | null {
    const url = this.sequencer?.getCurrUrl();
    if (!url) return null;
    // Remove CATALOG_PREFIX and ensure we don't duplicate path segments
    const relativeUrl = url.startsWith(CATALOG_PREFIX) ? url.substring(CATALOG_PREFIX.length) : url;
    let link = BASE_URL + '/?play=' + encodeURIComponent(relativeUrl);
    if (withSubtune) {
      const subtune = this.sequencer?.getSubtune();
      if (subtune !== 0) {
        link += '&subtune=' + subtune;
      }
    }
    return link;
  }

  handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    this.props.toastContext.enqueueToast('Copied song link to clipboard.', ToastLevels.INFO);
  };

  handleTabChange = (tab: TabType) => {
    this.setState({ activeTab: tab });
  };

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
    const { title, subtitle } = titlesFromMetadata(this.state.currentSongMetadata);
    const currContext = this.sequencer?.getCurrContext();
    const currIdx = this.sequencer?.getCurrIdx();

    return (
      <AudioPulseProvider
        audioCtx={this.audioCtx}
        sourceNode={this.playerNode}
        paused={this.state.paused}
        ejected={this.state.ejected}
        enabled={this.props.userContext.settings.audioReactivePulse ?? true}
      >
        <div className={`App ${!this.state.paused && !this.state.ejected ? 'is-playing' : ''}`}>
          {/* SVG filter definition for CRT noise effect */}
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <filter id="crt-noise">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.9"
                  numOctaves="4"
                  result="noise"
                  seed="0"
                >
                  <animate
                    attributeName="seed"
                    from="0"
                    to="100"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feComponentTransfer in="noise" result="opacity">
                  <feFuncA type="discrete" tableValues="0 0 0 1" />
                </feComponentTransfer>
              </filter>
            </defs>
          </svg>
          {/* CRT noise overlay */}
          <div className="crt-noise-overlay" aria-hidden="true" />
          <MessageBox
            showInfo={this.state.showInfo}
            infoTexts={this.state.infoTexts}
            toggleInfo={this.toggleInfo}
          />
          <Toast />
          <AppHeader />
          <TabBar activeTab={this.state.activeTab} onTabChange={this.handleTabChange} />
          <div className="App-main">
            <div className="App-main-inner">
              <div className="App-main-content-and-settings">
                <div
                  className={`App-main-content-area mobile-tab-content ${this.state.activeTab === 'browser' ? 'mobile-tab-active' : ''}`}
                  ref={this.contentAreaRef}
                >
                  <Switch>
                    <Route
                      path="/:browsePath*"
                      render={({ history, match, location }) => {
                        // Undo the react-router-dom double-encoded % workaround - see DirectoryLink.js
                        const browsePath =
                          (match.params as any)?.browsePath?.replace('%25', '%') || '';
                        return (
                          this.contentAreaRef.current && (
                            <Browse
                              currContext={currContext}
                              currIdx={currIdx}
                              history={history}
                              locationKey={(location as any).key}
                              browsePath={browsePath}
                              listing={this.state.directories[browsePath]}
                              playContext={this.playContexts[browsePath]}
                              fetchDirectory={this.fetchDirectory}
                              onSongClick={this.handleSongClick}
                              handleShufflePlay={this.handleShufflePlay}
                              scrollContainerRef={this.contentAreaRef}
                              listRef={this.listRef}
                            />
                          )
                        );
                      }}
                    />
                  </Switch>
                </div>
                <div
                  className={`App-main-content-area settings mobile-tab-content ${this.state.activeTab === 'settings' ? 'mobile-tab-active' : ''}`}
                >
                  <Settings
                    ejected={this.state.ejected}
                    tempo={this.state.tempo}
                    numVoices={this.state.currentSongNumVoices}
                    voiceMask={this.state.voiceMask}
                    voiceNames={this.state.voiceNames}
                    voiceGroups={this.state.voiceGroups}
                    onVoiceMaskChange={this.handleSetVoiceMask}
                    onTempoChange={this.handleTempoChange}
                    paramDefs={this.state.paramDefs}
                    paramValues={this.state.paramValues}
                    onParamChange={this.handleParamChange}
                    onPinParam={this.handlePinParam}
                    persistedSettings={this.props.userContext.settings}
                    sequencer={this.sequencer}
                  />
                </div>
              </div>
            </div>
            {!this.state.loading && (
              <div
                className={`mobile-tab-content ${this.state.activeTab === 'visualizer' ? 'mobile-tab-active' : ''}`}
              >
                <Visualizer
                  audioCtx={this.audioCtx}
                  sourceNode={this.playerNode}
                  chipCore={this.chipCore}
                  paused={this.state.ejected || this.state.paused}
                  persistedSettings={this.props.userContext.settings}
                  onThemeChange={(theme) =>
                    this.props.userContext.updateSettings({ visualizerTheme: theme })
                  }
                  onThemesExpandedChange={(expanded) =>
                    this.props.userContext.updateSettings({ visualizerThemesExpanded: expanded })
                  }
                />
              </div>
            )}
          </div>
          <SongDisplay
            songUrl={this.state.songUrl}
            ejected={this.state.ejected}
            getCurrentSongLink={this.getCurrentSongLink}
            handleCopyLink={this.handleCopyLink}
          />
          <AppFooter
            currentSongDurationMs={this.state.currentSongDurationMs}
            currentSongNumSubtunes={this.state.currentSongNumSubtunes}
            currentSongSubtune={this.state.currentSongSubtune}
            ejected={this.state.ejected}
            getCurrentSongLink={this.getCurrentSongLink}
            handleCopyLink={this.handleCopyLink}
            handleCycleRepeat={this.handleCycleRepeat}
            handleCycleShuffle={this.handleCycleShuffle}
            handleTimeSliderChange={this.handleTimeSliderChange}
            handleVolumeChange={this.handleVolumeChange}
            imageUrl={this.state.imageUrl}
            nextSong={this.nextSong}
            nextSubtune={this.nextSubtune}
            paused={this.state.paused}
            prevSong={this.prevSong}
            prevSubtune={this.prevSubtune}
            repeat={this.state.repeat}
            shuffle={this.state.shuffle}
            sequencer={this.sequencer}
            songUrl={this.state.songUrl}
            togglePause={this.togglePause}
            volume={this.state.volume}
          />
        </div>
      </AudioPulseProvider>
    );
  }
}

// TODO: convert App to a function component and remove this.
// Inject contexts as props since class components only support a single context.
const AppWithContext = (props: any) => {
  const userContext = useContext(UserContext);
  const toastContext = useContext(ToastContext);
  return <App {...props} userContext={userContext} toastContext={toastContext} />;
};

export default withRouter(AppWithContext);

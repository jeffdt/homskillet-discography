import React, { useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { Album, PlayPlan, albumPlan, shuffleAllPlan } from '../catalog/catalog';
import { useCatalog } from '../catalog/useCatalog';
import { COMPACT_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useIdleFade } from '../hooks/useIdleFade';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePerfMode } from '../hooks/usePerfMode';
import { isFullscreenSupported, toggleFullscreen } from '../shell/fullscreen';
import { Box } from '../shell/logoHandoff';
import {
  INITIAL_PANELS,
  PanelId,
  PanelState,
  isPanelOpen,
  panelsReducer,
  topmostPanel,
} from '../shell/panels';
import {
  BASE_PATH,
  InitialLocation,
  buildPlayUrl,
  isPageReload,
  parseInitialLocation,
  stripPlayParams,
} from '../shell/playUrl';
import { AudioGraph, PlaybackControls, PlaybackState } from '../types/playback';
import AboutPanel from './AboutPanel';
import AlbumsPanel from './AlbumsPanel';
import Dock from './Dock';
import MixerPanel from './MixerPanel';
import NowPlayingSpotlight from './NowPlayingSpotlight';
import PanelHost from './PanelHost';
import Stage from './Stage';
import StagePanel from './StagePanel';
import TitleScreen from './TitleScreen';
import Toast from './Toast';
import TopBar from './TopBar';
import { UserContext } from './UserProvider';

export const DEFAULT_TAGLINE = 'Original NES music';

interface AppShellProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  audioGraph: AudioGraph | null;
}

/** Panel state reduced to its topmost panel, matching what a compact sheet shows. */
function topOnly(panels: PanelState): PanelState {
  const top = topmostPanel(panels);
  return { open: top ? [top] : [] };
}

/** The immersive stage UI: everything visual, driven by App's playback state and controls. */
export default function AppShell({ playback, controls, audioGraph }: AppShellProps) {
  const { settings } = useContext(UserContext);
  const catalog = useCatalog();
  const compact = useMediaQuery(COMPACT_LAYOUT_QUERY);
  const perf = usePerfMode(compact);
  const [panels, dispatch] = useReducer(panelsReducer, INITIAL_PANELS);
  const [albumsAlbumId, setAlbumsAlbumId] = useState<string | null>(null);
  const [albumsFocusTrackId, setAlbumsFocusTrackId] = useState<string | null>(null);
  const [initialLocation, setInitialLocation] = useState<InitialLocation | null>(null);
  const [showFullscreen] = useState(() => isFullscreenSupported());
  const pendingSeekRef = useRef<{ trackId: string; ms: number } | null>(null);
  const wasEjectedRef = useRef(playback.ejected);
  const [hasStarted, setHasStarted] = useState(!playback.ejected);
  const logoHandoffRef = useRef<Box | null>(null);

  const currentTrack =
    (catalog && playback.songUrl && catalog.trackByHref.get(playback.songUrl)) || null;
  const currentAlbum =
    (catalog && currentTrack && catalog.albumById.get(currentTrack.albumId)) || null;
  const currentTrackId = currentTrack ? currentTrack.id : null;
  const showTitle = playback.ejected && !hasStarted;
  const playing = !playback.ejected && !playback.paused;
  const idle = useIdleFade({ enabled: playing });
  const sharedTrack = initialLocation ? initialLocation.sharedTrack : null;

  useEffect(() => {
    if (!catalog || initialLocation) return;
    const search = isPageReload()
      ? stripPlayParams(window.location.search)
      : window.location.search;
    const parsed = parseInitialLocation(window.location.pathname, search, catalog);
    setInitialLocation(parsed);
    if (!parsed.sharedTrack) {
      window.history.replaceState(null, '', BASE_PATH + stripPlayParams(window.location.search));
    }
    if (parsed.albumId) {
      setAlbumsAlbumId(parsed.albumId);
      dispatch({ type: 'open', id: 'albums', compact });
    }
  }, [catalog, initialLocation, compact]);

  useEffect(() => {
    if (currentTrackId)
      window.history.replaceState(null, '', buildPlayUrl(currentTrackId, window.location.search));
  }, [currentTrackId]);

  useEffect(() => {
    if (!playback.ejected) setHasStarted(true);
  }, [playback.ejected]);

  useEffect(() => {
    if (!playback.ejected && initialLocation && initialLocation.sharedTrack) {
      setInitialLocation({ ...initialLocation, sharedTrack: null, startMs: 0 });
    }
  }, [playback.ejected, initialLocation]);

  useEffect(() => {
    const pending = pendingSeekRef.current;
    const wasEjected = wasEjectedRef.current;
    wasEjectedRef.current = playback.ejected;
    if (!pending) return;
    if (!playback.ejected && currentTrackId === pending.trackId) {
      pendingSeekRef.current = null;
      controls.seekToMs(pending.ms);
    } else if (
      (playback.ejected && !wasEjected) ||
      (currentTrackId && currentTrackId !== pending.trackId)
    ) {
      pendingSeekRef.current = null;
    }
  }, [currentTrackId, playback.ejected, controls]);

  /** Resumes audio inside the gesture and hands a plan to the player. */
  const playPlan = useCallback(
    (plan: PlayPlan | null) => {
      if (!plan) return;
      controls.resumeAudio();
      controls.playTracks(plan.hrefs, plan.index);
    },
    [controls]
  );

  /** Turns shuffle on (persisted) and plays the whole catalog from a random track. */
  const startListening = useCallback(() => {
    if (!catalog) return;
    pendingSeekRef.current = null;
    controls.setShuffle(true);
    playPlan(shuffleAllPlan(catalog));
  }, [catalog, controls, playPlan]);

  /** Plays the ?play= track within its album and queues the ?t= seek. */
  const playSharedTrack = useCallback(() => {
    if (!catalog || !initialLocation || !initialLocation.sharedTrack) return;
    const track = initialLocation.sharedTrack;
    const album = catalog.albumById.get(track.albumId);
    if (!album) return;
    if (initialLocation.startMs > 0)
      pendingSeekRef.current = { trackId: track.id, ms: initialLocation.startMs };
    playPlan(albumPlan(album, album.tracks.indexOf(track)));
  }, [catalog, initialLocation, playPlan]);

  /** Plays an album from the chosen track. */
  const playAlbumTrack = useCallback(
    (album: Album, index: number) => playPlan(albumPlan(album, index)),
    [playPlan]
  );

  /** Toggles a panel; opening Albums jumps to the playing track's album. */
  const togglePanel = useCallback(
    (id: PanelId) => {
      if (id === 'albums' && !isPanelOpen(panels, 'albums')) {
        setAlbumsFocusTrackId(null);
        if (currentTrack) setAlbumsAlbumId(currentTrack.albumId);
      }
      if (compact && isPanelOpen(panels, id) && topmostPanel(panels) !== id) {
        dispatch({ type: 'open', id, compact });
        return;
      }
      dispatch({ type: 'toggle', id, compact });
    },
    [panels, currentTrack, compact]
  );

  /** Opens Albums at an album with the current track's blurb expanded. */
  const showInAlbums = useCallback(
    (albumId: string) => {
      setAlbumsAlbumId(albumId);
      setAlbumsFocusTrackId(currentTrackId);
      dispatch({ type: 'open', id: 'albums', compact });
    },
    [currentTrackId, compact]
  );

  /** Records where the title logo was as the title screen leaves. */
  const handLogoOff = useCallback((box: Box) => {
    logoHandoffRef.current = box;
  }, []);

  /** Hands the recorded title logo position to the top bar exactly once. */
  const takeLogoHandoff = useCallback(() => {
    const box = logoHandoffRef.current;
    logoHandoffRef.current = null;
    return box;
  }, []);

  /** Opens the Albums drawer at the album list. */
  const browseAlbums = useCallback(() => {
    setAlbumsAlbumId(null);
    dispatch({ type: 'open', id: 'albums', compact });
  }, [compact]);

  const anyPanelOpen = panels.open.length > 0;

  // Wide layouts have no backdrop behind panels, so a press anywhere outside the panels and chrome
  // closes them all. Compact sheets close from their own backdrop instead.
  useEffect(() => {
    if (!anyPanelOpen || compact) return undefined;
    const onPointerDown = (e: Event) => {
      const target = e.target as Element | null;
      if (target && target.closest && target.closest('.Panel, .Chrome, .toast-box-outer')) return;
      dispatch({ type: 'closeAll' });
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [anyPanelOpen, compact]);

  useKeyboardShortcuts({
    togglePause: () => controls.togglePause(),
    prevTrack: () => controls.prevTrack(),
    nextTrack: () => controls.nextTrack(),
    seekBack: () => controls.seekRelative(-5000),
    seekForward: () => controls.seekRelative(5000),
    speedDown: () => controls.setSpeedRelative(-0.1),
    speedDownFine: () => controls.setSpeedRelative(-0.01),
    speedUp: () => controls.setSpeedRelative(0.1),
    speedUpFine: () => controls.setSpeedRelative(0.01),
    toggleFullscreen: () => toggleFullscreen(),
    toggleAlbums: () => togglePanel('albums'),
    toggleMixer: () => togglePanel('mixer'),
    toggleStage: () => togglePanel('stage'),
    closeTopmost: () => {
      const top = topmostPanel(panels);
      if (top) {
        dispatch({ type: 'close', id: top });
        return undefined;
      }
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      return false;
    },
  });

  /** Renders the body of one panel. */
  const renderPanel = (id: PanelId): React.ReactNode => {
    switch (id) {
      case 'albums':
        return catalog ? (
          <AlbumsPanel
            catalog={catalog}
            albumId={albumsAlbumId}
            onSelectAlbum={(albumId) => {
              setAlbumsFocusTrackId(null);
              setAlbumsAlbumId(albumId);
            }}
            playingTrackId={currentTrackId}
            paused={playback.paused}
            onPlayTrack={playAlbumTrack}
            onShuffleAll={startListening}
            focusTrackId={albumsFocusTrackId}
          />
        ) : (
          <p className="Panel-empty">Loading albums…</p>
        );
      case 'mixer':
        return <MixerPanel playback={playback} controls={controls} settings={settings} />;
      case 'stage':
        return <StagePanel />;
      case 'about':
        return <AboutPanel about={catalog ? catalog.about : null} />;
      default:
        return null;
    }
  };

  const sharedAlbum =
    sharedTrack && catalog ? catalog.albumById.get(sharedTrack.albumId) : undefined;

  return (
    <div
      className={`App AppShell${playing ? ' is-playing' : ''}`}
      data-idle={idle ? 'true' : 'false'}
      data-layout={compact ? 'compact' : 'wide'}
      data-perf={perf}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="crt-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              result="noise"
              seed="0"
            >
              <animate attributeName="seed" from="0" to="100" dur="8s" repeatCount="indefinite" />
            </feTurbulence>
            <feComponentTransfer in="noise" result="opacity">
              <feFuncA type="discrete" tableValues="0 0 0 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div className="crt-noise-overlay" aria-hidden="true" />

      <Stage
        audioGraph={audioGraph}
        paused={!playing}
        settings={settings}
        renderScale={perf === 'low' ? 0.5 : 1}
      />

      {showTitle && (
        <TitleScreen
          ready={playback.ready && catalog !== null && initialLocation !== null}
          tagline={(catalog && catalog.tagline) || DEFAULT_TAGLINE}
          albumCount={catalog ? catalog.albums.length : 0}
          sharedTrack={
            sharedTrack
              ? { title: sharedTrack.title, albumTitle: sharedAlbum ? sharedAlbum.title : '' }
              : null
          }
          onStart={sharedTrack ? playSharedTrack : startListening}
          onGesture={controls.resumeAudio}
          onBrowse={browseAlbums}
          onLogoExit={handLogoOff}
        />
      )}

      {!showTitle && currentTrack && (
        <NowPlayingSpotlight
          trackId={currentTrack.id}
          title={currentTrack.title}
          albumTitle={currentAlbum ? currentAlbum.title : ''}
          blurb={currentTrack.blurb}
        />
      )}

      <TopBar
        panels={compact ? topOnly(panels) : panels}
        onToggle={togglePanel}
        showLogo={!showTitle}
        takeLogoHandoff={takeLogoHandoff}
      />

      {!showTitle && (
        <Dock
          playback={playback}
          controls={controls}
          track={currentTrack}
          album={currentAlbum}
          settings={settings}
          onShowInAlbums={showInAlbums}
          showFullscreen={showFullscreen}
          faded={idle && !compact}
        />
      )}

      <PanelHost
        panels={panels}
        compact={compact}
        onClose={(id) => dispatch({ type: 'close', id })}
        renderPanel={renderPanel}
      />

      <Toast />
    </div>
  );
}

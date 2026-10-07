import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioData } from '../contexts/AudioDataContext';
import { CHANNEL_COUNT } from '../config/channelPalettes';
import { useChannelColors } from '../hooks/useChannelColors';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useVoices } from '../hooks/useVoices';
import {
  SpectrumColoringId,
  scopeSettingsOf,
  spectrumColoringById,
  visualizerStyleById,
} from '../config/stageSettings';
import { spectrumGradientById } from '../config/spectrumGradients';
import { uiPaletteAt } from '../config/uiPalettes';
import { CanvasBox, computeStageLayout } from '../shell/stageLayout';
import { BinColorizer } from '../visuals/BinColorizer';
import { ScopeEffects, ScopeRenderer } from '../visuals/ScopeRenderer';
import { phaseGrid } from '../visuals/scopeMath';
import { SPECTROGRAM_SCROLL_PX_PER_S, readCssColor, readCssRgb } from '../visuals/spectrogramMath';
import { SpectrogramRenderer } from '../visuals/SpectrogramRenderer';
import {
  AdditivePainter,
  AveragePainter,
  BinPainter,
  GradientPainter,
} from '../visuals/spectrumPainters';
import { UserSettings } from './UserProvider';

interface StageProps {
  settings: UserSettings;
  /** Backing-store scale: 1 normally, 0.5 in low-power mode. */
  renderScale: number;
}

/** Applies a computed layout box to a canvas's backing store and CSS box. */
function applyBox(canvas: HTMLCanvasElement, box: CanvasBox): void {
  canvas.width = box.pixelWidth;
  canvas.height = box.pixelHeight;
  canvas.style.left = `${box.left}px`;
  canvas.style.width = `${box.width}px`;
  canvas.style.height = `${box.height}px`;
}

/** Full-window visualizer behind all other UI: the spectrum (colored by adding channel light, averaging channel colors, or one loudness gradient) or the channel scopes, each drawn by its own FrameLoop consumer while selected. */
export default function Stage({ settings, renderScale }: StageProps) {
  const { source } = useAudioData();
  const voices = useVoices();
  const channelColors = useChannelColors();
  const style = visualizerStyleById(settings.visualizerStyle).id;
  const scope = scopeSettingsOf(settings);
  const accent = uiPaletteAt(settings.uiPalette).accent;
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const lowPower = renderScale < 1;
  const bloomRef = useRef<HTMLCanvasElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const scopeColors = useMemo(
    () =>
      scope.scopeColoring === 'unified' ? new Array(CHANNEL_COUNT).fill(accent) : channelColors,
    [scope.scopeColoring, accent, channelColors]
  );
  const effects: ScopeEffects = useMemo(
    () => ({
      trails: scope.scopeTrails,
      glow: scope.scopeGlow,
      bloom: scope.scopeBloom,
      reactivity: scope.scopeReactivity,
      lineWidth: scope.scopeLineWidth,
      core: scope.scopeCore,
      fill: scope.scopeFill,
    }),
    [
      scope.scopeTrails,
      scope.scopeGlow,
      scope.scopeBloom,
      scope.scopeReactivity,
      scope.scopeLineWidth,
      scope.scopeCore,
      scope.scopeFill,
    ]
  );
  const spectrumColoring = spectrumColoringById(settings.spectrumColoring).id;
  const gradientStops = spectrumGradientById(settings.spectrumGradient).stops;
  const containerRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const freqRef = useRef<HTMLCanvasElement>(null);
  const scopesRef = useRef<HTMLCanvasElement>(null);
  const scopeRendererRef = useRef<ScopeRenderer | null>(null);
  const rendererRef = useRef<SpectrogramRenderer | null>(null);
  const colorizerRef = useRef<BinColorizer | null>(null);
  const paintersRef = useRef<Record<SpectrumColoringId, BinPainter> | null>(null);
  const additiveRef = useRef<AdditivePainter | null>(null);
  const gradientRef = useRef<GradientPainter | null>(null);

  useEffect(() => {
    if (!freqRef.current || !specRef.current) return;
    const layout = source.getSpectrumLayout();
    const shades = {
      background: readCssRgb('--neutral0', '#101010'),
      highlight: readCssRgb('--neutral4', '#fefefe'),
    };
    const fallback = readCssRgb('--neutral3', '#c3c3c3');
    rendererRef.current = new SpectrogramRenderer(
      { analyzer: freqRef.current, spectrogram: specRef.current },
      layout
    );
    colorizerRef.current = new BinColorizer(layout.bins, fallback);
    additiveRef.current = new AdditivePainter(layout, shades, fallback);
    gradientRef.current = new GradientPainter(spectrumGradientById(undefined).stops);
    paintersRef.current = {
      additive: additiveRef.current,
      average: new AveragePainter(colorizerRef.current, shades, layout.bins),
      unified: gradientRef.current,
    };
  }, [source]);

  useEffect(() => {
    if (!scopesRef.current) return;
    scopeRendererRef.current = new ScopeRenderer(
      scopesRef.current,
      bloomRef.current,
      renderScale,
      readCssColor('--neutral4', '#fefefe')
    );
  }, [renderScale]);

  useEffect(() => {
    scopeRendererRef.current?.setColors(scopeColors);
  }, [renderScale, scopeColors]);

  useEffect(() => {
    scopeRendererRef.current?.setVoices(voices);
  }, [renderScale, voices]);

  useEffect(() => {
    scopeRendererRef.current?.setSpan(scope.scopeSpan);
  }, [renderScale, scope.scopeSpan]);

  useEffect(() => {
    scopeRendererRef.current?.setLayout(scope.scopeLayout);
  }, [renderScale, scope.scopeLayout]);

  useEffect(() => {
    scopeRendererRef.current?.setEffects(effects);
  }, [renderScale, effects]);

  useEffect(() => {
    scopeRendererRef.current?.setMotion(!reducedMotion);
  }, [renderScale, reducedMotion]);

  const applyLayout = useCallback(() => {
    const container = containerRef.current;
    const spec = specRef.current;
    const freq = freqRef.current;
    if (!container || !spec || !freq) return;
    const layout = computeStageLayout(container.clientWidth, container.clientHeight, renderScale);
    applyBox(spec, layout.spectrogram);
    applyBox(freq, layout.analyzer);
    if (scopesRef.current) applyBox(scopesRef.current, layout.full);
    if (bloomRef.current) applyBox(bloomRef.current, layout.full);
    if (scopeRendererRef.current) scopeRendererRef.current.resize();
    const { clientWidth, clientHeight } = container;
    setStageSize((size) =>
      size.width === clientWidth && size.height === clientHeight
        ? size
        : { width: clientWidth, height: clientHeight }
    );
    if (rendererRef.current) rendererRef.current.resize();
  }, [renderScale]);

  useEffect(() => {
    const hasRaf = typeof requestAnimationFrame === 'function';
    let frame = 0;
    const onResize = () => {
      if (!hasRaf) {
        applyLayout();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyLayout);
    };
    applyLayout();
    window.addEventListener('resize', onResize);
    return () => {
      if (hasRaf) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [applyLayout]);

  useEffect(() => {
    applyLayout();
  }, [style, applyLayout]);

  useEffect(() => {
    colorizerRef.current?.setChannelColors(channelColors);
    additiveRef.current?.setChannelColors(channelColors);
  }, [source, channelColors]);

  useEffect(() => {
    colorizerRef.current?.setVoices(voices);
    additiveRef.current?.setVoices(voices);
  }, [source, voices]);

  useEffect(() => {
    gradientRef.current?.setStops(gradientStops);
  }, [source, gradientStops]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.setPeakDecayRate(settings.peakDecayRate ?? 0.98);
  }, [source, settings.peakDecayRate]);

  useEffect(() => {
    if (rendererRef.current)
      rendererRef.current.setPeakQuantization(settings.peakQuantization ?? 4);
  }, [source, settings.peakQuantization]);

  useFrameLoop(
    'stage-spectrogram',
    (frame, dtMs) => {
      const renderer = rendererRef.current;
      const painter = paintersRef.current?.[spectrumColoring];
      if (!renderer || !painter) return;
      painter.update(frame, dtMs);
      // The speed is in CSS pixels; the canvas backing store is renderScale times that.
      renderer.draw(frame.mixSpectrum, painter, dtMs, SPECTROGRAM_SCROLL_PX_PER_S * renderScale);
    },
    { enabled: style === 'spectrum' }
  );

  useFrameLoop('stage-scopes', (frame, dtMs) => scopeRendererRef.current?.draw(frame, dtMs), {
    enabled: style === 'scopes',
  });

  const showLabels =
    style === 'scopes' && (scope.scopeLayout === 'stacked' || scope.scopeLayout === 'phase');
  const grid = phaseGrid(voices.length, stageSize.width, stageSize.height);
  const labelPosition = (lane: number): React.CSSProperties =>
    scope.scopeLayout === 'phase'
      ? {
          top: `${(Math.floor(lane / grid.cols) / grid.rows) * 100}%`,
          right: `${((grid.cols - 1 - (lane % grid.cols)) / grid.cols) * 100}%`,
        }
      : { top: `${(lane / voices.length) * 100}%` };

  return (
    <div
      ref={containerRef}
      className="Stage"
      data-style={style}
      data-scope-layout={scope.scopeLayout}
      data-scope-coloring={scope.scopeColoring}
      aria-hidden="true"
    >
      <canvas ref={specRef} className="Stage-spectrogram" />
      <canvas ref={freqRef} className="Stage-analyzer" />
      <canvas ref={scopesRef} className="Stage-scopes" />
      <canvas
        ref={bloomRef}
        className="Stage-scopeBloom"
        style={{ opacity: lowPower ? 0 : scope.scopeBloom }}
      />
      {style === 'scopes' && scope.scopeCrt && <div className="Stage-crt" />}
      {showLabels &&
        voices.map((voice, lane) => (
          <span
            key={voice.index}
            className={`Stage-scopeLabel${voice.audible ? '' : ' is-silent'}`}
            data-channel={voice.index}
            style={labelPosition(lane)}
          >
            {voice.name}
          </span>
        ))}
    </div>
  );
}

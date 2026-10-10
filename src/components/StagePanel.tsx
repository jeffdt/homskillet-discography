import React from 'react';
import { CHANNEL_PALETTES, channelPaletteById } from '../config/channelPalettes';
import {
  SCOPE_COLORINGS,
  SCOPE_LAYOUTS,
  SPECTRUM_COLORINGS,
  VISUALIZER_DEFAULTS,
  VISUALIZER_STYLES,
  scopeColoringById,
  scopeLayoutById,
  scopeSettingsOf,
  spectrumColoringById,
  visualizerStyleById,
} from '../config/stageSettings';
import { SPECTRUM_GRADIENTS, spectrumGradientById } from '../config/spectrumGradients';
import ChannelColorsNotice from './stage/ChannelColorsNotice';
import ChannelLegend from './stage/ChannelLegend';
import ScopePresets from './stage/ScopePresets';
import SwatchPicker from './stage/SwatchPicker';
import { PEAK_SLIDERS, SCOPE_ZOOM, STAGE_COPY } from './stage/stageControls';
import { useSettingControls } from './stage/useSettingControls';
import {
  MORE_SCOPE_SLIDERS,
  MORE_SCOPE_TOGGLES,
  SCOPE_CRT,
  SCOPE_EFFECT_SLIDERS,
  VIZ_COPY,
} from './stage/vizControls';

const STYLE_OPTIONS = VISUALIZER_STYLES.map((style) => ({ id: style.id, label: style.label }));
const SPECTRUM_COLORING_OPTIONS = SPECTRUM_COLORINGS.map((c) => ({ id: c.id, label: c.label }));
const GRADIENT_OPTIONS = SPECTRUM_GRADIENTS.map((g) => ({
  id: g.id,
  label: g.label,
  colors: g.stops,
}));
const SCOPE_LAYOUT_OPTIONS = SCOPE_LAYOUTS.map((l) => ({ id: l.id, label: l.label }));
const SCOPE_COLORING_OPTIONS = SCOPE_COLORINGS.map((c) => ({ id: c.id, label: c.label }));
const CHANNEL_OPTIONS = CHANNEL_PALETTES.map((palette) => ({
  id: palette.id,
  label: palette.label,
  colors: palette.channels,
}));

/** The Visualizer panel: what the stage draws and how it colors the channels, every control explained. */
export default function StagePanel() {
  const { settings, updateSettings, slider, toggle } = useSettingControls();
  const style = visualizerStyleById(settings.visualizerStyle);
  const coloring = spectrumColoringById(settings.spectrumColoring);
  const gradient = spectrumGradientById(settings.spectrumGradient);
  const scope = scopeSettingsOf(settings);
  const palette = channelPaletteById(settings.channelPalette);

  return (
    <div className="StagePanel">
      <section className="StagePanel-section" aria-labelledby="stage-style-heading">
        <h3 id="stage-style-heading" className="StagePanel-heading">
          Style
        </h3>
        <SwatchPicker
          label="Visualizer style"
          options={STYLE_OPTIONS}
          selectedId={style.id}
          onSelect={(id) => updateSettings({ visualizerStyle: id })}
          describedBy="stage-style-description"
        />
        <p id="stage-style-description" className="StagePanel-note">
          {style.description}
        </p>
        {style.id === 'spectrum' ? (
          <>
            <SwatchPicker
              label="Spectrum coloring"
              options={SPECTRUM_COLORING_OPTIONS}
              selectedId={coloring.id}
              onSelect={(id) => updateSettings({ spectrumColoring: id })}
              describedBy="stage-coloring-description"
            />
            <p id="stage-coloring-description" className="StagePanel-note">
              {coloring.description}
            </p>
            {coloring.id === 'unified' && (
              <>
                <SwatchPicker
                  label="Gradient"
                  options={GRADIENT_OPTIONS}
                  selectedId={gradient.id}
                  onSelect={(id) => updateSettings({ spectrumGradient: id })}
                  describedBy="stage-gradient-note"
                />
                <p id="stage-gradient-note" className="StagePanel-note">
                  {VIZ_COPY.gradient}
                </p>
              </>
            )}
            {PEAK_SLIDERS.map((def) => slider(def))}
          </>
        ) : (
          <>
            <ScopePresets
              settings={settings}
              onApply={(preset) => updateSettings({ ...preset.settings })}
            />
            <SwatchPicker
              label="Scope layout"
              options={SCOPE_LAYOUT_OPTIONS}
              selectedId={scope.scopeLayout}
              onSelect={(id) => updateSettings({ scopeLayout: id })}
              describedBy="stage-layout-description"
            />
            <p id="stage-layout-description" className="StagePanel-note">
              {scopeLayoutById(scope.scopeLayout).description}
            </p>
            <SwatchPicker
              label="Trace color"
              options={SCOPE_COLORING_OPTIONS}
              selectedId={scope.scopeColoring}
              onSelect={(id) => updateSettings({ scopeColoring: id })}
              describedBy="stage-trace-description"
            />
            <p id="stage-trace-description" className="StagePanel-note">
              {scopeColoringById(scope.scopeColoring).description}
            </p>
            {SCOPE_EFFECT_SLIDERS.map((def) => slider(def))}
            {toggle(SCOPE_CRT)}
            <details className="StagePanel-more">
              <summary>More scope settings</summary>
              {slider(SCOPE_ZOOM)}
              {MORE_SCOPE_SLIDERS.map((def) => slider(def))}
              {MORE_SCOPE_TOGGLES.map((def) => toggle(def))}
            </details>
          </>
        )}
      </section>

      <section className="StagePanel-section" aria-labelledby="stage-colors-heading">
        <h3 id="stage-colors-heading" className="StagePanel-heading">
          Channel colors
        </h3>
        <p className="StagePanel-note">{STAGE_COPY.channelColors}</p>
        <ChannelColorsNotice
          visualizerStyle={style.id}
          spectrumColoring={coloring.id}
          scopeColoring={scope.scopeColoring}
          onUpdate={updateSettings}
        />
        <SwatchPicker
          label="Channel palette"
          options={CHANNEL_OPTIONS}
          selectedId={palette.id}
          onSelect={(id) => updateSettings({ channelPalette: id })}
          describedBy="stage-palette-description"
        />
        <p id="stage-palette-description" className="StagePanel-note">
          {palette.description}
        </p>
        <ChannelLegend />
      </section>

      <section className="StagePanel-section">
        <button
          type="button"
          className="StagePanel-button"
          aria-describedby="stage-reset-note"
          onClick={() => updateSettings({ ...VISUALIZER_DEFAULTS })}
        >
          Reset visualizer
        </button>
        <p id="stage-reset-note" className="StagePanel-note">
          {STAGE_COPY.resetVisualizer}
        </p>
      </section>
    </div>
  );
}

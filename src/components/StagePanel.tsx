import React, { useContext } from 'react';
import { CHANNEL_PALETTES, channelPaletteById } from '../config/channelPalettes';
import {
  SPARK_DEFAULTS,
  STAGE_DEFAULTS,
  VISUALIZER_STYLES,
  visualizerStyleById,
} from '../config/stageSettings';
import { UI_PALETTES, uiPaletteAt } from '../config/uiPalettes';
import ChannelLegend from './stage/ChannelLegend';
import StageSlider from './stage/StageSlider';
import StageToggle from './stage/StageToggle';
import SwatchPicker from './stage/SwatchPicker';
import {
  FILM_GRAIN,
  MORE_SPARK_SLIDERS,
  PEAK_SLIDERS,
  REACTIVE_UI,
  SCOPE_ZOOM,
  SPARKS,
  SPARK_FADE,
  SPARK_SLIDERS,
  STAGE_COPY,
  StageSliderDef,
  StageToggleDef,
  sliderSetting,
  toggleSetting,
} from './stage/stageControls';
import { UserContext } from './UserProvider';

const STYLE_OPTIONS = VISUALIZER_STYLES.map((style) => ({ id: style.id, label: style.label }));
const CHANNEL_OPTIONS = CHANNEL_PALETTES.map((palette) => ({
  id: palette.id,
  label: palette.label,
  colors: palette.channels,
}));
const ACCENT_OPTIONS = UI_PALETTES.map((palette, i) => ({
  id: String(i),
  label: palette.label,
  colors: [palette.accentDark, palette.accent],
}));

/** The Stage panel ("Visuals"): what you see, grouped by what it changes, every control explained. */
export default function StagePanel() {
  const { settings, updateSettings } = useContext(UserContext);
  const style = visualizerStyleById(settings.visualizerStyle);
  const palette = channelPaletteById(settings.channelPalette);
  const accentIndex = UI_PALETTES.indexOf(uiPaletteAt(settings.uiPalette));
  const sparksOn = toggleSetting(settings, SPARKS);

  const slider = (def: StageSliderDef, disabled = false) => (
    <StageSlider
      key={def.id}
      def={def}
      value={def === SCOPE_ZOOM ? settings.scopeSpan : sliderSetting(settings, def)}
      disabled={disabled}
      onChange={(value) => updateSettings({ [def.key]: value })}
    />
  );

  const toggle = (def: StageToggleDef, disabled = false) => (
    <StageToggle
      key={def.id}
      id={def.id}
      label={def.label}
      explanation={def.explanation}
      checked={toggleSetting(settings, def)}
      disabled={disabled}
      onChange={(on) => updateSettings({ [def.key]: def.toValue(on) })}
    />
  );

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
        {style.id === 'spectrum' ? PEAK_SLIDERS.map((def) => slider(def)) : slider(SCOPE_ZOOM)}
      </section>

      <section className="StagePanel-section" aria-labelledby="stage-colors-heading">
        <h3 id="stage-colors-heading" className="StagePanel-heading">
          Channel colors
        </h3>
        <p className="StagePanel-note">{STAGE_COPY.channelColors}</p>
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

      <section className="StagePanel-section" aria-labelledby="stage-interface-heading">
        <h3 id="stage-interface-heading" className="StagePanel-heading">
          Interface
        </h3>
        <SwatchPicker
          label="Accent color"
          options={ACCENT_OPTIONS}
          selectedId={String(accentIndex)}
          onSelect={(id) => updateSettings({ uiPalette: Number(id) })}
          describedBy="stage-accent-note"
        />
        <p id="stage-accent-note" className="StagePanel-note">
          {STAGE_COPY.accent}
        </p>
        {toggle(REACTIVE_UI)}
        {slider(FILM_GRAIN)}
      </section>

      <section className="StagePanel-section" aria-labelledby="stage-sparks-heading">
        <h3 id="stage-sparks-heading" className="StagePanel-heading">
          Sparks
        </h3>
        {toggle(SPARKS)}
        {SPARK_SLIDERS.map((def) => slider(def, !sparksOn))}
        <details className="StagePanel-more">
          <summary>More spark settings</summary>
          {MORE_SPARK_SLIDERS.map((def) => slider(def, !sparksOn))}
          {toggle(SPARK_FADE, !sparksOn)}
          <button
            type="button"
            className="StagePanel-button"
            onClick={() => updateSettings({ ...SPARK_DEFAULTS })}
          >
            Reset sparks
          </button>
        </details>
      </section>

      <section className="StagePanel-section">
        <button
          type="button"
          className="StagePanel-button"
          aria-describedby="stage-reset-note"
          onClick={() => updateSettings({ ...STAGE_DEFAULTS })}
        >
          Reset stage
        </button>
        <p id="stage-reset-note" className="StagePanel-note">
          {STAGE_COPY.reset}
        </p>
      </section>
    </div>
  );
}

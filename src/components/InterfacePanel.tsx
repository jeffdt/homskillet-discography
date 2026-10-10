import React from 'react';
import { INTERFACE_DEFAULTS, SPARK_DEFAULTS } from '../config/stageSettings';
import { UI_PALETTES, uiPaletteAt } from '../config/uiPalettes';
import SwatchPicker from './stage/SwatchPicker';
import {
  FILM_GRAIN,
  MORE_SPARK_SLIDERS,
  REACTIVE_STRENGTH,
  REACTIVE_UI,
  SPARKS,
  SPARK_FADE,
  SPARK_SLIDERS,
  STAGE_COPY,
  toggleSetting,
} from './stage/stageControls';
import { useSettingControls } from './stage/useSettingControls';

const ACCENT_OPTIONS = UI_PALETTES.map((palette, i) => ({
  id: String(i),
  label: palette.label,
  colors: [palette.accentDark, palette.accent],
}));

/** The Interface panel: how the buttons, bars and overlays around the visualizer look and move. */
export default function InterfacePanel() {
  const { settings, updateSettings, slider, toggle } = useSettingControls();
  const accentIndex = UI_PALETTES.indexOf(uiPaletteAt(settings.uiPalette));
  const sparksOn = toggleSetting(settings, SPARKS);

  return (
    <div className="StagePanel">
      <section className="StagePanel-section" aria-labelledby="interface-look-heading">
        <h3 id="interface-look-heading" className="StagePanel-heading">
          Look
        </h3>
        <SwatchPicker
          label="Accent color"
          options={ACCENT_OPTIONS}
          selectedId={String(accentIndex)}
          onSelect={(id) => updateSettings({ uiPalette: Number(id) })}
          describedBy="interface-accent-note"
        />
        <p id="interface-accent-note" className="StagePanel-note">
          {STAGE_COPY.accent}
        </p>
        {toggle(REACTIVE_UI)}
        {slider(REACTIVE_STRENGTH, !toggleSetting(settings, REACTIVE_UI))}
        {slider(FILM_GRAIN)}
      </section>

      <section className="StagePanel-section" aria-labelledby="interface-sparks-heading">
        <h3 id="interface-sparks-heading" className="StagePanel-heading">
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
          aria-describedby="interface-reset-note"
          onClick={() => updateSettings({ ...INTERFACE_DEFAULTS })}
        >
          Reset interface
        </button>
        <p id="interface-reset-note" className="StagePanel-note">
          {STAGE_COPY.resetInterface}
        </p>
      </section>
    </div>
  );
}

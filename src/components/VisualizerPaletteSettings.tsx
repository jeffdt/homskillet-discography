import React from 'react';
import { VISUALIZER_PALETTES } from '../config/visualizerPalettes';

interface VisualizerPaletteSettingsProps {
  selected: number;
  onSelect: (index: number) => void;
}

/** Visualizer palette grid, moved out of the old Visualizer column; sub-project 7 redesigns it. */
export default function VisualizerPaletteSettings({
  selected,
  onSelect,
}: VisualizerPaletteSettingsProps) {
  return (
    <div className="Settings">
      <div className="Settings-section">
        <h3>Visualizer palette</h3>
        <div className="Visualizer-theme-grid">
          {VISUALIZER_PALETTES.map((palette, i) => (
            <button
              key={palette.label}
              className={`Visualizer-theme-card${selected === i ? ' selected' : ''}`}
              aria-pressed={selected === i}
              onClick={() => onSelect(i)}
            >
              <span className="Visualizer-theme-swatch">
                {palette.colors.slice(0, -1).map((color, c) => (
                  <span
                    key={c}
                    className="Visualizer-theme-pixel"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="Visualizer-theme-label">{palette.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

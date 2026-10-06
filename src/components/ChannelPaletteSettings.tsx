import React from 'react';
import { CHANNEL_PALETTES, channelPaletteById } from '../config/channelPalettes';
import { useVoices } from '../hooks/useVoices';

interface ChannelPaletteSettingsProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Interim channel palette picker with a live legend of the playing track's channels (sub-project 7
 * redesigns the Stage panel). Swatches use var(--ch-N) through data-channel, so they always show
 * the active palette.
 */
export default function ChannelPaletteSettings({
  selectedId,
  onSelect,
}: ChannelPaletteSettingsProps) {
  const voices = useVoices();
  const selected = channelPaletteById(selectedId);
  return (
    <div className="Settings">
      <div className="Settings-section">
        <h3>Channel colors</h3>
        <p className="ChannelPalette-note">
          Each sound channel of the chip gets its own color in the visualizer. Where channels
          overlap, the louder one wins more of the color.
        </p>
        <div className="Visualizer-theme-grid">
          {CHANNEL_PALETTES.map((palette) => (
            <button
              key={palette.id}
              className={`Visualizer-theme-card${palette.id === selected.id ? ' selected' : ''}`}
              aria-pressed={palette.id === selected.id}
              title={palette.description}
              onClick={() => onSelect(palette.id)}
            >
              <span className="Visualizer-theme-swatch">
                {palette.channels.map((color, i) => (
                  <span
                    key={i}
                    className="Visualizer-theme-pixel"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="Visualizer-theme-label">{palette.label}</span>
            </button>
          ))}
        </div>
        <p className="ChannelPalette-note">{selected.description}</p>
        {voices.length === 0 ? (
          <p className="ChannelPalette-note">Play something to see which color is which channel.</p>
        ) : (
          <ul className="ChannelLegend" aria-label="Channel colors for this track">
            {voices.map((voice) => (
              <li
                key={voice.index}
                className={`ChannelLegend-item${voice.audible ? '' : ' is-silent'}`}
              >
                <span className="ChannelLegend-swatch" data-channel={voice.index} />
                <span className="ChannelLegend-name">{voice.name}</span>
                {!voice.audible && (
                  <span className="ChannelLegend-state">
                    {voice.muted ? 'muted' : 'not soloed'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

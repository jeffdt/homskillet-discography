import React from 'react';
import { useVoices } from '../../hooks/useVoices';
import { STAGE_COPY } from './stageControls';

/**
 * The playing track's channels with their colors (from var(--ch-N) through data-channel), dimmed
 * when you cannot hear them. Re-renders only on track load and mute or solo changes.
 */
export default function ChannelLegend() {
  const voices = useVoices();
  if (voices.length === 0) return <p className="StagePanel-note">{STAGE_COPY.noVoices}</p>;
  return (
    <ul className="ChannelLegend" aria-label="Channel colors for this track">
      {voices.map((voice) => (
        <li key={voice.index} className={`ChannelLegend-item${voice.audible ? '' : ' is-silent'}`}>
          <span className="ChannelLegend-swatch" data-channel={voice.index} />
          <span className="ChannelLegend-name">{voice.name}</span>
          {!voice.audible && (
            <span className="ChannelLegend-state">{voice.muted ? 'muted' : 'not soloed'}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

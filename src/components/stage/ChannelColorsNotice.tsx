import React from 'react';
import { VIZ_COPY } from './vizControls';

interface ChannelColorsNoticeProps {
  visualizerStyle: string;
  spectrumColoring: string;
  scopeColoring: string;
  /** Writes the settings that switch the current visual to channel colors. */
  onUpdate: (update: Record<string, string>) => void;
}

/**
 * In the Channel colors section: says when the visual on screen ignores the channel palette (scopes
 * in the accent color, or the Unified spectrum) and offers one click to color it by channel instead.
 * Renders nothing when the palette is in use.
 */
export default function ChannelColorsNotice({
  visualizerStyle,
  spectrumColoring,
  scopeColoring,
  onUpdate,
}: ChannelColorsNoticeProps) {
  const scopes = visualizerStyle === 'scopes';
  if (scopes ? scopeColoring !== 'unified' : spectrumColoring !== 'unified') return null;
  return (
    <div className="StagePanel-notice">
      <p className="StagePanel-note">
        {scopes ? VIZ_COPY.scopesIgnoreChannels : VIZ_COPY.spectrumIgnoresChannels}
      </p>
      <button
        type="button"
        className="StagePanel-button"
        onClick={() =>
          onUpdate(scopes ? { scopeColoring: 'channel' } : { spectrumColoring: 'additive' })
        }
      >
        {scopes ? VIZ_COPY.colorScopesByChannel : VIZ_COPY.colorSpectrumByChannel}
      </button>
    </div>
  );
}

import React from 'react';
import { VIZ_COPY } from './vizControls';

interface ChannelColorsNoticeProps {
  scopeColoring: string;
  /** Writes the settings that switch the scopes to channel colors. */
  onUpdate: (update: Record<string, string>) => void;
}

/**
 * In the Channel colors section: says when the scopes ignore the channel palette (drawn in the
 * accent color) and offers one click to color them by channel instead. Renders nothing when the
 * palette is in use.
 */
export default function ChannelColorsNotice({ scopeColoring, onUpdate }: ChannelColorsNoticeProps) {
  if (scopeColoring !== 'unified') return null;
  return (
    <div className="StagePanel-notice">
      <p className="StagePanel-note">{VIZ_COPY.scopesIgnoreChannels}</p>
      <button
        type="button"
        className="StagePanel-button"
        onClick={() => onUpdate({ scopeColoring: 'channel' })}
      >
        {VIZ_COPY.colorScopesByChannel}
      </button>
    </div>
  );
}

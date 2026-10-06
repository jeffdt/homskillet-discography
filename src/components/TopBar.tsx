import React from 'react';
import { PANEL_TITLES, PanelId, PanelState, isPanelOpen } from '../shell/panels';
import Wordmark from './Wordmark';
import { IconAlbums, IconInfo, IconMixer, IconStage } from './icons';

const BUTTONS: Array<{ id: PanelId; shortcut: string | null; Icon: () => JSX.Element }> = [
  { id: 'albums', shortcut: 'A', Icon: IconAlbums },
  { id: 'mixer', shortcut: 'M', Icon: IconMixer },
  { id: 'stage', shortcut: 'V', Icon: IconStage },
  { id: 'about', shortcut: null, Icon: IconInfo },
];

interface TopBarProps {
  panels: PanelState;
  onToggle: (id: PanelId) => void;
  /** Hidden while the title screen shows its own large logo. */
  showLogo?: boolean;
}

/** Logo plus panel toggles; fades with the rest of the chrome when idle. */
export default function TopBar({ panels, onToggle, showLogo = true }: TopBarProps) {
  return (
    <header className="TopBar Chrome">
      <div className="TopBar-logo" style={showLogo ? undefined : { visibility: 'hidden' }}>
        <Wordmark />
      </div>
      <nav className="TopBar-nav" aria-label="Panels">
        {BUTTONS.map(({ id, shortcut, Icon }) => {
          const open = isPanelOpen(panels, id);
          const label = PANEL_TITLES[id];
          return (
            <button
              key={id}
              className={`TopBar-button${open ? ' is-active' : ''}`}
              aria-pressed={open}
              aria-label={label}
              aria-keyshortcuts={shortcut || undefined}
              title={shortcut ? `${label} (${shortcut})` : label}
              onClick={() => onToggle(id)}
            >
              <Icon />
              <span className="TopBar-label" aria-hidden="true">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

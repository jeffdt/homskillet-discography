import React, { useLayoutEffect, useRef } from 'react';
import { usePulseTarget } from '../hooks/usePulseTarget';
import { Box, LOGO_HANDOFF_MS, handoffTransform } from '../shell/logoHandoff';
import { prefersReducedMotion } from '../shell/motion';
import { PANEL_TITLES, PanelId, PanelState, isPanelOpen } from '../shell/panels';
import Wordmark from './Wordmark';
import { IconAlbums, IconInfo, IconInterface, IconMixer, IconStage } from './icons';

const BUTTONS: Array<{ id: PanelId; shortcut: string | null; Icon: () => JSX.Element }> = [
  { id: 'albums', shortcut: 'A', Icon: IconAlbums },
  { id: 'mixer', shortcut: 'M', Icon: IconMixer },
  { id: 'stage', shortcut: 'V', Icon: IconStage },
  { id: 'interface', shortcut: 'I', Icon: IconInterface },
  { id: 'about', shortcut: null, Icon: IconInfo },
];

interface TopBarProps {
  panels: PanelState;
  onToggle: (id: PanelId) => void;
  /** Hidden while the title screen shows its own large logo. */
  showLogo?: boolean;
  /** Returns, once, where the title screen's logo was, so this logo can glide in from there. */
  takeLogoHandoff?: () => Box | null;
  /** While true the logo swells with the audio pulse (Reactive UI); otherwise it holds still. */
  pulsing?: boolean;
}

/** Panel toggles on the left, above where panels open, and the logo on the right; fades when idle. */
export default function TopBar({
  panels,
  onToggle,
  showLogo = true,
  takeLogoHandoff,
  pulsing = false,
}: TopBarProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  usePulseTarget(logoRef, '--pulse-intensity', pulsing);

  // Runs before paint in the commit that removes the title screen, so the logo never flashes in its corner.
  useLayoutEffect(() => {
    if (!showLogo || !takeLogoHandoff) return;
    const from = takeLogoHandoff();
    const word = logoRef.current && logoRef.current.querySelector<HTMLElement>('.Wordmark');
    if (!from || !word || typeof word.animate !== 'function' || prefersReducedMotion()) return;
    word.animate(
      [
        { transformOrigin: '0 0', transform: handoffTransform(from, word.getBoundingClientRect()) },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: LOGO_HANDOFF_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    );
  }, [showLogo, takeLogoHandoff]);

  return (
    <header className="TopBar Chrome">
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
      <div
        className="TopBar-logo"
        ref={logoRef}
        style={showLogo ? undefined : { visibility: 'hidden' }}
      >
        <Wordmark />
      </div>
    </header>
  );
}

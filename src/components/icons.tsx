import React from 'react';

/** 24x24 line glyph stroked in the current text color; `filled` also fills closed shapes. */
function Icon({ children, filled = false }: { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      className="Icon"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A record: the Albums drawer. */
export const IconAlbums = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12a6 6 0 0 1 6-6" />
  </Icon>
);

/** Three faders: the Mixer panel. */
export const IconMixer = () => (
  <Icon>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />
  </Icon>
);

/** An eye: the Visuals panel. */
export const IconStage = () => (
  <Icon>
    <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

/** Circled i: the About panel. */
export const IconInfo = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

/** Four corners: fullscreen. */
export const IconFullscreen = () => (
  <Icon>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </Icon>
);

/** Previous track. */
export const IconPrev = () => (
  <Icon filled>
    <path d="M19 20 9 12l10-8z" />
    <path d="M5 19V5" />
  </Icon>
);

/** Next track. */
export const IconNext = () => (
  <Icon filled>
    <path d="m5 4 10 8-10 8z" />
    <path d="M19 5v14" />
  </Icon>
);

/** Play. */
export const IconPlay = () => (
  <Icon filled>
    <path d="M6 3l14 9-14 9z" />
  </Icon>
);

/** Pause. */
export const IconPause = () => (
  <Icon filled>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </Icon>
);

/** Crossed arrows: shuffle. */
export const IconShuffle = () => (
  <Icon>
    <path d="m18 14 4 4-4 4M18 2l4 4-4 4" />
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
  </Icon>
);

/** Loop arrows with a 1: repeat this track. */
export const IconRepeat = () => (
  <Icon>
    <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10h1v4" />
  </Icon>
);

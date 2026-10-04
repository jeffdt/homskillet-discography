import React from 'react';

/** 16x16 pixel-grid glyph drawn in the current text color. */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="Icon"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {children}
    </svg>
  );
}

/** Four squares: the Albums drawer. */
export const IconAlbums = () => (
  <Icon>
    <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />
  </Icon>
);

/** Three faders: the Mixer panel. */
export const IconMixer = () => (
  <Icon>
    <path d="M4 1h1v14H4zM8 1h1v14H8zM12 1h1v14h-1zM2 9h5v3H2zM6 3h5v3H6zM10 6h5v3h-5z" />
  </Icon>
);

/** A screen: the Stage panel. */
export const IconStage = () => (
  <Icon>
    <path fillRule="evenodd" d="M1 2h14v10H1zM3 4v6h10V4zM6 13h4v2H6z" />
  </Icon>
);

/** Lowercase i: the About panel. */
export const IconInfo = () => (
  <Icon>
    <path d="M7 2h2v2H7zM6 6h3v6h1v2H6v-2h1V8H6z" />
  </Icon>
);

/** Four corners: fullscreen. */
export const IconFullscreen = () => (
  <Icon>
    <path d="M1 1h5v2H3v3H1zM10 1h5v5h-2V3h-3zM1 10h2v3h3v2H1zM13 10h2v5h-5v-2h3z" />
  </Icon>
);

/** Previous track. */
export const IconPrev = () => (
  <Icon>
    <path d="M2 2h2v12H2zM14 2v12L5 8z" />
  </Icon>
);

/** Next track. */
export const IconNext = () => (
  <Icon>
    <path d="M12 2h2v12h-2zM2 2l9 6-9 6z" />
  </Icon>
);

/** Play. */
export const IconPlay = () => (
  <Icon>
    <path d="M4 2l10 6-10 6z" />
  </Icon>
);

/** Pause. */
export const IconPause = () => (
  <Icon>
    <path d="M3 2h4v12H3zM9 2h4v12H9z" />
  </Icon>
);

/** Crossed arrows: shuffle. */
export const IconShuffle = () => (
  <Icon>
    <path d="M1 3h3l6 8h2V9l3 3-3 3v-2H9L3 5H1zM1 11h2l1.5-2 1.2 1.6L4 13H1zM9 3h3V1l3 3-3 3V5h-2L8.5 7 7.3 5.4z" />
  </Icon>
);

/** Loop arrows: repeat track. */
export const IconRepeat = () => (
  <Icon>
    <path d="M3 4h9V2l3 3-3 3V6H5v3H3zM13 12H4v2l-3-3 3-3v2h7V7h2z" />
  </Icon>
);

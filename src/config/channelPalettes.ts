import { VOICE_PAIRS } from '../audio/constants';

/** Channels a palette colors: one per voice pair the engine renders. */
export const CHANNEL_COUNT = VOICE_PAIRS;

/** A channel palette: one color per voice, so every per-channel display agrees (spec 3.8). */
export interface ChannelPalette {
  /** Stable key persisted in settings.channelPalette. Never rename or reuse one. */
  id: string;
  label: string;
  /** One plain-language line shown under the palette picker. */
  description: string;
  /** Exactly CHANNEL_COUNT lowercase '#rrggbb' colors; channels[i] colors voice index i. */
  channels: readonly string[];
}

/** The palette new visitors see, and the fallback for unknown ids. */
export const DEFAULT_CHANNEL_PALETTE_ID = 'chromatic';

/** Every channel palette, default first. src/__tests__/channelPalettes.test.ts validates each one. */
export const CHANNEL_PALETTES: readonly ChannelPalette[] = [
  {
    // Okabe and Ito's color-universal palette with gray in place of black for the dark stage. The
    // 2A03 voices (Square 1, Square 2, Triangle, Noise, DMC) get blue, yellow, green, gray, pink.
    // Measured 2026-10-06: smallest CIEDE2000 between two channels 21.6 normal, 12.2 protanopia,
    // 11.6 deuteranopia, 10.9 tritanopia; every color at least 3.67:1 against --background.
    id: 'chromatic',
    label: 'Chromatic',
    description:
      'A different hue for every channel, chosen to stay tellable apart with common kinds of color blindness.',
    channels: [
      '#56b4e9',
      '#f0e442',
      '#009e73',
      '#c3c3c3',
      '#cc79a7',
      '#e69f00',
      '#d55e00',
      '#0072b2',
    ],
  },
  {
    id: 'metallic-wing',
    label: 'Metallic Wing',
    description: 'Every channel in a shade of Metallic Wing green.',
    channels: [
      '#9bfe38',
      '#66cb01',
      '#c8ff8a',
      '#4f9e00',
      '#e2ffc4',
      '#7fe01c',
      '#b3fe6a',
      '#3f8000',
    ],
  },
  {
    id: 'game-boy',
    label: 'Game Boy',
    description: 'Four handheld greens, shared by the channels in turn.',
    channels: [
      '#e0f8d0',
      '#a8d080',
      '#78a858',
      '#509040',
      '#e0f8d0',
      '#a8d080',
      '#78a858',
      '#509040',
    ],
  },
  {
    id: 'game-genie',
    label: 'Game Genie',
    description: 'Blues, purples, reds and golds, like the Game Genie gradient.',
    channels: [
      '#6a6af5',
      '#a855e8',
      '#d0508a',
      '#ff3a5c',
      '#f0b000',
      '#ffffa0',
      '#9a9aff',
      '#ff7a3a',
    ],
  },
  {
    id: 'vapor',
    label: 'Vapor',
    description: 'Warm oranges against cool teals and blues.',
    channels: [
      '#ff5f29',
      '#ffd69c',
      '#73c6c6',
      '#6a96c8',
      '#ff9a6a',
      '#b0ecec',
      '#ffb470',
      '#9ab8e0',
    ],
  },
  {
    id: 'chrome',
    label: 'Chrome',
    description: 'Shades of gray: the shape of the music without color.',
    channels: [
      '#e0e0e0',
      '#bbbbbb',
      '#909090',
      '#707070',
      '#d0d0d0',
      '#a0a0a0',
      '#808080',
      '#c3c3c3',
    ],
  },
];

/** The palette with this id, or Chromatic when the id is missing or unknown (an old setting). */
export function channelPaletteById(id?: string | null): ChannelPalette {
  return (
    CHANNEL_PALETTES.find((palette) => palette.id === id) ||
    (CHANNEL_PALETTES.find(
      (palette) => palette.id === DEFAULT_CHANNEL_PALETTE_ID
    ) as ChannelPalette)
  );
}

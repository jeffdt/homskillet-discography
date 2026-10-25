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
export const DEFAULT_CHANNEL_PALETTE_ID = 'metallic-wing';

/** Every channel palette, default first. src/__tests__/channelPalettes.test.ts validates each one. */
export const CHANNEL_PALETTES: readonly ChannelPalette[] = [
  {
    id: 'metallic-wing',
    label: 'Metallic Wing',
    description:
      'The five Metallic Wing accent colors, their darker shades and Metallic Wing white.',
    channels: [
      '#66caff',
      '#efe903',
      '#9bfe38',
      '#fefefe',
      '#ffaec9',
      '#f0424a',
      '#ffbb3e',
      '#009ff4',
    ],
  },
  {
    // Okabe and Ito's color-universal palette with gray in place of black for the dark stage. The
    // 2A03 voices (Square 1, Square 2, Triangle, Noise, DMC) get blue, yellow, green, gray, pink.
    // Measured 2026-10-06: smallest CIEDE2000 between two channels 21.6 normal, 12.2 protanopia,
    // 11.6 deuteranopia, 10.9 tritanopia; every color at least 3.67:1 against --background.
    id: 'chromatic',
    label: 'Chromatic',
    description: 'A distinct hue per channel, easy to tell apart with common color blindness.',
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
    id: 'nes',
    label: 'NES',
    description: "Colors from the NES's built-in palette.",
    channels: [
      '#3cbcfc',
      '#f8b800',
      '#58d854',
      '#bcbcbc',
      '#f878f8',
      '#f83800',
      '#6888fc',
      '#00e8d8',
    ],
  },
  {
    id: 'pico-8',
    label: 'PICO-8',
    description: 'The bright colors of the PICO-8 fantasy console.',
    channels: [
      '#29adff',
      '#ffec27',
      '#00e436',
      '#83769c',
      '#ff77a8',
      '#ffa300',
      '#ff004d',
      '#ffccaa',
    ],
  },
  {
    // bz names Bazaar, the album whose game inspired these colors; keep the prefix.
    id: 'bazaar',
    label: 'bz Market',
    description: 'Teal, sand, moss, lilac and rust from the bz gradients.',
    channels: [
      '#90c8c8',
      '#f8e850',
      '#afc33e',
      '#919a6d',
      '#f8c0f8',
      '#f83000',
      '#d89048',
      '#9a7ad0',
    ],
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Bright cyan, yellow, green, magenta and orange.',
    channels: [
      '#00f0ff',
      '#fff200',
      '#39ff14',
      '#b0b0ff',
      '#ff2bd6',
      '#ff8a00',
      '#ff3b3b',
      '#8f5bff',
    ],
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Hot pink, purple and cyan.',
    channels: [
      '#4cc9f0',
      '#ffd166',
      '#06d6a0',
      '#c77dff',
      '#f72585',
      '#ff9e00',
      '#ff6b6b',
      '#4895ef',
    ],
  },
  {
    id: 'pastel',
    label: 'Pastel',
    description: 'Soft, light versions of every hue.',
    channels: [
      '#a0c4ff',
      '#fdffb6',
      '#caffbf',
      '#bdb2ff',
      '#ffc6ff',
      '#ffd6a5',
      '#ffadad',
      '#9bf6ff',
    ],
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Amber, orange, red and mauve, with sage and teal.',
    channels: [
      '#ffb000',
      '#ff6b35',
      '#e63946',
      '#b5838d',
      '#f4a261',
      '#ffe8a3',
      '#8ab17d',
      '#2a9d8f',
    ],
  },
  {
    id: 'reef',
    label: 'Reef',
    description: 'Coral, sea blue, teal and sand.',
    channels: [
      '#3a86ff',
      '#ffd23f',
      '#2ec4b6',
      '#e9d8a6',
      '#ff99c8',
      '#ff7f50',
      '#80ed99',
      '#b388eb',
    ],
  },
  {
    id: 'game-genie',
    label: 'Game Genie',
    description: 'Blues, purples, reds and golds.',
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

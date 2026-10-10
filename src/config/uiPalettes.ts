import { UIPalette } from '../types/uiPalette';

/** Accent palettes. The MW prefix names Metallic Wing, the album whose game inspired them; keep it. */
export const UI_PALETTES: UIPalette[] = [
  {
    label: 'MW Green',
    accentDark: '#66CB01',
    accent: '#9BFE38',
  },
  {
    label: 'MW Yellow',
    accentDark: '#FFBB3E',
    accent: '#EFE903',
  },
  {
    label: 'MW Blue',
    accentDark: '#009FF4',
    accent: '#66CAFF',
  },
  {
    label: 'MW Pink',
    accentDark: '#FF6A9B',
    accent: '#FFAEC9',
  },
  {
    label: 'MW Red',
    accentDark: '#DA0205',
    accent: '#F0424A',
  },
];

/** The accent palette at a stored index, or the first (MW Green) when the index is not valid. */
export function uiPaletteAt(index: unknown): UIPalette {
  return typeof index === 'number' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < UI_PALETTES.length
    ? UI_PALETTES[index]
    : UI_PALETTES[0];
}

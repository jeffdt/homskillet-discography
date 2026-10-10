import { UIPalette } from '../types/uiPalette';

export const UI_PALETTES: UIPalette[] = [
  {
    label: 'Green',
    accentDark: '#66CB01',
    accent: '#9BFE38',
  },
  {
    label: 'Yellow',
    accentDark: '#FFBB3E',
    accent: '#EFE903',
  },
  {
    label: 'Blue',
    accentDark: '#009FF4',
    accent: '#66CAFF',
  },
  {
    label: 'Pink',
    accentDark: '#FF6A9B',
    accent: '#FFAEC9',
  },
  {
    label: 'Red',
    accentDark: '#DA0205',
    accent: '#F0424A',
  },
];

/** The accent palette at a stored index, or the first (Green) when the index is not valid. */
export function uiPaletteAt(index: unknown): UIPalette {
  return typeof index === 'number' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < UI_PALETTES.length
    ? UI_PALETTES[index]
    : UI_PALETTES[0];
}

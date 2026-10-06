import { DEFAULT_COLOR_PALETTE } from '../visuals/spectrogramMath';
import { ColorPalette } from '../types/visualizer';

export const VISUALIZER_PALETTES: ColorPalette[] = [
  // MW Palettes
  {
    label: 'MW Green',
    colors: ['#101010', '#202020', '#66CB01', '#9BFE38', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Yellow',
    colors: ['#101010', '#202020', '#FFBB3E', '#EFE903', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Blue',
    colors: ['#101010', '#202020', '#009FF4', '#66CAFF', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Pink',
    colors: ['#101010', '#202020', '#FF6A9B', '#FFAEC9', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Red',
    colors: ['#101010', '#202020', '#DA0205', '#F0424A', '#FEFEFE', '#FEFEFE'],
  },
  // bz Palettes
  {
    label: 'bz chrome',
    colors: ['#101010', '#000000', '#707070', '#bbbbbb', '#e0e0e0', '#FEFEFE'],
  },
  {
    label: 'bz Negative',
    colors: ['#e0e0e0', '#bbbbbb', '#707070', '#101010', '#101010', '#000000'],
  },
  {
    label: 'bz Moss',
    colors: ['#101010', '#204631', '#538140', '#afc33e', '#d6e896', '#FEFEFE'],
  },
  {
    label: 'bz Olive',
    colors: ['#101010', '#353928', '#626949', '#919a6d', '#bfc5ab', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Desert',
    colors: ['#101010', '#393929', '#7b7363', '#b5a56b', '#e7d69c', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Vapor',
    colors: ['#101010', '#314a63', '#ff5f29', '#ffd69c', '#73c6c6', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Autumn',
    colors: ['#101010', '#301800', '#804000', '#f8b888', '#f8e8e0', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Ocean',
    colors: ['#101010', '#082048', '#486878', '#90c8c8', '#f8f8b8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Wheat',
    colors: ['#101010', '#405028', '#808840', '#b8c058', '#f8f8c8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Lime',
    colors: ['#101010', '#081800', '#488818', '#78c838', '#e0f8a0', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Sunset',
    colors: ['#101010', '#301850', '#a82820', '#d89048', '#f8e8c8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Inferno',
    colors: ['#101010', '#500058', '#f83000', '#f8e850', '#f8f8f8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Twilight',
    colors: ['#101010', '#282898', '#7830e8', '#e88888', '#f8c0f8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Emerald',
    colors: ['#101010', '#042022', '#083e34', '#085826', '#5c6b00', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Lavender',
    colors: ['#101010', '#301850', '#7a5da5', '#e7d69c', '#f8f8b8', '#FEFEFE', '#FEFEFE'],
  },
  // Misc Palettes
  {
    label: 'Game Genie',
    colors: DEFAULT_COLOR_PALETTE,
  },
  {
    label: 'Midnight',
    colors: ['#020024', '#090979', '#0f5a9e', '#0fd7b1', '#f2f2f2'],
  },
  {
    label: 'Sunset',
    colors: ['#020202', '#35012c', '#731630', '#ee4c2c', '#fde06f', '#fffce8'],
  },
];

/** Colors for a persisted palette index, falling back to the first palette when out of range. */
export function visualizerPaletteColors(index?: number): string[] {
  const palette = VISUALIZER_PALETTES[index ?? 0] || VISUALIZER_PALETTES[0];
  return palette.colors;
}

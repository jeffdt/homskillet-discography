/** A loudness gradient for the Unified spectrum: quiet values take the first stop, the loudest the last. */
export interface SpectrumGradient {
  /** Stable key persisted in settings.spectrumGradient. Never rename or reuse one. */
  id: string;
  label: string;
  /** Two or more lowercase '#rrggbb' stops, evenly spaced from silence to full. */
  stops: readonly string[];
}

/** The gradients the site had before channel colors (PR #137), in their old order. The owner will curate them. */
export const SPECTRUM_GRADIENTS: readonly SpectrumGradient[] = [
  {
    id: 'mw-green',
    label: 'MW Green',
    stops: ['#101010', '#202020', '#66cb01', '#9bfe38', '#fefefe', '#fefefe'],
  },
  {
    id: 'mw-yellow',
    label: 'MW Yellow',
    stops: ['#101010', '#202020', '#ffbb3e', '#efe903', '#fefefe', '#fefefe'],
  },
  {
    id: 'mw-blue',
    label: 'MW Blue',
    stops: ['#101010', '#202020', '#009ff4', '#66caff', '#fefefe', '#fefefe'],
  },
  {
    id: 'mw-pink',
    label: 'MW Pink',
    stops: ['#101010', '#202020', '#ff6a9b', '#ffaec9', '#fefefe', '#fefefe'],
  },
  {
    id: 'mw-red',
    label: 'MW Red',
    stops: ['#101010', '#202020', '#da0205', '#f0424a', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-chrome',
    label: 'bz chrome',
    stops: ['#101010', '#000000', '#707070', '#bbbbbb', '#e0e0e0', '#fefefe'],
  },
  {
    id: 'bz-negative',
    label: 'bz Negative',
    stops: ['#e0e0e0', '#bbbbbb', '#707070', '#101010', '#101010', '#000000'],
  },
  {
    id: 'bz-moss',
    label: 'bz Moss',
    stops: ['#101010', '#204631', '#538140', '#afc33e', '#d6e896', '#fefefe'],
  },
  {
    id: 'bz-olive',
    label: 'bz Olive',
    stops: ['#101010', '#353928', '#626949', '#919a6d', '#bfc5ab', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-desert',
    label: 'bz Desert',
    stops: ['#101010', '#393929', '#7b7363', '#b5a56b', '#e7d69c', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-vapor',
    label: 'bz Vapor',
    stops: ['#101010', '#314a63', '#ff5f29', '#ffd69c', '#73c6c6', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-autumn',
    label: 'bz Autumn',
    stops: ['#101010', '#301800', '#804000', '#f8b888', '#f8e8e0', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-ocean',
    label: 'bz Ocean',
    stops: ['#101010', '#082048', '#486878', '#90c8c8', '#f8f8b8', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-wheat',
    label: 'bz Wheat',
    stops: ['#101010', '#405028', '#808840', '#b8c058', '#f8f8c8', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-lime',
    label: 'bz Lime',
    stops: ['#101010', '#081800', '#488818', '#78c838', '#e0f8a0', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-sunset',
    label: 'bz Sunset',
    stops: ['#101010', '#301850', '#a82820', '#d89048', '#f8e8c8', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-inferno',
    label: 'bz Inferno',
    stops: ['#101010', '#500058', '#f83000', '#f8e850', '#f8f8f8', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-twilight',
    label: 'bz Twilight',
    stops: ['#101010', '#282898', '#7830e8', '#e88888', '#f8c0f8', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-emerald',
    label: 'bz Emerald',
    stops: ['#101010', '#042022', '#083e34', '#085826', '#5c6b00', '#fefefe', '#fefefe'],
  },
  {
    id: 'bz-lavender',
    label: 'bz Lavender',
    stops: ['#101010', '#301850', '#7a5da5', '#e7d69c', '#f8f8b8', '#fefefe', '#fefefe'],
  },
  {
    id: 'game-genie',
    label: 'Game Genie',
    stops: ['#000000', '#0000a0', '#6000a0', '#962761', '#dd1440', '#f0b000', '#ffffa0', '#ffffff'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    stops: ['#020024', '#090979', '#0f5a9e', '#0fd7b1', '#f2f2f2'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    stops: ['#020202', '#35012c', '#731630', '#ee4c2c', '#fde06f', '#fffce8'],
  },
];

/** The gradient the Unified spectrum starts with, and the fallback for unknown ids. */
export const DEFAULT_SPECTRUM_GRADIENT_ID = 'mw-green';

/** The gradient with this id, or MW Green when the id is missing or unknown. */
export function spectrumGradientById(id?: unknown): SpectrumGradient {
  return (
    SPECTRUM_GRADIENTS.find((gradient) => gradient.id === id) ||
    (SPECTRUM_GRADIENTS.find(
      (gradient) => gradient.id === DEFAULT_SPECTRUM_GRADIENT_ID
    ) as SpectrumGradient)
  );
}

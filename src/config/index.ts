// Development vs Production configuration
const IS_PRODUCTION: boolean = import.meta.env.MODE === 'production';
const PUBLIC_URL: string = import.meta.env.VITE_PUBLIC_URL || '';

// Use static files for both dev and production (no separate API/file servers needed)
const API_BASE: string = '';

const CATALOG_PREFIX: string = IS_PRODUCTION
  ? `${PUBLIC_URL}/music`
  : '/music';

const MAX_SAMPLE_RATE: number = 48000; // Higher rates are problematic for some players.
const MAX_VOICES: number = 64;
const REPLACE_STATE_ON_SEEK: boolean = false;

// GME (Game Music Emu) supported formats only
const FORMATS: string[] = [
  'ay',
  'gbs',
  'nsf',
  'nsfe',
  'spc',
];

export interface Config {
  API_BASE: string;
  CATALOG_PREFIX: string;
  FORMATS: string[];
  IS_PRODUCTION: boolean;
  MAX_SAMPLE_RATE: number;
  MAX_VOICES: number;
  PUBLIC_URL: string;
  REPLACE_STATE_ON_SEEK: boolean;
}

// Export for ES6 imports
export {
  API_BASE,
  CATALOG_PREFIX,
  FORMATS,
  IS_PRODUCTION,
  MAX_SAMPLE_RATE,
  MAX_VOICES,
  PUBLIC_URL,
  REPLACE_STATE_ON_SEEK,
};

// Default export for compatibility with CommonJS require()
export default {
  API_BASE,
  CATALOG_PREFIX,
  FORMATS,
  IS_PRODUCTION,
  MAX_SAMPLE_RATE,
  MAX_VOICES,
  PUBLIC_URL,
  REPLACE_STATE_ON_SEEK,
};

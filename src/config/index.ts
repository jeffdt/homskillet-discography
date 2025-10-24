// Development vs Production configuration
// These are replaced at build time by webpack DefinePlugin
const IS_PRODUCTION: boolean = process.env.NODE_ENV === 'production';
const PUBLIC_URL: string = process.env.PUBLIC_URL || '';

const API_BASE: string = IS_PRODUCTION
  ? '' // No API server in production
  : 'http://localhost:8080';

const CATALOG_PREFIX: string = IS_PRODUCTION
  ? `${PUBLIC_URL}/music` // Static files on GitHub Pages
  : 'http://localhost:8000/music'; // Python file server in dev

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

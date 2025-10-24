// Development vs Production configuration
// These are replaced at build time by webpack DefinePlugin
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const API_BASE = IS_PRODUCTION
  ? '' // No API server in production
  : 'http://localhost:8080';

const CATALOG_PREFIX = IS_PRODUCTION
  ? `${PUBLIC_URL}/music` // Static files on GitHub Pages
  : 'http://localhost:8000/music'; // Python file server in dev

const MAX_SAMPLE_RATE = 48000;                            // Higher rates are problematic for some players.
const MAX_VOICES = 64;
const REPLACE_STATE_ON_SEEK = false;
// GME (Game Music Emu) supported formats only
const FORMATS =  [
  'ay',
  'gbs',
  'nsf',
  'nsfe',
  'spc',
];

// needs to be a CommonJS module - used in node.js server
module.exports = {
  API_BASE,
  CATALOG_PREFIX,
  FORMATS,
  IS_PRODUCTION,
  MAX_SAMPLE_RATE,
  MAX_VOICES,
  PUBLIC_URL,
  REPLACE_STATE_ON_SEEK,
};

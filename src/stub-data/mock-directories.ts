/**
 * Mock catalog data for stub mode
 *
 * This provides a minimal catalog structure when directories.json
 * is not available (e.g., lightweight dev environments, remote deployments)
 */

import type { Directories } from '../types/catalog';

export const MOCK_DIRECTORIES: Directories = {
  '/': [
    {
      path: '/Demo Album',
      size: 100000,
      type: 'directory',
      numChildren: 3,
      mtime: Math.floor(Date.now() / 1000),
    },
  ],
  '/Demo Album': [
    {
      path: '/Demo Album/Track 01 - Intro.nsf',
      size: 15000,
      type: 'file',
      mtime: Math.floor(Date.now() / 1000),
      idx: 0,
    },
    {
      path: '/Demo Album/Track 02 - Main Theme.nsf',
      size: 18000,
      type: 'file',
      mtime: Math.floor(Date.now() / 1000),
      idx: 1,
    },
    {
      path: '/Demo Album/Track 03 - Finale.nsf',
      size: 20000,
      type: 'file',
      mtime: Math.floor(Date.now() / 1000),
      idx: 2,
    },
  ],
};

export const MOCK_CATALOG: string[] = [
  'Demo Album/Track 01 - Intro.nsf',
  'Demo Album/Track 02 - Main Theme.nsf',
  'Demo Album/Track 03 - Finale.nsf',
];

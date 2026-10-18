/**
 * Mock catalog data for stub mode
 *
 * This provides a minimal catalog structure when directories.json
 * is not available (e.g., lightweight dev environments, remote deployments)
 */

import type { RawDirectories } from '../catalog/catalog';

export const MOCK_DIRECTORIES: RawDirectories = {
  '/': [
    {
      path: '/Demo Album',
      size: 100000,
      type: 'directory',
      numChildren: 3,
    },
  ],
  '/Demo Album': [
    {
      path: '/Demo Album/Track 01 - Intro.nsf',
      size: 15000,
      type: 'file',
      idx: 0,
    },
    {
      path: '/Demo Album/Track 02 - Main Theme.nsf',
      size: 18000,
      type: 'file',
      idx: 1,
    },
    {
      path: '/Demo Album/Track 03 - Finale.nsf',
      size: 20000,
      type: 'file',
      idx: 2,
    },
  ],
};

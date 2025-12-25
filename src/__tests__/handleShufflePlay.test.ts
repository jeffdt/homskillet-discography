/**
 * Unit test for handleShufflePlay to ensure it uses the static catalog.json
 * and doesn't try to hit an API server endpoint that doesn't exist.
 *
 * This test validates the bug fix where the randomize button was broken
 * because it tried to fetch from an API endpoint instead of catalog.json.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the PUBLIC_URL config before importing
vi.mock('../config', () => ({
  PUBLIC_URL: '',
  API_BASE: '',
  CATALOG_PREFIX: '/music',
  FORMATS: ['nsf', 'nsfe'],
  IS_PRODUCTION: false,
  MAX_SAMPLE_RATE: 48000,
  MAX_VOICES: 64,
  REPLACE_STATE_ON_SEEK: false,
}));

import { handleShufflePlayLogic } from '../handleShufflePlayLogic';

describe('handleShufflePlayLogic', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch from /catalog.json (not from an API endpoint)', async () => {
    // This test ensures we don't regress to the bug where it tried to
    // fetch from ${API_BASE}/shuffle (which returned HTML instead of JSON)

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ['Album1/song1.nsf', 'Album1/song2.nsf'],
    });
    global.fetch = fetchMock;

    const pathToHrefMock = vi.fn((path) => `/music/${path}`);
    const playContextMock = vi.fn();

    await handleShufflePlayLogic('Album1', pathToHrefMock, playContextMock);

    // The critical assertion: verify we fetch from /catalog.json
    // NOT from /shuffle or any other API endpoint
    expect(fetchMock).toHaveBeenCalledWith('/catalog.json');
  });

  it('should filter files by path prefix', async () => {
    const mockCatalog = [
      'Album1/song1.nsf',
      'Album1/song2.nsf',
      'Album1/song3.nsf',
      'Album2/song4.nsf',
    ];

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mockCatalog,
    });

    const pathToHrefMock = vi.fn((path) => `/music/${path}`);
    const playContextMock = vi.fn();

    await handleShufflePlayLogic('Album1', pathToHrefMock, playContextMock);

    // Verify that only Album1 songs were passed to playContext
    expect(playContextMock).toHaveBeenCalled();
    const playedSongs = playContextMock.mock.calls[0][0];

    // All 3 Album1 songs should be included
    expect(playedSongs.length).toBe(3);
    playedSongs.forEach((song: string) => {
      expect(song).toMatch(/^\/music\/Album1\//);
    });
  });

  it('should include all matching songs (no limit)', async () => {
    // Create a catalog with many songs
    const mockCatalog = Array.from({ length: 150 }, (_, i) => `Album1/song${i}.nsf`);

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mockCatalog,
    });

    const pathToHrefMock = vi.fn((path) => `/music/${path}`);
    const playContextMock = vi.fn();

    await handleShufflePlayLogic('Album1', pathToHrefMock, playContextMock);

    // Verify all songs are included
    const playedSongs = playContextMock.mock.calls[0][0];
    expect(playedSongs.length).toBe(150);
  });
});

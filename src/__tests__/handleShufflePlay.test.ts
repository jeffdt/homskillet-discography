/**
 * Unit test for handleShufflePlay to ensure it uses the static catalog.json
 * and doesn't try to hit an API server endpoint that doesn't exist.
 *
 * This test validates the bug fix where the randomize button was broken
 * because it tried to fetch from an API endpoint instead of catalog.json.
 */

// Mock the PUBLIC_URL config before importing
jest.mock('../config', () => ({
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

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ['Album1/song1.nsf', 'Album1/song2.nsf'],
    });
    global.fetch = fetchMock;

    const pathToHrefMock = jest.fn((path) => `/music/${path}`);
    const playContextMock = jest.fn();

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

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockCatalog,
    });

    const pathToHrefMock = jest.fn((path) => `/music/${path}`);
    const playContextMock = jest.fn();

    await handleShufflePlayLogic('Album1', pathToHrefMock, playContextMock);

    // Verify that only Album1 songs were passed to playContext
    expect(playContextMock).toHaveBeenCalled();
    const playedSongs = playContextMock.mock.calls[0][0];

    // All songs should be from Album1
    expect(playedSongs.length).toBeLessThanOrEqual(3);
    playedSongs.forEach((song: string) => {
      expect(song).toMatch(/^\/music\/Album1\//);
    });
  });

  it('should limit shuffled results to 100 songs max', async () => {
    // Create a catalog with more than 100 songs
    const mockCatalog = Array.from({ length: 150 }, (_, i) => `Album1/song${i}.nsf`);

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockCatalog,
    });

    const pathToHrefMock = jest.fn((path) => `/music/${path}`);
    const playContextMock = jest.fn();

    await handleShufflePlayLogic('Album1', pathToHrefMock, playContextMock);

    // Verify that no more than 100 songs are played
    const playedSongs = playContextMock.mock.calls[0][0];
    expect(playedSongs.length).toBeLessThanOrEqual(100);
  });
});

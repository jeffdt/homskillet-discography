import { describe, it, expect, vi } from 'vitest';
import { loadCatalog } from '../catalog/loadCatalog';

const DIRS = {
  '/': [{ path: '/Bazaar', type: 'directory' }],
  '/Bazaar': [{ path: '/Bazaar/groove.nsf', type: 'file' }],
};

function respond(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  } as unknown as Response;
}

function fetchWith(routes: Record<string, () => Response>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((suffix) => url.endsWith(suffix));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return routes[key]();
  }) as unknown as typeof fetch;
}

describe('loadCatalog', () => {
  it('merges directories.json with metadata.json', async () => {
    const catalog = await loadCatalog(
      fetchWith({
        '/directories.json': () => respond(DIRS),
        '/music/metadata.json': () => respond({ albums: { Bazaar: { title: 'The Bazaar' } } }),
      })
    );
    expect(catalog.albums[0].title).toBe('The Bazaar');
  });

  it('uses fallbacks when metadata.json is missing', async () => {
    const catalog = await loadCatalog(
      fetchWith({
        '/directories.json': () => respond(DIRS),
        '/music/metadata.json': () => respond(null, false),
      })
    );
    expect(catalog.albums[0].title).toBe('Bazaar');
  });

  it('uses fallbacks when metadata.json is not valid JSON', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const catalog = await loadCatalog(
      fetchWith({
        '/directories.json': () => respond(DIRS),
        '/music/metadata.json': () => respond(new SyntaxError('Unexpected token <')),
      })
    );
    expect(catalog.albums[0].tracks[0].title).toBe('Groove');
    warn.mockRestore();
  });

  it('falls back to the mock catalog when directories.json fails (stub mode)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const catalog = await loadCatalog(
      fetchWith({
        '/directories.json': () => {
          throw new Error('offline');
        },
        '/music/metadata.json': () => respond({}),
      })
    );
    expect(catalog.albums.map((a) => a.id)).toEqual(['Demo Album']);
    warn.mockRestore();
  });
});

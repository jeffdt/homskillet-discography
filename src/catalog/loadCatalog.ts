import { CATALOG_PREFIX, PUBLIC_URL } from '../config';
import { MOCK_DIRECTORIES } from '../stub-data/mock-directories';
import { Catalog, RawDirectories, SiteMetadata, buildCatalog, normalizeMetadata } from './catalog';

/** Fetches directories.json, falling back to the mock catalog when it cannot be read. */
async function fetchDirectories(fetchFn: typeof fetch): Promise<RawDirectories> {
  try {
    const response = await fetchFn(`${PUBLIC_URL}/directories.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as RawDirectories;
  } catch (error) {
    console.warn('Failed to load directories.json, using mock catalog data:', error);
    return MOCK_DIRECTORIES;
  }
}

/** Fetches metadata.json, returning empty metadata when it is missing or unreadable. */
async function fetchMetadata(fetchFn: typeof fetch): Promise<SiteMetadata> {
  try {
    const response = await fetchFn(`${CATALOG_PREFIX}/metadata.json`);
    if (!response.ok) return {};
    return normalizeMetadata(await response.json());
  } catch (error) {
    console.warn('Could not read metadata.json, using title fallbacks:', error);
    return {};
  }
}

/** Loads the browsable catalog. Never rejects: missing files degrade to fallbacks or the stub catalog. */
export async function loadCatalog(fetchFn: typeof fetch = fetch): Promise<Catalog> {
  const [directories, metadata] = await Promise.all([
    fetchDirectories(fetchFn),
    fetchMetadata(fetchFn),
  ]);
  return buildCatalog(directories, metadata);
}

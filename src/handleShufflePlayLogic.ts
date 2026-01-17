/**
 * Extracted logic for handleShufflePlay to make it testable.
 * This function handles shuffling and playing a random selection of songs from a given path.
 */

import { PUBLIC_URL } from './config';
import { MOCK_CATALOG } from './stub-data/mock-directories';

export async function handleShufflePlayLogic(
  path: string,
  pathToHref: (path: string) => string,
  playContext: (items: string[]) => void
): Promise<void> {
  // Synthetic recursive shuffle using static catalog.json
  // Works in both development and production
  const catalogUrl = PUBLIC_URL ? `${PUBLIC_URL}/catalog.json` : '/catalog.json';

  let allFiles: string[];
  try {
    const response = await fetch(catalogUrl);
    allFiles = await response.json();
  } catch (error) {
    // Fallback to mock catalog in stub mode
    console.warn('Failed to load catalog.json, using mock catalog data:', error);
    allFiles = MOCK_CATALOG;
  }

  // Filter files that start with the given path
  const matchingFiles = path
    ? allFiles.filter(file => file.startsWith(path + '/') || file === path)
    : allFiles;

  // Shuffle all matching files
  const shuffled = matchingFiles.sort(() => Math.random() - 0.5);

  const items = shuffled.map(pathToHref);
  playContext(items);
}

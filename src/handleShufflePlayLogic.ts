/**
 * Extracted logic for handleShufflePlay to make it testable.
 * This function handles shuffling and playing a random selection of songs from a given path.
 */

import { PUBLIC_URL } from './config';

export async function handleShufflePlayLogic(
  path: string,
  pathToHref: (path: string) => string,
  playContext: (items: string[]) => void
): Promise<void> {
  // Synthetic recursive shuffle using static catalog.json
  // Works in both development and production
  const catalogUrl = PUBLIC_URL ? `${PUBLIC_URL}/catalog.json` : '/catalog.json';

  const response = await fetch(catalogUrl);
  const allFiles: string[] = await response.json();

  // Filter files that start with the given path
  const matchingFiles = path
    ? allFiles.filter(file => file.startsWith(path + '/') || file === path)
    : allFiles;

  // Shuffle and limit to 100
  const shuffled = matchingFiles
    .sort(() => Math.random() - 0.5)
    .slice(0, 100);

  const items = shuffled.map(pathToHref);
  playContext(items);
}

// @vitest-environment node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import {
  CHANNEL_COUNT,
  CHANNEL_PALETTES,
  DEFAULT_CHANNEL_PALETTE_ID,
  channelPaletteById,
} from '../config/channelPalettes';
import { Deficiency, contrastRatio, deltaE2000, minPairwiseDeltaE } from './helpers/colorVision';

/** --background in src/index.css. */
const BACKGROUND = '#101010';
/** WCAG 2.1 success criterion 1.4.11 (non-text contrast). */
const MIN_CONTRAST = 3;
/** Smallest CIEDE2000 difference allowed between two Chromatic channels, for every vision type. */
const MIN_CHROMATIC_DELTA_E = 10;

describe('colorVision helper', () => {
  it('matches published CIEDE2000 reference pairs', () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(deltaE2000([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 4);
    expect(deltaE2000([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio(BACKGROUND, BACKGROUND)).toBeCloseTo(1, 6);
    expect(contrastRatio('#000000', '#fefefe')).toBeCloseTo(20.822, 2);
  });

  it('collapses a red-green pair under deuteranopia but not under normal vision', () => {
    expect(minPairwiseDeltaE(['#d62728', '#8c8c00'], null)).toBeGreaterThan(40);
    expect(minPairwiseDeltaE(['#d62728', '#8c8c00'], 'deuteranopia')).toBeLessThan(8);
  });
});

describe('channel palettes', () => {
  it('have unique ids, labels, descriptions and exactly CHANNEL_COUNT lowercase hex colors', () => {
    expect(CHANNEL_COUNT).toBe(8);
    const ids = CHANNEL_PALETTES.map((palette) => palette.id);
    expect(new Set(ids).size).toBe(ids.length);
    CHANNEL_PALETTES.forEach((palette) => {
      expect(palette.id).toMatch(/^[a-z0-9-]+$/);
      expect(palette.label.length).toBeGreaterThan(0);
      expect(palette.description.length).toBeGreaterThan(0);
      expect(palette.channels).toHaveLength(CHANNEL_COUNT);
      palette.channels.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/));
    });
  });

  it.each(CHANNEL_PALETTES.map((palette) => [palette.id, palette.channels] as const))(
    '%s keeps every channel at least 3:1 against the background',
    (_id, channels) => {
      channels.forEach((color) =>
        expect(contrastRatio(color, BACKGROUND)).toBeGreaterThanOrEqual(MIN_CONTRAST)
      );
    }
  );

  it.each([
    ['normal', null],
    ['protanopia', 'protanopia'],
    ['deuteranopia', 'deuteranopia'],
    ['tritanopia', 'tritanopia'],
  ] as const)(
    'Chromatic keeps every pair of channels apart with %s vision',
    (_name, deficiency) => {
      const chromatic = channelPaletteById('chromatic').channels;
      expect(minPairwiseDeltaE(chromatic, deficiency as Deficiency | null)).toBeGreaterThanOrEqual(
        MIN_CHROMATIC_DELTA_E
      );
    }
  );

  it('defaults to Chromatic and falls back to it for unknown ids', () => {
    expect(DEFAULT_CHANNEL_PALETTE_ID).toBe('chromatic');
    expect(CHANNEL_PALETTES[0].id).toBe('chromatic');
    expect(channelPaletteById(undefined).id).toBe('chromatic');
    expect(channelPaletteById(null).id).toBe('chromatic');
    expect(channelPaletteById('retired-palette').id).toBe('chromatic');
    expect(channelPaletteById('game-boy').id).toBe('game-boy');
  });

  it('matches the --ch-N defaults in src/index.css', () => {
    const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');
    const declared: string[] = [];
    for (const match of css.matchAll(/--ch-(\d):\s*(#[0-9a-f]{6});/g)) {
      declared[Number(match[1])] = match[2];
    }
    expect(declared).toEqual([...channelPaletteById('chromatic').channels]);
  });
});

import React, { useEffect, useState } from 'react';

const TILE_SIZE = 128;

/**
 * Draws one tile of random light specks in the palette's brightest neutral and returns
 * it as a data URL, or null where canvas is unavailable.
 */
export function makeGrainTile(random: () => number = Math.random): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle =
    getComputedStyle(document.documentElement).getPropertyValue('--neutral4').trim() || 'white';
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (random() < 0.45) {
        ctx.globalAlpha = random() * 0.14;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas.toDataURL();
}

/**
 * Full-screen film grain at `amount` percent strength. The noise tile is drawn once and the
 * layer jitters with transforms only, so it stays on the compositor and costs the visualizer
 * no frames; changing the amount only changes the layer's opacity.
 */
export default function FilmGrain({ amount }: { amount: number }) {
  const [tile, setTile] = useState<string | null>(null);
  useEffect(() => setTile(makeGrainTile()), []);
  return (
    <div
      className="FilmGrain"
      aria-hidden="true"
      style={{ opacity: amount / 100, backgroundImage: tile ? `url(${tile})` : undefined }}
    />
  );
}

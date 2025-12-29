#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');

const COLORS = {
  accent: '#9bfe38',
  accentDark: '#66cb01',
};

function createCircleTransparent(size) {
  const radius = size / 2;
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="circleGradient" cx="50%" cy="50%">
          <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.accentDark};stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="${radius}" cy="${radius}" r="${radius * 0.7}" fill="url(#circleGradient)"/>
    </svg>
  `.trim();
}

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('Generating transparent circle favicon...');

  // 16x16
  const svg16 = Buffer.from(createCircleTransparent(16));
  await sharp(svg16).png().toFile(path.join(publicDir, 'homskillet-icon-16x16.png'));

  // 64x64
  const svg64 = Buffer.from(createCircleTransparent(64));
  await sharp(svg64).png().toFile(path.join(publicDir, 'homskillet-icon-64x64.png'));

  // ICO
  await sharp(svg64).png().toFile(path.join(publicDir, 'homskillet-icon.ico'));

  console.log('✓ Done! Transparent circle favicon generated.');
}

generate().catch(console.error);

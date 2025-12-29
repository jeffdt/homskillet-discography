#!/usr/bin/env node

/**
 * Generate favicon variations for preview
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const COLORS = {
  accent: '#9bfe38',
  accentDark: '#66cb01',
  background: '#101010',
  neutral: '#fefefe',
};

// Variation 1: Bold H (current)
function createBoldH(size) {
  const isSmall = size === 16;
  const strokeWidth = isSmall ? 2 : 8;
  const padding = isSmall ? 2 : 8;
  const letterWidth = size - padding * 2;
  const letterHeight = size - padding * 2;
  const leftX = padding;
  const rightX = size - padding - strokeWidth;
  const midY = size / 2 - strokeWidth / 2;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>
      <defs>
        <linearGradient id="hGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.accentDark};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="${leftX}" y="${padding}" width="${strokeWidth}" height="${letterHeight}" fill="url(#hGradient)"/>
      <rect x="${rightX}" y="${padding}" width="${strokeWidth}" height="${letterHeight}" fill="url(#hGradient)"/>
      <rect x="${leftX}" y="${midY}" width="${letterWidth}" height="${strokeWidth}" fill="url(#hGradient)"/>
    </svg>
  `.trim();
}

// Variation 2: Outlined H
function createOutlinedH(size) {
  const isSmall = size === 16;
  const strokeWidth = isSmall ? 2 : 4;
  const padding = isSmall ? 2 : 8;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>
      <defs>
        <linearGradient id="hGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.accentDark};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}"
            fill="none" stroke="url(#hGradient)" stroke-width="${strokeWidth}"/>
      <line x1="${size / 2}" y1="${padding}" x2="${size / 2}" y2="${size - padding}"
            stroke="url(#hGradient)" stroke-width="${strokeWidth}"/>
      <line x1="${padding}" y1="${size / 2}" x2="${size - padding}" y2="${size / 2}"
            stroke="url(#hGradient)" stroke-width="${strokeWidth}"/>
    </svg>
  `.trim();
}

// Variation 3: Circle gradient
function createCircle(size) {
  const radius = size / 2;
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>
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

// Variation 4: Square with corner accent
function createSquareAccent(size) {
  const padding = size * 0.15;
  const squareSize = size - padding * 2;
  const accentSize = squareSize * 0.3;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>
      <rect x="${padding}" y="${padding}" width="${squareSize}" height="${squareSize}"
            fill="none" stroke="${COLORS.neutral}" stroke-width="2"/>
      <rect x="${padding}" y="${padding}" width="${accentSize}" height="${accentSize}" fill="${COLORS.accent}"/>
      <rect x="${size - padding - accentSize}" y="${size - padding - accentSize}"
            width="${accentSize}" height="${accentSize}" fill="${COLORS.accentDark}"/>
    </svg>
  `.trim();
}

// Variation 5: Pixelated H (8-bit style)
function createPixelH(size) {
  const isSmall = size === 16;
  const pixelSize = isSmall ? 2 : 8;
  const gridSize = size / pixelSize;

  // Simple pixel pattern for "H"
  const pattern = [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ];

  let pixels = '';
  const offsetX = (size - pattern[0].length * pixelSize) / 2;
  const offsetY = (size - pattern.length * pixelSize) / 2;

  pattern.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 1) {
        const px = offsetX + x * pixelSize;
        const py = offsetY + y * pixelSize;
        const color = y < 2 ? COLORS.accent : COLORS.accentDark;
        pixels += `<rect x="${px}" y="${py}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>`;
      }
    });
  });

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>
      ${pixels}
    </svg>
  `.trim();
}

async function generateVariations() {
  const varDir = path.join(__dirname, '..', 'public', 'favicon-variations');

  // Create variations directory
  if (!fs.existsSync(varDir)) {
    fs.mkdirSync(varDir, { recursive: true });
  }

  console.log('Generating favicon variations...\n');

  const variations = [
    { name: 'bold-h', fn: createBoldH, desc: 'Bold H (current)' },
    { name: 'outlined-h', fn: createOutlinedH, desc: 'Outlined H' },
    { name: 'circle', fn: createCircle, desc: 'Circle gradient' },
    { name: 'square-accent', fn: createSquareAccent, desc: 'Square with accents' },
    { name: 'pixel-h', fn: createPixelH, desc: 'Pixelated H (8-bit)' },
  ];

  for (const variant of variations) {
    const svg64 = Buffer.from(variant.fn(64));
    const filename = `${variant.name}-64x64.png`;
    await sharp(svg64).png().toFile(path.join(varDir, filename));
    console.log(`✓ ${variant.desc}: favicon-variations/${filename}`);
  }

  console.log('\nVariations generated! Check public/favicon-variations/');
  console.log('To use one, run: bun run scripts/apply-favicon-variation.js <variation-name>');
}

generateVariations().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

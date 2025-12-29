#!/usr/bin/env node

/**
 * Generate favicon files using the Metallic Wing Green color palette
 * Creates 16x16 and 64x64 PNG versions with a simple "H" letterform design
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Metallic Wing Green palette
const COLORS = {
  accent: '#9bfe38', // Light green
  accentDark: '#66cb01', // Dark green
  background: '#101010', // Black
  neutral: '#fefefe', // Metallic wing white
};

/**
 * Create an SVG with an "H" letterform
 */
function createFaviconSVG(size) {
  const isSmall = size === 16;

  // For 16x16, use a simpler design
  // For 64x64, use a more detailed design
  const strokeWidth = isSmall ? 2 : 8;
  const padding = isSmall ? 2 : 8;
  const letterWidth = size - padding * 2;
  const letterHeight = size - padding * 2;

  // H shape coordinates
  const leftX = padding;
  const rightX = size - padding - strokeWidth;
  const midY = size / 2 - strokeWidth / 2;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>

      <!-- H letterform with gradient -->
      <defs>
        <linearGradient id="hGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.accentDark};stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Left vertical bar -->
      <rect x="${leftX}" y="${padding}" width="${strokeWidth}" height="${letterHeight}" fill="url(#hGradient)"/>

      <!-- Right vertical bar -->
      <rect x="${rightX}" y="${padding}" width="${strokeWidth}" height="${letterHeight}" fill="url(#hGradient)"/>

      <!-- Middle horizontal bar -->
      <rect x="${leftX}" y="${midY}" width="${letterWidth}" height="${strokeWidth}" fill="url(#hGradient)"/>
    </svg>
  `.trim();

  return Buffer.from(svg);
}

/**
 * Generate PNG favicons
 */
async function generateFavicons() {
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('Generating favicon files...');

  // Generate 16x16 PNG
  const svg16 = createFaviconSVG(16);
  await sharp(svg16).png().toFile(path.join(publicDir, 'homskillet-icon-16x16.png'));
  console.log('✓ Created homskillet-icon-16x16.png');

  // Generate 64x64 PNG
  const svg64 = createFaviconSVG(64);
  await sharp(svg64).png().toFile(path.join(publicDir, 'homskillet-icon-64x64.png'));
  console.log('✓ Created homskillet-icon-64x64.png');

  // Generate ICO file (using 64x64 as base)
  // Note: ICO files typically contain multiple sizes, but for simplicity we'll use the 64x64 version
  await sharp(svg64)
    .resize(64, 64)
    .toFormat('png')
    .toFile(path.join(publicDir, 'homskillet-icon.ico'));
  console.log('✓ Created homskillet-icon.ico');

  console.log('\nFavicon generation complete!');
  console.log('Next steps:');
  console.log('  1. Update public/index.html to reference new favicon files');
  console.log('  2. Update public/manifest.json to reference new favicon files');
  console.log('  3. Remove old chip-player-js favicon files');
}

// Run the generator
generateFavicons().catch((err) => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});

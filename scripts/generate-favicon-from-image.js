#!/usr/bin/env node

/**
 * Generate favicon from astronaut.png with proper padding and sizing
 */

const sharp = require('sharp');
const path = require('path');

async function generateFaviconFromImage() {
  const sourceImage = path.join(__dirname, '..', 'astronaut.png');
  const publicDir = path.join(__dirname, '..', 'public');

  console.log('Processing astronaut.png for favicon...');

  // Load the original image to get its dimensions
  const metadata = await sharp(sourceImage).metadata();
  console.log(`Original size: ${metadata.width}x${metadata.height}`);

  // Function to create a favicon with padding
  async function createWithPadding(size) {
    // Calculate padding (15% on each side)
    const padding = Math.floor(size * 0.15);
    const innerSize = size - padding * 2;

    // Resize the astronaut to fit within the inner area
    const resizedBuffer = await sharp(sourceImage)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
      })
      .toBuffer();

    // Create final image with padding (offset slightly down for better centering)
    const verticalOffset = Math.floor(size * 0.05); // Add 5% extra to top
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedBuffer,
          top: padding + verticalOffset,
          left: padding,
        },
      ])
      .png();
  }

  // Generate 16x16
  await (await createWithPadding(16)).toFile(path.join(publicDir, 'homskillet-icon-16x16.png'));
  console.log('✓ Created homskillet-icon-16x16.png');

  // Generate 64x64
  await (await createWithPadding(64)).toFile(path.join(publicDir, 'homskillet-icon-64x64.png'));
  console.log('✓ Created homskillet-icon-64x64.png');

  // Generate ICO (using 64x64)
  await (await createWithPadding(64)).toFile(path.join(publicDir, 'homskillet-icon.ico'));
  console.log('✓ Created homskillet-icon.ico');

  console.log('\n✨ Astronaut favicon generated!');
  console.log('Hard refresh your browser (Cmd+Shift+R) to see it.');
}

generateFaviconFromImage().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

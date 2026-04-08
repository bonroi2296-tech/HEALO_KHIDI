/**
 * Generate HEALO app icons from SVG using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'public', 'icons');

if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

// HEALO brand icon SVG - teal gradient with H
const createIconSvg = (size) => {
  const padding = Math.round(size * 0.12);
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.52);
  const crossSize = Math.round(size * 0.13);
  const crossX = Math.round(size * 0.72);
  const crossY = Math.round(size * 0.22);
  const crossThick = Math.max(2, Math.round(size * 0.03));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488"/>
      <stop offset="100%" style="stop-color:#0f766e"/>
    </linearGradient>
    <linearGradient id="cross" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5eead4"/>
      <stop offset="100%" style="stop-color:#2dd4bf"/>
    </linearGradient>
  </defs>
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" rx="${radius}" fill="url(#bg)"/>
  <text x="${size * 0.46}" y="${size * 0.58}" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="${fontSize}" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="central">H</text>
  <!-- Medical cross -->
  <rect x="${crossX - crossSize / 2}" y="${crossY - crossThick / 2}" width="${crossSize}" height="${crossThick}" rx="${crossThick / 2}" fill="url(#cross)"/>
  <rect x="${crossX - crossThick / 2}" y="${crossY - crossSize / 2}" width="${crossThick}" height="${crossSize}" rx="${crossThick / 2}" fill="url(#cross)"/>
</svg>`;
};

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating HEALO icons...');

  for (const size of sizes) {
    const svg = createIconSvg(size);
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    const filename = `icon-${size}x${size}.png`;
    writeFileSync(join(ICONS_DIR, filename), pngBuffer);
    console.log(`  ✓ ${filename} (${pngBuffer.length} bytes)`);
  }

  // apple-touch-icon (180x180)
  const appleSvg = createIconSvg(180);
  const appleBuffer = await sharp(Buffer.from(appleSvg))
    .png()
    .toBuffer();
  writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), appleBuffer);
  console.log(`  ✓ apple-touch-icon.png (${appleBuffer.length} bytes)`);

  // favicon-32x32
  const fav32Svg = createIconSvg(32);
  const fav32Buffer = await sharp(Buffer.from(fav32Svg))
    .png()
    .toBuffer();
  writeFileSync(join(ROOT, 'public', 'favicon-32x32.png'), fav32Buffer);
  console.log(`  ✓ favicon-32x32.png`);

  // favicon-16x16
  const fav16Svg = createIconSvg(16);
  const fav16Buffer = await sharp(Buffer.from(fav16Svg))
    .png()
    .toBuffer();
  writeFileSync(join(ROOT, 'public', 'favicon-16x16.png'), fav16Buffer);
  console.log(`  ✓ favicon-16x16.png`);

  // Also update favicon.svg with improved version
  writeFileSync(join(ROOT, 'public', 'favicon.svg'), createIconSvg(512));
  console.log(`  ✓ favicon.svg`);

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);

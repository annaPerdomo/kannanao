/**
 * Generates PWA icon PNGs from public/icons/icon-base.svg
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'icons', 'icon-base.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [152, 167, 180, 192, 512];

for (const size of sizes) {
  const outPath = join(root, 'public', 'icons', `icon-${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ icon-${size}.png`);
}

console.log('All icons generated.');

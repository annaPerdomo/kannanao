/**
 * Generates PWA icon PNGs for the app.
 *
 * Sources:
 *   - public/icons/icon-master.png   — square raster of the full mascot-in-circle
 *     mark (export `icon-circle.png` from the brand design project). Used for the
 *     larger home-screen / PWA icons. Falls back to icon-base.svg if absent.
 *   - public/icons/mascot-master.png — the standalone mascot on a TRANSPARENT
 *     background (export `mascot.png`). Used to cut the head-only favicons
 *     (16/32), which have no disc/background — just the dog's head.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');

const masterPath = join(iconsDir, 'icon-master.png');
const mascotPath = join(iconsDir, 'mascot-master.png');
const svgPath = join(iconsDir, 'icon-base.svg');

const usingMaster = existsSync(masterPath);
const sourcePath = usingMaster ? masterPath : svgPath;
const sourceBuffer = readFileSync(sourcePath);
const usingMascot = existsSync(mascotPath);
console.log(`Disc source:   ${usingMaster ? 'icon-master.png (raster)' : 'icon-base.svg (vector)'}`);
console.log(`Head source:   ${usingMascot ? 'mascot-master.png (transparent)' : '(none — favicons use full mark)'}`);

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// The raster master centers the disc in a large transparent canvas (~26% margin),
// which makes small favicons look tiny in a browser tab. Trim that margin so the
// artwork fills the frame.
const trimmed = usingMaster
  ? await sharp(sourceBuffer).trim({ threshold: 1 }).png().toBuffer()
  : sourceBuffer;

/**
 * Full mascot-in-circle mark, re-padded so the disc nearly fills the icon.
 * Used for the larger home-screen / PWA icons where the whole character reads.
 * FILL ~0.96 keeps a hair of margin and stays within the maskable safe zone.
 */
async function renderFull(size) {
  const FILL = 0.96;
  const inner = Math.round(size * FILL);
  const pad = size - inner;
  const top = Math.floor(pad / 2);
  const left = Math.floor(pad / 2);
  return sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: transparent })
    .extend({ top, bottom: pad - top, left, right: pad - left, background: transparent })
    .png()
    .toBuffer();
}

// Head-only source: cut the shiba's head off the transparent standalone mascot
// (region x[27,93], y[0,52] of the trimmed mascot — ears + face + cheeks, above
// the bandana and clear of the raised paw / sakura petals), then trim to hug it.
const mascotHead = usingMascot
  ? await (async () => {
      const base = await sharp(readFileSync(mascotPath)).trim({ threshold: 10 }).toBuffer();
      const { width: W, height: H } = await sharp(base).metadata();
      return sharp(base)
        .extract({
          left: Math.round(0.27 * W),
          top: 0,
          width: Math.round(0.66 * W),
          height: Math.round(0.52 * H),
        })
        .trim({ threshold: 10 })
        .png()
        .toBuffer();
    })()
  : null;

/**
 * Head-only favicon for tiny sizes: at 16–32px the whole mascot-in-a-circle is
 * unreadable, so the favicon is JUST the dog's head on a transparent background —
 * no disc, no gradient. Centered with a small margin.
 */
async function renderHead(size) {
  const inner = Math.round(size * 0.92);
  const pad = size - inner;
  const top = Math.floor(pad / 2);
  const left = Math.floor(pad / 2);
  return sharp(mascotHead)
    .resize(inner, inner, { fit: 'contain', background: transparent })
    .extend({ top, bottom: pad - top, left, right: pad - left, background: transparent })
    .png()
    .toBuffer();
}

// Tiny tab favicons get the head-only cut; larger app icons keep the full mascot.
const HEAD_SIZES = new Set([16, 32]);
const sizes = [16, 32, 152, 167, 180, 192, 512];

for (const size of sizes) {
  const useHead = usingMascot && HEAD_SIZES.has(size);
  const buf = useHead ? await renderHead(size) : await renderFull(size);
  await sharp(buf).toFile(join(iconsDir, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png${useHead ? ' (head only)' : ''}`);
}

console.log('All icons generated.');

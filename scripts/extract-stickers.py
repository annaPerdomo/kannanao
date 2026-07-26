#!/usr/bin/env python3
"""Slice promo/tango-stickers.png into the individual chat stickers.

    pip install pillow numpy
    python3 scripts/extract-stickers.py

Reads the 7x5 sticker sheet and writes 256x256 transparent WebPs to
public/stickers/, one per id in src/lib/stickers.ts. Re-run it after
regenerating the sheet; NAMES below maps sheet position -> sticker id, so a
redrawn sheet only needs that table updated.

How the background is removed: a plain "white is transparent" key would punch
holes through the dog's cream face and chest markings. Instead the near-white
pixels are connected-component labelled and only the components touching the
image border count as background, so enclosed white stays opaque. Edge pixels
that are partly blended into the background get a proportional alpha, which is
what keeps the cutouts from carrying a white halo onto a coloured bubble.
"""

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'promo', 'tango-stickers.png')
OUT = os.path.join(ROOT, 'public', 'stickers')

ROWS, COLS = 5, 7
SIZE = 256      # exported px; stickers render at 128 CSS px, so this covers 2x
WHITE_HI = 246  # >= this in every channel AND border-connected -> background
WHITE_LO = 200  # fully opaque at or below this, ramped in between

# Sheet order, left to right and top to bottom.
NAMES = """
wave      happy     amazing   heart     love      yay       cute
sad       goodnight surprised worried   angry     phew      wink
cool      shy       lol       blush     thinking  dance     fire
study     homework  cheer     tea       laptop    ganbaru   party
crying    relax     peek      box       thumbsup  cozy      hooray
"""


def label(mask):
    """Run-length connected-component labelling, 8-connected.

    Returns (labels, count) with labels 1..count and 0 for everything outside
    the mask. Written by hand because scipy isn't a dependency of this repo.
    """
    h, w = mask.shape
    parent = [0]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    rows_runs = []
    for y in range(h):
        row = mask[y]
        if not row.any():
            rows_runs.append([])
            continue
        d = np.diff(row.astype(np.int8))
        starts = list(np.flatnonzero(d == 1) + 1)
        ends = list(np.flatnonzero(d == -1))
        if row[0]:
            starts.insert(0, 0)
        if row[-1]:
            ends.append(w - 1)
        rows_runs.append([(int(s), int(e)) for s, e in zip(starts, ends)])

    run_labels = []
    for y, runs in enumerate(rows_runs):
        here = []
        prev = rows_runs[y - 1] if y else []
        prev_labels = run_labels[y - 1] if y else []
        for s, e in runs:
            lbl = 0
            for (ps, pe), pl in zip(prev, prev_labels):
                if ps <= e + 1 and pe >= s - 1:
                    lbl = pl if lbl == 0 else lbl
                    union(lbl, pl)
            if lbl == 0:
                parent.append(len(parent))
                lbl = len(parent) - 1
            here.append(lbl)
        run_labels.append(here)

    remap, out = {}, np.zeros((h, w), np.int32)
    for y, (runs, here) in enumerate(zip(rows_runs, run_labels)):
        for (s, e), lbl in zip(runs, here):
            root = find(lbl)
            if root not in remap:
                remap[root] = len(remap) + 1
            out[y, s:e + 1] = remap[root]
    return out, len(remap)


def main():
    ids = NAMES.split()
    if len(ids) != ROWS * COLS:
        sys.exit(f'NAMES has {len(ids)} entries, expected {ROWS * COLS}')

    rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    lum = rgb.min(axis=2)

    # 1. Background = near-white components that reach the image border.
    white_labels, _ = label(lum >= WHITE_HI)
    border = set(white_labels[0]) | set(white_labels[-1])
    border |= set(white_labels[:, 0]) | set(white_labels[:, -1])
    border.discard(0)
    background = np.isin(white_labels, list(border))
    opaque = ~background

    # 2. Grid lines: the emptiest column/row near each expected boundary.
    def best_cut(proj, center, span):
        lo, hi = max(0, center - span), min(len(proj), center + span)
        return lo + int(np.argmin(proj[lo:hi]))

    rowproj = opaque.sum(axis=1)
    rcuts = [0] + [best_cut(rowproj, round(h * k / ROWS), 45) for k in range(1, ROWS)] + [h]
    ccuts = []
    for r in range(ROWS):
        proj = opaque[rcuts[r]:rcuts[r + 1]].sum(axis=0)
        ccuts.append([0] + [best_cut(proj, round(w * k / COLS), 50) for k in range(1, COLS)] + [w])

    # 3. Assign each blob to a cell by centroid, then union the boxes. Going via
    #    blobs (rather than cropping the grid cell) keeps sparkles and hearts
    #    that drift past a grid line attached to the sticker they belong to.
    blobs, n = label(opaque)
    cells, owner = {}, {}
    for i in range(1, n + 1):
        ys, xs = np.nonzero(blobs == i)
        if ys.size < 8:  # stray speckle
            continue
        r = next(k for k in range(ROWS) if rcuts[k] <= ys.mean() < rcuts[k + 1])
        c = next(k for k in range(COLS) if ccuts[r][k] <= xs.mean() < ccuts[r][k + 1])
        owner[i] = (r, c)
        box = cells.setdefault((r, c), [w, h, 0, 0])
        box[0], box[1] = min(box[0], xs.min()), min(box[1], ys.min())
        box[2], box[3] = max(box[2], xs.max()), max(box[3], ys.max())

    missing = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) not in cells]
    if missing:
        sys.exit(f'no artwork found in cells {missing} — has the sheet layout changed?')

    # 4. Feathered alpha along the rim so cutouts carry no white halo.
    alpha = np.where(opaque, 255, 0).astype(np.float32)
    rim = opaque & (
        np.roll(background, 1, 0) | np.roll(background, -1, 0) |
        np.roll(background, 1, 1) | np.roll(background, -1, 1)
    )
    ramp = np.clip((WHITE_HI - lum) / (WHITE_HI - WHITE_LO), 0, 1) * 255
    alpha = np.where(rim, np.minimum(alpha, ramp), alpha).astype(np.uint8)

    os.makedirs(OUT, exist_ok=True)
    total = 0
    for (r, c), (x0, y0, x1, y1) in sorted(cells.items()):
        keep = np.isin(blobs, [i for i, o in owner.items() if o == (r, c)])
        tile = np.dstack([
            rgb[y0:y1 + 1, x0:x1 + 1].astype(np.uint8),
            np.where(keep, alpha, 0)[y0:y1 + 1, x0:x1 + 1],
        ])
        im = Image.fromarray(tile, 'RGBA')
        # Square-pad before resizing so every sticker keeps a consistent scale
        side = max(im.width, im.height)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        path = os.path.join(OUT, f'{ids[r * COLS + c]}.webp')
        canvas.resize((SIZE, SIZE), Image.LANCZOS).save(path, 'WEBP', quality=88, method=6)
        total += os.path.getsize(path)
    print(f'wrote {len(cells)} stickers to public/stickers ({total // 1024} KB)')


if __name__ == '__main__':
    main()

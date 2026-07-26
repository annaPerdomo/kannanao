#!/usr/bin/env python3
"""Slice the promo sheets into the home hero's banner art.

Two sheets, two shapes, because one aspect cannot serve both:

  promo/tango-greetings-2-different-times-of-day.png  — three stacked WIDE bands
      (sunrise / midday / night) for the desktop hero, ~5:1 each.
  promo/tango-banner-full-size-mobile.png             — the same three scenes as
      near-square cards for the phone hero, ~1.33:1 each, laid out with white
      gutters and rounded corners.

Within each set the bands are cropped to slightly different sizes, so this
normalises each set to ONE aspect ratio by trimming width off the sides. That
matters because the hero sizes itself from the art's aspect: if the three bands
disagreed, the whole page would jump a few pixels taller at noon.

The wide bands also get a `@2x` variant, because they are the one asset the hero
has to *enlarge*: a band is ~1400px wide and a retina screen at the hero's
1280px cap asks for 2560 device pixels. Left to the browser that is a bilinear
upscale, which turns the mascot's ink outlines to mush. Doing it here with
Lanczos plus a light unsharp mask is visibly crisper for the same reason it is
for any line art — better frequency response, and acutance the browser's filter
does not add. It invents no detail; see UPSCALE_TO.

The phone cards need no such variant. They are ~700px wide for a ~360px slot,
which is already ~2x on a phone, and doubling them would put the bytes exactly
where bandwidth is tightest.

Run after re-rendering either sheet:

    python3 scripts/extract-hero-banners.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DESKTOP_SRC = ROOT / "promo" / "tango-greetings-2-different-times-of-day.png"
MOBILE_SRC = ROOT / "promo" / "tango-banner-full-size-mobile.png"
OUT_DIR = ROOT / "public" / "mascot"

# Named for the app's greeting tiers (see resolveTimeOfDay in src/lib/timeOfDay.ts),
# not for the artwork's time of day, so the picture and the words always agree.
NAMES = ["morning", "afternoon", "evening"]

# The wide sheet's bands butt straight up against each other; nudge past the
# seam so no band keeps a slice of its neighbour's sky.
SEAM_PAD = 4
# Anything at or above this on all channels is sheet background, not artwork.
WHITE = 246

# Measured, not guessed: at the @2x scale q82 and q95 are indistinguishable,
# because what you are looking at is the upscale and not the compression. This
# sits a little above 82 for the assets that DO land near 1:1 — the phone cards,
# and the 1x bands on a non-retina screen — where artefacts have nothing to hide
# behind. Going higher only costs bytes.
QUALITY = 88

# Device-pixel width the @2x bands are built for: twice HERO_MAX_WIDTH in
# src/components/Home/GreetingHero.tsx, which is the widest the banner is ever
# laid out. Going beyond it would ship pixels no display asks for.
#
# NOTE this is an *enlargement* of a ~1400px original, so it adds sharpness, not
# information. The real fix is a bigger promo sheet: render it at 2x (~3350px
# wide) and these become genuine detail rather than a good upscale.
UPSCALE_TO = 2560
UNSHARP = ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=3)


def find_seams(rgb: np.ndarray) -> list[int]:
    """Row indices of the two band boundaries, found by vertical contrast."""
    delta = np.abs(np.diff(rgb.astype(int), axis=0)).mean(axis=(1, 2))
    # Search each middle quarter for its strongest row, so one loud seam can't
    # win twice.
    h = len(delta)
    return [
        int(np.argmax(delta[lo:hi]) + lo) for lo, hi in ((h // 4, h // 2), (h // 2, 3 * h // 4))
    ]


def runs_of(flags: np.ndarray) -> list[tuple[int, int]]:
    """Inclusive [start, end] spans where `flags` is True."""
    spans, start = [], None
    for i, on in enumerate(flags):
        if on and start is None:
            start = i
        elif not on and start is not None:
            spans.append((start, i - 1))
            start = None
    if start is not None:
        spans.append((start, len(flags) - 1))
    return spans


def content_box(rgb: np.ndarray) -> tuple[int, int, int, int]:
    """Bounding box of the non-white artwork in a sheet."""
    ink = ~(rgb >= WHITE).all(axis=2)
    rows, cols = np.where(ink.any(axis=1))[0], np.where(ink.any(axis=0))[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


def corner_inset(panel: np.ndarray) -> int:
    """
    How far in to trim so a rounded-corner card becomes a plain rectangle.

    The cards are drawn with rounded corners over white, so cropping to their
    bounding box leaves four white notches. Walk down the left edge until the
    artwork reaches it — that distance is the corner radius.
    """
    ink = ~(panel >= WHITE).all(axis=2)
    for y, row in enumerate(ink):
        if row[0]:
            return y
    return 0


def split_bands(sheet: Image.Image) -> list[Image.Image]:
    """The wide sheet: three full-width bands, split on their seams."""
    seams = find_seams(np.asarray(sheet))
    bounds = [(0, seams[0]), (seams[0], seams[1]), (seams[1], sheet.height)]
    # Pad away from interior seams only — the sheet's own top and bottom edges
    # are clean, and eating 4px there would clip the sunrise band's raised paw.
    return [
        sheet.crop(
            (
                0,
                top + SEAM_PAD if top > 0 else 0,
                sheet.width,
                bot - SEAM_PAD if bot < sheet.height else sheet.height,
            )
        )
        for top, bot in bounds
    ]


def split_cards(sheet: Image.Image) -> list[Image.Image]:
    """The mobile sheet: three rounded cards inside white gutters."""
    rgb = np.asarray(sheet)
    left, _, right, _ = content_box(rgb)
    # Rows that are entirely sheet background separate the cards.
    gutter = (rgb[:, left:right] >= WHITE).all(axis=2).mean(axis=1) > 0.9
    bands = [(a, b + 1) for a, b in runs_of(~gutter) if b - a > sheet.height // 8]
    cards = [sheet.crop((left, top, right, bot)) for top, bot in bands]
    return [
        card.crop((i, i, card.width - i, card.height - i))
        for card, i in ((c, corner_inset(np.asarray(c))) for c in cards)
    ]


def to_common_aspect(images: list[Image.Image]) -> list[Image.Image]:
    """
    Trim width off the sides until every image shares the tallest one's aspect.

    Trimming width rather than height is deliberate: the mascot is vertically
    centred and near-full-height in every band, so height is the dimension with
    nothing to spare. What comes off the sides is scenery.
    """
    target = min(im.width / im.height for im in images)
    out = []
    for im in images:
        width = round(im.height * target)
        pad = (im.width - width) // 2
        out.append(im.crop((pad, 0, pad + width, im.height)))
    return out


def retina(im: Image.Image) -> Image.Image:
    """The same band at the device-pixel width a retina hero asks for."""
    height = round(UPSCALE_TO * im.height / im.width)
    return im.resize((UPSCALE_TO, height), Image.LANCZOS).filter(UNSHARP)


def write(im: Image.Image, name: str) -> None:
    out = OUT_DIR / name
    im.save(out, "WEBP", quality=QUALITY, method=6)
    kb = out.stat().st_size // 1024
    print(f"{out.relative_to(ROOT)}  {im.width}x{im.height}  {im.width / im.height:.3f}  {kb} KB")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    bands = to_common_aspect(split_bands(Image.open(DESKTOP_SRC).convert("RGB")))
    for name, band in zip(NAMES, bands):
        write(band, f"hero-{name}.webp")
        write(retina(band), f"hero-{name}@2x.webp")

    cards = to_common_aspect(split_cards(Image.open(MOBILE_SRC).convert("RGB")))
    for name, card in zip(NAMES, cards):
        write(card, f"hero-{name}-mobile.webp")


if __name__ == "__main__":
    main()

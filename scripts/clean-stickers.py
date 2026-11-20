"""Cleans raw Quiver SVGs and copies them into public/art/stickers.

    python3 scripts/clean-stickers.py [raw_dir]

Quiver's output often includes a translucent background <rect> and tiny
off-white "speck" paths. This removes both, plus comments, and reports how
many specks each file lost. Check the results by eye afterwards; a few
stickers were also touched up by hand.
"""

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "stickers-raw")
DEST = os.path.join(ROOT, "public", "art", "stickers")


def light(color):
    c = color.lstrip("#")
    if len(c) == 3:
        c = "".join(x * 2 for x in c)
    try:
        r, g, b = (int(c[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return False
    return min(r, g, b) >= 0xD0


def speck(element):
    """A short path that is an off-white fill (not pure white) or a light stroke only."""
    if len(element) >= 500:
        return False
    fill = re.search(r'\bfill="([^"]+)"', element)
    stroke = re.search(r'\bstroke="([^"]+)"', element)
    fill = fill.group(1) if fill else None
    stroke = stroke.group(1) if stroke else None
    if (fill is None or fill == "none") and stroke and light(stroke):
        return True
    if fill and fill.lower() not in ("#fff", "#ffffff", "none") and light(fill):
        c = fill.lstrip("#")
        if len(c) == 6:
            v = [int(c[i : i + 2], 16) for i in (0, 2, 4)]
            if max(v) - min(v) <= 0x10:
                return True
    return False


os.makedirs(DEST, exist_ok=True)
files = sorted(glob.glob(os.path.join(RAW, "*.svg")))
if not files:
    sys.exit(f"No SVGs found in {RAW}")
for path in files:
    svg = open(path, encoding="utf-8").read()
    svg = re.sub(r"\s*<rect[^>]*fill-opacity[^>]*/>", "", svg)
    svg = re.sub(r"\s*<!--.*?-->", "", svg, flags=re.S)
    removed = 0

    def drop(match):
        global removed
        if speck(match.group(0)):
            removed += 1
            return ""
        return match.group(0)

    svg = re.sub(r"\s*<path[^>]*/>", drop, svg)
    name = os.path.basename(path)
    with open(os.path.join(DEST, name), "w", encoding="utf-8") as out:
        out.write(svg)
    print(f"{name}: removed {removed} specks" if removed else name)

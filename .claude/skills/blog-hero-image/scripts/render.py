#!/usr/bin/env python3
"""Lint and rasterize a blog hero SVG.

Usage:
  render.py hero.svg --png preview.png            # lint + PNG preview
  render.py hero.svg --png preview.png --out assets/images/blog/slug.png

Wraps the SVG in a bare HTML page, screenshots it with headless Chrome at
1200x630 (the site's Open Graph hero size), and optionally writes an
optimized PNG to the final location with Pillow. Before rendering it lints
the SVG against the UseArazzo hero-image rules and prints warnings; lint
findings never block rendering.
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile

WIDTH, HEIGHT = 1200, 630

PALETTE = {
    "#17210d": "ink (background base)",
    "#2a3a18": "dark moss (gradient partner, grid)",
    "#3a6b1f": "deep green",
    "#6ba543": "moss (secondary line work)",
    "#94c83d": "leaf (primary line work, nodes)",
    "#a3d977": "pale leaf (highlights)",
    "#f0f5e7": "mist (near-white glow)",
    "#ffffff": "white",
    "#fff": "white",
    "#000000": "black (only acceptable inside filters/masks)",
    "#000": "black (only acceptable inside filters/masks)",
}

FORBIDDEN_TEXT = re.compile(r"usearazzo|\barazzo\b|\bblog\b", re.IGNORECASE)


def lint(svg: str) -> list[str]:
    problems = []
    if 'viewBox="0 0 1200 630"' not in svg and "viewBox='0 0 1200 630'" not in svg:
        problems.append('viewBox is not "0 0 1200 630"')
    for attr in ("width", "height"):
        m = re.search(rf'<svg[^>]*\s{attr}="([^"]+)"', svg)
        if m and m.group(1) not in ({"width": ("1200", "1200px"), "height": ("630", "630px")}[attr]):
            problems.append(f"<svg {attr}> is {m.group(1)!r}, expected {WIDTH if attr == 'width' else HEIGHT}")
    if re.search(r"<(image|script|foreignObject)\b", svg):
        problems.append("contains <image>, <script> or <foreignObject>; the SVG must be self-contained")
    if re.search(r"@import|url\(\s*['\"]?https?:", svg):
        problems.append("references an external URL (font/stylesheet); must be self-contained")

    # Hex colors outside the brand palette.
    bad = set()
    for hexc in re.findall(r"#[0-9a-fA-F]{3,8}\b", svg):
        h = hexc.lower()
        if len(h) == 9:  # #rrggbbaa
            h = h[:7]
        if len(h) == 5:  # #rgba
            h = h[:4]
        if h not in PALETTE:
            bad.add(hexc)
    if bad:
        problems.append("off-palette hex colors: " + ", ".join(sorted(bad)))
    named = re.findall(r"(?:fill|stroke|stop-color|color)\s*[=:]\s*['\"]?([a-zA-Z]+)", svg)
    odd = {n for n in named if n.lower() not in {"none", "white", "black", "currentcolor", "transparent", "inherit", "url"}}
    if odd:
        problems.append("named colors that may be off-palette: " + ", ".join(sorted(odd)))

    # Text content.
    texts = re.findall(r"<text\b[^>]*>(.*?)</text>", svg, flags=re.S)
    flat = [re.sub(r"<[^>]+>", "", t).strip() for t in texts]
    flat = [t for t in flat if t]
    for t in flat:
        if FORBIDDEN_TEXT.search(t):
            problems.append(f'forbidden text (logo/wordmark/"Blog"): {t!r}')
    if len(flat) > 1:
        problems.append(f"{len(flat)} text elements: keep to at most one short display word, or none")
    elif len(flat) == 1 and len(flat[0].split()) > 2:
        problems.append(f"display text is more than a word or two: {flat[0]!r}")
    return problems


def render_png(svg_path: str, png_path: str) -> None:
    svg = open(svg_path, encoding="utf-8").read()
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<style>html,body{{margin:0;padding:0;width:{WIDTH}px;height:{HEIGHT}px;overflow:hidden;background:#17210D}}"
        f"svg{{display:block;width:{WIDTH}px;height:{HEIGHT}px}}</style></head><body>"
        f"{svg}</body></html>"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8",
                                     dir=os.path.dirname(os.path.abspath(png_path)) or None) as f:
        f.write(html)
        html_path = f.name
    try:
        cmd = [
            "google-chrome", "--headless=new", "--no-sandbox", "--hide-scrollbars",
            "--disable-gpu", "--force-device-scale-factor=1",
            f"--window-size={WIDTH},{HEIGHT}", f"--screenshot={os.path.abspath(png_path)}",
            f"file://{html_path}",
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
    finally:
        os.unlink(html_path)


def to_final_png(png_path: str, out_path: str) -> None:
    from PIL import Image
    im = Image.open(png_path).convert("RGB")
    if im.size != (WIDTH, HEIGHT):
        im = im.crop((0, 0, WIDTH, HEIGHT))
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    im.save(out_path, "PNG", optimize=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("svg")
    ap.add_argument("--png", required=True, help="PNG preview output path")
    ap.add_argument("--out", help="final PNG output path (e.g. assets/images/blog/<slug>.png)")
    ap.add_argument("--no-lint", action="store_true")
    args = ap.parse_args()

    svg = open(args.svg, encoding="utf-8").read()
    if not args.no_lint:
        problems = lint(svg)
        if problems:
            print("LINT WARNINGS:")
            for p in problems:
                print(f"  - {p}")
        else:
            print("lint: ok")

    render_png(args.svg, args.png)
    print(f"png:  {args.png}")
    if args.out:
        to_final_png(args.png, args.out)
        size_kb = os.path.getsize(args.out) / 1024
        print(f"out:  {args.out} ({size_kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

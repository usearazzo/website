---
name: blog-hero-image
description: >-
  Design, render, and wire in the hero image for a UseArazzo blog post: a
  hand-crafted 1200×630 SVG illustration in the brand greens (ink ground,
  moss and leaf line work, flat geometric, soft glows, no logo, no
  photography), rasterized with headless Chrome and saved as PNG in
  assets/images/blog/. Use this whenever a blog post needs a
  hero/cover/header/og image, when the user says "make an image for this
  post", "hero for the new article", "blog illustration", "cover image", or
  wants to iterate on an existing hero's composition or colors, even if they
  don't say "hero" or "SVG". Also use it when they want a prompt to design
  the image on claude.ai instead. Every post requires a hero, so reach for
  this proactively when a new post is being added and no image exists yet.
---

# Blog hero image (for UseArazzo)

Every post on usearazzo.com ships with a custom hero illustration: a single
flat-geometric scene that tells the article's story in the brand greens. The
blog index features the latest post with a big image and shows the rest as
image-top cards, and the same file is the Open Graph image, so a missing or
off-brand hero breaks the layout, the visual identity, and social previews.

This skill covers the whole job: pick a metaphor, write the SVG, render a
preview, iterate with the user, export PNG, fill in the post's `image:`
front matter. Prose is still the human's; you own only the image and its
metadata.

Two ways to produce the SVG:

- **Default: design it here.** Write the SVG yourself, render with the
  bundled script, look at the PNG, refine. Fast loop, no context switch.
- **Alternative: design on claude.ai.** If the user prefers to iterate
  visually as an artifact, fill in `references/claudeai-prompt.md` with the
  topic and metaphor, hand it over, and pick up the downloaded SVG at the
  render step. Same rules, same script.

## 1. Find the metaphor

Read the post (`_posts/<date>-<slug>.md`) if it exists; otherwise ask for a
one-line summary. Then propose a **central metaphor**, the visual story the
frame tells, and confirm it before drawing. Offer two or three directions in
a sentence each when the topic is abstract. A good metaphor:

- illustrates the *problem or transformation* the article is about, not the
  product's feature list (a path that forks and rejoins, loose threads
  becoming a chain of steps, plants growing from shared ground);
- works at card size (160px tall, cropped from the right) as a single
  recognizable silhouette;
- needs no words to read. Text is a last resort: at most one short display
  word (a spec keyword) if the metaphor genuinely demands it.

The existing heroes are the style reference; open them to calibrate density
and mood before drawing:

- `assets/images/blog/api-workflows-are-still-improvised.png`: a workflow
  path with rounded-square step nodes that forks into two branches and
  rejoins, on a faint grid.
- `assets/images/blog/arazzo-ecosystem.png`: a row of stylized plants on a
  ground line, sparse dots in the sky.

The Fork mark (one step splits, two run, they rejoin) is the brand's own
metaphor for Arazzo. Echo its *shapes* (rounded-square nodes, branching
lines) freely, but do not composite the logo file itself into the image.

## 2. Draw the SVG

Write the SVG to the scratchpad as `<slug>.svg`. Non-negotiables, and why:

| Rule | Why |
|---|---|
| `viewBox="0 0 1200 630"`, width/height 1200/630, fully self-contained (no `<image>`, scripts, external fonts, `@import`) | Rendered by a local Chrome with no network; 1200×630 is the Open Graph size the templates already declare |
| Palette only: `#17210D` ink (ground), `#2A3A18` dark moss (gradient partner, grid lines), `#3A6B1F` deep green, `#6BA543` moss (secondary line work), `#94C83D` leaf (primary line work, nodes), `#A3D977` pale leaf (highlights), `#F0F5E7` mist (near-white glow), white. Opacity is how you get tints, not new hexes | Consistency across the blog index; the lint flags anything else |
| Background: dark ground built from `#17210D` and `#2A3A18` (radial or diagonal gradient) plus one large soft moss glow behind the subject. Optional faint grid at very low opacity | Every hero shares this ground; the glow gives depth without leaving the palette |
| No logo file, no "UseArazzo", no "Arazzo" wordmark, no "Blog" anywhere | The illustration owns the frame; branding lives in the page chrome |
| Flat geometric shapes with rounded corners, thick `#94C83D` strokes with `stroke-linecap="round"`, rounded-square nodes, `feGaussianBlur` glows, small circular particles in leaf / pale leaf / mist | The house style; reads well at card size and matches the existing heroes |
| Keep everything essential inside the **left 85%** (x ≤ ~1020); only decorative elements beyond | Cards use `object-cover object-left`, so the right edge is what gets cropped |
| Keep the subject vertically centred-ish (y 120 to 510) | The featured card crops top and bottom too at some widths |
| If text is used: `font-family: system-ui, sans-serif`, bold, one word, `#94C83D` or white | No webfonts available at render time; keeps it legible |

Build in layers (background, grid, glow, main subject, particles) with `<g>`
groups and comments so the user can ask for "thicker lines" or "move the
plants left" and you can edit surgically. Prefer `<defs>` for reused
gradients/filters. Avoid giant blur radii on many elements (slow to render,
muddy at card size); one or two glows carry a frame.

## 3. Render, look, iterate

```bash
python3 .claude/skills/blog-hero-image/scripts/render.py <scratch>/<slug>.svg --png <scratch>/<slug>.png
```

The script lints first (viewBox, off-palette colors, forbidden text, external
refs) and prints warnings, then screenshots via headless Chrome. **Read the
PNG yourself** before showing it: check the silhouette reads, nothing
essential sits in the right 15%, the glow isn't washing out the subject, and
the particles look intentional rather than scattered. Fix obvious issues
first, then give the user the PNG path and a one-line description of what
they're looking at. Iterate on their feedback; keep each round's SVG edit
small and re-render. Don't ask about details you can settle yourself
(exact shades, particle counts); ask about direction (metaphor, focal
subject, mood).

If the user wants to design on claude.ai instead: fill the two bracketed
slots in `references/claudeai-prompt.md`, hand them the prompt, and when
they return the SVG, run it through the same script; the lint catches
drift from the rules.

## 4. Export and wire in

When the user is happy:

```bash
python3 .claude/skills/blog-hero-image/scripts/render.py <scratch>/<slug>.svg \
  --png <scratch>/<slug>.png --out assets/images/blog/<slug>.png
```

`<slug>` matches the post's filename slug. `--out` writes an optimized PNG
(the site's heroes are PNG, not WebP). Then set the post's front matter:

```yaml
image:
  path: /assets/images/blog/<slug>.png
  width: 1200
  height: 630
  alt: "<what the picture literally shows, one sentence, no 'image of'>"
  caption: "<short caption tying the scene to the article>"
```

Note the leading slash on `path`; the templates pass it through
`relative_url` / `absolute_url`. Propose `alt` and `caption` and let the user
adjust; both are image metadata, not article prose, and neither may contain
an em dash or en dash. `image` is required by the templates; the JSON-LD and
blog index assume every post has it. Keep the SVG source in the scratchpad
(or hand it to the user); it isn't committed unless they ask.

Sanity check before finishing: the PNG is 1200×630 and roughly 60 to 200 KB;
the post renders at `/blog/<slug>/` with `bundle exec jekyll serve`; the
card on `/blog/` still reads with the right side cropped.

## Don'ts

- No photography, stock art, clip art, emoji, or colors outside the palette.
- No logo overlay, wordmark, or "Blog" label composited onto the image.
- No blues or navy; the brand is green on dark green.
- Don't write or rewrite the post's prose while you're in there.
- Don't add new build dependencies; Chrome + Pillow is the whole toolchain.

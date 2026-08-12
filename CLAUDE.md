# CLAUDE.md

Project context for AI assistants working on the UseArazzo website.

## Project Overview

Jekyll static site for UseArazzo — a JavaScript/TypeScript toolkit for Arazzo, the OpenAPI
Initiative's specification for multi-step API workflows. Hosted on GitHub Pages at
`https://usearazzo.com/`.

Three products (the toolkit is pre-1.0; APIs may change before the stable release):
- **CLI** — `@usearazzo/cli`, one command-line interface across the toolchain. **Not yet published**
  — the page at `/cli/` describes the planned `validate`/`run` interface honestly as in-development,
  built from the two libraries below. Do not present it as installable.
- **Validator** — `@usearazzo/validator`, **not yet published**, under heavy development. Semantic
  validation and linting for Arazzo documents, LSP-compatible diagnostics, opt-in JSON Schema
  validation.
- **Runner** — `@usearazzo/runner`, private/unpublished, under heavy development. Executes Arazzo
  workflows against live APIs described by OpenAPI source descriptions, step by step.

**Nothing in the toolkit is on npm.** All five package names 404 on the registry — verify with
`curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@usearazzo/<pkg>` rather than
trusting `"private": false` in a `package.json`, which only means publish*able*. Never add
`npm install` instructions, "Published" badges, or `npmjs.com/package/@usearazzo/*` links (they are
dead) until a package actually resolves. Link to the monorepo's `packages/<name>` tree instead.

Lower-level packages `@usearazzo/parser` and `@usearazzo/resolver` are also unpublished and have no
dedicated product page — they're referenced only in "Built With" sections and `llms.txt`, per the
org's own framing of them as packages for people building their own Arazzo tooling.

All three products (plus parser/resolver) live in one monorepo:
[usearazzo/arazzo-toolkit](https://github.com/usearazzo/arazzo-toolkit).

## Not on this site

SpecLynx's product line (Editor, OpenAPI Toolkit, Language Service, ApiDOM) is **not** ported here —
those are SpecLynx products. UseArazzo's own roadmap (Language Service, Editor, VS Code Extension,
GitHub Actions, Agent Skills, MCP Server, MCP Compiler, Arazzo Transformers — see the
[org profile README](https://github.com/usearazzo/.github/blob/main/profile/README.md)) is
unbuilt; don't add product pages for roadmap items ahead of the code.

## Tech Stack

- **Jekyll** via `github-pages` gem (~232)
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`)
- **Prism.js** v1.29.0 for syntax highlighting (JS, TS, YAML, JSON, Bash)
- **Vanilla JavaScript** (no framework)
- **No npm/Node dependencies** — pure Ruby/Jekyll with CDN-based frontend libs

### Jekyll Plugins
- `jekyll-feed` — RSS feed
- `jekyll-sitemap` — sitemap.xml generation
- `jekyll-seo-tag` — Open Graph, Twitter Cards, canonical URLs, basic JSON-LD

## Build & Serve

```bash
bundle exec jekyll serve        # Dev server (localhost:4000)
bundle exec jekyll build        # Build to _site/
```

## File Structure

```
_config.yml                      # Site config (title, url, baseurl, plugins)
_layouts/
  base.html                      # HTML skeleton: head, nav, content, footer, org schema
  default.html                   # Wraps content in container (inherits base)
  post.html                      # Blog post layout (breadcrumb, byline, TechArticle JSON-LD)
_includes/
  head.html                      # <head> with seo tag, meta, CDN scripts
  nav.html                       # Responsive navbar with dropdowns
  footer.html                    # Footer with links and social icons
  schema-organization.html       # Organization JSON-LD (included sitewide)
  share-buttons.html             # Social share icons (Bluesky/LinkedIn/Mastodon/X), used on blog posts
_posts/
  YYYY-MM-DD-title.md            # Blog posts (Markdown, rendered with post layout) — none yet
pages/
  homepage.html                  # Landing page (permalink: /)
  blog.html                      # Blog index (permalink: /blog/); empty-state when site.posts is empty
  cli.html                       # CLI product page — in-development framing, no fake install steps
  runner.html                    # Runner product page, sidebar nav, architecture + JS API
  validator.html                 # Validator product page, sidebar nav, in-development framing + JS API
  about.html                     # Team, mission, track record, "Built on SpecLynx" credit
  privacy.html, terms.html       # Legal pages
assets/
  css/main.css                   # Custom CSS + CSS variables
  js/main.js                     # Mobile menu, lightbox, heading anchors
  images/                        # Logos, diagrams, screenshots
robots.txt                       # Sitemap directive (uses Jekyll variables)
llms.txt                         # LLM crawler discovery file
```

## Branding

- Logo: the "Fork" mark (`assets/images/logos/usearazzo-logo.svg`, sourced from
  `usearazzo/branding/svg/fork.svg`) — a square tile depicting "one step splits, two run, they
  rejoin," a metaphor for Arazzo's branching/parallel workflow execution. Variants:
  `usearazzo-logo-light-ui.svg` (white tile, for dark backgrounds like the footer),
  `usearazzo-logo-deep.svg` (moss tile, white glyph), `usearazzo-glyph.svg` (glyph only).
- CSS custom properties: `--color-primary-dark: #17210D` (brand "ink"), `--color-primary-light:
  #3A6B1F` (darkened brand green — the raw "moss" `#6BA543` fails 4.5:1 text contrast on white, and
  even a ~4.8:1-on-paper shade measured under 4.5 in Chrome/Lighthouse's actual renderer, so this
  one carries real margin — verify empirically with Lighthouse's `color-contrast` audit, not just
  the WCAG formula on paper, before trusting a shade close to the 4.5 line), `--color-accent:
  #94C83D` (brand "leaf", decorative only — never body text), `--color-moss: #6BA543` (secondary
  green for gradients/hover).
- Favicons were rasterized from `fork.svg` via `google-chrome --headless --screenshot` (no
  ImageMagick/rsvg-convert/PIL in this environment) — see git history for the exact commands if
  regenerating. `favicon.ico` is a hand-built PNG-in-ICO container (Python stdlib `struct`).
- No LaunchList/newsletter widget — SpecLynx's site had one, UseArazzo's doesn't.

## Inline Links in Body Text

Use `class="text-primary-light underline hover:no-underline"` for links inside paragraphs. This ensures links are distinguishable by more than color alone (Lighthouse accessibility requirement).

## Heading Anchors

JavaScript in `main.js` auto-generates `#` anchor links on headings with IDs and on first headings inside sections with IDs. Uses `:scope >` selector to avoid duplicates from nested sections.

`scroll-margin-top: 80px` on `[id]` elements prevents anchors from hiding under the sticky header.

## AEO (Answer Engine Optimization)

### Schema.org JSON-LD Structured Data
- **Organization** — sitewide via `_includes/schema-organization.html` (name, logo, email, sameAs). Carries `"@id"` (the site root URL) so other JSON-LD blocks can reference it, e.g. blog posts' `"publisher": { "@id": ... }`
- **SoftwareApplication** — on each product page (category, license, price, author)
- **BreadcrumbList** — on each product page (Home > Product Name)
- **Person** — on About page (both co-founders with jobTitle, URLs, sameAs)
- **FAQPage** — on each product page
- **WebSite/WebPage** — auto-generated by `jekyll-seo-tag`

### FAQ Sections
Each product page has a visible FAQ section at the bottom with matching `FAQPage` JSON-LD. Keep the visible HTML text and JSON-LD `text` values in sync when editing.

### robots.txt / llms.txt
Both use Jekyll front matter (`layout: none`) so Liquid variables resolve.

## Blog

- Posts live in `_posts/` as Markdown with permalink `/blog/:title/` (set via `collections.posts` in `_config.yml`)
- Front matter: `title`, `description`, `date`, `image` (`path`/`width`/`height`/`alt`/`caption`); optional `author`/`author_url`/`author_link` overrides. `image` is required — templates assume it.
- **Every post must have a catchy hero image** — brand colors (the greens above), no photography, no logo/wordmark in the image itself.
- **Post prose is written by humans.** AI assistants build blog infrastructure and hero images but never draft or rewrite article content.
- **Author is always a Person, never the Organization.** Defaults to Vladimír Gorej via `_config.yml` front matter defaults; UseArazzo appears only as `publisher` in JSON-LD. Byline links to `/about/#vladimir-gorej`.
- `pages/blog.html` shows an empty-state card when `site.posts` is empty — keep that branch working when adding the first post (it's an `{% if latest %}...{% else %}...{% endif %}` guard).

## Product content accuracy

This is real, currently-shipping (or currently-not-shipping) software. When updating product pages:
- Don't add commands, flags, or install instructions that don't exist in the actual package —
  check `arazzo-toolkit/packages/{validator,runner}/README.md` and `package.json` first.
- Keep the "not yet published" framing on every product page until that package actually resolves
  on the npm registry. `@usearazzo/cli` does not even exist in `arazzo-toolkit/packages/` yet.
- Keep the Runner page's "pre-1.0 / private" framing until `@usearazzo/runner`'s `package.json`
  drops `"private": true`.

## Important Notes

- No mention of SmartBear or Swagger as company names in ApiDOM-adjacent content beyond what's
  already public (the founders' own Swagger contribution history on the About page is fine — that's
  founder biography, not proprietary company detail).
- The `baseurl` is `""` (empty) — internal links use `{{ '/path/' | relative_url }}`
- The `url` is `https://usearazzo.com`
- No confirmed LinkedIn/X/Twitter accounts for UseArazzo — footer/nav only link GitHub + email until
  real accounts exist. Don't add social icons speculatively.

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
- **Runner** — `@usearazzo/runner`, **not yet published**, under heavy development. Its `package.json`
  carries `"private": true`, which is a publish guard, not secrecy: the source is public in the
  monorepo like everything else, so never describe it as "private" on the site. Executes Arazzo
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
  ecosystem.html                 # "Arazzo Ecosystem" registry of EXTERNAL resources: ONE page
                                 # at /ecosystem/ with hash sections in this order: #spec #tools
                                 # #articles #videos #examples #other #curation. Product-page
                                 # sticky sidebar (hidden below lg, like /cli/), hero gradient
                                 # header, full-width bands alternating white / #F0F5E7 tint
                                 # (assets/css/ecosystem.css). YouTube entries embed a
                                 # youtube-nocookie.com iframe (.ecosystem-video). Pure HTML,
                                 # no JS, no per-entry data-* attributes: a filter bar, star
                                 # picks, JS-computed counts, "recently added", nav pills, nav
                                 # cards, and six sub-pages were all built and removed at the
                                 # owner's request ("simple and easily maintainable"); don't
                                 # reintroduce any unasked. The page was named "Learn" first;
                                 # the owner renamed it Ecosystem. All entry URLs are
                                 # curl-verified before listing; never invent one. Entry
                                 # snippet and acceptance bar in CONTRIBUTING.md. UseArazzo's
                                 # own content is never listed; linked in nav and footer.
  cli.html                       # CLI product page — design sketch only, package does not exist
  runner.html                    # Runner product page, sidebar nav, inline SVG architecture + JS API
  validator.html                 # Validator product page, sidebar nav, in-development framing + JS API
  about.html                     # Mission, team, track record, "Built on SpecLynx" credit
  privacy.html, terms.html       # Legal pages
assets/
  css/main.css                   # Custom CSS + CSS variables
  js/main.js                     # Mobile menu, lightbox, heading anchors
  images/                        # Logos (incl. asyncapi-logo.svg), favicons, team/ headshots
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
- Favicons were rasterized from `fork.svg` via `google-chrome --headless --screenshot` — see git
  history for the exact commands if regenerating. (Pillow *is* available now, so resizing and
  cropping can be done in Python; ImageMagick and rsvg-convert are still absent.) `favicon.ico` is a hand-built PNG-in-ICO container (Python stdlib `struct`).
- No LaunchList/newsletter widget — SpecLynx's site had one, UseArazzo's doesn't.

## Inline Links in Body Text

Use `class="text-primary-light underline hover:no-underline"` for links inside paragraphs. This ensures links are distinguishable by more than color alone (Lighthouse accessibility requirement).

## Heading Anchors

JavaScript in `main.js` auto-generates `#` anchor links on headings with IDs and on first headings inside sections with IDs. Uses `:scope >` selector to avoid duplicates from nested sections.

`scroll-margin-top: 80px` on `[id]` elements prevents anchors from hiding under the sticky header.

## AEO (Answer Engine Optimization)

### Schema.org JSON-LD Structured Data
- **Organization** — sitewide via `_includes/schema-organization.html` (name, logo, email, sameAs). Carries `"@id"` (the site root URL) so other JSON-LD blocks can reference it, e.g. blog posts' `"publisher": { "@id": ... }`
- **SoftwareApplication** — on `/validator/` and `/runner/` only (category, license, version,
  author). Deliberately **absent from `/cli/`**: that block asserts a real application with a
  zero-price `Offer`, and no `@usearazzo/cli` source exists yet, so it would tell crawlers something
  the visible page denies. Add it when the package does.
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
- Keep the Runner page's "not yet published" framing until `@usearazzo/runner`'s `package.json`
  drops `"private": true` and the package resolves on the npm registry.
- **Package metadata does not belong on product pages.** Node engine floors, transitive dependency
  versions, and similar install-time detail live in the README and `package.json`, where someone
  installing will look. A product page introduces a product to someone evaluating it. README parity
  is not the goal; three additions were reverted for exactly this reason.
- Product page copy is checked against the package README, but the README is not automatically
  right. Both the `docs/rules.md` link (a 404) and the "private" framing came from READMEs.

## Writing style

- **No em dashes or en dashes in site copy.** `pages/`, `_includes/`, `_layouts/`, `llms.txt`, and
  `README.md` were swept clean of all 58 occurrences. Rephrase with a colon, comma, semicolon,
  parentheses, or a sentence split. Hyphens inside compound words ("command-line", "step-by-step")
  are fine. Check with `grep -rn "&mdash;\|—\|&ndash;\|–" pages/ _includes/ _layouts/ llms.txt README.md`
  before calling copy done. This file is internal notes and is exempt.
- Prefer periods over semicolons when both work; a semicolon joining two loosely related clauses
  reads as odd.
- Lead with what the reader can do, not with what is missing. "For now the Validator runs from a
  checkout" beats "There is nothing to install yet".
- The upstream org profile README uses em dashes heavily, so strip them when porting from it.

## Product page conventions

The three product pages share a shape. Keep them parallel when editing one.

- **Status badge ladder**: `Published` / `In development` / `Idea`. Everything is currently
  `In development`; `Idea` marks a single unbuilt command (`init`) inside an otherwise settled page.
- **Status callout** directly under the intro paragraph (`bg-[#F0F5E7] border-l-4 border-primary-light`),
  stating plainly what does not exist.
- **CTA pair**: "View source on GitHub" (primary) and "Follow Discussions" (secondary), both
  pointing at real destinations, never npm.
- **"Availability"**, not "Installation", while nothing is installable. An install heading promises
  a command that does not exist.
- **"Rest of the Toolkit"** for the sibling-product cards. "Built With" is only correct on `/cli/`,
  which genuinely will be built with the other two; on `/validator/` and `/runner/` it was backwards.
  Each of those pages ends with an "Under the hood, X uses ..." line naming the real dependency.
- **First FAQ answers "can I install this today?"** in the visible HTML and in the `FAQPage` JSON-LD.
- **SpecLynx is not mentioned on product pages.** It appears only in the About page's "Built on
  SpecLynx" section (and its `llms.txt` mirror), where it is founder lineage rather than a
  dependency note. The org's public members are `char0n` and `frantuma`, so "our own API tooling
  foundation" is accurate.
- **Never call an unpublished package "private".** `"private": true` in `package.json` is a publish
  guard; the source is public in the monorepo like everything else.

### Product page layout

`<main class="flex-1 min-w-0 max-w-4xl px-6 py-12">` — the **`min-w-0` is load-bearing**. Flex
children default to `min-width: auto`, so a wide `<pre>` refuses to shrink and pushes the column
past the viewport, which `overflow-x: hidden` on `html` then clips instead of scrolling. Without it
every product page loses the right edge of its prose below roughly 500px, and `.code-block`'s
`overflow-x: auto` can never fire. Verify at 420px after touching these pages.

### Diagrams

The Runner's architecture diagram is **inline SVG** in `pages/runner.html`, not an image: real text,
brand palette, `role="img"` with `<title>`/`<desc>`. There is no mermaid runtime on the site, so do
not paste rendered mermaid screenshots (they also mangle `<br/>` labels into run-on text). The old
`.architecture-box` / `.architecture-box-highlight` rules in `main.css` are now unused.

## Important Notes

- No mention of SmartBear or Swagger as company names in ApiDOM-adjacent content beyond what's
  already public (the founders' own Swagger contribution history on the About page is fine — that's
  founder biography, not proprietary company detail).
- **The site is live on the custom domain: `baseurl: ""`, `url: "https://usearazzo.com"`, with a
  `CNAME` of `usearazzo.com`.** These are the correct values; do not "restore" the old project-page
  pair (`baseurl: "/website"`, `url: "https://usearazzo.github.io"`), which is what an earlier
  version of this file documented as current. `usearazzo.github.io/website/` now 301s to the custom
  domain.
  - If you ever do test on the project URL again, note that the config and the `CNAME` have to move
    together. With a `CNAME` present, GitHub applies the custom domain as soon as DNS verifies, so a
    `/website` baseurl makes every real URL 404 at the domain root and serves GitHub Pages' default
    "Page not found" page instead.
  - That mismatch is not just a broken-links problem. It happened for a window on 2026-08-13
    (`CNAME` added in `0e1d355`, baseurl fixed later the same day in `7471ebe`), and Google crawled
    `usearazzo.com` during it, found only GitHub's 404 page, and cached **GitHub's Octocat as the
    site favicon** in search results and Search Console. The live favicon chain has been verified
    correct since (`/favicon.ico` is a valid ICO with 16/32/48px entries, Googlebot gets a 200,
    nothing is blocked in `robots.txt`); only Google's cache is stale. The fix is Request Indexing
    on the home page in Search Console plus patience, and **never renaming `/favicon.ico`**, since a
    moved favicon URL restarts Google's refresh clock.
- Never hardcode a root-relative path. Always `{{ '/path/' | relative_url }}` for `href`/`src`, and
  `{{ '/path/' | absolute_url }}` inside JSON-LD, which needs absolute URLs. A non-empty `baseurl`
  is what exposes these; three were found and fixed this way (`/favicon.ico`, the footer logo link,
  and `site.webmanifest`'s `id`/`start_url`).
- No confirmed LinkedIn/X/Twitter accounts for UseArazzo — footer/nav only link GitHub + email until
  real accounts exist. Don't add social icons speculatively.

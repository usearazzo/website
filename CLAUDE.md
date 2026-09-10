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

**Only `@usearazzo/parser` is on npm** (published 2026-09-08; `1.0.1-alpha.0` and then `1.0.1-alpha.1`, a README-only release the same day). The other four
package names 404 on the registry — verify with
`curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@usearazzo/<pkg>` rather than
trusting `"private": false` in a `package.json`, which only means publish*able*. Never add
`npm install` instructions, "Published" badges, or `npmjs.com/package/@usearazzo/*` links (they are
dead) for a package until it actually resolves. Link to the monorepo's `packages/<name>` tree instead.

Lower-level packages `@usearazzo/parser` and `@usearazzo/resolver` have no product page by design —
they're for people building their own Arazzo tooling, per the org's own framing. The parser has an
API reference page at `/docs/parser/` (see "Package reference pages" below); the resolver is
unpublished and referenced only in "Built With" sections, the docs hub card, and `llms.txt`.

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
- **Tailwind CSS** 3.4.17 as a **generated, committed stylesheet** (`assets/css/tailwind.css`,
  ~17 KB), not the Play CDN script. See "Page performance" below for why and how to regenerate
- **Prism.js** v1.29.0 for syntax highlighting (JS, TS, YAML, JSON, Bash); scripts from cdnjs,
  theme CSS self-hosted, both only on pages with `prism: true`
- **Vanilla JavaScript** (no framework)
- **No npm/Node dependencies in the repo** (no `package.json`). Node is needed only to regenerate
  the Tailwind file, via `npx`, when a page gains a class it does not have yet

### Page performance (2026-09-10)
- **Tailwind is a static file.** The Play CDN script (127 KB of JavaScript compiling the page's
  CSS in the browser, render-blocking, "not for production" per Tailwind's docs) held every page
  at ~90 performance with FCP 2.2 s / LCP 2.9 s; the generated file scores 100 with 1.2 s / 1.5 s
  and rendered pixel-identical on /, /docs/, /runner/, and the tutorial. Inputs:
  `tailwind.config.js` (repo root, content globs, excluded from the Jekyll build) and
  `_tailwind/input.css`. **Regenerate whenever a page gains a Tailwind class the file does not
  have yet**, or the class silently does nothing:
  `npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i _tailwind/input.css -o assets/css/tailwind.css --minify`.
  `.github/workflows/tailwind.yml` regenerates on push and PR and fails when the committed file is
  stale. The globs include `assets/js/**` so classes toggled from JavaScript are picked up. The
  `<link>` sits where the CDN `<script>` was, after `main.css` and page stylesheets, so the
  cascade is unchanged. Brand colour utilities (`.text-primary-dark` etc.) are plain rules in
  `main.css`, so Tailwind runs on its default config.
- **Hero images ship as WebP with the PNG kept.** Front matter `image.webp` (optional) names a
  WebP sibling of `image.path`; the guide, tutorial, and post layouts and the docs hub and blog
  index cards render `image.webp | default: image.path`, while `image.path` (PNG) stays the
  Open Graph and JSON-LD image, where WebP support is still patchy. The heroes are flat
  brand-green artwork, so WebP q90 is 16 to 20 KB against 130 to 350 KB PNG. Generate with
  Pillow: `Image.open(p).convert('RGB').save(p[:-4] + '.webp', 'WEBP', quality=90, method=6)`.
  Every post, guide, and tutorial hero has one; a new hero needs the PNG (for OG) and the WebP.
- **No server-side syntax highlighting** (`highlighter: none` plus kramdown
  `syntax_highlighter_opts.disable` in `_config.yml`). Rouge, on by default under `github-pages`,
  wrapped every token of every fenced block in a span, about 800 per docs page and 20 to 45 KB of
  HTML, which Prism then discarded when it re-highlighted in the browser. kramdown still emits
  `<pre><code class="language-x">`, which is all Prism needs; code blocks render identically. Side
  effect: inline `<code>` no longer carries Rouge's `language-plaintext`, so Prism's theme no longer
  touches it and `.post-content code` in `main.css` styles it as written (the override rule that
  fought Rouge was removed).
- **The Prism theme is self-hosted** (`assets/css/prism-tomorrow.min.css`, MIT, provenance in its
  header): a render-blocking stylesheet on a third-party origin cost ~800 ms for 1.3 KB. The
  Prism scripts still come deferred from cdnjs.
- **Prism loads only where `prism: true`**: `head.html` gates the theme CSS and the six scripts on
  it. `_config.yml` defaults set it for posts, tutorials, guides, and reference; `cli`, `validator`,
  and `runner` set it in their own front matter. A new page with code blocks needs the flag or its
  code renders unstyled. Pages without code (home, docs hub, blog index, ecosystem, about, legal)
  skip the cdnjs connection and a render-blocking stylesheet.
- `head.html` preconnects to `cdnjs.cloudflare.com` only when Prism loads. (An interim step
  pinned the Tailwind CDN URL to dodge its per-load 302; the static file made that moot.)

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
  guide.html                     # Guide layout: product-page two-column shape, sidebar TOC from
                                 # front matter `toc`, "Updated" date, TechArticle + BreadcrumbList
  tutorial.html                  # Tutorial layout: a copy of guide.html with the breadcrumb, JSON-LD,
                                 # and back link pointing at /docs/#tutorials. Keep the two in step
  reference.html                 # Package reference layout: outline sidebar from `toc` (items may
                                 # carry `children`, rendered indented like the Runner page's
                                 # Architecture sub-entries), breadcrumb Home / Docs / Package
                                 # reference, "Updated" date (no version line, see "No concrete versions"),
                                 # npm + Source links, no hero, no author byline, TechArticle
                                 # (about: SoftwareSourceCode) + BreadcrumbList JSON-LD
_includes/
  head.html                      # <head> with seo tag, meta, CDN scripts
  nav.html                       # Responsive navbar with dropdowns
  footer.html                    # Footer with links and social icons
  schema-organization.html       # Organization JSON-LD (included sitewide)
  share-buttons.html             # Social share icons (Bluesky/LinkedIn/Mastodon/X), used on blog posts
_posts/
  YYYY-MM-DD-title.md            # Blog posts (Markdown, rendered with post layout)
_tutorials/
  slug.md                        # Tutorials (Markdown, tutorial layout), output at /docs/tutorials/<slug>/
_guides/
  slug.md                        # Guides (Markdown, guide layout), output at /docs/guides/<slug>/
_reference/
  <package>.md                   # Package API reference (Markdown, reference layout), output at
                                 # /docs/<package>/. One page per published package
assets/guides/<slug>/            # Sample documents a guide's code runs against, served as-is so
                                 # readers can download them; every number in the guide must be
                                 # reproducible from these files
assets/tutorials/<slug>/         # Same for tutorials, plus the finished script the tutorial builds
                                 # (readers download it; keep it byte-identical to the final listing)
pages/
  homepage.html                  # Landing page (permalink: /)
  blog.html                      # Blog index (permalink: /blog/); empty-state when site.posts is empty
  docs.html                      # Docs hub (permalink: /docs/), redone 2026-09-10 on the shape of
                                 # stoplight.io/guides at the owner's request: no sidebar, centred
                                 # full-width page. Hero gradient band (title, intro, three jump
                                 # pills #tutorials #guides #packages), then three bands alternating
                                 # white / #F0F5E7 tint, each a centred heading, one-line lead, and
                                 # a row of compact cards (assets/css/docs.css, loaded via the
                                 # page's `stylesheets` front matter). .docs-grid is a plain
                                 # left-aligned grid (1 / 2 / 3 columns); a short row leaves its
                                 # slots empty (the owner chose this over centred cards and over
                                 # the old full-width image-left card). Tutorial and guide cards: thumbnail
                                 # (16:9 crop of the hero), status badge only when set, title,
                                 # `summary` front matter (one sentence; falls back to
                                 # `description`), one filled button. No "Updated" date on cards.
                                 # Each band fills to three with dashed placeholder cards
                                 # (owner's request 2026-09-10): the first says "More ... on the
                                 # way" with a Discussions link, the rest are aria-hidden ghosts
                                 # shown only at three columns (lg); below that they would just
                                 # add scroll, so docs.css hides them.
                                 # They also cover the zero-guides case, so the old empty-state
                                 # branch is gone.
                                 # Package cards are all static (badge, name, one-line blurb,
                                 # filled "API reference" for published, outline "README on
                                 # GitHub" for the rest). No spec
                                 # section: the Ecosystem page's #spec covers it
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
tailwind.config.js               # Content globs for the generated Tailwind file; regenerate command
                                 # in its header comment. Excluded from the Jekyll build
_tailwind/input.css              # The three @tailwind directives the generator compiles
.github/workflows/tailwind.yml   # CI: regenerates assets/css/tailwind.css and fails if it is stale
assets/
  css/tailwind.css               # GENERATED, committed. Do not edit by hand; regenerate (see above)
  css/docs.css                   # Docs hub only (bands, cards, placeholders); loaded via front matter
  css/main.css                   # Custom CSS + CSS variables
  js/main.js                     # Mobile menu, lightbox, heading anchors, guide FAQ toggles.
                                 # Loaded ONCE, deferred, from head.html. A second synchronous
                                 # include in footer.html ran every DOMContentLoaded handler
                                 # twice (two FAQ click listeners cancelled each other out);
                                 # it was removed 2026-09-07, do not re-add
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
- **SoftwareApplication** — on `/validator/` and `/runner/` only (category, license,
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
- The parser release announcement is a Field notes post, `_posts/2026-09-08-arazzo-parser-on-npm.md`,
  drafted 2026-09-08 (dated today so it shows in a plain `jekyll serve`; the owner sets the real
  date and file name before pushing). It names the release in the title and first paragraph, then the field
  notes (why the parser shipped first, the five bugs the docs turned up, what alpha means), and
  links the tutorial as the next step. Publish it a few days after the tutorial, never before.
- `pages/blog.html` shows an empty-state card when `site.posts` is empty — keep that branch working when adding the first post (it's an `{% if latest %}...{% else %}...{% endif %}` guard).

## Docs and guides

- `/docs/` is the single entry point for reading material, modelled on Redocly's `/docs` hub but
  deliberately one tree, not two: guides live at `/docs/guides/<slug>/` (Jekyll `guides`
  collection in `_guides/`), and future per-package reference pages would slot in at
  `/docs/<package>/` beside them. The owner chose `/docs/guides/` over a top-level `/guides/` so
  the hub is the real parent (breadcrumbs, JSON-LD) and the nav needs only one `Docs` link.
- Breadcrumb on a guide is Home / Docs / Guides / Title, with Guides linking to `/docs/#guides`
  (there is no separate guides index page). The JSON-LD `BreadcrumbList` mirrors it.
- Guides are reachable from the footer's Resources column (`Guides`, pointing at `/docs/#guides`)
  and the `Docs` nav link. The homepage does not feature guides: a homepage section was built and
  removed at the owner's request in favour of the footer link.
- A guide is evergreen and undated in the reader's eyes: the layout shows "Updated" (from
  `last_modified_at`, falling back to `date`) rather than a publish date. Guides are not in the
  RSS feed.
- Guide front matter: `title`, `description`, optional `summary` (one sentence for the docs hub
  card; the card falls back to `description`), `date`, `image` (`path`/`width`/`height`/`alt`,
  optional `caption`), optional `last_modified_at`, optional `status` (rendered as a badge, e.g.
  `Draft`), and `toc` (list of `{id, title}`) which drives the sidebar. Heading IDs in the Markdown
  must match the `toc` ids (`## Heading {#id}`). Optional `faq` (list of `{question, answer}`;
  answers are Markdown block scalars and may carry inline code, lists, and short fenced examples,
  rendered with the `.post-content` styles; front matter is not run through Liquid, so write
  internal links as plain root-relative Markdown links, `[text](/blog/slug/)`, and the layout
  prefixes `site.baseurl`) renders a collapsible `<dl>` FAQ section after the body (a button in each `<dt>` toggles its `<dd>` via `main.js`; without JS every answer shows), a `FAQ` sidebar link, and
  a matching `FAQPage` JSON-LD from the same strings (Markdown rendered then stripped to plain
  text, entities unescaped), so visible text and schema cannot drift.
  Phrase questions the way someone would ask an LLM or search engine ("How do I parse an Arazzo
  document in JavaScript?"), and lead each answer with the direct answer.
- **Every guide has a hero image**, same rules and pipeline as blog posts (`blog-hero-image`
  skill, brand greens, no photography, no logo), saved in `assets/images/guides/`. The layout and
  the hub card both assume `image` is set.
- Guide audience, per the owner: any developer building their own Arazzo tooling (editor plugins,
  linters, generators, agents). Not people merely writing Arazzo documents; that is blog territory.
- The parsing guide's three formerly-pending toolkit changes have all landed on the toolkit's
  `main` and are in the published `@usearazzo/parser` 1.0.1-alpha.0: shared source descriptions are
  parsed once and distinguished from true cycles (usearazzo/arazzo-toolkit#139, merged as #142),
  `ParseError` is exported from the package entry (#140, merged as #141), and `resolve.baseURI`
  works for object and inline input (#137, merged as #138). All three were re-verified by running
  the guide's samples against the package on 2026-09-08. The reference page documents the same
  behaviour.
- Guides follow the blog authorship rule: prose is the founders'. AI may build scaffolding,
  outline, and first drafts from site copy and package READMEs, but final text is theirs.
- The parsing guide shows `npm install @usearazzo/parser`. That was an owner-approved exception
  (2026-09-03) while the package was about to publish; since 2026-09-08 the registry returns 200
  for it, so the instruction is simply true and the guide is no longer `Draft`.
- **No concrete versions on the site** (owner decision 2026-09-08). Product pages, the parser
  reference, `llms.txt`, and blog posts say "alpha" or "published", never `1.0.1-alpha.1`: a number
  goes stale with the next release and the npm page already carries it. The reference layout has
  no "Documents version" line and no `version` in its JSON-LD; `package` front matter carries
  `name`, `npm`, `github` only. `softwareVersion` was removed from the Validator and Runner
  `SoftwareApplication` blocks for the same reason. This file may cite versions; it is internal.
- **Package reference pages** (`_reference/<package>.md`, `/docs/<package>/`) exist only for
  packages that resolve on npm. Front matter: `title` (the package name), `description`, `date`,
  optional `last_modified_at`, `status` (`Published`), `package` (`name`, `version`, `npm`,
  `github`), and `toc` (list of `{id, title, children?}`). Heading IDs use `{#id}` and must match.
  The reference is the site's copy, edited from the package README, not mirrored: when the two
  diverge, the source of truth is the package's `types/*.d.ts` and `src/`, and every claim on the
  page was checked against them (the old README misquoted the `ParseError` message, for example).
  Bump `last_modified_at` when re-verifying against a new release. The package README, in turn, is
  a front door on purpose (~90 lines: what it parses, an at-a-glance table, install, one document
  example and one grammar example, links to the reference and the guide, supported versions, the
  toolkit) with the UseArazzo logo hot-linked from
  `https://usearazzo.com/assets/images/logos/usearazzo-logo.svg`. No License section: the badge,
  `package.json`, and the shipped LICENSE file cover it. Do not grow it back into a manual.
- Unpublished packages keep their reference in the README on GitHub. The docs hub links to it; do
  not mirror README content onto the site ahead of publishing.
- No search box and no newsletter on the docs hub. Both are speculative UI for a hub this size.
- **Tutorials are a separate Docs section, not a blog post type** (owner decision 2026-09-08, built
  the same day once `@usearazzo/parser` resolved on npm). They live in the `tutorials` collection at
  `/docs/tutorials/<slug>/`, a sibling of Guides, with the guide lifecycle: same front matter
  (`title`, `description`, `date`, `image`, optional `last_modified_at`, `status`, `toc`, `faq`),
  "Updated" date, `status` badge, sample files under `assets/tutorials/<slug>/`, hero in
  `assets/images/tutorials/`, not in the RSS feed. Hub band above Guides,
  footer link, and an `llms.txt` loop. A tutorial is one use case, one package, verb-first steps,
  runnable end to end, finishable in one sitting, every command real today. A guide unpacks a
  problem space and shows the DIY route. No empty-state section in the hub: the section loops
  `site.tutorials` unguarded, so the first tutorial must stay. The blog does not carry tutorials
  and its types stay Explainer and Field notes; a package release gets a Field notes post that
  links the tutorial as its next step, and a companion post beyond that only when the tutorial's
  context turned up an angle worth its own piece.
- The first tutorial, "List Every Document an Arazzo Workflow Depends On"
  (`_tutorials/list-arazzo-workflow-dependencies.md`), builds a 71-line `inventory.mjs` that parses
  an entry document with `sourceDescriptions: true` and prints a Mermaid graph of the documents it
  reaches (stdout), with problems on stderr keyed by source description name (source maps and
  positions were in an earlier draft and dropped at the owner's request as not adding value; the
  reference is linked from Next steps instead). There is no text-tree step: the owner
  asked for the graph as the end result and then for the text trees to go, so the walk emits
  Mermaid from the first recursive step and the diagnostics section only adds stderr and the
  exit code. Nothing the reader writes gets deleted later. The page shows the rendered graph as an
  inline SVG in the Runner diagram's light palette (the Graph tab's initial content; Mermaid loads
  only when the reader runs the micro-app, see below) with the Mermaid source in the next tab.
  Every output block was captured from a real run against the published 1.0.1-alpha.1 on
  2026-09-08 (only the scratch directory in error messages was replaced by `/home/you/inventory`).
  The chosen problem is deliberately document-level (the network of source descriptions), not
  expressions or criteria, and needs no dereferencing, so `@usearazzo/resolver` is never in the
  path. Rejected candidates: an `operationId` cross-check (needs dereferenced OpenAPI and is the
  Validator's job) and a step dependency graph (expression parsing, not document parsing).
- **The tutorial's "The end result" is a micro-app** (built 2026-09-09 at the owner's request). The
  static graph, Mermaid text, and stderr for the samples sit in three tabs (Graph / Mermaid source /
  Standard error) inside a form with a URL input. Submitting a URL loads the parser's UMD browser
  build (`dist/arazzo-parser.browser.min.js`, ~410 KB gzipped) and Mermaid (~1 MB gzipped) from
  unpkg **on demand, never in `head.html`**, runs the same walk as `inventory.mjs` (ported in
  `assets/js/tutorials/list-arazzo-workflow-dependencies.js`; keep the two in step), and replaces
  the tabs with the live result. Loader, error box (parser `ParseError` cause chain, CORS hint,
  60 s timeout), and a 700 ms minimum status time are deliberate. This is the only page with
  remote scripts outside the sitewide CDN set, and the `src` URLs are **pinned to exact versions
  with SRI hashes** (an exception to "No concrete versions": a `src` attribute is not copy, and the
  pin plus hash is what keeps the page working when a new release changes behaviour). To bump:
  change the version in both `data-*-src` attributes and recompute
  `openssl dgst -sha384 -binary <file> | base64`. The sample URL is written root-relative and made
  absolute against the page's own origin at runtime, so it is same-origin on localhost, 127.0.0.1,
  and production alike (an absolute `site.url` value failed with a CORS error on a local server).
  It travels in `data-dep-demo-sample` on the input, not `value`: a relative string in the
  `value` of a `type="url"` input is invalid HTML (the Nu checker flags it), and the script
  prefills the field from the attribute.
  The browser build is not documented in the package README or the reference page, so the page
  uses it without teaching it as an install path. Headless Chrome in the Claude Code sandbox has no
  outbound network: external URLs (raw GitHub, which sends `access-control-allow-origin: *`) can
  only be verified in a real browser.
- **Relative entry paths**: the published alphas (1.0.1-alpha.0 and .1) record a relative entry
  path unchanged as `retrievalURI`, so relative source description URLs resolve to `/samples/...`
  and fail (usearazzo/arazzo-toolkit#147). The fix, PR #148, resolves relative paths against the
  working directory. On the owner's instruction (2026-09-08) the tutorial and its shipped script
  assume that fix: no `path.resolve`, no FAQ entry about it. `1.0.1-alpha.2` (published
  2026-09-08, now `latest`) contains #148, so the tutorial's publish gate is met.

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
- **The compatibility table lives in three places and must stay identical**: the homepage
  `#compatibility` section, `llms.txt`, and the org profile README
  (`usearazzo/.github/profile/README.md`). Current facts (2026-09-03): Arazzo 1.0.0, 1.0.1, and
  1.1.0 workflow documents validate and run. Arazzo documents as source descriptions validate and
  run (the Runner has supported `$sourceDescriptions.<name>.<workflowId>` cross-document
  references since arazzo-toolkit#73). OpenAPI 2.0, 3.0.x, 3.1.x source descriptions validate and
  run. OpenAPI 3.2.x and AsyncAPI source descriptions do neither, and both get an explicit
  "no / no" row so the gap is stated rather than implied. The "Supported versions" lists on `/validator/` and
  `/runner/`, the Validator FAQ (visible and JSON-LD), and every toolkit package README must list
  the same Arazzo versions. Compatibility changes are pushed directly to `main` in all repos.

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
brand palette, `role="img"` with `<title>`/`<desc>`. There is no mermaid runtime on the site (the
one exception is loaded on demand by the dependencies tutorial's micro-app), so do not paste
rendered mermaid screenshots (they also mangle `<br/>` labels into run-on text). The old
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

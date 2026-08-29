---
name: developer-marketing
description: >-
  Strategic lens for creating or reviewing UseArazzo website content: blog
  posts, product pages, FAQs, getting-started/onboarding flows, guides,
  tutorials, the Ecosystem page, and site structure. Informed by reading
  "Developer Marketing Does Not Exist" (Adam DuVander): the educator mindset,
  problem-focused content, a developer experience checklist, tutorial/guide
  structure, and content cadence. Use this whenever planning a new post or
  page, choosing what to write about next, structuring a getting-started
  guide, drafting a headline, reviewing existing content for gaps, or when
  the user asks things like "what should we write about," "does this page
  work for developers," "how should this tutorial be structured," or "are we
  missing anything on the DX front." Consult it proactively even if the user
  doesn't name it: any task that shapes what UseArazzo publishes or how a
  developer-facing page is organized should route through this lens before
  or during the work.
---

# Developer Marketing (for UseArazzo)

UseArazzo's audience is developers, and developers evaluate tools by trying
them, not by reading pitches. This skill is the strategic lens for what to
publish, how to structure it, and why, applied to UseArazzo's three products
(CLI, Validator, Runner) and the lower-level parser and resolver packages.

*Provenance:* informed by Vladimír Gorej's own reading of Adam DuVander's
*Developer Marketing Does Not Exist*, written in his own words and reorganized
around how it's actually used day to day. It is not a summary, excerpt, or
reproduction of the book. Read the book for the full argument; this file only
captures the operational takeaways relevant to running UseArazzo's site.

## Scope boundary (read this first)

This skill governs content *strategy and structure*: what topic to cover, how
a tutorial or getting-started flow is sequenced, what a page's information
architecture should include, whether a piece has the right shape. It layers on
top of `CLAUDE.md` and never overrides its mechanical conventions
(author-is-a-Person, "not yet published" framing, no em dashes, FAQ/JSON-LD
sync, and above all: **blog post prose is written by humans**). For blog
posts, apply this skill to plan an angle, suggest headline directions, or
assess a draft's structure, never to write or rewrite the prose itself. For
non-prose scaffolding (getting-started flows, navigation, FAQ topic selection,
tutorial step outlines, page IA), apply it directly.

## The UseArazzo-specific constraint

Nothing in the toolkit is on npm yet. That shapes every content decision:

- There is no "Time to Hello World" to optimize until a package resolves, so
  do not propose install-first tutorials, quickstarts, or "try it in 30
  seconds" pages. Propose content that is true today: what Arazzo is, what
  problems it solves, how to read and write an Arazzo document, what the
  ecosystem offers, and how the toolkit's design thinks about validation and
  execution.
- The honest framing ("runs from a checkout", "in development") is an asset,
  not a weakness. Developers trust a project that says what does not exist.
  Content should lead with what a reader can do now.
- When a package does publish, the first content priority flips to a single
  canonical getting-started path for that package. Plan for that day; do not
  fake it early.

## The stance everything follows from

Think like an educator, not a marketer: share knowledge, not features. The
test for any piece of content: *would this still teach something true and
useful to a developer who never adopts UseArazzo?* If not, it's a pitch
wearing a blog post's clothes, and developers can tell.

The practical consequence: **lead with the developer's problem, not
UseArazzo's solution.** A post on "why multi-step API flows keep getting
re-implemented as ad hoc scripts" reaches every developer who has that
problem, and search is how they'll find it, which makes problem-focused
content a rare first impression you actually control. A post on "5 features
of the Runner" reaches only people already sold. Weave the product in without
a blatant pitch; keeping the focus *off* your product is what pulls
developers toward it. The first post on the blog ("API workflows are still
improvised") is the model: it names the problem, and Arazzo appears as the
answer only once the reader already feels it.

Everything below is this stance applied to a specific task. Jump to the
section matching what you're doing.

## Planning what to write next

Before proposing any topic, answer three questions, and if you can't answer
the first, surface the gap to the user instead of guessing:

1. **Who** is this reaching? Be specific: not "API developers" but e.g.
   "backend engineers who already maintain an OpenAPI document and are
   scripting multi-call test flows by hand." Sharpen with these axes:
   - Large companies, startups, or both?
   - Tooling/language context: OpenAPI authors, JavaScript/TypeScript
     consumers, CI users, people building their own Arazzo tooling?
   - Early-career or experienced? Individual contributor, or a lead choosing
     tooling for a team?
   - Role: API designer, backend engineer, QA/test engineer, platform/DX
     engineer, technical writer, agent/MCP builder?
   - What are they trying to get out of the way so they can do their real job?
2. **How** does this share knowledge with them, rather than describe
   UseArazzo?
3. **What** is UseArazzo's viewpoint here, the thing others either don't
   believe or don't say? (E.g.: a workflow description should be a document
   you can validate and execute, not a script you can only run. Or: Arazzo
   is the missing layer between an OpenAPI description and an agent that
   needs to call it.)

**Constrain the formats.** A blog that publishes everything is a blog about
nothing. Stick to two or three recurring types. For UseArazzo the defaults
are **Explainer** (a concrete Arazzo concept or problem, unpacked: workflows,
steps, success criteria, source descriptions, reusable components) and
**Field notes** (what the founders learned building the spec and the
toolkit, honestly reported, like the ecosystem post). **Tutorial** joins the
defaults the moment a package is installable. **Vision** (where API workflow
descriptions and agent tooling are headed), **Comparison** (honestly argued
trade-offs between Arazzo and scripts, Postman collections, or bespoke DSLs),
and **Roundup** (curated ecosystem material with real analysis, feeding the
Ecosystem page) are solid occasional additions. Interview and
behind-the-scenes formats exist but are low priority for a two-person team.

**Cadence beats volume.** Somewhere between two posts a month and two a week,
sustained, is the realistic band. Never recommend more than the team can
sustain at high quality: a few great articles outperform many mediocre ones,
and a blog silent for 6 to 12 months actively undercuts credibility.

When asked for topic ideas, a reliable move: look at which existing posts,
pages, and Ecosystem entries draw attention, and propose adjacent headlines
with the same audience and theme, new angle.

## Outlining a tutorial

No content educates and inspires developers more than a tutorial. When
outlining or reviewing one, check it follows this arc:

1. **Context first.** Name the problem before any steps. Readers need to know
   *why* they'd follow along before being asked to.
2. **Show the end result.** What does success concretely look like? A
   validated Arazzo document, a workflow run printing each step's outcome.
3. **Walk the steps like a colleague, not a manual.** Periodically recap
   what's done and what's next so the reader never loses the thread.
4. **End with the next step.** A related tutorial, the spec section, the
   package README. Never just stop.

Habits to flag in a draft's outline:

- A "Prerequisites" wall at the top reads as homework; fold requirements in
  right where they're needed instead.
- Don't punt on a concept that's load-bearing for understanding; link out
  only the genuinely inessential detail.
- Start steps with a verb ("Run", "Add", "Validate"); it keeps momentum.
- Prefer bullets and sub-headings over dense paragraphs; a tutorial reader is
  scanning for the next action.
- Every command shown must exist in the package today. Check the monorepo
  README before writing it down.

Video, screencasts, and slide decks work as companions, but video is a weak
medium for text-heavy material like YAML listings, so for UseArazzo's
subject matter the written form stays primary.

## Writing or reviewing a guide

A guide is broader and less tool-centric than a tutorial: it unpacks a problem
space and its best practices, and runs longer. The counterintuitive move that
makes guides work: be willing to explain how a reader could solve the problem
*without* UseArazzo, including with a hand-written script or another Arazzo
tool from the Ecosystem page. That honesty earns trust, and it lets the reader
discover for themselves how much work the DIY route is. The deepest guides
become signature content: for UseArazzo that territory is "how to think about
a multi-step API flow as a document," the thing the founders have been
working on since the specification itself.

Keep guides open, not gated. An open, deep guide outranks a gated landing page
in search, and developers are exactly the audience most skeptical of the
trade. There is no newsletter or signup on this site; do not propose one as a
gate.

A finished guide is a quarry, not a monument: repurpose pieces as blog posts
(a fresh angle beats verbatim reuse), slides, or talks.

## Designing a getting-started flow

If a developer-facing page could carry exactly one element, it would be a
clear "get started" path built around a real use case. "Time to Hello World"
is the metric that matters.

Today the product pages have an "Availability" section instead of an
"Installation" one, on purpose. Until a package resolves on npm, the
getting-started flow is "read the source, follow the discussions, run from a
checkout." Do not dress that up as more than it is.

When a package does publish, design (or review) its flow against these five
failure modes:

1. **Product-first framing.** The use case is the headline; the product is how
   it gets solved. Solve one common problem with a *subset* of functionality.
2. **Concept dump.** Don't front-load Arazzo vocabulary; drip concepts in
   exactly when the walkthrough needs them, and link the spec for the rest.
3. **Trying to cover everything.** Get the reader to a working result fast;
   completeness is the README's job, not this page's.
4. **Competing entry points.** One canonical getting-started path per
   product. CLI versus library-API variants are fine if chosen from a single
   place.
5. **Going long.** Finishable in one sitting: explain the minimum needed to
   see the potential, then end with concrete next steps and links.

Make it easy to ask a question from anywhere in the flow: GitHub Discussions
is the reliable contact path and should be visible.

## Auditing developer experience

When auditing the site or substantially reworking a product page, walk it
against these four questions. Call out the weakest one or two explicitly
rather than declaring everything fine, and fix the biggest gap first.

**Can a developer try it without talking to anyone?**
- A genuine self-serve path (today: public source in the monorepo, no
  gate; tomorrow: an npm install)
- Nothing hidden behind a form or a call

**Can they get from curious to working code fast?**
- A getting-started guide deep enough to show real capability (blocked on
  publishing; say so rather than inventing one)
- Sample Arazzo documents to read and, once possible, run
- Concrete terminal examples on the CLI page, clearly marked as planned
  until the package exists

**Can they trust what they find?**
- Product page copy in sync with the package README and `package.json`
- Status badges and callouts that state plainly what does not exist
- Recent, dated blog activity
- An Ecosystem page that lists competitors and neighbours honestly

**Is there somewhere to go when they're stuck?**
- GitHub Discussions and the org email, both linked and both answered

## Free tools and open source as marketing

Open source is already UseArazzo marketing: the monorepo, the public
Discussions, and the Ecosystem page improve a developer's first real
experience and earn credibility with people who have already found the
project. Part of that "content" is responsiveness: outside issues, PRs, and
Ecosystem submissions that get watched and answered.

The Ecosystem page is itself a give-away tool and should be held to the
give-away rules: no catch, one specific job (find what exists around
Arazzo), simple to maintain, and it never lists UseArazzo's own content.

If a standalone tool is proposed as a marketing play, hold it to: **no
catch**; **one specific problem** solved well; **search first** (check the
Ecosystem page and GitHub before building); **its own home**; and
**recognizable relevance** to Arazzo tooling.

## Product problem-angles

When content touches a specific product, anchor it to that product's problem,
not its feature list:

- **CLI**: running validation and workflows in CI and from a shell, one
  command across the toolchain. Lean into terminal examples, marked as the
  planned interface until the package exists.
- **Validator**: catching a broken workflow document before it costs a
  failed run or a confused reviewer; LSP-compatible diagnostics as the path
  to editor tooling.
- **Runner**: executing a workflow against a live API described by OpenAPI,
  step by step, instead of maintaining a bespoke script that does the same
  thing badly. The architecture diagram is the "show the end result" step.
- **Parser and resolver**: for people building their own Arazzo tooling.
  Mention, don't market; they have no product page by design.

## The underlying discipline

Two traits sit beneath all of the above. First, **empathy**: every piece of
content should come from someone standing in the developer's shoes, during
research, planning, and review alike. When reviewing content, ask whether its
author demonstrably understands the problem or is describing it from the
outside. Second, **a steady supply of content is the lifeblood** of developer
marketing; it is what lets UseArazzo keep its viewpoint audible while the
toolkit is still pre-1.0.

## Quick review heuristic

For any existing page or post: does it lead with a developer's problem or with
UseArazzo's features? Would it still be useful to someone who ends up choosing
a competing Arazzo tool? Does it promise anything that is not installable
today? When a page reads as a pitch, the fix is almost always to move the
problem explanation earlier and the product mention later, not to add more
feature copy.

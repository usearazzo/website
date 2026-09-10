# Concept Catalog

A living list of the durable content themes UseArazzo can write about.
This is deliberately a different kind of list than a content calendar
(which would track individual pieces and their scheduled dates) — there
isn't one of those today, and this file isn't trying to become one. Each
entry below groups more than one potential piece of content under one
theme, so a single package or idea gets a body of content over time
instead of one-off, scattered posts.

See the `content-strategy` skill (`.claude/skills/content-strategy/`) for
the reasoning behind this structure.

**How to use this file:**
- Each concept gets a short brief: why it matters, what it covers, how it
  connects to UseArazzo.
- Add new concepts as they're found (mindhunting, keyword research,
  audience questions); don't wait for a "good enough" moment.
- Pull individual topics and headlines from a concept's brief and backlog
  when it's time to actually plan a piece; run each candidate through the
  Problem/Angle/Teach test before committing to it.
- A concept for an unpublished package stays in **planning-only** status:
  brief and backlog are fine to build now, but don't draft or publish
  guide/tutorial/reference content for it until the package is real, per
  `CLAUDE.md`'s "no concrete versions until it's real" rule.

---

## API Workflows: The Core Concept

**Status:** Live — no package required, this is pure problem-space content.

**Why it matters:** Every other concept in this catalog (parsing,
validating, running, resolving) assumes the reader already understands why
a sequence of API calls, with state, branching, and success criteria
carried across steps, is a fundamentally different thing from a single API
call. That distinction is rarely spelled out anywhere, which makes it a
genuine, underserved angle rather than a rehash of "what is an API"
(deliberately not a concept here: too broad, no distinctive position, and
it doesn't reach UseArazzo's actual audience, who already know what an API
is).

**What it covers:** What makes something a "workflow" instead of a call;
why state and step-to-step dependencies are the hard part; why treating a
workflow as a document (something you can validate and inspect) beats
treating it as a script (something you can only run).

**How it connects to UseArazzo:** It's the conceptual setup for the entire
toolkit, and the natural companion to the first blog post ("API Workflows
Are Still Improvised"), which asserts the problem without fully defining
the term.

**Backlog / candidate topics:**
- A definitional piece: what an API workflow is, worked through with a
  concrete multi-step example (e.g., create a resource, then use its ID in
  a follow-up call), contrasted with a single API call.
- **A landscape piece on pre-Arazzo API workflow tooling**: list the
  approaches people used to orchestrate multi-step API calls before a
  format like Arazzo existed (Postman/Newman collections chaining
  requests, hand-written scripts, other request-chaining or orchestration
  tools), show concretely how each one works, and compare that to
  Arazzo's document-based approach. This is about tools that predate or
  exist independently of Arazzo, not other Arazzo-spec tooling. Verify
  every tool mentioned actually works the way the piece claims before
  publishing, the same diligence the Ecosystem page's entries already get.

---

## Parsing

**Status:** Live. `@usearazzo/parser` is published on npm.

**Why it matters:** Parsing is the first thing anyone building their own
Arazzo tooling has to solve, and it's the one place in the toolkit where
the audience is explicitly people writing code against Arazzo documents,
not just running them.

**What it covers:** Turning an Arazzo document (and the source
descriptions it references) into a usable in-memory structure; the source
descriptions that get pulled in along the way, including cycles between
them; error reporting when a document doesn't parse.

**How it connects to UseArazzo:** It's the foundation the CLI, Validator,
and Runner are all built on, and the one package other people building
their own tooling would reach for directly.

**Existing pieces:** the parsing guide (`_guides/`), the "List Every
Document an Arazzo Workflow Depends On" tutorial (`_tutorials/`), the
parser reference page (`_reference/`), the npm announcement field-notes
post.

**Backlog / candidate topics:**
- **"Build Your Own Arazzo Parser" series** — the strongest DIY-instinct
  content in the catalog, written honestly enough that the real complexity
  shows, not a simplified toy version that makes it look easy:
  1. Reading and validating the raw document shape: what an Arazzo
     document actually contains, and the first decisions a parser has to
     make about it.
  2. Resolving source descriptions and handling cycles between them: the
     part that looks simple until a document references another document
     that references it back (the real bug class behind
     usearazzo/arazzo-toolkit#139/#142).
  3. Surfacing useful errors: why a parse failure needs to say *where* and
     *why*, not just that it failed (the design problem behind
     `ParseError` and #140/#141).
  Each part should end with what the real parser does differently from
  the reader's first working version, not just what it does.

---

## Validating

**Status:** Planning-only. `@usearazzo/validator` is not yet published.

**Why it matters:** This is the point where a broken workflow document
gets caught before it costs a failed run or a confused code reviewer, and
where LSP-compatible diagnostics become the path to real editor tooling.

**What it covers:** Semantic validation and linting for Arazzo documents,
beyond what a JSON Schema check alone would catch; diagnostics shaped for
editors and CI, not just a pass/fail result.

**How it connects to UseArazzo:** It's the second of the three products,
and the natural next concept to build out once it publishes, using the
Parsing concept as the template (guide + tutorial + reference together).

**Backlog / candidate topics (do not draft until published):**
- A guide-stage (pre-publish) piece on what "semantic" validation catches
  that schema validation alone doesn't — this one *can* be written now,
  since it doesn't require the package to exist, only honest explanation
  of the problem space.
- Once published: a getting-started tutorial for validating a real Arazzo
  document and reading the diagnostics.
- Once published: how the LSP-compatible diagnostics map to editor
  tooling, aimed at people building editor integrations.

---

## Running

**Status:** Planning-only. `@usearazzo/runner` is not yet published.
(Its `package.json` carries `"private": true` as a publish guard only —
never describe the source itself as private; it's public in the monorepo.)

**Why it matters:** This is where a hand-maintained script that calls an
API step by step gets replaced with a document that can be validated,
run, and inspected after the fact.

**What it covers:** Executing an Arazzo workflow against live APIs
described by OpenAPI source descriptions, step by step, including
cross-document workflow references via
`$sourceDescriptions.<name>.<workflowId>`.

**How it connects to UseArazzo:** The third product, and the one the
architecture diagram on `/runner/` already explains visually; content here
can lean on that diagram as the "show the end result" step.

**Backlog / candidate topics (do not draft until published):**
- **"Build Your Own Arazzo Runner" series** — the guide-stage (pre-publish)
  companion to the parser series; doesn't need the package to exist to
  write honestly, since it's about the real problems, not the package:
  1. Executing a single step against a live API described by an OpenAPI
     source description: the easy part, and where it stops being easy.
  2. Carrying state between steps: passing one step's outputs into a
     later step's inputs across an entire workflow.
  3. Success criteria and branching: deciding whether a step succeeded,
     and what the workflow does next when it didn't.
  4. Retries and the run trace: how many attempts a step took, which
     action got selected, and reporting that back once the workflow ends.
  Once the package publishes, add a fifth part on cross-document workflow
  references (`$sourceDescriptions.<name>.<workflowId>`), and a separate
  getting-started tutorial that runs a real workflow end to end using
  `@usearazzo/runner` itself rather than a hand-rolled version.

---

## Resolving (source descriptions)

**Status:** Live but unpublished by design. `@usearazzo/resolver` has no
product page (per `CLAUDE.md`, it's for people building their own Arazzo
tooling, not a product to market) and is referenced only in "Built With"
sections, the docs hub, and `llms.txt`.

**Why it matters:** Dereferencing and resolving source descriptions is a
real, separate problem from parsing, and it's exactly the kind of
lower-level detail the audience building their own tooling cares about
even though it will never get a marketing page.

**What it covers:** Resolving relative and absolute source description
references, `resolve.baseURI` behavior, the working-directory resolution
fix tracked in usearazzo/arazzo-toolkit#147/#148.

**How it connects to UseArazzo:** Mention, don't market, per the product
page conventions; content here is closer to engineering notes than to a
pitch.

**Backlog / candidate topics:**
- A field-notes style piece on the relative-path resolution bug and fix
  (#147/#148), in the same honest, technical voice as the parser's own
  field-notes post.

---

## CLI (cross-cutting)

**Status:** Design-sketch only. `@usearazzo/cli` does not exist yet in
`arazzo-toolkit/packages/`.

**Why it matters:** It's the one-command-across-the-toolchain story, and
the concept that ties Parsing, Validating, and Running together for
someone who just wants a command line, not a library.

**What it covers:** `validate` and `run` as a single interface built on
the Validator and Runner libraries underneath.

**How it connects to UseArazzo:** Genuinely "Built With" the other two
products, unlike Validator or Runner's pages (where that framing was
backwards).

**Backlog / candidate topics:** none yet — too early; revisit once
Validator or Runner publishes and the CLI has something real underneath it
to describe.

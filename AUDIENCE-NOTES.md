# Audience Notes

Reference notes about UseArazzo's audience, kept separate from
[`CONCEPT-CATALOG.md`](./CONCEPT-CATALOG.md) on purpose: this file is
research input (what the audience already knows and is up against), the
catalog is content output (what to write about). Update this file as
research turns up more; pull from it when writing or reviewing a brief in
the catalog.

See the `content-strategy` skill (`.claude/skills/content-strategy/`) for
the reasoning behind this structure (its "Mindhunting" and "Lingua Franca"
sections in particular).

---

## Who the audience is

Two audiences, ordered by what is published today. A piece names which one
it is for before it gets an angle. A piece that tries to reach both usually
reaches neither.

**These definitions are hypotheses** (drafted 2026-09-18 from what the
toolkit does, before there was much of an audience to observe). Revise them
as real people interact with the content: log each signal under "Observed"
below, and change a definition when several independent signals agree, not
on one data point.

### 1. Tool builders (primary while only the parser is on npm)

Developers writing code *against* Arazzo documents: editor plugins,
linters, generators, documentation renderers, agents.

- **Roles:** tooling, platform, and DX engineers; open-source maintainers
  of API tooling. Experienced, individual contributors, comfortable
  reading a spec.
- **What they are trying to get out of the way:** reading an Arazzo
  document and everything it references into a structure they can trust,
  so they can get on with the tool they actually set out to build.
- **How they solve it today:** `yaml.parse` plus hand-rolled handling of
  source descriptions, references, and errors.
- **Served by:** `@usearazzo/parser` (and the resolver), guides,
  tutorials, the reference, Field notes posts. The only audience that can
  be given runnable content today.
- **Assume they know:** OpenAPI, JSON Schema, TypeScript, Node.js. Assume
  they do not know UseArazzo exists, and may know Arazzo only by name.

### 2. Workflow practitioners (primary once Validator, Runner, CLI publish)

Engineers who already maintain an OpenAPI description and script the
multi-call flows that exercise it by hand.

- **Roles:** backend, QA/test, and platform engineers; API designers. Often
  a lead choosing tooling for a team and a CI pipeline.
- **What they are trying to get out of the way:** keeping multi-step API
  flows correct and repeatable without maintaining a pile of scripts.
- **How they solve it today:** the DIY Competitors list below.
- **Served by:** the product pages and Explainer posts (problem-space
  content that needs no package). No tutorials for them until a package
  resolves on npm.
- **Assume they know:** OpenAPI, Postman, CI. Assume they do not know
  Arazzo.

### Not the audience (yet)

- **Agent and MCP builders:** nothing on the roadmap for them is built.
  Revisit when it is.
- **People learning Arazzo as a specification:** the Ecosystem page points
  them at the spec and external material; the site does not teach the spec.
- **Non-technical buyers:** there is nothing to buy.

### Observed

One line per signal: date, where (issue, Discussion, social reply,
analytics), who (role, not name), which audience they fit or that they fit
neither. Empty so far.

### Open, to fill from real people rather than guesses

- Who has actually engaged so far (toolkit issues, Discussions, replies to
  social posts), and which of the two audiences were they?
- Company size and whether the chooser is the user.
- Where each audience goes first for a technical answer.

---

## Lingua Franca

The tools, standards, and languages UseArazzo's audience already speaks.
Framing future content in these terms, rather than reinventing vocabulary
per piece, is the point of keeping this list.

- **Standards:** OpenAPI, JSON Schema, the Arazzo specification itself.
- **Language and runtime:** TypeScript and JavaScript, Node.js.
- **Protocols and interfaces relevant to the roadmap:** the Language
  Server Protocol (the Validator's diagnostics depend on this), and, once
  built, MCP for agent tooling.
- **Adjacent tools:** Postman and Insomnia, OpenAPI editors and linters,
  CI runners.

Update this list as roadmap items in the org profile README move from idea
to built, rather than guessing ahead of the code.

---

## DIY Competitors

What UseArazzo is actually up against for most of its audience isn't a
named competing product, it's a developer's own script. Naming these
explicitly is what makes it possible to teach that path honestly instead
of vaguely gesturing at "doing it yourself."

- **Hand-written, multi-call test scripts** that call an API step by step,
  with no shared document describing the flow.
- **Postman or Newman collections** used as a de facto workflow engine,
  chaining requests together outside of what they were originally built
  for.
- **Bespoke orchestration DSLs or internal tooling**, built in-house to
  solve the same sequencing problem Arazzo documents solve.

Feeds directly into the "API Workflows: The Core Concept" and "Build Your
Own Arazzo Parser / Runner" backlog items in `CONCEPT-CATALOG.md` — this
list is the honest starting point for that content, not a set of
competitors to argue against.

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

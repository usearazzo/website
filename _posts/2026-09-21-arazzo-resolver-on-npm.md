---
title: "@usearazzo/resolver Is on npm. Here Is What It Took"
description: "The second UseArazzo package is published, as an alpha. Why resolving references is three jobs, why a schema's identity is not its location, and the ten fixes it took in the layer underneath."
date: 2026-09-21
image:
  path: /assets/images/blog/arazzo-resolver-on-npm.png
  webp: /assets/images/blog/arazzo-resolver-on-npm.webp
  width: 1200
  height: 630
  alt: "Three stacked rounded slabs on a dark green ground; the bottom two are solid bright green and lit, the middle one holding three square nodes joined by a solid and a dotted line, and the top one is a dashed outline"
  caption: "Two layers lit now. The second one follows the links."
---

The second package from the UseArazzo toolkit is on npm: [@usearazzo/resolver](https://www.npmjs.com/package/@usearazzo/resolver), as an alpha. The [parser]({{ '/blog/arazzo-parser-on-npm/' | relative_url }}) reads an Arazzo document and leaves every reference in it exactly as written. The resolver is the package that follows them: `$ref`s, JSON Schema references, and the Reusable Objects that point into `components`, in Arazzo documents and in the OpenAPI documents they name.

```bash
npm install @usearazzo/resolver
```

The place to start is the [Arazzo Resolver API reference]({{ '/docs/resolver/' | relative_url }}). It covers every function, option, and error, and every output on that page came from a real run.

The rest of this post is about why "resolving" turned out to be three different jobs, and about the ten fixes it took in the layer underneath, in dereferencing and bundling both.

## Three jobs behind one word

Ask three tool builders to "resolve the references" and you get three different programs. So the resolver has three operations, and the first decision you make is which one you need.

- **Dereference** replaces every reference with the content it points at. You get a document with no references left. This is what you want before executing a workflow, which is why the [Runner]({{ '/runner/' | relative_url }}) depends on this package.
- **Bundle** copies every external target into the entry document. You get one self-contained file that still reads like the original, references and all.
- **Resolve** leaves the references alone. It fetches and parses every document they reach, and hands you the set. This is what you want when the reference graph itself is the subject, for example to list every file a workflow depends on.

Why is this a separate package, and not an option on the parser? Because following a reference means file system and network access, caching, and cycle rules of its own. A parser that did all of that on every call would be the wrong tool for an editor that just wants a tree. The [Parsing Arazzo Documents]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}#not-parsing) guide draws that line: a parser reads, a resolver dereferences.

## Identity is not location

The thing that took longest to get right is one idea, and it sits under dereferencing and bundling alike.

I started out thinking a reference points at a place: a file, and a path inside it. For the Reference Objects of OpenAPI 2.0 and 3.0 that is true, and both operations are simple. Dereferencing reads the place. Bundling copies it into `components` and points the reference at the copy.

JSON Schema 2020-12 changes it, and both OpenAPI 3.1 and Arazzo use it. A schema can declare its own identity with `$id`. Every relative `$ref` inside it resolves against that identity, not against the file it happens to sit in. So a resolver needs an index of identities, and that index has to stay right while the document changes under it.

Dereferencing reads that index. Bundling rewrites the document the index describes, so it is where most of the trouble showed up. Bundling is not copying. It is **relocating**, and relocating a schema changes what every relative reference around it means. One sentence sums it up: a bundle is only a bundle if you can move it. If the output still needs the directory it was made in, or the network, it is not self-contained, whatever it looks like.

## What it took upstream

The resolver stands on [SpecLynx ApiDOM](https://github.com/speclynx/apidom), which I also maintain, and that is where almost all of the work went. Ten issues, closed in two patch releases over four days.

It started with a review comment. The pull request that [prepared the package for publishing](https://github.com/usearazzo/arazzo-toolkit/pull/157) came with a bundle fixture, and a comment on its expected output pointed out that the output was wrong. The fixture had enshrined the bug. That became [toolkit #158](https://github.com/usearazzo/arazzo-toolkit/issues/158), and pulling on it unravelled the rest.

In bundling:

- **A schema with its own `$id` was embedded, and then nothing pointed at it.** The file was fetched as `./inputs.json` but called itself `https://example.com/schemas/inputs.json`. The bundler embedded it under its own name and left the `$ref` as written, so the reference dangled. Now the `$ref` is rebased onto the embedded `$id` ([#530](https://github.com/speclynx/apidom/issues/530)).
- **A schema without an `$id` got an absolute path from my machine as one.** The bundler assigned the retrieval URI, which for a file is an absolute path. The bundle leaked a machine-specific path and only worked in the directory it was made in. It now gets an `$id` relative to the entry document ([#531](https://github.com/speclynx/apidom/issues/531)).
- **Everything broke as soon as a schema lived in a subdirectory.** Components inserted during the walk were visited again, with the entry document's base URI. Every existing fixture kept all its files in one directory, which is exactly what hid it ([#535](https://github.com/speclynx/apidom/issues/535)).
- **Hoisting a Response or a Parameter out of another OpenAPI 3.1 document lost its schemas.** Relative schema `$ref`s inside it were carried along with the wrong base ([#537](https://github.com/speclynx/apidom/issues/537)). A schema it named elsewhere in the same document was never brought along ([#546](https://github.com/speclynx/apidom/issues/546)).

In the `$id` lookup that dereferencing and bundling share:

- **The `$id` index was a snapshot.** Lookups went through metadata recorded once, at parse time, and the list was cached. Any `$id` assigned or changed afterwards was invisible. Worse, a schema with no identifiers matched any URI. Lookups now walk the real elements ([#536](https://github.com/speclynx/apidom/issues/536), [#540](https://github.com/speclynx/apidom/issues/540)).
- **A schema inside a referenced fragment could not find itself.** A Response in another file held a schema with an absolute `$id` and a `$ref` to its own `$defs`. The `$id` was never indexed, so both operations fell back to fetching that `$id` over HTTP ([#541](https://github.com/speclynx/apidom/issues/541)).

All of that shipped in [one ApiDOM release](https://github.com/speclynx/apidom/releases/tag/v5.2.5), and the resolver was published the next day.

Then I wrote the reference page, ran every sample, and two more things broke. Both are in dereferencing.

- **`continueOnError` did not cover Reusable Objects.** A linter wants to process everything that works and report the rest. One bad `reference: $components.parameters.missing` still threw ([#550](https://github.com/speclynx/apidom/issues/550)).
- **Source descriptions came back as the wrong document.** Through the `Element` functions and both resolve functions, the `petstore` entry held the Arazzo document again, not the OpenAPI document it names ([#551](https://github.com/speclynx/apidom/issues/551)).

Both were fixed in [the next release](https://github.com/speclynx/apidom/releases/tag/v5.2.6), a day later, and the published resolver carries it. Both reproductions now pass against the package from npm.

Two are still open, both in dereferencing, and neither blocks normal use. A schema `$ref` cannot be served from a pre-computed set when every resolver is switched off ([#554](https://github.com/speclynx/apidom/issues/554)), and the `location` of an error inside a referenced document repeats a fragment ([#555](https://github.com/speclynx/apidom/issues/555)).

The lesson from the parser was that the samples in the docs are the best test suite a package has. That held again: two of the ten came from writing the reference. The new lesson is about fixtures. A fixture whose files all sit in one directory tests nothing about location, and location is the whole problem. And a saved expected output proves only that the output has not changed, never that it was right. The `bundled.json` that started all this was the bundler's own broken output, saved and then asserted against. The test was green the whole time.

## What alpha means here

Alpha means the API can still move before 1.0. Concretely:

- The surface is ten functions: dereference, bundle, and resolve, each for Arazzo and for OpenAPI, with `Element` variants for dereference and resolve that take a tree you already parsed. Only whole documents bundle.
- A dereferenced result is not a tree. Each reference site gets its own top-level element, but everything beneath it is shared, so treat it as a graph. A change made under one reference site shows up under the others.
- Option names follow ApiDOM's: `resolve`, `parse`, `dereference`, `bundle`. The Runner is the only consumer so far, so they may still move as other tools start using the package.
- The same versions as the parser: Arazzo 1.0.0, 1.0.1, and 1.1.0, with OpenAPI 2.0, 3.0.x, and 3.1.x. OpenAPI 3.2 and AsyncAPI are not supported yet.

The feedback I want most is the same as before, from people building their own Arazzo tooling: what did you have to work around, and what did you need that is not there? [Discussions](https://github.com/orgs/usearazzo/discussions) is the place, and the [monorepo](https://github.com/usearazzo/arazzo-toolkit) is where the issues go.

## What comes next

The Validator and the Runner are both in development and both unpublished. They now stand on two published layers, not one: a parser that reads, and a resolver that follows.

Until then, the resolver is there to be used. Start with the [Arazzo Resolver API reference]({{ '/docs/resolver/' | relative_url }}), bundle something that lives in more than one directory, move the result somewhere else, and tell me what breaks.

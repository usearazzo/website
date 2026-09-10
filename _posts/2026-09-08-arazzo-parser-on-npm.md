---
title: "@usearazzo/parser Is on npm. Here Is What It Took"
description: "The first UseArazzo package is published, as an alpha. Why the parser went out before the Validator and the Runner, what writing its docs turned up, and what alpha means here."
date: 2026-09-08
image:
  path: /assets/images/blog/arazzo-parser-on-npm.png
  webp: /assets/images/blog/arazzo-parser-on-npm.webp
  width: 1200
  height: 630
  alt: "Three stacked rounded slabs on a dark green ground; the bottom one is solid bright green and lit, the two above it are dimmer outlines"
  caption: "The bottom layer ships first. Everything else stands on it."
---

The first package from the UseArazzo toolkit is on npm: [@usearazzo/parser](https://www.npmjs.com/package/@usearazzo/parser), as an alpha. It reads Arazzo documents, the OpenAPI documents they point at, and the two small languages that live inside Arazzo strings, runtime expressions and criterion conditions. It is the reading layer everything else in the toolkit stands on.

```bash
npm install @usearazzo/parser
```

If you want to see it do something before reading further, the [first tutorial]({{ '/docs/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}) builds a sixty-line script that lists every document a workflow depends on. It runs against the published package as-is.

The rest of this post is about why this package went first, and what I learned getting it out the door.

## Why the parser, and not the Validator or the Runner

A few weeks ago I wrote that [API workflows are still improvised]({{ '/blog/api-workflows-are-still-improvised/' | relative_url }}) and that UseArazzo is building the tooling to change that. The tools people actually want are the [Validator]({{ '/validator/' | relative_url }}) and the [Runner]({{ '/runner/' | relative_url }}). Nobody wakes up wanting a parser.

But both of those tools need the same three things from the document before they can do their job. They need to know what every node *is*: that a string in a `value` field is a runtime expression and not just text, that `steps` is a list of Step Objects and not a bag of maps. They need to know *where* every node is, line and column, because a diagnostic without a position is a riddle and a run failure without one is a support ticket. And they need every document the workflow reaches, since a step can call an operation in one OpenAPI description and a workflow in another Arazzo document, each with source descriptions of its own.

The Runner already had its own expression parsing, and the Validator needs the same trees. Shipping either of them first would have meant shipping the same parser twice, privately, and fixing every bug in two places. So the parser came out alone, with its API documented. The Runner was [moved onto it](https://github.com/usearazzo/arazzo-toolkit/pull/134) before the alpha was cut, and the Validator already depends on it.

There is a second reason. The [Arazzo Ecosystem]({{ '/ecosystem/' | relative_url }}) page lists more than twenty tools, and most of them started the same way: someone loaded a YAML file and got to work. I would rather the next editor plugin, linter, or agent integration not have to start from a YAML loader. A parser that is a dependency, not a product, is a better contribution to that ecosystem than a product would be.

## What the document is

The thing that took longest to get right is not any one feature. It is a shift in what I thought I was parsing.

I started out thinking of an Arazzo document as a file. It is not. It is several languages in one file: YAML or JSON on the outside, runtime expressions inside the strings, a condition grammar inside the criteria, JSON Pointer inside the expressions, JSON Schema for the inputs. And it is one file in a network: its source descriptions point at OpenAPI documents and at other Arazzo documents, and those point onwards. What a workflow means is spread across that network, so a parser that stops at the file has not finished.

The [Parsing Arazzo Documents]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}) guide is the long version of that argument. What matters for this post is that once I took the network seriously, the bugs showed up on their own.

## What writing the docs turned up

Every bug fixed in the fortnight before the release was found by writing documentation, not by writing code. I sat down to write the guide, ran every sample in it against the package, and four things broke.

- **Shared documents looked like cycles.** Two workflow documents naming the same OpenAPI description is the normal case, not a loop. The parser treated the second reference as a cycle, cut it, and dropped the parsed document on the floor. Fixed in [#142](https://github.com/usearazzo/arazzo-toolkit/pull/142): a document reached twice is parsed once, and every later reference points at the first parse.
- **The in-memory resolver served the wrong document.** Inline content is parsed under a synthetic `memory://` URI, and the resolver serving it answered for *any* `memory://` URI, so a relative source description that could not be found came back as the parent document itself. Fixed in [#136](https://github.com/usearazzo/arazzo-toolkit/pull/136).
- **Inline input had nowhere to resolve from.** If you hand the parser a string or an object, a relative source description URL has no base to resolve against. `resolve.baseURI` now supplies one, in [#138](https://github.com/usearazzo/arazzo-toolkit/pull/138).
- **`ParseError` was not exported.** You could catch it, but not by type. [#141](https://github.com/usearazzo/arazzo-toolkit/pull/141).

Then I wrote the tutorial, ran its script, and found a fifth: pass a *relative* file path and the parser read the file fine, but resolved the source descriptions against the relative string as if it were a URL path. Reported as [#147](https://github.com/usearazzo/arazzo-toolkit/issues/147) and fixed in [#148](https://github.com/usearazzo/arazzo-toolkit/pull/148) the same day: a relative path now resolves against the working directory, in the parser, the resolver, and the Runner's document registry alike.

I am not embarrassed by the list. Four of the five are about the network, and they are exactly the bugs you would expect from a parser written by someone who thought of a document as a file. The lesson I am taking is procedural: the samples in the docs are the best test suite the package has, because they are the tests a user would write.

## What alpha means here

Alpha means the API can still move before 1.0. Concretely:

- The four functions, `parseArazzo`, `parseOpenAPI`, `parseRuntimeExpression`, and `parseCriterionCondition`, and their result shapes are what I intend to keep. The [API reference]({{ '/docs/parser/' | relative_url }}) documents every option and every error they produce, and was checked against the type declarations and the source, not the README.
- Option names under `parse.parserOpts` may change as the Validator starts consuming the package and wants things the Runner did not.
- The documents come back as [SpecLynx ApiDOM](https://github.com/speclynx/apidom), which I also maintain. That is a dependency you are taking on, and it is not going anywhere.
- Arazzo 1.0.0, 1.0.1, and 1.1.0 documents parse. OpenAPI 2.0, 3.0.x, and 3.1.x source descriptions parse. OpenAPI 3.2 and AsyncAPI source descriptions do not yet.

The feedback I want most is from people building their own Arazzo tooling: what did you have to work around, and what did you need that is not there? [Discussions](https://github.com/orgs/usearazzo/discussions) is the place, and the [monorepo](https://github.com/usearazzo/arazzo-toolkit) is where the issues go.

## What comes next

The Validator and the Runner are both in development and both unpublished. Each will get the same treatment: docs written against the code, samples run before release, a tutorial the day it lands, and a post like this one saying what it took.

Until then, the parser is there to be used. Start with the [tutorial]({{ '/docs/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}), read the [guide]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}) if you want to know why it is shaped the way it is, and tell me what breaks.

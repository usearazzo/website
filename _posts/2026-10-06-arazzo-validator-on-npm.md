---
title: "@usearazzo/validator Is on npm. Here Is What It Took"
description: "The third UseArazzo package is published, as an alpha. Why an empty list of diagnostics has to mean something, and what it took to get there."
date: 2026-10-06
image:
  path: /assets/images/blog/arazzo-validator-on-npm.png
  webp: /assets/images/blog/arazzo-validator-on-npm.webp
  width: 1200
  height: 630
  alt: "Three stacked rounded slabs on a dark green ground, all three solid bright green and lit; the top one holds a check mark beside a solid line and a dotted line"
  caption: "Three layers lit. The top one checks what the other two read."
---

The third package from the UseArazzo toolkit is on npm: [@usearazzo/validator](https://www.npmjs.com/package/@usearazzo/validator), as an alpha. The [parser]({{ '/blog/arazzo-parser-on-npm/' | relative_url }}) reads an Arazzo document. The [resolver]({{ '/blog/arazzo-resolver-on-npm/' | relative_url }}) follows its references. The validator tells you what is wrong with it, before a workflow runs and fails halfway through.

```bash
npm install @usearazzo/validator
```

This post is about one idea. When the validator reports nothing, your document has to be fine. Most of the work before publishing went into making that true.

## How do I use it?

Let me show you the simplest use. Point it at a file, keep the errors, and fail when there are any:

```js
import { validateURI, DiagnosticSeverity } from '@usearazzo/validator';

const diagnostics = await validateURI('./adopt-a-pet.arazzo.yaml');
const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);

for (const { range, message } of errors) {
  console.log(`${range.start.line + 1}:${range.start.character + 1}  ${message}`);
}
console.log(`${errors.length} errors`);
process.exitCode = errors.length > 0 ? 1 : 0;
```

Here is `adopt-a-pet.arazzo.yaml`. The two steps on lines 16 and 19 are both called `find-pet`:

```yaml
arazzo: 1.0.1
info:
  title: Adopt a pet
  summary: Find a pet and adopt it.
  description: Find an available pet in the store and adopt it.
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    url: ./petstore.openapi.json
    type: openapi
workflows:
  - workflowId: adopt-a-pet
    summary: Adopt a pet.
    description: Find an available pet and adopt it.
    steps:
      - stepId: find-pet
        description: Find an available pet.
        operationId: findPetsByStatus
      - stepId: find-pet
        description: Adopt the pet.
        operationId: updatePet
```
{: .numbered}

Run the script, and it finds both:

```text
16:9  Every step must have a unique 'stepId' within a workflow.
19:9  Every step must have a unique 'stepId' within a workflow.
2 errors
```

Why the `+ 1`? Diagnostics count lines and characters from 0, the way editors do.

Already holding the text, say in an editor or a test? Then skip the file and use `validate`:

```js
import { validate, createTextDocument } from '@usearazzo/validator';

const textDocument = createTextDocument('file:///home/you/adopt-a-pet.arazzo.yaml', yamlText);
const diagnostics = await validate(textDocument);
```

From there, the place to go is the [Arazzo Validator API reference]({{ '/docs/validator/' | relative_url }}). It covers every function, option, and error, and all 251 rules, with each message quoted exactly as the validator reports it.

## What do you get back?

Each line the script printed is one diagnostic. Here is the first one in full:

```json
{
  "range": { "start": { "line": 15, "character": 8 }, "end": { "line": 17, "character": 37 } },
  "severity": 1,
  "code": 9040403,
  "source": "apilint",
  "message": "Every step must have a unique 'stepId' within a workflow."
}
```

As you can see, this is a [Language Server Protocol diagnostic](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic). VS Code and every other LSP client already know how to render it. So the same output works in an editor, in a script, and in CI. Nothing needs translating.

Notice that nothing was thrown. A problem in the document is always a diagnostic. The validator throws only when it cannot read the document at all. Then you get a typed `ValidateError`, with the original error on `cause` ([toolkit #201](https://github.com/usearazzo/arazzo-toolkit/pull/201)). So there are exactly two outcomes: a list, or the news that the document never arrived.

Why does it matter? Because of what people do with the list. They count the errors, and zero means "valid". A validator has to earn that trust, and it can lose it in two ways:

- by saying nothing when something is wrong
- by saying something when nothing is

I ran into both while getting this package ready.

## When silence was not a pass

The most dangerous bug in a validator is the one that produces no output. Nobody files an issue about a document that passed.

- **Arazzo 1.1.0 documents were never checked against JSON Schema.** With JSON Schema validation turned on, an Arazzo 1.0.x document was checked against the 1.0 schema. A 1.1.0 document was checked against nothing. The 1.1 schema provider existed upstream. We simply never registered it in our defaults. So a 1.1.0 document looked like it had passed ([toolkit #202](https://github.com/usearazzo/arazzo-toolkit/pull/202)).
- **The README promised a check that does not exist.** It said relative external `$ref`s in a JSON Schema resolve against a `baseURI` you pass in. I pointed a `$ref` at a missing file and got zero diagnostics, with `baseURI` and without. The `referenceValidation` check covers local `#/...` pointers only. The README now says so, and so does the [API reference]({{ '/docs/validator/' | relative_url }}) ([toolkit #204](https://github.com/usearazzo/arazzo-toolkit/pull/204)).

How did I find them? The same way as before: by writing the API reference for this site and running every sample in it. With the parser, the docs turned up five bugs. With the resolver, two of the ten. This time they caught the one that mattered most. Well, at least it was caught in time. The 1.1.0 fix landed before the first publish, so no published version has the bug.

## When noise was not an error

The opposite failure is just as bad. A validator that reports errors on a valid document teaches people to ignore it.

Here is the one I hit. Every Reusable Object reported three errors. Reference a parameter, a success action, or a failure action from `components`, and the validator demanded fields a Reusable Object must not have. It also rejected `reference` as a field that is not allowed.

Why? The rules for a Parameter Object also ran on a Reusable Object that points at one. The OpenAPI rules guard against exactly this case. The Arazzo rules were written without the guard. So a document using Reusable Objects in all six places it can reported 18 errors. Now it reports none ([toolkit #17](https://github.com/usearazzo/arazzo-toolkit/issues/17)).

## When it read too much

There is a third way to lose trust, and it has nothing to do with diagnostics. An Arazzo document decides what its source descriptions point at, and the validator fetches them.

The default allow list for local files was `['*']`. Looks harmless, right? In practice it let a document name any file on disk, `/etc/passwd` included, and the validator would read it. And because a glob like `'*'` never matches a dotfile, a perfectly ordinary `./.petstore.json` was skipped. So the default was too open and too closed at the same time. Now it is the parser's: local `.json`, `.yaml`, and `.yml` files, dotfiles included, and nothing else ([toolkit #201](https://github.com/usearazzo/arazzo-toolkit/pull/201)).

Validating a document you did not write? The API reference has a section on [untrusted documents]({{ '/docs/validator/#untrusted' | relative_url }}). It shows how to turn resolution off, or how to keep it inside one directory.

## What does alpha mean here?

Alpha means the API can still move before 1.0. Concretely:

- The surface is two functions. `validateURI` takes a path or a URL. `validate` takes a document already in memory, as a `TextDocument`, which is what an editor holds.
- 251 rules run by default, grouped by the object they check. Each has a stable numeric code to match on.
- Warnings and hints are advice, not violations. To decide whether a document is valid, count errors only.
- JSON Schema validation is opt-in. The rules already report most of what it finds, so turning it on mostly doubles the output.
- The same versions as the parser and the resolver: Arazzo 1.0.0, 1.0.1, and 1.1.0, in JSON and YAML.
- The checks come from the SpecLynx ApiDOM Language Service, which I also maintain. Documents are read with the parser.

**The feedback I want most:**

- Which rule fired on a document you know is fine?
- Which mistake got through that should not have?

[Discussions](https://github.com/orgs/usearazzo/discussions) is the place, and the [monorepo](https://github.com/usearazzo/arazzo-toolkit) is where the issues go.

## What are the future plans?

Two things.

The first is more rules. My goal is to uncover as much as possible without running a workflow against a real API. Today the rules check a document's own shape. Next they check what the document means:

- **Runtime expressions,** fully. Not only that each one parses, but that it sits in a position where it makes sense. The [runtime expressions tutorial]({{ '/docs/tutorials/parse-arazzo-runtime-expressions/' | relative_url }}#where-parsing-ends) ends exactly here: `$response.body#/id` as a parameter value parses fine and is still wrong.
- **Criterion objects,** with their conditions, JSONPath queries, and JSON Pointers.
- **Source descriptions.** The validator already fetches and parses them. The next rules read them. Does a step's `operationId` really exist in the OpenAPI document it names? Does a `workflowId` exist in the Arazzo document it names?

That list lives in [toolkit #197](https://github.com/usearazzo/arazzo-toolkit/issues/197). If you have a rule idea, add it there.

The second is the CLI. The validator used to ship a command-line interface of its own. We took it out on purpose ([toolkit #7](https://github.com/usearazzo/arazzo-toolkit/issues/7)). Two entry points for one job would only confuse people. And every package would carry its own argument parsing, output formats, and exit codes. So the command line gets one home, the [UseArazzo CLI]({{ '/cli/' | relative_url }}), and validation will be its first command. It is **coming soon**. Let me show you how it will look:

{::nomarkdown}
<p class="mb-3"><span class="badge badge-secondary">Coming soon</span></p>
<div class="terminal mb-4">
        <div class="terminal-titlebar">
          <span class="terminal-dot terminal-dot-red"></span>
          <span class="terminal-dot terminal-dot-yellow"></span>
          <span class="terminal-dot terminal-dot-green"></span>
          <span class="terminal-title">usearazzo validate (preview)</span>
        </div>
<!-- Two runs. JS types each command and reveals its output in a loop; without JS (or with
     reduced motion) the runs render stacked. Diagnostics are verbatim validateURI output for
     the two sample documents, with ranges shown 1-based. -->
<pre class="terminal-body terminal-panel" role="region" tabindex="0" aria-label="Preview of the planned validate command on two Arazzo documents" data-terminal-typewriter><span class="terminal-run"><span class="terminal-prompt"><span class="t-dollar">$</span> npx @usearazzo/cli validate <span class="t-arg">adopt-a-pet.arazzo.yaml</span></span>
<span class="t-file">adopt-a-pet.arazzo.yaml</span>
  <span class="t-loc">16:9-18:38</span>  <span class="t-error">error</span>  <span class="t-code">9040403</span>  <span class="t-msg">Every step must have a unique 'stepId' within a workflow.</span>
  <span class="t-loc">19:9-22:1 </span>  <span class="t-error">error</span>  <span class="t-code">9040403</span>  <span class="t-msg">Every step must have a unique 'stepId' within a workflow.</span>

<span class="t-fail">&#10006; 2 problems (2 errors)</span></span><span class="terminal-run"><span class="terminal-prompt"><span class="t-dollar">$</span> npx @usearazzo/cli validate <span class="t-arg">onboarding.arazzo.yaml</span></span>
<span class="t-file">onboarding.arazzo.yaml</span>
  <span class="t-loc">16:9-17:32</span>  <span class="t-warn">warning</span>  <span class="t-code">9050201</span>  <span class="t-msg">Step 'description' should be present and non-empty string.</span>

<span class="t-warnsum">&#9888; 1 problem (1 warning)</span></span></pre>
</div>
{:/nomarkdown}

The command and its formatting are a preview. The diagnostics are not. Each one is what the validator reports for that document today, with lines counted from 1. Compare the two runs. The first is the document from above, with its two errors. The second has only a warning, which is advice, not a violation.

So there it is. Until the CLI arrives, the library is there to be used. Start with the [Arazzo Validator API reference]({{ '/docs/validator/' | relative_url }}), point it at a workflow you have written, and tell me what it got wrong.

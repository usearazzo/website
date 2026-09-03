---
title: "Parsing Arazzo Documents"
description: "An Arazzo document is several languages in one file, and one file in a network of documents. Why reading one properly is harder than loading YAML, what a tool needs from a parser, and how UseArazzo's parser approaches it."
date: 2026-09-03
image:
  path: /assets/images/guides/arazzo-document-parsing.png
  width: 1200
  height: 630
  alt: "A document sheet with indented text lines feeding into two meshing gears, which turn it into a tree of rounded-square nodes fanning out from one root on the right"
  caption: "Parsing: a document goes in, the gears turn, a tree you can walk comes out."
toc:
  - id: the-end-result
    title: What a parsed document looks like
  - id: why-hard
    title: Why parsing Arazzo is hard
  - id: by-hand
    title: Doing it by hand
  - id: not-parsing
    title: Where parsing should stop
  - id: with-the-parser
    title: How @usearazzo/parser approaches it
  - id: next-steps
    title: Next steps
---

You are building something that reads Arazzo documents. An editor plugin, a linter, a generator, an agent that turns workflows into tools, or just a script that lists every step in a repository's workflows. Before any of that can start, the document has to be read. This guide is about that reading step: why it is more than a YAML loader, what a tool actually needs from a parser, and how UseArazzo's parser, `@usearazzo/parser`, answers those needs.

If you only ever *write* Arazzo documents, you can skip this one. It is for the people building the tools that read them.

## What a parsed document looks like {#the-end-result}

Here is the destination, so the rest of the guide has something to aim at. Every sample below runs against this small workflow, saved as `adopt-a-pet.arazzo.yaml` next to the OpenAPI description it names. Both files, plus the two variants used later, are [available to download]({{ '/assets/guides/arazzo-document-parsing/' | relative_url }}adopt-a-pet.arazzo.yaml) from the site.

```yaml
arazzo: 1.0.1
info:
  title: Pet adoption
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    type: openapi
    url: ./petstore.openapi.yaml
workflows:
  - workflowId: adopt-a-pet
    inputs:
      type: object
      properties:
        petId:
          type: string
    steps:
      - stepId: find-pet
        operationId: getPetById
        parameters:
          - name: petId
            in: path
            value: $inputs.petId
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          name: $response.body#/name
      - stepId: adopt
        operationId: adoptPet
        parameters:
          - name: petId
            in: path
            value: $inputs.petId
```

A workflow document goes in, and a tree comes out that knows what every node is, where it came from in the source, and whether anything was wrong with it. For the sample, a good parse yields something like this, whichever parser produced it:

```text
adopt-a-pet.arazzo.yaml                                      lines 1 to 32
├── arazzo: 1.0.1
├── info
├── sourceDescriptions
│   └── petstore  (openapi)  ./petstore.openapi.yaml
└── workflows
    └── adopt-a-pet                                          lines 10 to 32
        ├── inputs  (JSON Schema)
        └── steps
            ├── find-pet                                     lines 17 to 26
            │   ├── operationId: getPetById
            │   ├── parameter petId = $inputs.petId          (runtime expression)
            │   ├── successCriteria: $statusCode == 200      (criterion condition)
            │   └── output name = $response.body#/name       (runtime expression)
            └── adopt                                        lines 27 to 32
problems: none
```

Three things in that picture matter for a tool author. The nodes are typed: `steps` is a list of step nodes, not a bag of maps, and the strings that are really expressions are known to be expressions. Every node carries its position in the original text, which is what a diagnostic, a hover, or a go-to-definition needs. And problems come back as data alongside the tree rather than as a thrown exception, so a half-broken document in someone's editor still yields a tree you can work with.

Getting to that output is the hard part.

## Why parsing Arazzo is hard {#why-hard}

An Arazzo document looks like one file in one format. It is really several languages layered on top of each other, inside one node of a network of documents, and a parser that stops after the first layer has not parsed the document.

### One document, two formats

Arazzo documents are written in YAML or JSON. JSON is a subset of YAML 1.2, so one YAML parser can read both, but the relation only runs one way. A YAML parser also accepts a `.json` file with comments, single-quoted strings, or a trailing comma, none of which is JSON, so "it loaded" does not tell you which format you were given. A tool that hands the document on to a strict JSON consumer, or writes it back out, has to know. JSON also has a native parser that is faster and stricter, and its syntax errors and positions are worth reporting in JSON terms. That means two parsers, two ideas of what a "position" is, and two sets of syntax errors to report. It also means the first job is detection: given a string, is this Arazzo at all, and in which format, really? A YAML loader will happily load an OpenAPI description, a Kubernetes manifest, or a shopping list. Something has to check for the `arazzo` version field and refuse the rest before any later stage runs.

### A grammar hidden in strings

Many values in the document are not values. `$inputs.petId`, `$steps.find-pet.outputs.name`, `$response.body#/pets/0/id`, `$sourceDescriptions.petstore.getPetById`: these are [runtime expressions](https://spec.openapis.org/arazzo/latest.html#runtime-expressions), a small language with its own ABNF grammar, embedded in ordinary strings. To a YAML loader they are strings. To a tool they are references that can be well-formed or not, that name a step which may or may not exist, and that carry a JSON Pointer in their tail. Checking any of that means parsing the expression, not the document.

### A programming language inside a string inside the document

The [Criterion Object](https://spec.openapis.org/arazzo/latest.html#criterion-object) goes one step further. A step's success criteria are conditions like `$statusCode == 200` or `$response.body#/status == 'available' && $response.header.X-Rate-Limit-Remaining > 0`. The `simple` criterion type is a tiny expression language: comparisons, boolean operators, negation, literals, and runtime expressions as operands. It also has its own way of reaching into a value. The specification's example, `$statusCode == 200 && $response.body.data != null`, navigates into the response body with a `.data` accessor, and `[0]` style index accessors work the same way. `$response.body#/pets/0/name` and `$response.body.pets[0].name` name the same value through two different grammars, and they do not mix: once a `#` pointer starts, dots and brackets are pointer text, not navigation. The other criterion types hand the condition to JSONPath, XPath, or a regular expression engine. So inside a single string you can have a condition grammar with its own accessors, which contains a runtime expression grammar, which contains a JSON Pointer. Three grammars deep, before you have left one field.

### Documents that point at other documents

An Arazzo document describes calls against APIs it does not contain. Each [Source Description](https://spec.openapis.org/arazzo/latest.html#source-description-object) names an external document by URL and declares its type: `openapi`, `arazzo`, and, since Arazzo 1.1.0, `asyncapi`. To resolve `operationId: getPetById`, or to know what `$response.body#/name` could contain, a tool has to fetch and parse those documents too. That opens several doors at once:

- **More formats.** An `openapi` source can be any OpenAPI version, and 2.0, 3.0.x, 3.1.x, and 3.2 each have their own structure. An `asyncapi` source is AsyncAPI v3. Each one is again YAML or JSON.
- **URI resolution.** A source description URL may be absolute, relative to the workflow document, a local file path, or a remote HTTP(S) URL. Relative URLs need a base URI, and Arazzo 1.1.0 lets the document override that base with the `$self` field.
- **Partial failure.** One source description being unreachable should not make the workflow document unreadable. The tool needs the rest of the tree plus an accurate note about what was missing.

### The document is a network

The door that matters most is the `arazzo` source type. A source description can be another Arazzo document, and that document has its own source descriptions, which can be Arazzo documents in turn. Steps reach across the links: `workflowId: $sourceDescriptions.onboarding.create-account` calls a workflow that lives in a different file, and `dependsOn` can name one too. So the file you were handed is not the document. It is one node in a graph of documents, and the graph is what the workflow means.

That graph has properties a single file does not:

- **Its size is unknown until you have walked it.** Each Arazzo node can add any number of OpenAPI descriptions and further Arazzo nodes. A workflow library that composes shared sub-workflows across teams can pull in dozens of files from a mix of local paths and remote URLs.
- **It can loop.** Document A lists B as a source. B lists C, and C lists A, or B lists A directly. Nothing in the specification forbids it, and a walker that follows links without remembering where it has been never terminates.
- **The same file can be reached by different names.** `./shared/auth.arazzo.yaml` from one document and `../auth.arazzo.yaml` from another are the same file. Cycle detection and caching both depend on resolving every link to one canonical URI first.
- **Depth is a policy decision.** A linter opening one file in an editor should probably not fetch the whole company's workflow graph on every keystroke. A runner probably should. The parser has to let the caller choose.

A parser that handles a single file well and leaves the graph to the caller has left the hardest part to the caller.

### Schemas and other niceties

Workflow inputs are described with [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), which is another language with its own reference and vocabulary semantics. Reusable Objects let a step reference a shared parameter, success action, or failure action by a runtime expression. Arazzo 1.1.0 adds Selector Objects to outputs and parameters. None of this is exotic on its own. Together, it means a "parsed" Arazzo document is a tree in which several nodes are the roots of further trees in other languages.

### The specification keeps moving

Arazzo has shipped [three releases in two years]({{ '/blog/arazzo-specification-evolution/' | relative_url }}). A document written last year says `arazzo: 1.0.0`. One written this month may say `1.1.0` and use `$self`, `channelPath`, `action`, or a Selector Object, none of which existed before. A parser that hard-codes one version's field list has two ways to fail: reject the newer document outright, or load it and silently drop the fields it does not know, which is worse, because the tool downstream then reasons about a workflow that is missing parts. Reading has to be tolerant of versions. Deciding what is valid *for* a version is a separate job, and one that changes with every release.

### Positions, for everything above

Every piece of tooling worth having reports where a problem is. That means line and column for the document nodes, but also offsets inside an expression string when the expression is what is wrong, and which file in the graph the problem came from. The [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) counts positions in UTF-16 code units, which is also how JavaScript strings index, so a parser aimed at editor tooling has to count the same way.

Put together, this is the real scope of "parsing an Arazzo document": detect the format, parse it tolerantly with positions, recognise the Arazzo structure, parse the expression grammars inside the strings, resolve every referenced document to a canonical URI and parse it in its own format, walk the graph of Arazzo sources without looping and to a depth the caller chose, and report all of it as data.

## Doing it by hand {#by-hand}

It is worth seeing how far a plain loader gets, because that is where most first attempts start.

```js
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const text = await readFile('./adopt-a-pet.arazzo.yaml', 'utf8');
const doc = YAML.parse(text);

for (const workflow of doc.workflows ?? []) {
  for (const step of workflow.steps ?? []) {
    console.log(workflow.workflowId, step.stepId);
  }
}
```

For a script you run yourself against documents you wrote, this is fine, and you should not feel bad about it. The trouble starts as soon as the tool has to serve other people or other documents:

- **No detection.** `YAML.parse` returns an object for any YAML, and since JSON is a subset of YAML 1.2, for any JSON too, including JSON with comments in it that no JSON parser would accept. Whether what came back is Arazzo, and whether the file was really the format its extension claims, is now your problem.
- **No positions.** The object has no idea which line `step.stepId` came from. Most YAML libraries can expose a concrete syntax tree with positions, but then you are walking that tree yourself and mapping it back to the Arazzo structure.
- **Strings stay strings.** `$steps.find-pet.outputs.name` is a string. To tell it apart from `$steps.find-pet.outputs`, which is not a valid expression, you need the runtime expression grammar. To check a success criterion you need the condition grammar as well. Both grammars are published as standalone packages, [Arazzo Runtime Expression](https://github.com/swaggerexpert/arazzo-runtime-expression) and [Arazzo Criterion](https://github.com/swaggerexpert/arazzo-criterion), and they are the same ones `@usearazzo/parser` wraps, so you can wire them into your own loader if that is all you need.
- **Source descriptions are URLs, nothing more.** You write the fetch, the relative URL resolution against the document's directory, the format detection for each OpenAPI version, and the error reporting when one of them is unreachable.
- **The graph is yours to walk.** Recursion into Arazzo sources, canonical URIs so the same file is not fetched twice under two names, an ancestor check so real cycles terminate without a shared file being mistaken for one, a depth limit so an editor does not fetch the world. Get any of these wrong and the failure mode is a hang, not an error.
- **Damaged input throws.** A document with one bad indent gives you an exception and no tree, which is exactly the situation an editor is in most of the time.

Each of these is a solved problem somewhere. The cost is assembling and maintaining the set, across two formats and five or six document types, for a specification that is still adding features. If you would rather not, other parsers in the ecosystem have done some of this assembly: [php-arazzo](https://github.com/Mohammed-Alama/php-arazzo) in PHP, [roas](https://github.com/sv-tools/roas) in Rust, and the Arazzo support inside [Redocly CLI](https://github.com/Redocly/redocly-cli). The [Ecosystem page]({{ '/ecosystem/#tools' | relative_url }}) keeps the full list. Whichever you pick, or build, there is one more question to settle before you can judge it: where parsing ends.

## Where parsing should stop {#not-parsing}

Knowing where a parser stops is as useful as knowing what it does, and the line is the same whichever parser you use. Four things look like parsing and are not:

- **Dereferencing.** `$ref` inside a source description's JSON Schema, or a Reusable Object's `reference`, point at content that may live in another file. Following them is resolution, a separate walk with its own caching and cycle rules.
- **Validation.** A step that references a workflow that does not exist is a well-formed document. Whether it is a correct one depends on rules that change with every release, so a parser that also validated would be wrong about validity each time the specification moved.
- **Evaluation.** An expression AST is structure. What `$steps.find-pet.outputs.name` is worth exists only during a run, so evaluation belongs to whatever runs the workflow.
- **JSONPath, XPath, and regular expressions.** General-purpose languages with their own ecosystems. A parser that bundled them would be maintaining three more grammars.

The UseArazzo toolkit draws exactly these lines: `@usearazzo/parser` reads, [`@usearazzo/resolver`]({{ '/docs/#packages' | relative_url }}) dereferences, the [Validator]({{ '/validator/' | relative_url }}) judges, and the [Runner]({{ '/runner/' | relative_url }}) evaluates. A parser you build or pick should draw them somewhere too. The one that does everything is the one nobody can keep up to date.

## How @usearazzo/parser approaches it {#with-the-parser}

`@usearazzo/parser` is the reading layer of the [UseArazzo toolkit](https://github.com/usearazzo/arazzo-toolkit). It covers the three syntaxes the specification defines: documents, runtime expressions, and criterion conditions. It produces a [SpecLynx ApiDOM](https://github.com/speclynx/apidom) data model, which is what gives it typed nodes and positions.

```bash
npm install @usearazzo/parser
```

Its [package reference]({{ '/docs/#packages' | relative_url }}) documents every option. This section takes the problems above in order and gives the parser's answer to each.

### Detection and input shapes

`parseArazzo` takes any of four shapes and returns the same kind of result for all of them:

```js
await parseArazzo({ arazzo: '1.0.1', info: { title: 'Pets', version: '1.0.0' }, workflows: [] });
await parseArazzo('arazzo: 1.0.1\ninfo:\n  title: Pets\n  version: 1.0.0\nworkflows: []\n');
await parseArazzo('./adopt-a-pet.arazzo.yaml');
await parseArazzo('https://example.com/workflows/adopt-a-pet.arazzo.json');
```

Detection runs first: the parser looks for the `arazzo` field and sniffs JSON or YAML, and only treats a string as a URI when it is not recognisable as inline content. The result is a `ParseResultElement`:

- `api`: the document, as a typed `ArazzoSpecification1Element`
- `errors` and `warnings`: annotations collected while parsing
- `meta.get('retrievalURI')`: where the document came from, for file and URL input

`api` is a typed tree with getters named after the specification's fields, and `toValue` from `@speclynx/apidom-core` unwraps any node to a plain value. Walking the sample:

```js
import { parseArazzo } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await parseArazzo('./adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceMap: true, strict: false } },
});

const workflow = parseResult.api.workflows.get(0);
console.log(toValue(workflow.workflowId)); // adopt-a-pet

workflow.steps.forEach((step) => {
  console.log(`${toValue(step.stepId)} at line ${step.startLine + 1}`);
});
// find-pet at line 17
// adopt at line 27

console.log(parseResult.errors.length, parseResult.warnings.length); // 0 0
```

Input that cannot be read as Arazzo at all, an OpenAPI description passed by mistake or a file that is not there, throws a `ParseError` whose `cause` says why. Local file paths must end in `.json`, `.yaml`, or `.yml`. The file resolver refuses anything else, so a `workflow.arazzo` with no extension is reported as unreadable.

### Versions

- Any `1.x.y` version string is accepted and read through the same code path, so a 1.0.0 document and a 1.1.0 document produce the same kind of tree.
- Fields that 1.1.0 added, `$self`, `channelPath`, `action`, `correlationId`, come through as typed getters.
- Fields the parser does not know, from a future release or an `x-` extension, are kept as ordinary members with their positions, never dropped.
- A `2.0.0` document is refused as not Arazzo.

Drawing the line between what 1.0.1 allows and what 1.1.0 allows is left to the [Validator]({{ '/validator/' | relative_url }}), which is where a per-version rule belongs.

### Tolerance and positions

The `strict` option picks between two parsers with different jobs:

| | `strict: true` (default) | `strict: false` |
|---|---|---|
| Parser | Native `JSON.parse` or a strict YAML parser | [tree-sitter](https://tree-sitter.github.io/) grammar |
| On damaged input | Throws | Keeps going, reports damage as annotations |
| Source maps | Not available | `sourceMap: true` puts zero-based, UTF-16 positions on every element |
| Made for | Runners, CI checks | Editors, linters, anything that shows a diagnostic |

Damage the sample so the second step's `operationId` sits one space to the left of its siblings, which takes it out of the step's mapping:

```yaml
      - stepId: adopt
       operationId: adoptPet   # seven spaces instead of eight
        parameters:
          - name: petId
```

Then parse it in tolerant mode:

```js
const parseResult = await parseArazzo('./adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { strict: false, sourceMap: true } },
});

parseResult.api.element;          // arazzoSpecification1: still a tree
parseResult.errors.map(toValue);  // [ '(Error YAML syntax error)' ]

const step = parseResult.api.workflows.get(0).steps.get(1);
toValue(step.stepId);      // adopt
step.startLine;            // 26
step.startCharacter;       // 8
toValue(step.operationId); // undefined: the damaged line was dropped, the rest of the step kept

const problem = parseResult.errors.get(0);
problem.startLine;      // 26
problem.startCharacter; // 21: the annotation points at the damage, not at the document
```

The tree survives, the damage is localised to one field, and the diagnostic knows where to point. One limit worth knowing: detection needs enough intact text to recognise the document, so an inline string too damaged to detect falls through to the URI path and fails there. Hand badly broken documents over as a file path and you get the tolerant tree.

### The embedded grammars

`parseRuntimeExpression` and `parseCriterionCondition` are pure syntax parsers: string in, AST out, nothing evaluated, no document needed.

```js
import { parseRuntimeExpression, parseCriterionCondition } from '@usearazzo/parser';

parseRuntimeExpression('$steps.find-pet.outputs.name').tree;
// { type: 'StepsExpression', stepId: 'find-pet', field: 'outputs', outputName: 'name' }

parseRuntimeExpression('$response.body#/pets/0/id').tree;
// { type: 'ResponseExpression',
//   source: { type: 'Source',
//     reference: { type: 'BodyReference',
//       jsonPointer: { type: 'JsonPointer', value: '/pets/0/id', referenceTokens: [...] } } } }

const { result, tree } = parseRuntimeExpression('$steps.find-pet.outputs');
result.success;    // false: an outputs reference needs an output name
result.maxMatched; // 15, the offset where parsing stopped
tree;              // undefined

const condition = parseCriterionCondition("$response.body#/status == 'available' && $statusCode == 200").tree;
condition.type;                       // LogicalExpression
condition.left.type;                  // BinaryExpression
condition.left.left.type;             // RuntimeExpression
condition.left.left.expression.type;  // ResponseExpression: the sub-AST from parseRuntimeExpression
condition.left.right;                 // { type: 'Literal', valueType: 'string', value: 'available' }

parseCriterionCondition("$response.body.pets[0].name == 'Rex'").tree.left;
// { type: 'RuntimeExpressionNavigation',
//   expression: { type: 'RuntimeExpression', text: '$response.body', ... },
//   navigation: [ { type: 'MemberAccess', name: 'pets' },
//                 { type: 'IndexAccess', value: 0 },
//                 { type: 'MemberAccess', name: 'name' } ] }
```

- Invalid syntax never throws. `result.success` goes false and `result.maxMatched` is the offset where the grammar gave up, which is the offset a diagnostic should point at.
- A condition's AST carries the parsed runtime expression of each operand, which in turn carries its JSON Pointer's reference tokens: the three-grammars-deep field from earlier, unpacked.
- Only the `simple` criterion grammar is covered. JSONPath, XPath, and regular expressions are left to their own libraries.

### The network

Source description parsing is off by default, because it means file system and network access, and a caller opening one file should not pay for the whole graph.

- `sourceDescriptions: true` turns it on. An array of names turns it on for some. `sourceDescriptionsMaxDepth` caps how many Arazzo levels the walk descends.
- Each source description becomes its own `ParseResultElement`, parsed into the namespace for its own type, appended after the main document and also attached to the `SourceDescriptionElement` that named it under `meta.get('parseResult')`.
- Relative URLs resolve against the location the document was parsed from, honouring the `$self` field. An object or inline string has no location of its own, so tell the parser where to treat it as coming from with `resolve.baseURI`, an absolute path or URL that is never read itself. Without it, a relative source in inline input comes back as an error annotation. Absolute source URLs and an absolute `$self` field on the document work too.
- Nothing in the walk throws. An unreachable file becomes an error annotation on that entry, and the main document still parses.
- Arazzo sources recurse, and cycle detection is what makes the recursion terminate.

To see cycle detection at work, add a second document, `onboarding.arazzo.yaml`, that lists `adopt-a-pet.arazzo.yaml` as an `arazzo` source and `petstore.openapi.yaml` as an `openapi` one, and list `onboarding` back from `adopt-a-pet`. Parsing `adopt-a-pet` with source descriptions on then walks A, then B, then stops exactly where B points back at A:

```text
ParseResultElement
├── api: arazzoSpecification1                     adopt-a-pet.arazzo.yaml
├── ParseResultElement  petstore    (openapi)
│   └── api: openApi3_1
└── ParseResultElement  onboarding  (arazzo)
    ├── api: arazzoSpecification1                 onboarding.arazzo.yaml
    ├── ParseResultElement  petstore  (openapi)
    │   └── api: openApi3_1                       the same document, parsed once
    └── ParseResultElement  adoption  (arazzo)    no api
        └── warning: Source description ".../adopt-a-pet.arazzo.yaml" has already been visited. Skipping to prevent cycle
```

Two things in that tree are deliberate, and they are the difference between cycle detection and a blunt "seen it before" check:

- **Only true cycles are detected.** A document is a cycle only when it is already on the chain of ancestors being parsed. `adopt-a-pet` is the root of this walk, so B's reference back to it is one, and that entry gets the warning and no `api`. Embedding it would make the tree loop.
- **Shared documents are not cycles.** Both A and B name `petstore.openapi.yaml`. Nothing in that file points back at either of them, so reaching it a second time is a shared dependency, a diamond, not a loop. It is fetched and parsed once and every source description that names it gives you the same parsed document.

Underneath both, every link is canonicalised before it is followed, so two spellings of one path count as one file, and the bookkeeping is shared across the JSON and YAML parsers, so a cycle that crosses formats still terminates.

Today the parser reads OpenAPI 2.0, 3.0.x, and 3.1.x sources. AsyncAPI sources, which Arazzo 1.1.0 allows, are not yet parsed: Arazzo requires AsyncAPI v3, and the data model underneath the parser covers AsyncAPI 2.x only, so a `type: asyncapi` source currently comes back with an error annotation saying no parser could read it.

## Next steps {#next-steps}

- The parser's [package reference]({{ '/docs/#packages' | relative_url }}) documents every option, including style preservation for round-tripping a document back to its original formatting.
- [`@usearazzo/resolver`]({{ '/docs/#packages' | relative_url }}) picks up where parsing stops: it dereferences the `$ref`s, JSON Schema references, and `$components` reusable references that the parser leaves in place, and it does the same for the OpenAPI documents the source descriptions point at.
- The [Validator]({{ '/validator/' | relative_url }}) is the next layer up: what it means for a parsed document to be correct.

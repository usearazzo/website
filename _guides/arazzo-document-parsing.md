---
title: "Parsing Arazzo Documents"
description: "An Arazzo document is several languages in one file, and one file in a network of documents. Why reading one properly is harder than loading YAML, what a tool needs from a parser, and what a good result looks like."
summary: "Why reading an Arazzo document properly is harder than loading YAML, and what a tool should expect from a parser."
date: 2026-09-03
last_modified_at: 2026-09-21
image:
  path: /assets/images/guides/arazzo-document-parsing.png
  webp: /assets/images/guides/arazzo-document-parsing.webp
  width: 1200
  height: 630
  alt: "A document sheet with indented text lines feeding into two meshing gears, which turn it into a tree of rounded-square nodes fanning out from one root on the right"
  caption: "Parsing: a document goes in, the gears turn, a tree you can walk comes out."
stylesheets:
  - /assets/css/ast-tree.css
toc:
  - id: the-end-result
    title: What a parsed document looks like
  - id: why-hard
    title: Why parsing Arazzo is hard
  - id: by-hand
    title: Doing it by hand
  - id: a-good-parse
    title: What a good parser gives you
  - id: not-parsing
    title: Where parsing should stop
  - id: next-steps
    title: Next steps
faq:
  - question: "Can Arazzo documents be written in JSON or YAML?"
    answer: |
      Both. JSON is a subset of YAML 1.2, so one YAML parser reads either. The relation only runs one way, though. A YAML parser also accepts a `.json` file with comments, single-quoted strings, or a trailing comma, and none of that is JSON.

      A tool that writes the document back out, or hands it to a strict JSON consumer, has to know which format it really has. So a good parser detects the format from the content, not from the file extension, and reads real JSON with a strict JSON parser.
  - question: "Can I just load an Arazzo file with a YAML parser?"
    answer: |
      For a one-off script over documents you wrote, yes:

      ```js
      import { readFile } from 'node:fs/promises';
      import YAML from 'yaml';

      const doc = YAML.parse(await readFile('./adopt-a-pet.arazzo.yaml', 'utf8'));
      ```

      For a tool other people use, a YAML loader falls short in four ways:

      - it accepts any YAML or JSON without checking that it is Arazzo;
      - it has no line and column positions for the nodes it returns;
      - it leaves runtime expressions such as `$steps.find-pet.outputs.name` and success criteria as opaque strings;
      - it stops at the file, while the workflow's meaning spans the OpenAPI, AsyncAPI, and Arazzo documents its source descriptions point at.
  - question: "How do I tell whether a file is an Arazzo document?"
    answer: |
      Look for a top-level `arazzo` field holding a `1.x.y` version string. A YAML loader will happily load an OpenAPI description or a Kubernetes manifest, so something has to check for that field before any later stage runs.

      A parser should make this check first. Anything that is not Arazzo should be refused with an error that says why. Do not rely on the file name: `.arazzo.yaml` is a convention, not a rule.
  - question: "Which versions of the Arazzo specification exist?"
    answer: |
      Three releases so far:

      - **1.0.0**, September 2024: the initial stable release.
      - **1.0.1**, January 2025: a patch with erratum fixes and clarifications, plus the first official JSON Schema.
      - **1.1.0**, May 2026: a minor release that adds AsyncAPI v3 source descriptions, Selector Objects, `$self` for document identity, step dependencies, and tightened evaluation semantics. It removes nothing, so a 1.0.1 document is a 1.1.0 document once the version string is bumped.

      A document says which one it targets in its top-level `arazzo` field. The blog post [I Diffed Every Arazzo Release So You Don't Have To](/blog/arazzo-specification-evolution/) walks through what each release changed.
  - question: "How do I get line numbers for steps and errors in an Arazzo document?"
    answer: |
      A plain YAML or JSON loader throws positions away, so you need a parser that keeps them. Look for two things:

      - **Source maps.** Every node in the tree carries its start and end position in the original text.
      - **A tolerant mode.** The parser keeps going on damaged input and reports each syntax error as data, with its own position. A strict parser throws at the first error and returns no tree.

      For editor tooling, positions should be zero-based and counted in UTF-16 code units. That is how the Language Server Protocol counts, and how JavaScript strings index.
  - question: "What is a source description in Arazzo?"
    answer: |
      A Source Description names an external document the workflow's steps run against, by URL and type:

      ```yaml
      sourceDescriptions:
        - name: petstore
          type: openapi
          url: ./petstore.openapi.yaml
      ```

      The type is `openapi`, `arazzo`, or, since Arazzo 1.1.0, `asyncapi`. Steps reach into it through expressions such as `$sourceDescriptions.petstore.getPetById`, and a step's `workflowId` can call a workflow that lives in another Arazzo document the same way. Because an `arazzo` source has source descriptions of its own, the file you were handed is one node in a graph of documents, and a parser that stops at the file has left the hardest part to you.
  - question: "Which OpenAPI and AsyncAPI versions can an Arazzo source description point at?"
    answer: |
      The specification does not pin an OpenAPI version: an `openapi` source can be any of 2.0, 3.0.x, 3.1.x, or 3.2.x, each with its own structure. An `asyncapi` source, allowed since Arazzo 1.1.0, is AsyncAPI v3 only. An `arazzo` source is another 1.x document.

      What a given tool can read is usually narrower. Check which source versions your parser supports, and what it does with one it cannot read. The right behaviour is a problem reported on that source, with the main document still parsed.
  - question: "How do I parse an Arazzo runtime expression?"
    answer: |
      With a parser for the runtime expression grammar. Runtime expressions such as `$inputs.petId` or `$response.body#/pets/0/id` are a small language, embedded in ordinary strings. The specification defines it in ABNF, so you can generate a parser from the grammar or use an existing one, such as [`@swaggerexpert/arazzo-runtime-expression`](https://github.com/swaggerexpert/arazzo-runtime-expression) for JavaScript.

      Expect a syntax tree, not a value. `$steps.find-pet.outputs.name` should come back as a steps expression with a step id, a field, and an output name. Nothing is evaluated, and no document is needed. For invalid input, such as `$steps.find-pet.outputs` with no output name, a good parser does not throw. It reports failure and the offset where the grammar gave up, which is where a diagnostic should point.
  - question: "How do I parse an Arazzo success criterion condition?"
    answer: |
      With a parser for the `simple` criterion grammar. A condition such as `$response.body#/status == 'available' && $statusCode == 200` is a tiny expression language: comparisons, boolean operators, negation, literals, and the `.field` and `[0]` accessors. [`@swaggerexpert/arazzo-criterion`](https://github.com/swaggerexpert/arazzo-criterion) is a standalone JavaScript parser for it.

      The specification defines this language in prose only, with no ABNF, so tools can disagree on edge cases such as operator precedence. Pick a parser that publishes its grammar. [Arazzo-Specification#518](https://github.com/OAI/Arazzo-Specification/issues/518) proposes a normative one.

      The syntax tree should carry each runtime expression operand as its own parsed sub-tree, not as a string. JSONPath, XPath, and regular expression criteria are not part of this grammar. Hand those to their own libraries.
  - question: "Does parsing an Arazzo document also validate it?"
    answer: |
      No. A step that references a workflow that does not exist is still a well-formed document, and validity depends on rules that change with every Arazzo release. Good tooling keeps four jobs apart:

      - a parser reads the document;
      - a resolver dereferences `$ref`s and reusable references;
      - a validator judges whether the document is correct;
      - a runner evaluates expressions during a run.
  - question: "Can an Arazzo parser follow source descriptions to other Arazzo and OpenAPI documents?"
    answer: |
      It can, and the caller should decide when. Following source descriptions means file system and network access, so it should be off by default and switched on per call, for all sources, for some by name, and to a maximum depth.

      A parser that follows them has to get five things right:

      - resolve every link to a canonical URI first, so one file under two spellings counts once;
      - report a document already on the chain of ancestors as a cycle, and skip it;
      - parse a document shared by two parents once, and not mistake it for a cycle;
      - turn an unreachable file into a reported problem, not an exception;
      - accept a base URI for inline strings and objects, which have no location of their own.
  - question: "How do I parse an Arazzo document in JavaScript or TypeScript?"
    answer: |
      With an Arazzo parser. A plain YAML loader is enough for a script you run yourself, but it gives you no detection, no positions, and no parsing of the expressions inside strings. The checklist in [What a good parser gives you](/docs/guides/arazzo-document-parsing/#a-good-parse) says what to look for.

      One option is `@usearazzo/parser`. Its `parseArazzo` function takes a file path, a URL, a YAML or JSON string, or a plain object, and returns the same kind of result for all four:

      ```js
      import { parseArazzo } from '@usearazzo/parser';

      const { api, errors, warnings } = await parseArazzo('./adopt-a-pet.arazzo.yaml');
      ```

      `api` is a typed tree of the document. `errors` and `warnings` are annotations collected while parsing. Every input, option, and result field is in the [API reference](/docs/parser/#parse-arazzo).
---
Let's say you are building something that reads Arazzo documents. It might be an editor plugin, a linter, a generator, or an agent that turns workflows into tools. It might be just a script that lists every step in a repository's workflows. Before any of that can start, the document has to be read. This guide is about that reading step. We'll look at why it is more than a YAML loader, and at what a tool should expect from a parser. The problems and the results are the same whichever parser you use, or build.

If you only ever *write* Arazzo documents, you can skip this one. It is for the people building the tools that read them.

## What a parsed document looks like {#the-end-result}

Here is the destination first, so the rest of the guide has something to aim at. Every sample below runs against this small workflow. It is saved as `adopt-a-pet.arazzo.yaml`, next to the OpenAPI description it names. Both files, plus the two variants we'll use later, are [available to download]({{ '/assets/guides/arazzo-document-parsing/' | relative_url }}adopt-a-pet.arazzo.yaml) from the site.

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
{: .numbered}

A workflow document goes in and a tree comes out. The tree knows what every node is, where it came from in the source, and whether anything was wrong with it. For our sample, a good parse yields something like this, whichever parser produced it:

<figure class="ast" aria-label="Tree from a good parse of adopt-a-pet.arazzo.yaml">
<p class="ast-source">adopt-a-pet.arazzo.yaml</p>
<div class="ast-scroll"><ul class="ast-tree ast-side"><li><span class="ast-node ast-doc"><small>document</small>arazzo 1.0.1<em>lines 1 to 32</em></span><ul><li><span class="ast-node ast-doc"><small>info</small>Pet adoption<em>lines 3 to 4</em></span></li><li><span class="ast-node ast-doc"><small>source description</small>petstore<em>openapi, lines 6 to 8</em></span></li><li><span class="ast-node ast-doc"><small>workflow</small>adopt-a-pet<em>lines 10 to 32</em></span><ul><li><span class="ast-node ast-doc"><small>inputs</small>JSON Schema<em>lines 12 to 15</em></span></li><li><span class="ast-node ast-doc"><small>step</small>find-pet<em>lines 17 to 26</em></span><ul><li><span class="ast-node ast-doc"><small>operationId</small>getPetById<em>line 18</em></span></li><li><span class="ast-node ast-rex"><small>parameter petId</small>$inputs.petId<em>lines 20 to 22</em></span></li><li><span class="ast-node ast-cond"><small>success criterion</small>$statusCode == 200<em>line 24</em></span></li><li><span class="ast-node ast-rex"><small>output name</small>$response.body#/name<em>line 26</em></span></li></ul></li><li><span class="ast-node ast-doc"><small>step</small>adopt<em>lines 27 to 32</em></span></li></ul></li></ul></li></ul></div>
<p class="ast-problems"><b class="ast-ok">problems</b>none</p>
<figcaption><span class="ast-key ast-doc">document node</span><span class="ast-key ast-rex">runtime expression</span><span class="ast-key ast-cond">criterion condition</span></figcaption>
</figure>

Every node carries the lines it came from, so you can match the figure against the numbered source above. To stay readable, the figure leaves out the list nodes `sourceDescriptions`, `workflows`, and `steps`.

Notice three things in that picture. First, the nodes are **typed**. `steps` is a list of step nodes, not a bag of maps, and the strings that are really expressions are known to be expressions. Second, every node carries its **position** in the original text. That is what a diagnostic, a hover, or a go-to-definition needs. And third, **problems come back as data** alongside the tree, not as a thrown exception. A half-broken document in someone's editor still yields a tree you can work with.

Getting to that output is the hard part.

## Why parsing Arazzo is hard {#why-hard}

An Arazzo document looks like one file in one format. It is really several languages layered on top of each other, inside one node of a network of documents. A parser that stops after the first layer has not parsed the document. Let's go through the layers one by one.

### One document, two formats

Arazzo documents are written in YAML or JSON. JSON is a subset of YAML 1.2, so one YAML parser can read both. But the relation only runs one way. A YAML parser also accepts a `.json` file with comments, single-quoted strings, or a trailing comma, and none of that is JSON. So "it loaded" does not tell you which format you were given.

Why does it matter? A tool that hands the document on to a strict JSON consumer, or writes it back out, has to know. JSON also has a native parser that is faster and stricter, and its syntax errors and positions are worth reporting in JSON terms. So now we have two parsers, two ideas of what a "position" is, and two sets of syntax errors to report.

It also means the first job is detection. Given a string, is this Arazzo at all? And in which format, really? A YAML loader will happily load an OpenAPI description, a Kubernetes manifest, or a shopping list. Something has to check for the `arazzo` version field and refuse the rest, before any later stage runs.

### The specification keeps moving

Arazzo has shipped [three releases in two years]({{ '/blog/arazzo-specification-evolution/' | relative_url }}). A document written last year says `arazzo: 1.0.0`. One written this month may say `1.1.0` and use `$self`, `channelPath`, `action`, or a Selector Object. None of these existed before.

A parser that hard-codes one version's field list has two ways to fail. It can reject the newer document outright. Or it can load it and silently drop the fields it does not know. The second one is worse, because the tool downstream then reasons about a workflow that is missing parts.

So reading has to be tolerant of versions. Deciding what is valid *for* a version is a separate job, and one that changes with every release.

### Documents that point at other documents

An Arazzo document describes calls against APIs it does not contain. Each [Source Description](https://spec.openapis.org/arazzo/v1.1.0.html#source-description-object) names an external document by URL and declares its type: `openapi`, `arazzo`, and, since Arazzo 1.1.0, `asyncapi`. To resolve `operationId: getPetById`, or to know what `$response.body#/name` could contain, a tool has to fetch and parse those documents too. That opens several doors at once:

- **More formats.** An `openapi` source can be any OpenAPI version, and 2.0, 3.0.x, 3.1.x, and 3.2 each have their own structure. An `asyncapi` source is AsyncAPI v3. Each one is again YAML or JSON.
- **URI resolution.** A source description URL may be absolute, relative to the workflow document, a local file path, or a remote HTTP(S) URL. Relative URLs need a base URI, and Arazzo 1.1.0 lets the document override that base with the `$self` field.
- **Partial failure.** One unreachable source description should not make the workflow document unreadable. The tool needs the rest of the tree, plus an accurate note about what was missing.

### The document is a network

The door that matters most is the `arazzo` source type. A source description can be another Arazzo document. That document has its own source descriptions, which can be Arazzo documents in turn. Steps reach across the links. `workflowId: $sourceDescriptions.onboarding.create-account` calls a workflow that lives in a different file, and `dependsOn` can name one too.

So the file you were handed is not the document. It is one node in a graph of documents, and the graph is what the workflow means. That graph has properties a single file does not have:

- **Its size is unknown until you have walked it.** Each Arazzo node can add any number of OpenAPI descriptions and further Arazzo nodes. A workflow library that composes shared sub-workflows across teams can pull in dozens of files, from a mix of local paths and remote URLs.
- **It can loop.** Document A lists B as a source. B lists C, and C lists A. Or B lists A directly. Nothing in the specification forbids it, and a walker that follows links without remembering where it has been never terminates.
- **The same file can be reached by different names.** `./shared/auth.arazzo.yaml` from one document and `../auth.arazzo.yaml` from another are the same file. Cycle detection and caching both depend on resolving every link to one canonical URI first.
- **Depth is a policy decision.** A linter in an editor should not fetch the whole company's workflow graph on every keystroke. A runner probably should. The parser has to let the caller choose.

A parser that handles a single file well and leaves the graph to the caller has left the hardest part to the caller.

### A grammar hidden in strings

Now let's open the strings. Many values in the document are not really values. Take `$inputs.petId`, `$steps.find-pet.outputs.name`, `$response.body#/pets/0/id`, or `$sourceDescriptions.petstore.getPetById`. These are [runtime expressions](https://spec.openapis.org/arazzo/v1.1.0.html#runtime-expressions), a small language with its own ABNF grammar, embedded in ordinary strings.

To a YAML loader they are just strings. To a tool they are references. A reference can be well-formed or not, it can name a step that does not exist, and it can carry a JSON Pointer in its tail. Checking any of that means parsing the expression, not the document.

### A programming language inside a string inside the document

The [Criterion Object](https://spec.openapis.org/arazzo/v1.1.0.html#criterion-object) goes one step further. A step's success criteria are conditions like `$statusCode == 200` or `$response.body#/status == 'available' && $response.header.X-Rate-Limit-Remaining > 0`. The `simple` criterion type is a tiny expression language: comparisons, boolean operators, negation, literals, and runtime expressions as operands.

It also has its own way of reaching into a value. The specification's example is `$statusCode == 200 && $response.body.data != null`. Notice how it navigates into the response body with a `.data` accessor. `[0]` style index accessors work the same way. Now compare `$response.body#/pets/0/name` with `$response.body.pets[0].name`. They name the same value through two different grammars, and the two do not mix. Once a `#` pointer starts, dots and brackets are pointer text, not navigation.

The other criterion types hand the condition to JSONPath, XPath, or a regular expression engine. So what do we have inside a single string? A condition grammar with its own accessors, which contains a runtime expression grammar, which contains a JSON Pointer. Three grammars deep, and we have not left one field yet.

### A grammar the specification never wrote down

Runtime expressions have an ABNF grammar in the specification. `simple` conditions do not. The specification gives us a table of literals, a table of operators, and prose. Every tool has to answer the rest alone:

- Where does a runtime expression end and an operator begin? The two languages share characters: `.`, `=`, `<`, and `>`.
- Which binds tighter, `&&` or `||`?
- Is a chained comparison such as `$statusCode > 199 < 300` allowed?
- Do `.data` and `[0]` belong to the condition language or to the runtime expression? In `$inputs.pet.name`, is that an input named `pet.name`, or the `name` member of an input named `pet`?

This is an **interoperability** problem, not a style problem. Two tools that answer differently read the same condition differently. The same workflow then passes in one runner and fails in another.

The first question runs deeper than it looks. A name in a runtime expression may contain `=`, `<`, `&`, and even spaces. So may a JSON Pointer token, and a pointer has no terminator at all. Read as a whole, the ordinary `$response.body#/status == 200` is also one valid runtime expression, with the pointer `/status == 200`. Nobody means that. But only a boundary rule can say so, and the specification has none.

A sensible rule, "an operand ends at whitespace or at an operator character", settles the ordinary conditions. It also leaves a whole family with no right answer: any name or key that contains one of those characters.

- In `$request.query.a=b == 1`, is the first `=` part of the parameter name, or the start of the operator?
- In `$response.body#/a=b == 1`, is it part of the pointer? The `#/` form is no escape, for the reason above.

Both readings are legal each time, and nothing in the specification picks one.

The full story is in [The one Arazzo condition no tool can evaluate safely](https://vladimirgorej.com/blog/the-one-arazzo-condition-no-tool-can-evaluate-safely/). [Arazzo-Specification#518](https://github.com/OAI/Arazzo-Specification/issues/518) asks the specification for a normative grammar, and proposes one in ABNF.

### Schemas and other niceties

Workflow inputs are described with [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), which is another language with its own reference and vocabulary semantics. [Reusable Objects](https://spec.openapis.org/arazzo/v1.1.0.html#reusable-object) let a step reference a shared parameter, success action, or failure action by a runtime expression. Arazzo 1.1.0 adds [Selector Objects](https://spec.openapis.org/arazzo/v1.1.0.html#selector-object) to outputs and parameters.

None of this is exotic on its own. Together, it means that a "parsed" Arazzo document is a tree in which several nodes are the roots of further trees, in other languages.

### Positions, for everything above

Every piece of tooling worth having reports *where* a problem is. For us that means three things:

- line and column for the document nodes;
- offsets inside an expression string, when the expression is what is wrong;
- the file in the graph that the problem came from.

There is one more catch. The [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) counts positions in UTF-16 code units, and JavaScript strings index the same way. A parser aimed at editor tooling has to count the same way too.

So what is the real scope of "parsing an Arazzo document"? Let's put it together:

- detect the format;
- parse it tolerantly, with positions;
- recognise the Arazzo structure in any 1.x version;
- resolve every referenced document to a canonical URI, and parse it in its own format;
- walk the graph of Arazzo sources without looping, to a depth the caller chose;
- parse the expression grammars inside the strings;
- report all of it as data.

## Doing it by hand {#by-hand}

How far does a plain loader get? It is worth seeing, because that is where most first attempts start.

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

For a script you run yourself, against documents you wrote, this is fine. You should not feel bad about it. The trouble starts as soon as the tool has to serve other people, or other documents:

- **No detection.** `YAML.parse` returns an object for any YAML. JSON is a subset of YAML 1.2, so it does the same for any JSON, including JSON with comments that no JSON parser would accept. Is what came back really Arazzo? Was the file really the format its extension claims? That is now your problem.
- **No positions.** The object has no idea which line `step.stepId` came from. Most YAML libraries can expose a concrete syntax tree with positions. But then you are walking that tree yourself, and mapping it back to the Arazzo structure.
- **Strings stay strings.** `$steps.find-pet.outputs.name` is a string. To tell it apart from `$steps.find-pet.outputs`, which is not a valid expression, you need the runtime expression grammar. To check a success criterion, you need the condition grammar as well. Both grammars are published as standalone packages: [`@swaggerexpert/arazzo-runtime-expression`](https://github.com/swaggerexpert/arazzo-runtime-expression) and [`@swaggerexpert/arazzo-criterion`](https://github.com/swaggerexpert/arazzo-criterion). You can wire them into your own loader, if that is all you need.
- **Source descriptions are URLs, nothing more.** You write the fetch, and the relative URL resolution against the document's directory. You write the format detection for each OpenAPI version. You write the error reporting for a source that is unreachable.
- **The graph is yours to walk.** You need recursion into Arazzo sources. You need canonical URIs, so the same file is not fetched twice under two names. You need an ancestor check, so real cycles terminate and a shared file is not mistaken for one. You need a depth limit, so an editor does not fetch the world. Get any of these wrong, and the failure mode is a hang, not an error.
- **Damaged input throws.** A document with one bad indent gives you an exception and no tree. An editor is in exactly that situation most of the time.

Each of these is a solved problem somewhere. The cost is in assembling the set and maintaining it, across two formats and five or six document types, for a specification that is still adding features.

If you would rather not, other parsers have done some of this assembly already. There is [php-arazzo](https://github.com/Mohammed-Alama/php-arazzo) in PHP, [roas](https://github.com/sv-tools/roas) in Rust, and the Arazzo support inside [Redocly CLI](https://github.com/Redocly/redocly-cli). The [Ecosystem page]({{ '/ecosystem/#tools' | relative_url }}) keeps the full list. Whichever you pick, or build, the next section is what to judge it by.

## What a good parser gives you {#a-good-parse}

Now let's turn the problems around. This section takes them in the same order and gives the result to expect for each. It describes results, not an API. Use it as a checklist, for a parser you pick or one you build. One note about the figures: they are illustrations. Node names differ from parser to parser. The shape is what matters.

### A format you can be sure of

- The parser checks that the input is Arazzo before anything else runs. It looks for the `arazzo` field and its `1.x.y` version.
- It works out whether the text is really JSON or YAML from the content, not from the file extension.
- Anything else is refused, with an error that says why. An OpenAPI description passed by mistake is the common case.
- It reads text that has no file behind it. An editor buffer that was never saved is still a document.

### Every 1.x version, nothing dropped

- A 1.0.0 document and a 1.1.0 document produce the same kind of tree.
- The fields that 1.1.0 added, such as `$self`, `channelPath`, `action`, and `correlationId`, are typed like the rest.
- Fields the parser does not know, from a future release or an `x-` extension, are kept with their positions. They are never dropped.

And what about the things that 1.0.1 allows and 1.1.0 does not? That is a validation question. The parser does not answer it.

### Source descriptions, read in their own format

- Each source description is parsed as what it is: an OpenAPI description in its own version, an AsyncAPI document, or another Arazzo document. Each one is again JSON or YAML.
- Relative URLs resolve against the location of the document that names them, honouring the `$self` field. Text with no location needs a base URI from the caller.
- One bad source does not spoil the rest. An unreachable file, or a format the parser cannot read, becomes a problem on that entry. The main document still parses.
- Following sources means file system and network access, so the caller decides. A good parser lets the caller follow none, some by name, or all.

A word of caution here. Few tools read every legal source format. Check which OpenAPI and AsyncAPI versions a parser supports before you depend on it.

### A graph walk that terminates

- The caller sets how deep the walk goes. An editor wants one level, a runner wants everything.
- Every link is made canonical before it is followed. Two spellings of one path count as one file.
- A document reached twice is fetched and parsed once.
- A cycle ends the walk on that branch, with a warning. It never ends in a hang.

The last two are easy to confuse, so here is an example. Take a second document, [`onboarding.arazzo.yaml`]({{ '/assets/guides/arazzo-document-parsing/' | relative_url }}onboarding.arazzo.yaml). It lists `adopt-a-pet.arazzo.yaml` as an `arazzo` source and `petstore.openapi.yaml` as an `openapi` one. Now list `onboarding` back from `adopt-a-pet`. A parse of `adopt-a-pet` that follows sources should walk A, then B, and stop exactly where B points back at A:

<figure class="ast">
<div class="ast-scroll"><svg viewBox="0 0 720 320" role="img" aria-labelledby="cycle-title cycle-desc"><title id="cycle-title">Walk of adopt-a-pet.arazzo.yaml with source descriptions followed</title><desc id="cycle-desc">adopt-a-pet.arazzo.yaml, the root of the walk, points at onboarding.arazzo.yaml as onboarding and at petstore.openapi.yaml as petstore. onboarding.arazzo.yaml points at petstore.openapi.yaml too, which is a shared document and is parsed once. It also points back at adopt-a-pet.arazzo.yaml as adoption. That edge is a cycle: it is drawn dashed, reported as a warning, and not followed.</desc><defs><marker id="cycle-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280"/></marker><marker id="cycle-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#B91C1C"/></marker></defs><g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"><line x1="330" y1="78" x2="205" y2="238" stroke="#6B7280" stroke-width="2" marker-end="url(#cycle-arrow)"/><line x1="400" y1="78" x2="545" y2="238" stroke="#6B7280" stroke-width="2" marker-end="url(#cycle-arrow)"/><line x1="262" y1="268" x2="458" y2="268" stroke="#6B7280" stroke-width="2" marker-end="url(#cycle-arrow)"/><path d="M 90 238 C 90 120, 150 50, 248 50" fill="none" stroke="#B91C1C" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#cycle-arrow-red)"/><rect x="230.0" y="148" width="84" height="17" rx="3" fill="#FAFCF6"/><text x="272" y="160" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="11.5" fill="#374151">onboarding</text><rect x="443.0" y="148" width="70" height="17" rx="3" fill="#FAFCF6"/><text x="478" y="160" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="11.5" fill="#374151">petstore</text><rect x="325.0" y="260" width="70" height="17" rx="3" fill="#FAFCF6"/><text x="360" y="272" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="11.5" fill="#374151">petstore</text><text x="176" y="106" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="11.5" fill="#B91C1C">adoption</text><text x="176" y="122" font-size="11" fill="#B91C1C">cycle, not followed</text><text x="360" y="292" text-anchor="middle" font-size="11" fill="#4B5563">shared, not a cycle</text><rect x="250" y="22" width="220" height="56" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/><text x="360" y="46" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="13" fill="#17210D">adopt-a-pet.arazzo.yaml</text><text x="360" y="64" text-anchor="middle" font-size="11" fill="#4B5563">Arazzo, root of the walk</text><rect x="40" y="240" width="220" height="56" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/><text x="150" y="264" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="13" fill="#17210D">onboarding.arazzo.yaml</text><text x="150" y="282" text-anchor="middle" font-size="11" fill="#4B5563">Arazzo</text><rect x="460" y="240" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#17210D" stroke-width="2"/><text x="570" y="264" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="13" fill="#17210D">petstore.openapi.yaml</text><text x="570" y="282" text-anchor="middle" font-size="11" fill="#4B5563">OpenAPI, parsed once</text></g></svg></div>
<figcaption><span class="ast-key ast-edge">source description, followed and parsed</span><span class="ast-key ast-cycle">cycle, skipped with a warning</span></figcaption>
</figure>

Two things in that figure are deliberate:

- **Only true cycles are cycles.** A document is a cycle only when it is already on the chain of ancestors being parsed. `adopt-a-pet` is the root of this walk, so B's reference back to it is one. That entry gets a warning and no tree.
- **Shared documents are not cycles.** Both A and B name `petstore.openapi.yaml`. Nothing in that file points back at either of them. Reaching it a second time is a shared dependency, a diamond, not a loop. A blunt "seen it before" check would wrongly skip it.

### Runtime expressions as trees

A string that holds a runtime expression comes back as a syntax tree, not as a string. Nothing is evaluated, and no document is needed.

<figure class="ast" aria-label="Syntax tree of the runtime expression $steps.find-pet.outputs.name">
<p class="ast-source">$steps.find-pet.outputs.name</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-rex"><small>steps expression</small>$steps</span><ul><li><span class="ast-node ast-rex"><small>step id</small>find-pet</span></li><li><span class="ast-node ast-rex"><small>field</small>outputs</span></li><li><span class="ast-node ast-rex"><small>output name</small>name</span></li></ul></li></ul></div>
<figcaption><span class="ast-key ast-rex">runtime expression</span></figcaption>
</figure>

<figure class="ast" aria-label="Syntax tree of the runtime expression $response.body#/pets/0/id">
<p class="ast-source">$response.body#/pets/0/id</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-rex"><small>response expression</small>$response</span><ul><li><span class="ast-node ast-rex"><small>body reference</small>body</span><ul><li><span class="ast-node ast-ptr"><small>JSON Pointer</small>/pets/0/id</span><ul><li><span class="ast-node ast-ptr"><small>token</small>pets</span></li><li><span class="ast-node ast-ptr"><small>token</small>0</span></li><li><span class="ast-node ast-ptr"><small>token</small>id</span></li></ul></li></ul></li></ul></li></ul></div>
<figcaption><span class="ast-key ast-rex">runtime expression</span><span class="ast-key ast-ptr">JSON Pointer</span></figcaption>
</figure>

- The tree names the kind of expression and its parts. A tool can then ask whether step `find-pet` exists, without any string slicing.
- The JSON Pointer in the tail is parsed too, down to its reference tokens.
- Invalid syntax is reported, not thrown. `$steps.find-pet.outputs` is not a valid expression, because an outputs reference needs an output name. The result says that parsing failed, and gives the offset where the grammar gave up. That offset is where a diagnostic should point.

### Criterion conditions as trees

A `simple` condition is a small expression language, so its result is an expression tree. In the figures, the colour of a node tells you which grammar it belongs to.

<figure class="ast" aria-label="Syntax tree of the condition $response.body#/status == 'available' &amp;&amp; $statusCode == 200">
<p class="ast-source">$response.body#/status == 'available' &amp;&amp; $statusCode == 200</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-cond"><small>logical and</small>&amp;&amp;</span><ul><li><span class="ast-node ast-cond"><small>comparison</small>==</span><ul><li><span class="ast-node ast-rex"><small>response expression</small>$response.body</span><ul><li><span class="ast-node ast-ptr"><small>JSON Pointer</small>/status</span></li></ul></li><li><span class="ast-node ast-lit"><small>string</small>'available'</span></li></ul></li><li><span class="ast-node ast-cond"><small>comparison</small>==</span><ul><li><span class="ast-node ast-rex"><small>status code expression</small>$statusCode</span></li><li><span class="ast-node ast-lit"><small>number</small>200</span></li></ul></li></ul></li></ul></div>
<figcaption><span class="ast-key ast-cond">criterion condition</span><span class="ast-key ast-rex">runtime expression</span><span class="ast-key ast-ptr">JSON Pointer</span><span class="ast-key ast-lit">literal</span></figcaption>
</figure>

As you can see, there are three colours in one tree. Here is what to expect from a parser that produces it:

- **The grammar is published.** The specification has no ABNF for conditions yet. So the parser says which grammar it follows, in ABNF, where anyone can read it. Two tools can only agree on a condition if they can compare grammars, and a grammar hidden in a hand-written tokenizer cannot be compared with anything. The [grammar of `@swaggerexpert/arazzo-criterion`](https://github.com/swaggerexpert/arazzo-criterion/blob/main/src/grammar.bnf) is one published example. It is the one proposed in [Arazzo-Specification#518](https://github.com/OAI/Arazzo-Specification/issues/518).
- **Operators have a stated precedence.** The usual choice is that `&&` binds tighter than `||`. Parentheses and `!` negation are nodes of their own. A chained comparison such as `$statusCode > 199 < 300` does not parse.
- **The operand boundary is a stated rule.** The usual rule is that an operand ends at whitespace or at an operator character. That rule is what makes `$response.body#/status == 200` a comparison and not one long pointer.
- **The runtime expression grammar checks the operand.** The condition parser does not copy the runtime expression rules. It hands the operand over, and the longest prefix that is a valid runtime expression wins. The rest is `.member` and `[0]` navigation. This way the two grammars cannot drift apart. It also settles `$inputs.pet.name`: a name may contain dots, so that is an input named `pet.name`, with no navigation.
- **What the rule cannot express is refused, not guessed.** Under that rule, a name or key that contains an operator character cannot be written. `$request.query.a=b == 1` fails to parse, with an offset. So does `$response.body#/a=b == 1`. A silent wrong guess would be worse. The way out for such a key is a `jsonpath` criterion, because JSONPath quotes member names: `$.pets[?@['a=b'] == 1]`.
- **Literals are typed.** A string, a number, a boolean, and `null` are different nodes. `200` and `'200'` do not compare the same way, so a tool has to see the difference.
- **Each runtime expression operand is parsed.** The condition tree holds the expression's own tree, which holds its JSON Pointer. This is the three-grammars-deep field from earlier, unpacked.
- **Accessors are navigation steps, not pointer text.** The two ways of reaching into a value stay apart in the tree:

<figure class="ast" aria-label="Syntax tree of the condition $response.body.pets[0].name == 'Rex'">
<p class="ast-source">$response.body.pets[0].name == 'Rex'</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-cond"><small>comparison</small>==</span><ul><li><span class="ast-node ast-cond"><small>navigation</small>.pets[0].name</span><ul><li><span class="ast-node ast-rex"><small>response expression</small>$response.body</span></li><li><span class="ast-node ast-cond"><small>member</small>pets</span></li><li><span class="ast-node ast-cond"><small>index</small>0</span></li><li><span class="ast-node ast-cond"><small>member</small>name</span></li></ul></li><li><span class="ast-node ast-lit"><small>string</small>'Rex'</span></li></ul></li></ul></div>
<figcaption><span class="ast-key ast-cond">criterion condition</span><span class="ast-key ast-rex">runtime expression</span><span class="ast-key ast-lit">literal</span></figcaption>
</figure>

- **Failure works as it does for expressions.** A condition that does not parse gives a failed result and an offset, not an exception.
- **Only `simple` conditions are parsed.** The Criterion Object's `type` says which language the condition is in. For `jsonpath`, `xpath`, and `regex`, the parser keeps the string as it is and records the type. The tool can then hand it to the right library.

### Positions and problems, even for damaged input

- Every node carries its position in the original text. For editor tooling that means zero-based lines and characters, counted in UTF-16 code units.
- A problem inside an expression points inside the string, not at the whole field.
- A problem in a source description says which document it came from.
- Problems come back as data, next to the tree. A runner can still ask the parser to fail fast. An editor cannot work that way, because the document in an editor is broken most of the time.

To see it, damage the sample so that the second step's `operationId` sits one space to the left of its siblings. That takes it out of the step's mapping, and the lines after it no longer fit anywhere. The damaged file is [available to download]({{ '/assets/guides/arazzo-document-parsing/' | relative_url }}adopt-a-pet.broken.arazzo.yaml) too.

```yaml
      - stepId: adopt
       operationId: adoptPet   # seven spaces instead of eight
        parameters:
          - name: petId
```
{: .numbered data-start="27"}

A plain loader throws here and returns nothing. A good parse gives you this:

<figure class="ast" aria-label="Tree from a tolerant parse of the damaged document, with the problem it reported">
<p class="ast-source">adopt-a-pet.broken.arazzo.yaml</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-doc"><small>document</small>arazzo 1.0.1</span><ul><li><span class="ast-node ast-doc"><small>workflow</small>adopt-a-pet<em>from line 10</em></span><ul><li><span class="ast-node ast-doc"><small>step</small>find-pet<em>lines 17 to 26</em></span></li><li><span class="ast-node ast-doc"><small>step</small>adopt<em>from line 27</em></span><ul><li><span class="ast-node ast-gone"><small>dropped fields</small>operationId, parameters<em>lines 28 to 32</em></span></li></ul></li></ul></li></ul></li></ul></div>
<p class="ast-problems"><b>error</b>YAML syntax error<span>lines 27 to 32</span></p>
<figcaption><span class="ast-key ast-doc">parsed node, with its position</span><span class="ast-key ast-gone">damaged, dropped from the tree</span></figcaption>
</figure>

The tree survives. The damage costs us the rest of that one step, and nothing else. The document, the workflow, the first step, and the second step's `stepId` are all intact, with their positions. And the problem points at the damaged text, not at the whole document.

## Where parsing should stop {#not-parsing}

That was a long checklist, so it is worth saying what is *not* on it. Knowing where a parser stops is as useful as knowing what it does, and the line is the same whichever parser you use. Four things look like parsing and are not:

- **Dereferencing.** `$ref` inside a source description's JSON Schema, or a Reusable Object's `reference`, point at content that may live in another file. Following them is resolution, a separate walk with its own caching and cycle rules.
- **Validation.** A step that references a workflow that does not exist is a well-formed document. Whether it is a correct one depends on rules that change with every release. A parser that also validated would be wrong about validity each time the specification moved.
- **Evaluation.** An expression AST is structure. What `$steps.find-pet.outputs.name` is worth exists only during a run, so evaluation belongs to whatever runs the workflow.
- **JSONPath, XPath, and regular expressions.** These are general-purpose languages with their own ecosystems. A parser that bundled them would be maintaining three more grammars.

So there are four jobs: a parser reads, a resolver dereferences, a validator judges, and a runner evaluates. A parser you build or pick should draw these lines somewhere. The one that does everything is the one nobody can keep up to date.

## Next steps {#next-steps}

- UseArazzo's own answer to this checklist is [`@usearazzo/parser`]({{ '/docs/parser/' | relative_url }}), for JavaScript and TypeScript. Its API reference documents every function and option.
- The tutorial [List Every Document an Arazzo Workflow Depends On]({{ '/docs/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}) walks the network of source descriptions with it, end to end.
- Resolution is the next layer up: what it takes to follow the `$ref`s and `$components` references a parser leaves in place is the subject of [Resolving Arazzo Documents]({{ '/docs/guides/arazzo-document-resolving/' | relative_url }}), and [`@usearazzo/resolver`]({{ '/docs/resolver/' | relative_url }}) is UseArazzo's answer to it.
- The [Validator]({{ '/validator/' | relative_url }}) is the layer after that: what it means for a parsed document to be correct.

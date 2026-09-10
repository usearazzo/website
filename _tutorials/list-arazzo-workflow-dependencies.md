---
title: "List Every Document an Arazzo Workflow Depends On"
description: "An Arazzo workflow names the APIs and other workflows it calls, and a run fetches all of them. Write a script that parses the entry document, follows every source description, and draws the graph of what each document is, which are shared, and which cannot be read."
summary: "Write a script that parses an entry document, follows every source description, and draws the graph of documents the workflow reaches."
date: 2026-09-08
image:
  path: /assets/images/tutorials/list-arazzo-workflow-dependencies.png
  webp: /assets/images/tutorials/list-arazzo-workflow-dependencies.webp
  width: 1200
  height: 630
  alt: "A rounded-square document node on the left with three lines branching to three nodes; the middle one continues to a fourth node that loops back to the first with a dotted line, and the bottom one is drawn as a dashed outline with a gap in its line"
  caption: "One entry document, everything it reaches, and the one it cannot."
toc:
  - id: the-end-result
    title: The end result
  - id: install
    title: Install the parser
  - id: parse
    title: Parse the entry document
  - id: source-descriptions
    title: Follow the source descriptions
  - id: describe
    title: Say what each document is
  - id: recurse
    title: Walk into workflow documents
  - id: problems
    title: Report the problems
  - id: run
    title: Run it
  - id: next-steps
    title: Next steps
faq:
  - question: "How do I find all the documents an Arazzo workflow depends on?"
    answer: |
      Parse the workflow document with `@usearazzo/parser` and the `sourceDescriptions` option turned on, then loop over the document's `sourceDescriptions`. Each Source Description Object carries the parsed document it points at as a `parseResult` entry in its metadata:

      ```js
      import { parseArazzo } from '@usearazzo/parser';

      const parseResult = await parseArazzo('onboarding.arazzo.yaml', {
        parse: { parserOpts: { sourceDescriptions: true } },
      });

      const sourceDescriptions = parseResult.api.sourceDescriptions;
      for (let i = 0; i < sourceDescriptions.length; i += 1) {
        const nested = sourceDescriptions.get(i).meta.get('parseResult');
        nested.api; // the parsed document, or undefined if it could not be read
      }
      ```

      One call fetches and parses every document the workflow names, whatever its kind: the OpenAPI descriptions its steps call, other Arazzo documents whose workflows it calls, and their source descriptions in turn. AsyncAPI documents will appear the same way once the parser supports them. The [walk step](/docs/tutorials/list-arazzo-workflow-dependencies/#recurse) of this tutorial turns that loop into a graph.
  - question: "Can an Arazzo source description point to another Arazzo document?"
    answer: |
      Yes. A Source Description Object with `type: arazzo` names another workflow document, and a step calls one of its workflows with `workflowId: $sourceDescriptions.<name>.<workflowId>` instead of an `operationId`. That document has source descriptions of its own, so a workflow is really the root of a network of documents. `@usearazzo/parser` follows the whole network in one call when `sourceDescriptions` is on, nesting each Arazzo document's results beneath the Source Description Object that named it.
  - question: "How do I generate a dependency graph of an Arazzo workflow?"
    answer: |
      Parse the workflow with `sourceDescriptions: true`, walk the source descriptions recursively, and print one [Mermaid](https://mermaid.js.org/) node per document and one arrow per source description. The seventy-line script in this tutorial does exactly that, and its output for a workflow that names two APIs and one other workflow is:

      ```text
      graph LR
        d1["onboarding.arazzo.yaml<br/>Arazzo 1.0.1"]
        d2["petstore.openapi.yaml<br/>OpenAPI 3.1.0"]
        d1 -->|petstore| d2
        d3["adopt-a-pet.arazzo.yaml<br/>Arazzo 1.0.1"]
        d1 -->|adoption| d3
        d3 -->|petstore| d2
        d4["billing.openapi.yaml<br/>not parsed"]:::missing
        d1 -.->|billing| d4
        classDef missing stroke-dasharray: 6 4
      ```

      Paste that inside a fenced `mermaid` block in a GitHub comment, pull request, or README and it renders as a graph.
  - question: "What happens when a source description file is missing?"
    answer: |
      Nothing throws. The missing document's `parseResult` has no `api` and carries an `error` annotation saying why, such as a file that could not be read or a document no parser recognised. The entry document and every other source description still parse, so your tool sees the whole network with one node marked as unreadable, rather than no network at all. The tutorial's script draws such a document as a dashed node, reports the error on standard error, and exits with a nonzero status.
  - question: "What if two workflows reference the same document?"
    answer: |
      It is parsed once, whatever kind of document it is. When `onboarding.arazzo.yaml` and the `adopt-a-pet.arazzo.yaml` it names both point at `petstore.openapi.yaml`, the parser parses petstore for the first reference and points the second one's `parseResult` at the same result, with an `info` annotation saying it was reused. A workflow document reached from two places is shared the same way. Keeping a `Map` from result to node id is enough to draw it as one node with two arrows into it. A true cycle, where a document names one of its own ancestors, is cut and reported as a `warning` annotation on the source description that closed the loop, so parsing never recurses forever.
  - question: "Does @usearazzo/parser follow source descriptions by default?"
    answer: |
      No. Following them means reading files and making network requests, so it is opt-in per call with `parse.parserOpts.sourceDescriptions`. Pass `true` to follow all of them, or an array of names to follow only some, and cap how far nested Arazzo documents are followed with `sourceDescriptionsMaxDepth`. All three are in the [source descriptions section](/docs/parser/#source-descriptions) of the API reference.
  - question: "What if a source description's declared type does not match the document?"
    answer: |
      The parser detects what the document is from its content, not from the declared `type`, and parses it as what it is. The mismatch becomes a `warning` annotation on that source description's result, such as a document declared as `openapi` that turns out to be Arazzo. The document is still parsed and still appears in the graph with its detected kind and version. Print `nested.warnings` to see these.
  - question: "Can a source description be an AsyncAPI document?"
    answer: |
      Arazzo 1.1.0 allows `type: asyncapi`, but `@usearazzo/parser` does not parse AsyncAPI documents yet. The source description gets an `error` annotation saying no parser could parse the file, the rest of the workflow document parses normally, and the tutorial's script draws it as a dashed node like any other unreadable document. The [compatibility table](/#compatibility) on the homepage tracks which document kinds and versions parse, validate, and run.
  - question: "Do I need @usearazzo/resolver to follow source descriptions?"
    answer: |
      No. Following source descriptions is the parser's own `sourceDescriptions` option. The resolver is for a different job: dereferencing `$ref` inside the documents and `$components` reusable references, which this tutorial never touches. The parser reads the network of documents and hands you a tree. What each document contains is left exactly as written.
  - question: "What happens when a source description is a URL rather than a file?"
    answer: |
      The parser fetches it over HTTP or HTTPS, with a 15 second timeout and up to five redirects, and the script works unchanged. Relative URLs resolve against where the parent document was read from, so a parent fetched from `https://example.com/flows/onboarding.arazzo.yaml` with a source description of `./petstore.openapi.yaml` fetches `https://example.com/flows/petstore.openapi.yaml`.
---

An Arazzo document rarely stands alone. Its `sourceDescriptions` name the OpenAPI descriptions its steps call, and since a step can also call a workflow in another Arazzo document, the list can name other workflow documents too, each with source descriptions of its own. A run reads all of them. Before you commit a workflow to CI, review someone else's, or hand one to an agent, it helps to know what that network is: which documents will be fetched, from where, what kind and version each one is, and which ones cannot be read.

A YAML loader shows you one file. This tutorial writes a script that draws the whole network, using `@usearazzo/parser`. The script is about seventy lines and you will have it running in a few minutes.

## The end result {#the-end-result}

Here is where you will end up. Given a workflow document that names two APIs and one other workflow, the script prints a [Mermaid](https://mermaid.js.org/) graph. Paste it into a GitHub comment, a pull request description, or a README, and it renders like the first tab below. The three tabs are the graph, the Mermaid text, and the standard error output, exactly as the script prints them for the sample files.

The same walk also runs here, in your browser, on the parser's browser build. Paste the URL of any Arazzo document your browser can fetch (the server has to allow cross-origin requests, which raw GitHub URLs do), and the three tabs are replaced with the live result. The parser and Mermaid load from unpkg on the first run.

<form id="dep-demo" class="dep-demo my-6 rounded-lg border border-gray-200 bg-[#F0F5E7] p-4 sm:p-6" data-parser-src="https://unpkg.com/@usearazzo/parser@1.0.1-alpha.2/dist/arazzo-parser.browser.min.js" data-parser-integrity="sha384-2EzdIMvhnZ/SAmCyAOtQH2E8DSt1l0hYE55Zz5L1Q+iw9zS0jNDJguObw2nbYoyC" data-mermaid-src="https://unpkg.com/mermaid@11.17.2/dist/mermaid.min.js" data-mermaid-integrity="sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2">
  <label for="dep-demo-url" class="block text-sm font-semibold text-primary-dark mb-2">URL of an Arazzo document</label>
  <div class="flex flex-col sm:flex-row gap-2">
    <input id="dep-demo-url" type="url" required spellcheck="false" autocomplete="off" value="{{ '/assets/tutorials/list-arazzo-workflow-dependencies/onboarding.arazzo.yaml' | relative_url }}" class="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-primary-dark focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light">
    <button id="dep-demo-run" type="submit" class="primary-cta text-white font-bold py-2 px-5 rounded disabled:opacity-60 disabled:cursor-wait">Draw the graph</button>
  </div>
  <p class="mt-2 mb-0 text-sm text-gray-600">Try <a href="{{ '/assets/tutorials/list-arazzo-workflow-dependencies/onboarding.arazzo.yaml' | relative_url }}" data-dep-demo-url="{{ '/assets/tutorials/list-arazzo-workflow-dependencies/onboarding.arazzo.yaml' | relative_url }}" class="text-primary-light underline hover:no-underline">onboarding.arazzo.yaml</a> from this tutorial, or the <a href="https://raw.githubusercontent.com/OAI/Arazzo-Specification/main/examples/1.0.0/pet-coupons.arazzo.yaml" data-dep-demo-url="https://raw.githubusercontent.com/OAI/Arazzo-Specification/main/examples/1.0.0/pet-coupons.arazzo.yaml" class="text-primary-light underline hover:no-underline">pet coupons example</a> from the Arazzo specification repository.</p>
  <p id="dep-demo-status" class="mt-4 mb-0 flex items-center gap-2 text-sm text-gray-700" role="status" aria-live="polite" hidden><span class="dep-demo-spinner" aria-hidden="true"></span><span id="dep-demo-status-text"></span></p>
  <div id="dep-demo-error" class="mt-4 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert" hidden></div>
  <div class="mt-4 flex gap-1 overflow-x-auto border-b border-gray-300" role="tablist" aria-label="Script output">
    <button type="button" role="tab" id="dep-demo-tab-graph" aria-controls="dep-demo-graph" aria-selected="true" class="whitespace-nowrap px-3 py-2 text-sm font-semibold text-gray-500 hover:text-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light">Graph</button>
    <button type="button" role="tab" id="dep-demo-tab-source" aria-controls="dep-demo-source-panel" aria-selected="false" class="whitespace-nowrap px-3 py-2 text-sm font-semibold text-gray-500 hover:text-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light">Mermaid source</button>
    <button type="button" role="tab" id="dep-demo-tab-problems" aria-controls="dep-demo-problems-panel" aria-selected="false" class="whitespace-nowrap px-3 py-2 text-sm font-semibold text-gray-500 hover:text-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light">Standard error <span id="dep-demo-problems-count" class="ml-1 rounded-full bg-red-700 px-1.5 text-xs text-white">1</span></button>
  </div>
  <div id="dep-demo-graph" class="dep-demo-graph mt-4 overflow-x-auto rounded-md bg-white p-4" role="tabpanel" aria-labelledby="dep-demo-tab-graph" tabindex="0">
      <svg viewBox="0 0 720 300" role="img" aria-labelledby="dep-title dep-desc" class="w-full h-auto max-w-3xl mx-auto">
        <title id="dep-title">Dependency graph of onboarding.arazzo.yaml</title>
        <desc id="dep-desc">onboarding.arazzo.yaml, Arazzo 1.0.1, points at adopt-a-pet.arazzo.yaml (Arazzo 1.0.1) as adoption, at petstore.openapi.yaml (OpenAPI 3.1.0) as petstore, and with a dotted arrow at billing.openapi.yaml, drawn dashed and marked not parsed. adopt-a-pet.arazzo.yaml also points at the same petstore.openapi.yaml.</desc>
        <defs>
          <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280"/>
          </marker>
          <marker id="dep-arrow-dotted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF"/>
          </marker>
        </defs>
        <g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
          <!-- edges -->
          <path d="M 220 138 C 260 138, 250 53, 284 53" fill="none" stroke="#6B7280" stroke-width="2" marker-end="url(#dep-arrow)"/>
          <line x1="220" y1="150" x2="494" y2="150" stroke="#6B7280" stroke-width="2" marker-end="url(#dep-arrow)"/>
          <path d="M 220 162 C 260 162, 250 247, 284 247" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#dep-arrow-dotted)"/>
          <path d="M 490 53 C 530 53, 540 110, 566 111" fill="none" stroke="#6B7280" stroke-width="2" marker-end="url(#dep-arrow)"/>

          <!-- edge labels -->
          <rect x="228" y="84" width="58" height="16" rx="3" fill="#FFFFFF"/>
          <text x="257" y="96" text-anchor="middle" font-size="11" fill="#4B5563">adoption</text>
          <rect x="330" y="134" width="56" height="16" rx="3" fill="#FFFFFF"/>
          <text x="358" y="146" text-anchor="middle" font-size="11" fill="#4B5563">petstore</text>
          <rect x="232" y="203" width="44" height="16" rx="3" fill="#FFFFFF"/>
          <text x="254" y="215" text-anchor="middle" font-size="11" fill="#4B5563">billing</text>
          <rect x="514" y="64" width="56" height="16" rx="3" fill="#FFFFFF"/>
          <text x="542" y="76" text-anchor="middle" font-size="11" fill="#4B5563">petstore</text>

          <!-- nodes -->
          <g>
            <rect x="20" y="117" width="200" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
            <text x="120" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#17210D">onboarding.arazzo.yaml</text>
            <text x="120" y="165" text-anchor="middle" font-size="12" fill="#4B5563">Arazzo 1.0.1</text>
          </g>
          <g>
            <rect x="290" y="20" width="200" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
            <text x="390" y="47" text-anchor="middle" font-size="13" font-weight="700" fill="#17210D">adopt-a-pet.arazzo.yaml</text>
            <text x="390" y="68" text-anchor="middle" font-size="12" fill="#4B5563">Arazzo 1.0.1</text>
          </g>
          <g>
            <rect x="290" y="214" width="200" height="66" rx="8" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="6 4"/>
            <text x="390" y="241" text-anchor="middle" font-size="13" font-weight="700" fill="#17210D">billing.openapi.yaml</text>
            <text x="390" y="262" text-anchor="middle" font-size="12" fill="#4B5563">not parsed</text>
          </g>
          <g>
            <rect x="500" y="117" width="200" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
            <text x="600" y="144" text-anchor="middle" font-size="13" font-weight="700" fill="#17210D">petstore.openapi.yaml</text>
            <text x="600" y="165" text-anchor="middle" font-size="12" fill="#4B5563">OpenAPI 3.1.0</text>
          </g>
        </g>
      </svg>
  </div>
  <div id="dep-demo-source-panel" class="mt-4" role="tabpanel" aria-labelledby="dep-demo-tab-source" tabindex="0">
    <pre class="language-text"><code id="dep-demo-source">graph LR
  d1["onboarding.arazzo.yaml<br/>Arazzo 1.0.1"]
  d2["petstore.openapi.yaml<br/>OpenAPI 3.1.0"]
  d1 -->|petstore| d2
  d3["adopt-a-pet.arazzo.yaml<br/>Arazzo 1.0.1"]
  d1 -->|adoption| d3
  d3 -->|petstore| d2
  d4["billing.openapi.yaml<br/>not parsed"]:::missing
  d1 -.->|billing| d4
  classDef missing stroke-dasharray: 6 4</code></pre>
  </div>
  <div id="dep-demo-problems-panel" class="mt-4" role="tabpanel" aria-labelledby="dep-demo-tab-problems" tabindex="0">
    <pre class="language-text"><code id="dep-demo-problems-list">billing: Error parsing source description "/home/you/inventory/billing.openapi.yaml": Error while reading file "/home/you/inventory/billing.openapi.yaml"</code></pre>
  </div>
</form>

Every node comes from the documents themselves. The kind and version of each one is detected from its content, not from the `type` the parent declared. The petstore file is named by two workflow documents and appears once, with two arrows into it, because the parser parsed it once. The document that does not exist is a dashed node on a dotted arrow, and the script exits with a nonzero status so CI notices.

The micro-app above fetched these same three files from the site: [onboarding.arazzo.yaml]({{ '/assets/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}onboarding.arazzo.yaml), [adopt-a-pet.arazzo.yaml]({{ '/assets/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}adopt-a-pet.arazzo.yaml), and [petstore.openapi.yaml]({{ '/assets/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}petstore.openapi.yaml). Download them, along with the finished script, [inventory.mjs]({{ '/assets/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}inventory.mjs), into a directory of their own. The entry document, `onboarding.arazzo.yaml`, looks like this:

```yaml
arazzo: 1.0.1
info:
  title: Onboarding
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    type: openapi
    url: ./petstore.openapi.yaml
  - name: adoption
    type: arazzo
    url: ./adopt-a-pet.arazzo.yaml
  - name: billing
    type: openapi
    url: ./billing.openapi.yaml
workflows:
  - workflowId: create-account
    steps:
      - stepId: adopt
        workflowId: $sourceDescriptions.adoption.adopt-a-pet
```

`adopt-a-pet.arazzo.yaml` is a two-step workflow that names `petstore.openapi.yaml` as its only source description. There is deliberately no `billing.openapi.yaml`.

## Install the parser {#install}

In that directory:

```bash
npm install @usearazzo/parser @speclynx/apidom-core
```

`@usearazzo/parser` does the parsing. `@speclynx/apidom-core` provides `toValue`, which turns a node of the parsed tree back into a plain JavaScript value so you can print it.

## Parse the entry document {#parse}

Start with the smallest script that proves the parser is working. Save this as `inventory.mjs`:

```js
import path from 'node:path';
import { parseArazzo, ParseError } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const entry = process.argv[2];

let parseResult;
try {
  parseResult = await parseArazzo(entry);
} catch (error) {
  if (error instanceof ParseError) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

const { api } = parseResult;
console.log(`${toValue(api.info.title)}  Arazzo ${toValue(api.arazzo)}`);
```

Run it:

```bash
node inventory.mjs onboarding.arazzo.yaml
```

```text
Onboarding  Arazzo 1.0.1
```

Three things happened. `parseArazzo` read the file, checked that it is an Arazzo document, and returned a typed tree under `api` with a getter for every field the specification defines. A relative path resolves against the working directory, and the parser remembers where the document came from, which is what the relative URLs in its `sourceDescriptions` will resolve against in the next step. And a file that is not Arazzo at all, or cannot be read, throws a `ParseError` whose message says where the input came from. Try it on `petstore.openapi.yaml` to see that path.

## Follow the source descriptions {#source-descriptions}

By default the parser stops at the entry document. Turn on `sourceDescriptions` and it fetches and parses every document the `sourceDescriptions` array points at, in the same call:

```js
parseResult = await parseArazzo(entry, {
  parse: { parserOpts: { sourceDescriptions: true } },
});
```

Each parsed document is attached to the Source Description Object that named it, as a `parseResult` entry in that node's metadata. So the natural way to walk them is to loop over the entry document's `sourceDescriptions`, which also gives you the declared `name` and `url` for the label. Replace the last `console.log` with:

```js
console.log(`${toValue(api.info.title)}  Arazzo ${toValue(api.arazzo)}`);

const sourceDescriptions = api.sourceDescriptions;
for (let i = 0; i < sourceDescriptions.length; i += 1) {
  const sourceDescription = sourceDescriptions.get(i);
  const nested = sourceDescription.meta.get('parseResult');
  const status = nested.api ? nested.api.element : 'not parsed';
  console.log(`  ${toValue(sourceDescription.name)}  ${toValue(sourceDescription.url)}  ${status}`);
}
```

```text
Onboarding  Arazzo 1.0.1
  petstore  ./petstore.openapi.yaml  openApi3_1
  adoption  ./adopt-a-pet.arazzo.yaml  arazzoSpecification1
  billing  ./billing.openapi.yaml  not parsed
```

That is already the flat inventory. Each `nested` value is the same kind of result `parseArazzo` returned for the entry document: `api` is the parsed tree when there is one, and when there is not, the reason is waiting in `nested.errors`. Nothing threw. A source description that cannot be read never stops the parse of everything else, which is what you want from an inventory.

## Say what each document is {#describe}

`openApi3_1` and `arazzoSpecification1` are the element types of the parsed trees. They tell you what the parser found, whatever the parent's `type` claimed, and each tree carries its own version field. A small helper turns that into a readable label. Add it above the loop:

```js
function describe(api) {
  if (api.element === 'arazzoSpecification1') return `Arazzo ${toValue(api.arazzo)}`;
  if (api.element === 'swagger') return `OpenAPI ${toValue(api.swagger)}`;
  return `OpenAPI ${toValue(api.openapi)}`;
}
```

and use it for the status:

```js
const status = nested.api ? describe(nested.api) : 'not parsed';
```

OpenAPI 2.0 documents carry their version in a `swagger` field rather than `openapi`, hence the middle line. If a parent declares `type: openapi` for a file that turns out to be Arazzo, the document still parses as what it is, and a `warning` annotation lands in `nested.warnings` saying so. You will print those in a moment.

## Walk into workflow documents {#recurse}

The `adoption` entry is an Arazzo document with source descriptions of its own, and the parser has already followed them: a workflow document reached through a source description is parsed with its own source descriptions followed in turn, so the whole network comes back from the one call. The script has to walk it, and since a network is a picture, it may as well draw one.

The output format is [Mermaid](https://mermaid.js.org/), because it is the cheapest way to get a picture into the places reviewers look: GitHub renders a fenced `mermaid` block in comments, pull requests, and Markdown files. Each document becomes a node labelled with its file name and what it is, each source description becomes an arrow labelled with its name, and a document that could not be parsed becomes a dashed node on a dotted arrow.

Two details make this a walk over a network rather than an infinite loop. First, only Arazzo documents have `sourceDescriptions`, so an OpenAPI document yields an empty list and the walk stops there. Second, one document can be reached by more than one path: `onboarding` and `adopt-a-pet` both name `petstore.openapi.yaml`. The parser parses such a document once and points every later reference at the same result. Handing out a node id per result, on first sight, is enough: a result seen before gets a second arrow into its existing node and is not walked again.

Replace the title line and the loop from the previous step with:

```js
function fileName(parseResult) {
  return path.basename(toValue(parseResult.meta.get('retrievalURI')));
}

const ids = new Map();
const lines = ['graph LR'];

function idFor(parseResult) {
  if (!ids.has(parseResult)) ids.set(parseResult, `d${ids.size + 1}`);
  return ids.get(parseResult);
}

function walk(parseResult) {
  const from = idFor(parseResult);
  const sourceDescriptions = parseResult.api.sourceDescriptions ?? [];

  for (let i = 0; i < sourceDescriptions.length; i += 1) {
    const sourceDescription = sourceDescriptions.get(i);
    const nested = sourceDescription.meta.get('parseResult');
    const name = toValue(sourceDescription.name);
    const seen = ids.has(nested);
    const to = idFor(nested);

    if (nested.api) {
      if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>${describe(nested.api)}"]`);
      lines.push(`  ${from} -->|${name}| ${to}`);
    } else {
      if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>not parsed"]:::missing`);
      lines.push(`  ${from} -.->|${name}| ${to}`);
    }

    if (nested.api && !seen) walk(nested);
  }
}

lines.push(`  ${idFor(parseResult)}["${fileName(parseResult)}<br/>${describe(parseResult.api)}"]`);
walk(parseResult);
lines.push('  classDef missing stroke-dasharray: 6 4');

console.log(lines.join('\n'));
```

```text
graph LR
  d1["onboarding.arazzo.yaml<br/>Arazzo 1.0.1"]
  d2["petstore.openapi.yaml<br/>OpenAPI 3.1.0"]
  d1 -->|petstore| d2
  d3["adopt-a-pet.arazzo.yaml<br/>Arazzo 1.0.1"]
  d1 -->|adoption| d3
  d3 -->|petstore| d2
  d4["billing.openapi.yaml<br/>not parsed"]:::missing
  d1 -.->|billing| d4
  classDef missing stroke-dasharray: 6 4
```

That is the graph from the top of the page. Every document's file name comes from the result's `retrievalURI` metadata, which the parser sets for everything it read from a path or URL. A document that could not be read still has one, which is how the missing node gets its name.

What is left is saying why `billing` was not parsed, and where.

## Report the problems {#problems}

The reason `billing` was not parsed is in `nested.errors`, as annotation elements whose value is the message. Problems belong on standard error, so the graph on standard output stays clean enough to paste. Add a counter next to `lines`:

```js
const lines = ['graph LR'];
let problems = 0;
```

Inside the loop in `walk`, after the two `lines.push` branches, print the annotations under the source description's name and count the errors:

```js
    nested.errors.forEach((annotation) => console.error(`${name}: ${toValue(annotation)}`));
    nested.warnings.forEach((annotation) => console.error(`${name}: warning: ${toValue(annotation)}`));
    problems += nested.errors.length;
```

And exit with the count, after the `console.log`:

```js
process.exit(problems > 0 ? 1 : 0);
```

Warnings are the parser saying "parsed, but you should know". A parent that declares `type: openapi` for a file that is really Arazzo gets one, and so does a cycle, where a document names one of its own ancestors: the parser cuts the loop and reports it on the source description that closed it. Neither changes the exit code.

## Run it {#run}

The complete script is [inventory.mjs]({{ '/assets/tutorials/list-arazzo-workflow-dependencies/' | relative_url }}inventory.mjs), seventy-one lines. Run it against the entry document:

```bash
node inventory.mjs onboarding.arazzo.yaml
```

```text
graph LR
  d1["onboarding.arazzo.yaml<br/>Arazzo 1.0.1"]
  d2["petstore.openapi.yaml<br/>OpenAPI 3.1.0"]
  d1 -->|petstore| d2
  d3["adopt-a-pet.arazzo.yaml<br/>Arazzo 1.0.1"]
  d1 -->|adoption| d3
  d3 -->|petstore| d2
  d4["billing.openapi.yaml<br/>not parsed"]:::missing
  d1 -.->|billing| d4
  classDef missing stroke-dasharray: 6 4
billing: Error parsing source description "/home/you/inventory/billing.openapi.yaml": Error while reading file "/home/you/inventory/billing.openapi.yaml"
```

The exit status, `echo $?`, is `1` because one source description could not be read. Wrap the first block in a fenced `mermaid` code block in a GitHub comment and you get the graph from [the top of this page](#the-end-result). To keep the graph and the problems apart, send them to different places:

```bash
node inventory.mjs onboarding.arazzo.yaml > dependencies.mmd 2> problems.txt
```

Run it against `adopt-a-pet.arazzo.yaml` instead and you get two nodes, one edge, and exit status `0`. Create an empty `billing.openapi.yaml` and the message on standard error changes from a reading error to one saying no parser could parse the file. Point it at a workflow document of your own and the graph is whatever that document reaches.

What you have: one `parseArazzo` call that reads an entry document and everything it names, a walk over the result that gives every document a node with its kind, version, and file name, shared documents drawn once with every arrow into them, and unreadable ones drawn dashed, reported by name, and counted into the exit status. That is a dependency check for a CI job, a graph for a pull request, or the discovery step for a tool that needs to know what a workflow touches before doing anything else.

## Next steps {#next-steps}

- Large trees can be capped with `sourceDescriptionsMaxDepth`, and `sourceDescriptions` also accepts an array of names to follow only some of them. Both are in the [source descriptions section]({{ '/docs/parser/#source-descriptions' | relative_url }}) of the parser reference, along with the annotation classes and the shared-document rule this script relies on.
- If your tool needs the line and column of a source description that failed, turn on source maps: `sourceMap: true` with `strict: false` puts a position on every node, including the Source Description Object in the parent. See [Source maps]({{ '/docs/parser/#source-maps' | relative_url }}).
- The same result also holds every parsed document as a top-level member, which is the route to take when you want the documents without the declarations. See [Result structure]({{ '/docs/parser/#result-structure' | relative_url }}).
- Why a document is a network, and what else a parser has to get right, is the subject of the [Parsing Arazzo Documents]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}) guide.
- The [Runner]({{ '/runner/' | relative_url }}) is what consumes this tree for real: it executes a workflow against the APIs the tree describes.
- Something did not work as described? Say so in [Discussions](https://github.com/orgs/usearazzo/discussions).

<script src="{{ '/assets/js/tutorials/list-arazzo-workflow-dependencies.js' | relative_url }}" defer></script>

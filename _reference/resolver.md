---
title: "Arazzo Resolver API Reference: @usearazzo/resolver"
description: "Dereference, bundle, and resolve the references in Arazzo and OpenAPI documents in JavaScript. Every function, option, result shape, and error of @usearazzo/resolver."
date: 2026-09-18
status: Published
package:
  name: "@usearazzo/resolver"
  npm: https://www.npmjs.com/package/@usearazzo/resolver
  github: https://github.com/usearazzo/arazzo-toolkit/tree/main/packages/resolver
toc:
  - id: install
    title: Installation
  - id: exports
    title: Exports
  - id: operations
    title: Three operations
  - id: common
    title: Inputs and options
    children:
      - id: inputs
        title: Inputs
      - id: options
        title: Options
      - id: errors
        title: Errors
      - id: continue-on-error
        title: Unresolvable references
  - id: dereference
    title: Dereference
    children:
      - id: dereference-arazzo
        title: dereferenceArazzo
      - id: dereference-source-descriptions
        title: Source descriptions
      - id: dereference-cycles
        title: Cycles
      - id: dereference-openapi
        title: dereferenceOpenAPI
  - id: bundle
    title: Bundle
    children:
      - id: bundle-arazzo
        title: bundleArazzo
      - id: bundle-openapi
        title: bundleOpenAPI
  - id: resolve
    title: Resolve
    children:
      - id: resolve-arazzo
        title: resolveArazzo
      - id: resolve-openapi
        title: resolveOpenAPI
  - id: elements
    title: Parsed documents and elements
    children:
      - id: element-parse-result
        title: A parsed document
      - id: element-base-uri
        title: Base URI for inline content
      - id: element-child
        title: A single element
  - id: versions
    title: Supported versions
---

`@usearazzo/resolver` handles the references inside Arazzo and OpenAPI documents. A reference can point at another part of the same document or at another document. The package does three things with them:

- **Dereference**: replace every reference with its target.
- **Bundle**: pull external documents into one compound document.
- **Resolve**: return the set of documents the references reach.

All three work on [SpecLynx ApiDOM](https://github.com/speclynx/apidom) trees. Documents are read with [`@usearazzo/parser`](/docs/parser/).

## Installation {#install}

```sh
npm install @usearazzo/resolver
```

The package ships ESM and CommonJS builds with TypeScript declarations, and requires Node.js 20.10 or newer. It is pre-1.0: the version documented here is an alpha, and the API may still change before the stable release.

## Exports {#exports}

| Export | Kind | What it is |
|---|---|---|
| `dereferenceArazzo`, `dereferenceOpenAPI` | function | Dereference a document from a path or URL. |
| `dereferenceArazzoElement`, `dereferenceOpenAPIElement` | function | Dereference a document you already parsed, or a single element inside it. |
| `bundleArazzo`, `bundleOpenAPI` | function | Bundle a document from a path or URL into one compound document. |
| `resolveArazzo`, `resolveOpenAPI` | function | Collect a document and every external document it references, from a path or URL. |
| `resolveArazzoElement`, `resolveOpenAPIElement` | function | The same for a document you already parsed, or a single element inside it. |
| `defaultDereferenceArazzoOptions`, `defaultDereferenceOpenAPIOptions` | constant | The options each dereference function starts from before yours are merged in. |
| `defaultBundleArazzoOptions`, `defaultBundleOpenAPIOptions` | constant | The same for the bundle functions. |
| `defaultResolveArazzoOptions`, `defaultResolveOpenAPIOptions` | constant | The same for the resolve functions. |
| `DereferenceError`, `BundleError`, `ResolveError` | class | Thrown when the matching operation fails. |
| `DereferenceArazzoOptions`, `DereferenceOpenAPIOptions`, `BundleArazzoOptions`, `BundleOpenAPIOptions`, `ResolveArazzoOptions`, `ResolveOpenAPIOptions` | type | `PartialDeep<ApiDOMReferenceOptions>`, all six. |
| `ReferenceSet` | type | What the resolve functions return. |

There are no bundle functions for parsed elements: bundling always starts from a path or URL.

## Three operations {#operations}

| Operation | What happens to a reference | Returns |
|---|---|---|
| [Dereference](#dereference) | Replaced by the content it points at (inlined). | `ParseResultElement` with no references left |
| [Bundle](#bundle) | External targets are copied into the entry document's components. | `ParseResultElement` holding one compound document |
| [Resolve](#resolve) | Left alone. The documents it reaches are fetched and parsed. | `ReferenceSet` of every document reached |

Which one to use:

- **Dereference** to read a document without chasing pointers, for example before executing a workflow.
- **Bundle** to get one self-contained file that still reads like the original.
- **Resolve** to work with the reference graph itself, for example to list every file a document depends on.

## Inputs and options {#common}

These rules hold for all ten functions.

### Inputs {#inputs}

The functions without `Element` in their name take a location, as a string:

- **A file system path.** A relative path resolves against the current working directory.
- **A `file://` URL.**
- **An HTTP or HTTPS URL.**

Inline content is not accepted here. Parse a string or an object with the parser first, then pass the result to an `Element` function. See [Parsed documents and elements](#elements).

The absolute location is stored on the result as `retrievalURI` metadata. Relative references inside the document resolve against it.

### Options {#options}

The second argument of every function is a deep-partial [ApiDOM reference options](https://github.com/speclynx/apidom/blob/main/packages/apidom-reference/src/options/index.ts) object. It is merged over the function's exported defaults.

The defaults reuse the parser's resolvers and parsers. Documents are fetched and detected exactly as [`parseArazzo`](/docs/parser/#parse-arazzo) and [`parseOpenAPI`](/docs/parser/#parse-openapi) would. Plain JSON, YAML, and binary parsers are added on top. They read referenced files that are not API descriptions, such as a bare JSON Schema.

The keys you are likely to set:

| Option | Default | Effect |
|---|---|---|
| `resolve.baseURI` | none | Where to treat a parsed document as coming from. Needed only by the `Element` functions. See [Base URI for inline content](#element-base-uri). |
| `dereference.strategyOpts.sourceDescriptions` | `false` | `dereferenceArazzo` only. Process the documents the `sourceDescriptions` array points at. Accepts `true` or an array of names. See [Source descriptions](#dereference-source-descriptions). |
| `dereference.strategyOpts.sourceDescriptionsMaxDepth` | `+Infinity` | `dereferenceArazzo` only. How many levels of Arazzo source descriptions to follow. |
| `dereference.continueOnError`, `bundle.continueOnError` | `false` | Keep going when a reference cannot be resolved: `true`, or a callback that receives each error. See [Unresolvable references](#continue-on-error). |
| `dereference.circular` | `'ignore'` | What to do with a reference that closes a cycle: `'ignore'`, `'replace'`, or `'error'`. See [Cycles](#dereference-cycles). |
| `dereference.strategyOpts.parseResult` | none | The parsed document a single element belongs to. See [A single element](#element-child). |

```js
import { defaultDereferenceArazzoOptions } from '@usearazzo/resolver';

console.dir(defaultDereferenceArazzoOptions, { depth: null });
```

### Errors {#errors}

Each operation throws its own error class: `DereferenceError`, `BundleError`, or `ResolveError`. The message names the operation and the location you passed. The underlying error is on `cause`:

```js
import { bundleArazzo, BundleError } from '@usearazzo/resolver';

try {
  await bundleArazzo('./missing.yaml');
} catch (error) {
  if (error instanceof BundleError) {
    error.message; // 'Failed to bundle Arazzo Document at "./missing.yaml"'
    error.cause.message; // 'Error while reading file "/home/you/project/missing.yaml"'
  }
  throw error;
}
```

A document of the wrong kind is an error too. `dereferenceArazzo` on an OpenAPI document throws a `DereferenceError`. Its cause is an `UnmatchedDereferenceStrategyError`. The bundle and resolve functions do the same with `UnmatchedBundleStrategyError` and `UnmatchedResolveStrategyError`.

One trap: the errors on `cause` come from ApiDOM, and ApiDOM has its own `ResolveError` class. It is not the class this package exports. `error.cause instanceof ResolveError` is `false`, even when the cause's name reads `ResolveError`. Use `instanceof` on the outer error only, and treat `cause` as detail.

### Unresolvable references {#continue-on-error}

By default the first reference that cannot be resolved stops the whole operation. That is the right behaviour for a build step. An editor or a linter usually wants the opposite: process everything that works, and report what does not. Set `continueOnError`:

| Value | Effect |
|---|---|
| `false` (default) | Throw on the first unresolvable reference. |
| `true` | Skip unresolvable references silently. |
| a function | Skip them, and call the function with each error. |

```js
import { dereferenceOpenAPI } from '@usearazzo/resolver';

const problems = [];
const parseResult = await dereferenceOpenAPI('/path/to/petstore.openapi.yaml', {
  dereference: { continueOnError: (error) => problems.push(error) },
});

problems.length; // 2
problems[0].message;
// 'Error while dereferencing Reference Object. Cannot resolve $ref "#/components/parameters/missing": ...'
problems[1].message;
// 'Error while dereferencing Schema Object. Cannot resolve $ref "./schemas/nope.yaml": ...'
```

Each error is an ApiDOM `UnresolvableReferenceError`. A skipped reference stays in the result exactly as written, for example `{ $ref: './schemas/nope.yaml' }`. Every other reference is processed as usual. If the function itself throws, the operation stops, and that error becomes the `cause`.

The option lives under a different key for each operation:

| Operation | Key | A skipped reference |
|---|---|---|
| Dereference | `dereference.continueOnError` | Stays in the result as written. |
| Bundle | `bundle.continueOnError` | Stays as written, so the bundle still points outside itself. |
| Resolve | `dereference.continueOnError` | Its document is missing from the `ReferenceSet`. |

One exception, in Arazzo documents only. A [Reusable Object](https://spec.openapis.org/arazzo/latest.html#reusable-object) reference that cannot be resolved, such as `$components.parameters.missing`, always throws. `continueOnError` covers `$ref` only.

## Dereference {#dereference}

Dereferencing replaces every reference with the content it points at. Other tools call this inlining references, or flattening a document.

The result is a graph, not a tree. Normally it is a directed acyclic graph (DAG). When the references [form cycles](#dereference-cycles), it is a directed cyclic graph (DCG).

The reason is sharing. A target referenced from several places is not copied in full each time. Each reference site gets its own top-level element. Everything beneath that element is shared, with the other sites and with the original under `components`:

```js
const [first, second] = workflow.steps.map((step) => step.parameters.get(0));
const original = parseResult.api.components.parameters.get('limit');

first === second; // false: each site has its own element
first.get('name') === second.get('name'); // true: the content is shared
first.get('name') === original.get('name'); // true
```

A change made inside one target shows up everywhere it was referenced. Treat a dereferenced document as read-only. To change a part of it, clone that part first with `cloneDeep` from `@speclynx/apidom-datamodel`.

### dereferenceArazzo {#dereference-arazzo}

```ts
dereferenceArazzo(uri: string, options?: DereferenceArazzoOptions): Promise<ParseResultElement>
```

An Arazzo document has two kinds of reference. Both are replaced:

- JSON Schema references (the `$ref` keyword).
- [Reusable Object](https://spec.openapis.org/arazzo/latest.html#reusable-object) references (the `reference` field, holding a `$components...` expression).

Given this document:

```yaml
workflows:
  - workflowId: adoptPet
    inputs:
      $ref: ./schemas/adoption.yaml
    steps:
      - stepId: findPet
        operationId: findPets
        parameters:
          - reference: $components.parameters.limit
components:
  parameters:
    limit:
      name: limit
      in: query
      value: 10
```

dereferencing fetches `schemas/adoption.yaml`, follows the references inside it, and inlines both targets:

```js
import { dereferenceArazzo } from '@usearazzo/resolver';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await dereferenceArazzo('/path/to/adopt-a-pet.arazzo.yaml');
const workflow = parseResult.api.workflows.get(0);

toValue(workflow.steps.get(0).parameters.get(0)); // { name: 'limit', in: 'query', value: 10 }
toValue(workflow.inputs).type; // 'object', the content of schemas/adoption.yaml
toValue(parseResult.meta.get('retrievalURI')); // '/path/to/adopt-a-pet.arazzo.yaml'
```

The result is the same [`ParseResultElement`](/docs/parser/#result) the parser returns, with `api`, `errors`, `warnings`, and `annotations`. The `components` section stays in place. Only the references to it are replaced.

### Source descriptions {#dereference-source-descriptions}

By default the documents listed under `sourceDescriptions` are left alone. With `sourceDescriptions: true`, each one is fetched, parsed, and dereferenced in the same call:

```js
import { dereferenceArazzo } from '@usearazzo/resolver';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await dereferenceArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  dereference: { strategyOpts: { sourceDescriptions: true } },
});

parseResult.length; // 2: the main document and petstore

const petstore = parseResult.get(1);
toValue(petstore.meta.get('name')); // 'petstore'
petstore.api.element; // 'openApi3_1', with its own $refs replaced
parseResult.api.sourceDescriptions.get(0).meta.get('parseResult') === petstore; // true
```

The result has the same shape as the parser's [parsed source descriptions](/docs/parser/#result-structure):

- Each direct source description is a further top-level member.
- The member has the `source-description` class, and its `name` and `type` in metadata.
- The same element is also on its `SourceDescriptionElement`, under the `parseResult` metadata key.

Pass an array of names to process only some source descriptions. An Arazzo source description can have source descriptions of its own. `sourceDescriptionsMaxDepth` caps how many levels are followed:

```js
const parseResult = await dereferenceArazzo('/path/to/onboarding.arazzo.yaml', {
  dereference: {
    strategyOpts: { sourceDescriptions: ['petstore'], sourceDescriptionsMaxDepth: 2 },
  },
});
```

A source description that cannot be processed never throws. It comes back as a member holding an `error` annotation. The main document and the other source descriptions still dereference. At a depth of `0`, for example, each member carries this annotation:

```text
Maximum dereference depth of 0 has been exceeded by file "/path/to/adopt-a-pet.arazzo.yaml"
```

The options can also be scoped to the Arazzo strategy, as `strategyOpts['arazzo-1'].sourceDescriptions`. The OpenAPI functions have no such options, because an OpenAPI document has no source descriptions.

### Cycles {#dereference-cycles}

References can form a cycle, most often a schema that refers to itself:

```yaml
components:
  schemas:
    Node:
      type: object
      properties:
        next:
          $ref: '#/components/schemas/Node'
```

Dereferencing handles this without recursing forever. What it does with the reference that closes the loop is up to you. Set `dereference.circular`:

| Value | The closing reference becomes | Use it when |
|---|---|---|
| `'ignore'` (default) | The target element itself. The result loops. | You walk the graph in memory. |
| `'replace'` | A `ref` element holding the target's absolute URI. The result has no loops. | You serialize the result. |
| `'error'` | Nothing. A `DereferenceError` is thrown. | Cycles are not allowed in your documents. |

With the default, two things need care:

- A naive walk never ends. Track the elements you have visited.
- `toValue` returns a plain object with the same loop. `JSON.stringify` rejects it with `Converting circular structure to JSON`.

With `'replace'`, both problems go away:

```js
import { dereferenceOpenAPI } from '@usearazzo/resolver';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await dereferenceOpenAPI('/path/to/cycle.openapi.yaml', {
  dereference: { circular: 'replace' },
});

const next = parseResult.api.components.schemas.get('Node').properties.get('next');
next.element; // 'ref'
toValue(next); // '/path/to/cycle.openapi.yaml#/components/schemas/Node'
JSON.stringify(toValue(parseResult.api)); // works
```

To choose the replacement yourself, add `dereference.circularReplacer`. It receives that `ref` element, and what it returns goes into the result:

```js
const parseResult = await dereferenceOpenAPI('/path/to/cycle.openapi.yaml', {
  dereference: {
    circular: 'replace',
    circularReplacer: (ref) => {
      ref.content = '#/components/schemas/Node';
      return ref;
    },
  },
});
// Node serializes as { type: 'object', properties: { next: '#/components/schemas/Node' } }
```

With `'error'`, the cause names the reference: `Cannot resolve $ref "#/components/schemas/Node": Circular reference detected`.

The options work the same in `dereferenceArazzo` and the `Element` functions. When the goal is a file on disk, consider [bundling](#bundle) instead. It keeps the cycle as a plain `$ref`.

### dereferenceOpenAPI {#dereference-openapi}

```ts
dereferenceOpenAPI(uri: string, options?: DereferenceOpenAPIOptions): Promise<ParseResultElement>
```

Dereferences an OpenAPI document on its own: Reference Objects, Path Item references, and schema references, local and external. `api` is the element for the document's version: `openApi2`, `openApi3_0`, or `openApi3_1`.

```js
import { dereferenceOpenAPI } from '@usearazzo/resolver';

const parseResult = await dereferenceOpenAPI('/path/to/petstore.openapi.yaml');
await dereferenceOpenAPI('https://example.com/petstore.openapi.yaml');
```

## Bundle {#bundle}

Bundling copies every externally referenced document into the entry document. One file then carries everything. Unlike dereferencing, bundling keeps the references. The result still reads like the original, reusable parts stay reusable, and cycles can still be written down.

### bundleArazzo {#bundle-arazzo}

```ts
bundleArazzo(uri: string, options?: BundleArazzoOptions): Promise<ParseResultElement>
```

The external references in an Arazzo document are JSON Schemas. They land in `components.inputs`. Each hoisted schema gets an `$id` that records where it came from. The `$ref` values stay as written. They now resolve against those `$id`s instead of the file system. This is standard JSON Schema bundling, explained in [JSON Schema bundling finally formalised](https://json-schema.org/blog/posts/bundling-json-schema-compound-documents).

```js
import { bundleArazzo } from '@usearazzo/resolver';
import { toYAML } from '@speclynx/apidom-core';

const parseResult = await bundleArazzo('/path/to/adopt-a-pet.arazzo.yaml');
console.log(toYAML(parseResult.api));
```

For the document from the [dereference example](#dereference-arazzo), the output keeps the workflow untouched and gains two schemas:

```yaml
workflows:
  - workflowId: adoptPet
    inputs:
      $ref: ./schemas/adoption.yaml
    # steps unchanged
components:
  parameters:
    # limit, unchanged
  inputs:
    adopter:
      type: object
      properties:
        name:
          type: string
      $id: schemas/adopter.yaml
    adoption:
      type: object
      properties:
        petId:
          type: integer
        adopter:
          $ref: ./adopter.yaml
      $id: schemas/adoption.yaml
```

Reusable Object references already point inside the document, so they are left alone. Source descriptions are not bundled. They are separate API descriptions, and the `sourceDescriptions` array keeps pointing at them.

### bundleOpenAPI {#bundle-openapi}

```ts
bundleOpenAPI(uri: string, options?: BundleOpenAPIOptions): Promise<ParseResultElement>
```

The targets of external Reference Objects are hoisted into the matching section. The references are rewritten to point there:

| Document | An external target lands in | The reference becomes |
|---|---|---|
| OpenAPI 3.1.x | The matching `components` field. Path Items go to `components.pathItems`. | `#/components/parameters/limit` |
| OpenAPI 3.0.x | The matching `components` field. External Path Items are inlined, as 3.0 has no `components.pathItems`. | `#/components/parameters/limit` |
| OpenAPI 2.0 | The root `parameters`, `responses`, or `definitions`. | `#/parameters/limit` |

External schemas depend on the version:

- **OpenAPI 3.1.x.** Schemas are full JSON Schema. A hoisted schema gains an `$id` and its `$ref` stays as written, as in Arazzo.
- **OpenAPI 3.0.x and 2.0.** A schema reference is an ordinary Reference Object. It is rewritten to `#/components/schemas/<name>` or `#/definitions/<name>`.

```js
import { bundleOpenAPI } from '@usearazzo/resolver';

const parseResult = await bundleOpenAPI('/path/to/petstore.openapi.yaml');
```

## Resolve {#resolve}

Resolving fetches and parses every document the references reach. It changes nothing. You get back the list of documents.

### resolveArazzo {#resolve-arazzo}

```ts
resolveArazzo(uri: string, options?: ResolveArazzoOptions): Promise<ReferenceSet>
```

```js
import { resolveArazzo } from '@usearazzo/resolver';

const refSet = await resolveArazzo('/path/to/adopt-a-pet.arazzo.yaml');

refSet.size; // 3
refSet.refs.map((ref) => ref.uri);
// [
//   '/path/to/adopt-a-pet.arazzo.yaml',
//   '/path/to/schemas/adoption.yaml',
//   '/path/to/schemas/adopter.yaml',
// ]

refSet.rootRef.uri; // '/path/to/adopt-a-pet.arazzo.yaml'
refSet.rootRef.value.api.element; // 'arazzoSpecification1'
```

A [`ReferenceSet`](https://github.com/speclynx/apidom/tree/main/packages/apidom-reference) holds one `Reference` per document. Each `Reference` has a `uri` (absolute) and a `value` (the parsed `ParseResultElement`). `rootRef` is the entry document, with its references still in place. Documents reached only through other documents are included too. `schemas/adopter.yaml` above is one.

Source descriptions are not followed. The set lists what the entry document's own references reach.

### resolveOpenAPI {#resolve-openapi}

```ts
resolveOpenAPI(uri: string, options?: ResolveOpenAPIOptions): Promise<ReferenceSet>
```

The same for an OpenAPI document of any supported version.

```js
import { resolveOpenAPI } from '@usearazzo/resolver';

const refSet = await resolveOpenAPI('/path/to/petstore.openapi.yaml');
refSet.refs.map((ref) => ref.uri);
// ['/path/to/petstore.openapi.yaml', '/path/to/schemas/pet.yaml']
```

## Parsed documents and elements {#elements}

```ts
dereferenceArazzoElement<T extends Element>(element: T, options?: DereferenceArazzoOptions): Promise<T>
dereferenceOpenAPIElement<T extends Element>(element: T, options?: DereferenceOpenAPIOptions): Promise<T>
resolveArazzoElement<T extends Element>(element: T, options?: ResolveArazzoOptions): Promise<ReferenceSet>
resolveOpenAPIElement<T extends Element>(element: T, options?: ResolveOpenAPIOptions): Promise<ReferenceSet>
```

The `Element` functions start from something you already parsed, not from a location. They take the same options and throw the same errors. Their messages name no location: `Failed to dereference Arazzo Document`.

### A parsed document {#element-parse-result}

Pass the `ParseResultElement` the parser gave you. If it was parsed from a path or URL, it carries its own `retrievalURI`. Nothing else is needed:

```js
import { parseArazzo } from '@usearazzo/parser';
import { dereferenceArazzoElement, resolveArazzoElement } from '@usearazzo/resolver';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml');

const dereferenced = await dereferenceArazzoElement(parseResult);
const refSet = await resolveArazzoElement(parseResult);
```

Dereferencing returns a new element. The one you passed in keeps its references, so you can hold both. Source descriptions are the exception: process them with [`dereferenceArazzo`](#dereference-source-descriptions), from a path or URL.

### Base URI for inline content {#element-base-uri}

A document parsed from a string or an object has no location. Relative references inside it have nothing to resolve against. Pass `resolve.baseURI`:

```js
import { parseArazzo } from '@usearazzo/parser';
import { dereferenceArazzoElement } from '@usearazzo/resolver';

const parseResult = await parseArazzo(yamlText);
const dereferenced = await dereferenceArazzoElement(parseResult, {
  resolve: { baseURI: 'https://example.com/adopt-a-pet.arazzo.yaml' },
});
```

Without it, the call fails before anything is fetched:

```text
baseURI option is required when dereferencing a ParseResultElement without retrievalURI metadata
```

The resolve functions say `when resolving` instead.

A `retrievalURI` on the element wins over the option. The parser's own [`resolve.baseURI`](/docs/parser/#base-uri) sets that `retrievalURI`. If you parsed with it, you do not need the option here.

### A single element {#element-child}

You can dereference or resolve one element, such as a workflow or a path item. The rest of the document is not processed. An element does not know which document it belongs to, so pass that document as `dereference.strategyOpts.parseResult`. References to `components` resolve against it:

```js
import { parseArazzo } from '@usearazzo/parser';
import { dereferenceArazzoElement } from '@usearazzo/resolver';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml');
const workflow = parseResult.api.workflows.get(0);

const dereferenced = await dereferenceArazzoElement(workflow, {
  dereference: { strategyOpts: { parseResult } },
});

dereferenced.element; // 'workflow'
toValue(dereferenced.steps.get(0).parameters.get(0)); // { name: 'limit', in: 'query', value: 10 }
```

The return value has the type you passed in. A `WorkflowElement` goes in, a dereferenced `WorkflowElement` comes out. If the parent document has no `retrievalURI`, add `resolve.baseURI` as above.

The resolve functions accept a single element the same way, with two differences:

- The `ReferenceSet` covers what is reachable from that element, not from the whole document. Its `rootRef` has the document's URI, but holds a wrapper around a copy of the element.
- `parseResult` is optional. Without it, pass both `resolve.baseURI` and `parse.mediaType`. The element alone cannot say what kind of document it came from.

## Supported versions {#versions}

Arazzo documents:

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0)

OpenAPI documents, as source descriptions or on their own:

- [OpenAPI 2.0](https://spec.openapis.org/oas/v2.0)
- [OpenAPI 3.0.x](https://spec.openapis.org/oas/v3.0.4)
- [OpenAPI 3.1.x](https://spec.openapis.org/oas/v3.1.2)

Both JSON and YAML are accepted for every version. The format is detected from the content, not the file extension.

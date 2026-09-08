---
title: "@usearazzo/parser"
description: "API reference for the Arazzo parser: parseArazzo, parseOpenAPI, parseRuntimeExpression, and parseCriterionCondition, with every option, result shape, and error they produce."
date: 2026-09-08
status: Published
package:
  name: "@usearazzo/parser"
  version: "1.0.1-alpha.1"
  npm: https://www.npmjs.com/package/@usearazzo/parser
  github: https://github.com/usearazzo/arazzo-toolkit/tree/main/packages/parser
toc:
  - id: install
    title: Installation
  - id: exports
    title: Exports
  - id: parse-arazzo
    title: parseArazzo
    children:
      - id: inputs
        title: Inputs
      - id: options
        title: Options
      - id: base-uri
        title: Base URI for inline content
      - id: errors
        title: Errors
      - id: result
        title: Result
      - id: source-maps
        title: Source maps
      - id: style
        title: Style preservation
  - id: source-descriptions
    title: Source descriptions
    children:
      - id: enabling
        title: Enabling
      - id: selective
        title: Selective parsing
      - id: result-structure
        title: Result structure
      - id: via-source-description
        title: Via SourceDescriptionElement
      - id: recursion
        title: Recursion and depth
      - id: cycles
        title: Cycles and shared documents
      - id: annotations
        title: Annotations
  - id: parse-openapi
    title: parseOpenAPI
  - id: parse-runtime-expression
    title: parseRuntimeExpression
  - id: parse-criterion-condition
    title: parseCriterionCondition
  - id: apidom
    title: Working with the tree
  - id: versions
    title: Supported versions
---

`@usearazzo/parser` reads the three languages an Arazzo document is written in. `parseArazzo` and `parseOpenAPI` turn a document into a typed [SpecLynx ApiDOM](https://github.com/speclynx/apidom) tree. `parseRuntimeExpression` and `parseCriterionCondition` turn the two grammars embedded in its strings, runtime expressions and `simple` criterion conditions, into syntax trees. For the reasoning behind that split, and for a walk through a real document, read the [Parsing Arazzo Documents](/docs/guides/arazzo-document-parsing/) guide. This page is the reference.

## Installation {#install}

```sh
npm install @usearazzo/parser
```

The package ships ESM and CommonJS builds with TypeScript declarations, and requires Node.js 20.10 or newer. It is pre-1.0: the version documented here is an alpha, and the API may still change before the stable release.

## Exports {#exports}

| Export | Kind | What it is |
|---|---|---|
| `parseArazzo` | function | Parses an Arazzo document from a path, URL, string, or object. |
| `parseOpenAPI` | function | Parses an OpenAPI document the same way. |
| `parseRuntimeExpression` | function | Parses a bare runtime expression into an AST. |
| `parseCriterionCondition` | function | Parses a `simple` criterion condition into an AST. |
| `defaultParseArazzoOptions`, `defaultParseOpenAPIOptions` | constant | The options each document parser starts from before yours are merged in. |
| `defaultParseRuntimeExpressionOptions`, `defaultParseCriterionConditionOptions` | constant | Empty on purpose. The grammar packages supply their own defaults. |
| `ParseError` | class | Thrown by the two document parsers when parsing fails. |
| `ArazzoRuntimeExpressionParseError`, `ArazzoCriterionParseError` | class | Re-exported from the grammar packages. Thrown only on an internal parser error, never for invalid syntax. |
| `ParseArazzoOptions`, `ParseOpenAPIOptions` | type | `PartialDeep<ApiDOMReferenceOptions>`. |
| `ParseRuntimeExpressionOptions`, `ParseCriterionConditionOptions` | type | The grammar packages' parse options. |
| `ParseRuntimeExpressionResult`, `ParseCriterionConditionResult` | type | `{ result, tree, stats, trace }` bound to each grammar's AST type. |
| `RuntimeExpressionASTNode`, `CriterionConditionAST` | type | The AST node types the two grammar parsers produce. |
| `ParseResultElement` | type | The ApiDOM element the two document parsers resolve to. |

## parseArazzo {#parse-arazzo}

```ts
parseArazzo(source: string | Record<string, unknown>, options?: ParseArazzoOptions): Promise<ParseResultElement>
```

### Inputs {#inputs}

One function, four kinds of input. The parser decides which it has been given, in this order:

1. **A plain object.** Serialized to pretty-printed JSON with two-space indentation and parsed from that.
2. **A string that detects as Arazzo.** Inline JSON or YAML, sniffed from the content rather than from a file extension.
3. **A file system path.** Read from disk. Only `.json`, `.yaml`, and `.yml` files are accepted.
4. **An HTTP or HTTPS URL.** Fetched with a 15 second timeout and up to five redirects.

```js
import { parseArazzo } from '@usearazzo/parser';

await parseArazzo({ arazzo: '1.0.1', info: { title: 'Pets', version: '1.0.0' }, sourceDescriptions: [], workflows: [] });
await parseArazzo('{"arazzo": "1.0.1", "info": {"title": "Pets", "version": "1.0.0"}, "sourceDescriptions": [], "workflows": []}');
await parseArazzo(`
arazzo: '1.0.1'
info:
  title: Pets
  version: '1.0.0'
sourceDescriptions: []
workflows: []
`);
await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml');
await parseArazzo('https://example.com/adopt-a-pet.arazzo.yaml');
```

A string that is neither Arazzo content nor a readable location fails with a `ParseError`.

### Options {#options}

The second argument is a deep-partial [ApiDOM reference options](https://github.com/speclynx/apidom/blob/main/packages/apidom-reference/src/options/index.ts) object, merged over `defaultParseArazzoOptions`. The keys you will actually set live under `parse.parserOpts`:

| Option | Default | Effect |
|---|---|---|
| `strict` | `true` | Only accept content the Arazzo parsers positively detect. Must be `false` for `sourceMap` and `style`. |
| `sourceMap` | `false` | Record the start and end position of every element. See [Source maps](#source-maps). |
| `style` | `false` | Record formatting detail for round-trip output. See [Style preservation](#style). |
| `sourceDescriptions` | `false` | Fetch and parse the documents the `sourceDescriptions` array points at. Accepts `true` or an array of names. See [Source descriptions](#source-descriptions). |
| `sourceDescriptionsMaxDepth` | `+Infinity` | How many levels of Arazzo source descriptions to follow. See [Recursion and depth](#recursion). |

```js
import { parseArazzo } from '@usearazzo/parser';

const parseResult = await parseArazzo(source, {
  parse: {
    parserOpts: {
      strict: false,
      sourceMap: true,
    },
  },
});
```

Under `resolve`, `baseURI` is the one you are likely to need (next section). `resolve.resolvers` accepts extra ApiDOM resolvers; the parser's own in-memory resolver is always placed ahead of them.

Both default option objects are exported, so you can inspect exactly what a call starts from:

```js
import { defaultParseArazzoOptions, defaultParseOpenAPIOptions } from '@usearazzo/parser';

console.dir(defaultParseArazzoOptions, { depth: null });
```

### Base URI for inline content {#base-uri}

A document passed as an object or string has no location, so relative references inside it, such as a source description `url` of `./petstore.openapi.yaml`, have nothing to resolve against. `resolve.baseURI` tells the parser where to treat the document as coming from:

```js
import { parseArazzo } from '@usearazzo/parser';

const document = {
  arazzo: '1.0.1',
  info: { title: 'Pet adoption', version: '1.0.0' },
  sourceDescriptions: [{ name: 'petstore', type: 'openapi', url: './petstore.openapi.yaml' }],
  workflows: [],
};

const parseResult = await parseArazzo(document, {
  resolve: { baseURI: '/path/to/adopt-a-pet.arazzo.json' },
  parse: { parserOpts: { sourceDescriptions: true } },
});

parseResult.meta.get('retrievalURI'); // '/path/to/adopt-a-pet.arazzo.json'
parseResult.get(1).meta.get('retrievalURI'); // '/path/to/petstore.openapi.yaml'
```

The base URI must be absolute; a relative value is not resolved against the working directory. It is never read: the in-memory content is what gets parsed, so the path need not exist or carry a recognized extension. It is also recorded as the result's `retrievalURI`.

### Errors {#errors}

When parsing fails for any reason, `parseArazzo` throws a `ParseError`. The message names where the input came from, and the underlying error is on `cause`:

```js
import { parseArazzo, ParseError } from '@usearazzo/parser';

try {
  await parseArazzo('not an arazzo document');
} catch (error) {
  if (error instanceof ParseError) {
    error.message; // 'Failed to parse Arazzo Document from "[inline CONTENT]"'
    error.cause; // the error from the underlying parser or resolver
  }
  throw error;
}
```

The provenance in the message is the path or URL for a location, `[object]` for a plain object, `[inline JSON]` or `[inline YAML]` for detected inline content, and `[inline CONTENT]` for a string that was neither. A document that parses but is not an Arazzo document is also a `ParseError`, with an `UnmatchedParserError` as its cause.

### Result {#result}

The promise resolves to a [`ParseResultElement`](https://github.com/speclynx/apidom/blob/main/packages/apidom-datamodel/README.md#parseresultelement):

| Accessor | Type | What it is |
|---|---|---|
| `api` | `ArazzoSpecification1Element` | The document, as a typed tree with a getter for every field the specification defines. |
| `errors` | `ArrayElement` | Annotations with the `error` class. |
| `warnings` | `ArrayElement` | Annotations with the `warning` class. |
| `annotations` | `ArrayElement` | Every annotation, whatever its class. |
| `isEmpty` | `boolean` | True when nothing was parsed. |
| `meta.get('retrievalURI')` | `StringElement` | Where the document was read from. Set for paths, URLs, and inline content parsed with `resolve.baseURI`. Absent for other inline content. |

```js
import { parseArazzo } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml');

toValue(parseResult.api.info.title); // 'Pet adoption'
parseResult.errors.length; // 0
toValue(parseResult.meta.get('retrievalURI')); // '/path/to/adopt-a-pet.arazzo.yaml'
```

When source descriptions are parsed, the same element also holds their results as further top-level members. See [Result structure](#result-structure).

### Source maps {#source-maps}

With `sourceMap: true` and `strict: false`, every element carries its position in the source. Positions are zero-based and counted in UTF-16 code units, which is what the Language Server Protocol and JavaScript string indexing use:

```js
import { parseArazzo } from '@usearazzo/parser';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceMap: true, strict: false } },
});

const workflow = parseResult.api.workflows.get(0);
workflow.startLine; // line the element begins on
workflow.startCharacter; // column it begins at
workflow.startOffset; // offset from the start of the document
workflow.endLine;
workflow.endCharacter;
workflow.endOffset;
```

For a plain object, positions refer to the JSON the parser generated from it, not to anything in your program. The ApiDOM data model documentation covers [source maps](https://github.com/speclynx/apidom/tree/main/packages/apidom-datamodel#source-maps) in full.

### Style preservation {#style}

With `style: true` and `strict: false`, the parser records formatting detail on each element: YAML quoting, flow versus block style, comments, indentation, and for JSON the indentation and the raw text of numbers. `toYAML` and `toJSON` from `@speclynx/apidom-core` can then reproduce the original formatting:

```js
import { parseArazzo } from '@usearazzo/parser';
import { toYAML, toJSON } from '@speclynx/apidom-core';

const fromYAML = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { style: true, strict: false } },
});
const yaml = toYAML(fromYAML.api, { preserveStyle: true });

const fromJSON = await parseArazzo('/path/to/adopt-a-pet.arazzo.json', {
  parse: { parserOpts: { style: true, strict: false } },
});
const json = toJSON(fromJSON.api, undefined, undefined, { preserveStyle: true });
```

`style` and `sourceMap` are independent and can be enabled together.

## Source descriptions {#source-descriptions}

An Arazzo document points at the APIs its workflows call through the [Source Description Object](https://spec.openapis.org/arazzo/latest.html#source-description-object). The parser can follow those pointers and parse what it finds, so that one call gives you the workflow document and every OpenAPI or Arazzo document it depends on.

This is off by default. Following references means reading files and making network requests, so you opt in per call.

### Enabling {#enabling}

```js
import { parseArazzo } from '@usearazzo/parser';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: true } },
});
```

The option can also be set per parser, which matters only when you configure the JSON and YAML parsers differently:

```js
const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: {
    parserOpts: {
      'arazzo-json-1': { sourceDescriptions: true },
      'arazzo-yaml-1': { sourceDescriptions: true },
    },
  },
});
```

Relative `url` values resolve against the URI the parent document was retrieved from. A parent passed as an object or inline string without `resolve.baseURI` has a synthetic `memory://` URI, so a relative `url` under it cannot be retrieved. The source description then gets an `error` annotation saying so. Provide [`resolve.baseURI`](#base-uri), use absolute `file://` or `https://` URLs, or declare a `$self` with a scheme on the parent.

### Selective parsing {#selective}

Pass an array of names to parse only some source descriptions:

```js
const parseResult = await parseArazzo('/path/to/onboarding.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: ['petstore'] } },
});
```

### Result structure {#result-structure}

Every document that is a direct source description of the main document is added to the main `ParseResultElement` as a further top-level member. The first member is always the main document. Documents discovered while recursing into an Arazzo source description are nested beneath the element that referenced them, not repeated at the top level:

```text
ParseResultElement                       onboarding.arazzo.yaml
├── .api: ArazzoSpecification1Element    the main document
├── ParseResultElement (petstore)        direct source description
│   └── .api: OpenApi3_1Element
└── ParseResultElement (adoption)        direct source description, type arazzo
    ├── .api: ArazzoSpecification1Element
    └── ParseResultElement (petstore)    reached again: shared, not reparsed
        └── .meta parseResult            points at the petstore element above
```

Each parsed document lands in the ApiDOM namespace for its type:

| Document | Namespace |
|---|---|
| Arazzo 1.x | [@speclynx/apidom-ns-arazzo-1](https://github.com/speclynx/apidom/tree/main/packages/apidom-ns-arazzo-1) |
| OpenAPI 2.0 | [@speclynx/apidom-ns-openapi-2](https://github.com/speclynx/apidom/tree/main/packages/apidom-ns-openapi-2) |
| OpenAPI 3.0.x | [@speclynx/apidom-ns-openapi-3-0](https://github.com/speclynx/apidom/tree/main/packages/apidom-ns-openapi-3-0) |
| OpenAPI 3.1.x | [@speclynx/apidom-ns-openapi-3-1](https://github.com/speclynx/apidom/tree/main/packages/apidom-ns-openapi-3-1) |

Source description members carry the `source-description` class and their `name` and `type` in metadata:

```js
import { parseArazzo } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: true } },
});

parseResult.length; // 1 main document + N direct source descriptions

for (let i = 0; i < parseResult.length; i += 1) {
  const element = parseResult.get(i);
  if (element.classes.includes('source-description')) {
    const name = toValue(element.meta.get('name'));
    const type = toValue(element.meta.get('type'));
    const api = element.api; // the parsed OpenAPI or Arazzo document
  }
}
```

### Via SourceDescriptionElement {#via-source-description}

The same `ParseResultElement` is also attached to the `SourceDescriptionElement` that referenced it, under the `parseResult` metadata key. Use this route when you start from a position in the `sourceDescriptions` array, or need to correlate a parsed document with its declaration:

```js
import { parseArazzo } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';

const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: true } },
});

const sourceDescription = parseResult.api.sourceDescriptions.get(0);
const nested = sourceDescription.meta.get('parseResult');

if (nested.errors.length === 0) {
  nested.api.element; // 'openApi3_1'
  toValue(nested.meta.get('retrievalURI')); // where it was fetched from
}
```

### Recursion and depth {#recursion}

A source description of type `arazzo` is parsed with its own source descriptions followed in turn, so a tree of workflow documents comes back in one call. `sourceDescriptionsMaxDepth` caps how far that goes:

```js
const parseResult = await parseArazzo('/path/to/adopt-a-pet.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: true, sourceDescriptionsMaxDepth: 2 } },
});
```

The default is `+Infinity`. At `0` no source description is parsed and each gets an `error` annotation instead.

### Cycles and shared documents {#cycles}

A true cycle, where a document references one of its own ancestors, is detected and reported as a `warning` annotation on the source description that closes the loop. Parsing continues; nothing recurses forever.

Reaching the same document twice through different paths is not a cycle. The common case is one OpenAPI description shared by several workflow documents. The parser parses it once. Every later source description pointing at it gets a `ParseResultElement` with no `api` of its own, an `info` annotation, and a `parseResult` metadata entry pointing at the element where the document was actually parsed. The `SourceDescriptionElement`'s `parseResult` metadata points there too:

```js
// onboarding.arazzo.yaml references petstore.openapi.yaml and adopt-a-pet.arazzo.yaml
// adopt-a-pet.arazzo.yaml references petstore.openapi.yaml as well: shared, not a cycle

const parseResult = await parseArazzo('/path/to/onboarding.arazzo.yaml', {
  parse: { parserOpts: { sourceDescriptions: true } },
});

parseResult.length; // 3: the main document, petstore, adoption
const adoption = parseResult.get(2);
const shared = adoption.api.sourceDescriptions.get(0).meta.get('parseResult');
shared === parseResult.get(1); // true: the petstore element parsed for onboarding
adoption.get(1).api; // undefined: the nested petstore entry is a pointer, not a second parse
```

### Annotations {#annotations}

Problems while parsing source descriptions never throw. They become annotation elements on the source description's own result, so the main document and every other source description still parse:

| Class | Meaning | Examples |
|---|---|---|
| `error` | That source description could not be parsed. | File not found, unparseable document, depth limit reached, relative URL under an inline parent. |
| `warning` | Parsed, with something to know. | A cycle was cut, or the declared `type` does not match the document found. |
| `info` | Nothing went wrong. | A shared document was reused instead of parsed again. |

```js
for (let i = 0; i < parseResult.length; i += 1) {
  const element = parseResult.get(i);
  if (element.classes.includes('source-description')) {
    const name = toValue(element.meta.get('name'));
    element.errors.forEach((error) => console.error(`${name}: ${toValue(error)}`));
    element.warnings.forEach((warning) => console.warn(`${name}: ${toValue(warning)}`));
  }
}
```

## parseOpenAPI {#parse-openapi}

```ts
parseOpenAPI(source: string | Record<string, unknown>, options?: ParseOpenAPIOptions): Promise<ParseResultElement>
```

Parses an OpenAPI document on its own. Use it when you resolve source descriptions yourself, or when the OpenAPI document is what you have. It accepts the same four kinds of input as `parseArazzo`, takes the same options including `resolve.baseURI`, throws the same `ParseError`, and returns a `ParseResultElement` whose `api` is the element for the document's version: `openApi2`, `openApi3_0`, or `openApi3_1`.

```js
import { parseOpenAPI } from '@usearazzo/parser';

await parseOpenAPI({ openapi: '3.1.0', info: { title: 'Petstore', version: '1.0.0' }, paths: {} });
await parseOpenAPI('/path/to/petstore.openapi.yaml');
await parseOpenAPI('https://example.com/petstore.openapi.yaml');
```

## parseRuntimeExpression {#parse-runtime-expression}

```ts
parseRuntimeExpression(expression: string, options?: ParseRuntimeExpressionOptions): ParseRuntimeExpressionResult
```

Parses a bare [runtime expression](https://spec.openapis.org/arazzo/latest.html#runtime-expressions) into an AST. Bare means without the surrounding braces: `$inputs.username`, not `{$inputs.username}`. The function is synchronous and needs no document. Invalid syntax never throws; it is reported through the returned `result`, which makes the function safe as a pure syntax check when linting the expressions embedded in a document.

```js
import { parseRuntimeExpression } from '@usearazzo/parser';

const { result, tree } = parseRuntimeExpression('$steps.findPet.outputs.petId');
result.success; // true
tree; // { type: 'StepsExpression', stepId: 'findPet', field: 'outputs', outputName: 'petId' }

const invalid = parseRuntimeExpression('$unknown.thing');
invalid.result.success; // false
invalid.tree; // undefined
invalid.result.maxMatched; // offset up to which parsing succeeded
```

The return value is `{ result, tree, stats, trace }`. `result.success` says whether the whole string parsed; `result.matched` and `result.maxMatched` are offsets into the input.

It throws in two cases only:

- `TypeError` when `expression` is not a string.
- `ArazzoRuntimeExpressionParseError` on an unexpected internal error, which is distinct from invalid syntax.

```js
import { parseRuntimeExpression, ArazzoRuntimeExpressionParseError } from '@usearazzo/parser';

try {
  parseRuntimeExpression(expression);
} catch (error) {
  if (error instanceof ArazzoRuntimeExpressionParseError) {
    console.error('Unexpected parser error:', error.cause);
  }
  throw error;
}
```

The function wraps [@swaggerexpert/arazzo-runtime-expression](https://www.npmjs.com/package/@swaggerexpert/arazzo-runtime-expression), and `RuntimeExpressionASTNode` and `ParseRuntimeExpressionResult` are that package's types under this package's names. Splitting a `{expression}` template into literal and expression spans, or interpolating one, stays with that package's `extract` and `interpolate` functions.

## parseCriterionCondition {#parse-criterion-condition}

```ts
parseCriterionCondition(condition: string, options?: ParseCriterionConditionOptions): ParseCriterionConditionResult
```

Parses the [Criterion Object](https://spec.openapis.org/arazzo/latest.html#criterion-object)'s `simple` condition grammar into an AST. It behaves like `parseRuntimeExpression`: synchronous, no document, invalid syntax reported through `result` rather than thrown. Each runtime expression operand inside the condition is parsed too, and its sub-AST rides on the `RuntimeExpression` node that holds it.

```js
import { parseCriterionCondition } from '@usearazzo/parser';

const { result, tree } = parseCriterionCondition('$statusCode == 200');
result.success; // true
tree.type; // 'BinaryExpression'

const invalid = parseCriterionCondition('$statusCode ===');
invalid.result.success; // false
invalid.tree; // undefined
```

It throws a `TypeError` for a non-string `condition` and an `ArazzoCriterionParseError` on an unexpected internal error. The function wraps [@swaggerexpert/arazzo-criterion](https://www.npmjs.com/package/@swaggerexpert/arazzo-criterion); `CriterionConditionAST` and `ParseCriterionConditionResult` are its types.

[JSONPath](https://datatracker.ietf.org/doc/html/rfc9535) and [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901), which can appear inside expressions, are general-purpose syntaxes with their own ecosystems and are out of scope here. Use `@swaggerexpert/jsonpath` or a JSON Pointer library directly for those.

## Working with the tree {#apidom}

The document parsers return ApiDOM, so every ApiDOM tool applies. Two packages cover most needs.

[@speclynx/apidom-core](https://github.com/speclynx/apidom/tree/main/packages/apidom-core) converts and serializes:

```js
import { parseArazzo } from '@usearazzo/parser';
import { toValue, toJSON, toYAML, sexprs } from '@speclynx/apidom-core';
import { cloneDeep, cloneShallow } from '@speclynx/apidom-datamodel';

const { api } = await parseArazzo(source);

const object = toValue(api); // plain JavaScript value
const json = toJSON(api); // JSON string
const yaml = toYAML(api); // YAML string
const deep = cloneDeep(api);
const shallow = cloneShallow(api);
const sexpr = sexprs(api); // S-expression dump, handy when debugging
```

[@speclynx/apidom-traverse](https://github.com/speclynx/apidom/tree/main/packages/apidom-traverse) walks the tree with visitors keyed by element type:

```js
import { parseArazzo } from '@usearazzo/parser';
import { traverse } from '@speclynx/apidom-traverse';

const { api } = await parseArazzo(source);
const steps = [];

traverse(api, {
  StepElement(path) {
    steps.push(path.node);
    if (steps.length >= 10) path.stop();
  },
});
```

The [SpecLynx ApiDOM](https://github.com/speclynx/apidom) repository documents the rest.

## Supported versions {#versions}

Arazzo documents:

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0)

OpenAPI documents, as source descriptions or through `parseOpenAPI`:

- [OpenAPI 2.0](https://spec.openapis.org/oas/v2.0)
- [OpenAPI 3.0.x](https://spec.openapis.org/oas/v3.0.4)
- [OpenAPI 3.1.x](https://spec.openapis.org/oas/v3.1.2)

Both JSON and YAML are accepted for every version. The format is detected from the content, not the file extension.

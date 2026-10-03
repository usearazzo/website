---
title: "Arazzo Validator API Reference: @usearazzo/validator"
description: "Validate and lint Arazzo documents in JavaScript, with LSP diagnostics. Every function, option, error, and rule of @usearazzo/validator."
lead: "Validate and lint Arazzo documents in JavaScript, and get Language Server Protocol diagnostics back. Every function, option, diagnostic, error, and rule of @usearazzo/validator."
date: 2026-10-03
status: Published
package:
  name: "@usearazzo/validator"
  npm: https://www.npmjs.com/package/@usearazzo/validator
  github: https://github.com/usearazzo/arazzo-toolkit/tree/main/packages/validator
toc:
  - id: install
    title: Installation
  - id: exports
    title: Exports
  - id: validate-uri
    title: validateURI
    children:
      - id: validate-uri-inputs
        title: Inputs
      - id: validate-uri-resolve
        title: Fetching the document
      - id: errors
        title: Errors
  - id: validate
    title: validate
    children:
      - id: text-document
        title: TextDocument
      - id: relative-urls
        title: Relative URLs
      - id: not-detected
        title: Documents that are not Arazzo
  - id: diagnostics
    title: Diagnostics
    children:
      - id: diagnostic-shape
        title: Shape
      - id: diagnostic-codes
        title: Codes and sources
  - id: options
    title: Options
    children:
      - id: validation-context
        title: What runs
      - id: parse-context
        title: Source descriptions
      - id: defaults
        title: Defaults and merging
  - id: untrusted
    title: Untrusted documents
    children:
      - id: untrusted-off
        title: No access beyond the document
      - id: untrusted-directory
        title: One directory only
  - id: rules
    title: Rules
    children:
      - id: any-object
        title: Any object
      - id: arazzo-object
        title: Arazzo Specification Object
      - id: info-object
        title: Info Object
      - id: source-description-object
        title: Source Description Object
      - id: workflow-object
        title: Workflow Object
      - id: step-object
        title: Step Object
      - id: parameter-object
        title: Parameter Object
      - id: success-action-object
        title: Success Action Object
      - id: failure-action-object
        title: Failure Action Object
      - id: components-object
        title: Components Object
      - id: reusable-object
        title: Reusable Object
      - id: criterion-object
        title: Criterion Object
      - id: expression-type-object
        title: Criterion Expression Type Object
      - id: request-body-object
        title: Request Body Object
      - id: payload-replacement-object
        title: Payload Replacement Object
      - id: selector-object
        title: Selector Object
      - id: schema-object
        title: Schema Object
  - id: versions
    title: Supported versions
---

`@usearazzo/validator` checks an Arazzo document and reports every problem it finds. Problems come back as [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) diagnostics: a location, a severity, a code, and a message. An editor can underline them, a CI step can count them, and a terminal can print them.

The checks come from the [SpecLynx ApiDOM Language Service](https://www.npmjs.com/package/@speclynx/api-languageservice). Documents are read with [`@usearazzo/parser`](/docs/parser/).

## Installation {#install}

```sh
npm install @usearazzo/validator
```

The package ships ESM and CommonJS builds with TypeScript declarations, and requires Node.js 20.10 or newer. It is pre-1.0: the version documented here is an alpha, and the API may still change before the stable release.

## Exports {#exports}

| Export | Kind | What it is |
|---|---|---|
| `validateURI` | function | Validate a document from a path or URL. |
| `validate` | function | Validate a document already in memory, as a `TextDocument`. |
| `createTextDocument` | function | Wrap a URI and content in a `TextDocument` ready for `validate`. |
| `TextDocument` | class | Re-exported from `vscode-languageserver-textdocument`. |
| `ARAZZO_LANGUAGE_ID`, `DEFAULT_DOCUMENT_VERSION` | constant | The language ID (`'apidom'`) and version (`1`) `createTextDocument` uses. |
| `defaultLanguageServiceContext` | constant | The validation settings your options are merged over. |
| `defaultArazzoResolveOptions` | constant | The file and HTTP resolvers `validateURI` fetches the document with. |
| `ValidateError` | class | Thrown when `validateURI` cannot fetch the document. |
| `Diagnostic`, `DiagnosticSeverity` | type, constant | Re-exported from `vscode-languageserver-types`. |
| `LanguageServiceContext` | type | The shape of the options. |

## validateURI {#validate-uri}

```ts
validateURI(
  uri: string,
  context?: PartialDeep<LanguageServiceContext>,
  resolveOptions?: PartialDeep<ApiDOMReferenceResolveOptions>,
): Promise<Diagnostic[]>
```

Fetches the document at `uri`, validates it, and returns every diagnostic:

```js
import { validateURI, DiagnosticSeverity } from '@usearazzo/validator';

const diagnostics = await validateURI('/path/to/adopt-a-pet.arazzo.yaml');
const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);
const isValid = errors.length === 0;
```

An empty array means nothing was found. A document with problems is not an error: it resolves to its diagnostics like any other.

### Inputs {#validate-uri-inputs}

`uri` is a location, as a string:

- **A file system path.** A relative path is read from the current working directory.
- **A `file://` URL.**
- **An HTTP or HTTPS URL.**

```js
await validateURI('./adopt-a-pet.arazzo.yaml');
await validateURI('file:///path/to/adopt-a-pet.arazzo.yaml');
await validateURI('https://example.com/adopt-a-pet.arazzo.yaml');
```

All three forms land on the same absolute location. Relative URLs inside the document, such as `sourceDescriptions[].url: ./petstore.openapi.json`, resolve against it, whichever form you passed.

The second argument is the [options](#options), shared with `validate`.

### Fetching the document {#validate-uri-resolve}

`validateURI` reads the document with the parser's file and HTTP resolvers, exported as `defaultArazzoResolveOptions`:

- **Files.** Only `.json`, `.yaml`, and `.yml` files are read, dotfiles included.
- **HTTP.** A 15 second timeout, at most 5 redirects, and no credentials.

The third argument is merged over them. It is an [ApiDOM reference resolve options](https://github.com/speclynx/apidom/blob/main/packages/apidom-reference/src/options/index.ts) object. `resolverOpts` entries are set on each resolver, so the keys worth setting are the resolver's own: `timeout`, `redirects`, `withCredentials`, and `cache` for HTTP.

```js
const diagnostics = await validateURI('https://example.com/adopt-a-pet.arazzo.yaml', {}, {
  resolverOpts: { timeout: 10000 },
});
```

These resolvers fetch the entry document only. What source descriptions may read is a separate setting, [`parseContext.fileAllowList`](#parse-context).

### Errors {#errors}

`validateURI` throws a `ValidateError` only when it cannot fetch the document: a missing file, an HTTP error, a file the resolvers do not allow. The message names the location you passed. The underlying error is on `cause`:

```js
import { validateURI, ValidateError } from '@usearazzo/validator';

try {
  await validateURI('./missing.arazzo.yaml');
} catch (error) {
  if (error instanceof ValidateError) {
    error.message; // 'Failed to read Arazzo Document at "./missing.arazzo.yaml"'
    error.cause.message; // 'Error while reading file "/home/you/project/missing.arazzo.yaml"'
  }
  throw error;
}
```

The cause comes from ApiDOM. Its `name` is often `ResolveError`, ApiDOM's own class of that name. Use `instanceof` on the outer error only.

Everything wrong with a document that was fetched is a diagnostic, never an exception. That includes a document that is not Arazzo at all: see [Documents that are not Arazzo](#not-detected).

## validate {#validate}

```ts
validate(
  textDocument: TextDocument,
  context?: PartialDeep<LanguageServiceContext>,
): Promise<Diagnostic[]>
```

Validates content you already hold. It fetches nothing for the document itself, and never throws for a bad document.

```js
import { validate, createTextDocument } from '@usearazzo/validator';

const textDocument = createTextDocument('file:///path/to/adopt-a-pet.arazzo.yaml', yamlText);
const diagnostics = await validate(textDocument);
```

`validateURI` is this function with a fetch in front of it. It reads the document, wraps it in a `TextDocument` named after the absolute location, and calls `validate`.

### TextDocument {#text-document}

`validate` takes a [`TextDocument`](https://www.npmjs.com/package/vscode-languageserver-textdocument), the document model of the Language Server Protocol. An editor extension already has one. Anything else can build one:

```js
import { createTextDocument, TextDocument } from '@usearazzo/validator';

const a = createTextDocument('file:///path/to/adopt-a-pet.arazzo.yaml', yamlText);
const b = TextDocument.create('file:///path/to/adopt-a-pet.arazzo.yaml', 'apidom', 1, yamlText);
```

Both are the same document. `createTextDocument` fills in `ARAZZO_LANGUAGE_ID` and `DEFAULT_DOCUMENT_VERSION` for you. JSON and YAML are both accepted; the format is detected from the content.

### Relative URLs {#relative-urls}

A relative `sourceDescriptions[].url` resolves against the `TextDocument`'s URI. Give the `TextDocument` the document's real, absolute location, such as `file:///path/to/adopt-a-pet.arazzo.yaml` or `https://example.com/adopt-a-pet.arazzo.yaml`. A made-up URI works for everything else, but its source descriptions then resolve against the made-up location.

### Documents that are not Arazzo {#not-detected}

Content that is not recognized as Arazzo returns exactly one diagnostic, spanning the whole document, and nothing else runs:

```json
{
  "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 3, "character": 0 } },
  "severity": 1,
  "code": 9000001,
  "source": "apilint",
  "message": "Document content is not recognized as an Arazzo Specification"
}
```

That covers an OpenAPI document, a JSON or YAML array, an empty file, and a document that matches both Arazzo and another specification.

It also covers YAML that does not parse, anywhere in the document: a YAML syntax error is reported this way, not as a syntax error at its location. JSON is different. A JSON syntax error comes back as a diagnostic at the error, with source `syntax` and code `0`, alongside the rules that still apply to what did parse.

## Diagnostics {#diagnostics}

Both functions return an array of [`Diagnostic`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic) objects, the type VS Code and every Language Server Protocol client render.

### Shape {#diagnostic-shape}

A workflow whose two steps share a `stepId` reports each step:

```json
{
  "range": { "start": { "line": 12, "character": 8 }, "end": { "line": 15, "character": 41 } },
  "severity": 1,
  "code": 9040403,
  "source": "apilint",
  "message": "Every step must have a unique 'stepId' within a workflow."
}
```

Every diagnostic has these five fields:

| Field | What it holds |
|---|---|
| `range` | Where the problem is. Lines and characters count from `0`. |
| `severity` | `1` error, `2` warning, `4` hint. Compare against `DiagnosticSeverity`. |
| `code` | Which rule fired. See [Codes and sources](#diagnostic-codes). |
| `source` | Which part of the validator reported it. |
| `message` | A human-readable description. |

Warnings and hints are advice, not violations. A missing `description` on a workflow is a warning; a missing `summary` is a hint. To decide whether a document is valid, count errors only.

### Codes and sources {#diagnostic-codes}

| Source | Code | Reported by |
|---|---|---|
| `apilint` | A number, such as `9040403` | A [rule](#rules). The number is stable: match on it. |
| `apilint` | `9000001` | The document is [not Arazzo](#not-detected). |
| `apilint` | A generated string | A `$ref` whose target does not exist (message `local reference not found`). |
| `syntax` | `0` | A JSON syntax error. |
| `Arazzo 1.0 Schema` | `'json-schema'` | [JSON Schema validation](#validation-context), when enabled. |

The code of an unresolvable `$ref` is different on every run, so it cannot be matched on. Match on the message instead.

The numeric codes have names in `ApilintCodes`, exported by `@speclynx/api-languageservice`. `ApilintCodes.ARAZZO_NOT_DETECTED` is `9000001`, for example.

## Options {#options}

The second argument of both functions is a deep-partial `LanguageServiceContext`. It is merged over [`defaultLanguageServiceContext`](#defaults).

### What runs {#validation-context}

Five options under `validationContext` decide which checks run and how their messages read:

| Option | Default | Effect when on |
|---|---|---|
| `semanticValidation` | `true` | Every [rule](#rules) runs. |
| `semanticLinting` | `true` | Only rules marked as lint rules run. No Arazzo rule is, so on its own it adds nothing. |
| `referenceValidation` | `true` | Every local `$ref` inside a JSON Schema, such as `#/components/inputs/adopter`, must point at something that exists. External `$ref`s to other files are not checked. |
| `jsonSchemaValidation` | `false` | Arazzo 1.0.x documents are also checked against the Arazzo 1.0 JSON Schema. Arazzo 1.1.0 documents get no JSON Schema check. |
| `betterAjvErrors` | `true` | Friendlier messages for JSON Schema validation. |

Turning `semanticValidation` off therefore turns every rule off, whatever `semanticLinting` says.

JSON Schema validation is off by default because the rules already report most of what it finds, so turning it on mostly doubles the output. What it adds is structural, such as telling the variants of a Reusable Object apart:

```json
{
  "range": { "start": { "line": 1, "character": 0 }, "end": { "line": 1, "character": 4 } },
  "severity": 1,
  "code": "json-schema",
  "source": "Arazzo 1.0 Schema",
  "message": "\"info\" property must have required property \"version\""
}
```

```js
const diagnostics = await validateURI('/path/to/adopt-a-pet.arazzo.yaml', {
  validationContext: { jsonSchemaValidation: true },
});
```

### Source descriptions {#parse-context}

The documents listed under `sourceDescriptions` are fetched and parsed while the entry document is validated. Two options under `parseContext` control that:

| Option | Default | Effect |
|---|---|---|
| `arazzo.sourceDescriptionsResolution` | `true` | Fetch and parse each source description. |
| `fileAllowList` | `[/\.json$/i, /\.ya?ml$/i]` | Which local files a source description may read. An empty array turns resolution off entirely. |

The default allow list matches the parser's: local `.json`, `.yaml`, and `.yml` files, dotfiles included, and nothing else. Its entries are regular expressions, tested against the file's absolute path. Glob strings are accepted too, but a glob such as `'*'` never matches a dotfile such as `.petstore.yaml`. HTTP and HTTPS source descriptions are not affected by this list.

No rule reads the parsed source descriptions yet. A source description that is missing, cannot be fetched, or does not parse produces no diagnostic, and an `operationId` is not checked against the OpenAPI document it names. The rules check the shape of `$sourceDescriptions` expressions, and resolve workflows and steps within the document itself.

### Defaults and merging {#defaults}

```js
import { defaultLanguageServiceContext } from '@usearazzo/validator';

console.dir(defaultLanguageServiceContext, { depth: null });
```

Your options are merged over the defaults key by key. Objects merge; arrays and every other value replace. Setting `fileAllowList` therefore replaces the default list, it does not add to it:

```js
// read .json, .yaml, .yml, and .openapi files
const diagnostics = await validateURI('/path/to/adopt-a-pet.arazzo.yaml', {
  parseContext: { fileAllowList: [/\.json$/i, /\.ya?ml$/i, /\.openapi$/i] },
});
```

The defaults also set `defaultContentLanguage` to Arazzo 1.0.1. That is not the version checked: each document is checked against the version in its own `arazzo` field.

## Untrusted documents {#untrusted}

An Arazzo document decides what its source descriptions point at. By default the validator reads every `.json`, `.yaml`, and `.yml` file a source description names, wherever it is, and fetches every HTTP and HTTPS one. For a document you wrote, that is what you want. For a document you did not, restrict it.

### No access beyond the document {#untrusted-off}

Turn source description resolution off. The validator then reads the entry document and nothing else:

```js
const diagnostics = await validateURI('/path/to/untrusted.arazzo.yaml', {
  parseContext: {
    fileAllowList: [],
    arazzo: { sourceDescriptionsResolution: false },
  },
});
```

Since [no rule reads source descriptions yet](#parse-context), this changes no diagnostic today.

### One directory only {#untrusted-directory}

To let source descriptions resolve, but only inside one directory, anchor the allow list to that directory:

```js
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// percent-encoded the way the validator encodes paths, with the trailing slash
const root = encodeURI('/home/you/specs/').replace(/#/g, '%23').replace(/\?/g, '%3F');

const diagnostics = await validateURI('/home/you/specs/adopt-a-pet.arazzo.yaml', {
  parseContext: {
    fileAllowList: [new RegExp(`^${escapeRegExp(root)}.*\\.(json|ya?ml)$`, 'i')],
  },
});
```

The pattern is tested against the final, absolute location, so a URL cannot climb out of the directory:

- `../` segments are resolved first. `./sub/../other/../petstore.json` is tested as `/home/you/specs/petstore.json`.
- Percent-encoded dots are decoded first. `./%2e%2e/%2e%2e/secrets.json` is tested as the real path outside the directory, and rejected.
- The path is percent-encoded when tested: a space is `%20`, `#` is `%23`, and `?` is `%3F`. That is why `root` is encoded the same way. `encodeURI` alone leaves `#` and `?` as they are.

Three limits:

- **Keep the trailing slash.** Without it, `/home/you/specs` also matches `/home/you/specs-private/`.
- **Symlinks are not resolved.** The check compares paths, not files on disk. A symlink inside the directory that points outside it passes.
- **HTTP is not covered.** The allow list is for local files only. To stop network access as well, turn resolution off as [above](#untrusted-off).

## Rules {#rules}

Every rule the validator runs on an Arazzo document, grouped by the object it checks. All of them run when `semanticValidation` is on, which is the default.

- **Rule** is the diagnostic's `code`, the number to match on, with the rule's name in `ApilintCodes` under it. The name never appears in a diagnostic, but it says what the rule checks.
- **Only in** marks a rule that applies to Arazzo 1.0.x or 1.1.0 documents only. Empty means both.

The messages are quoted exactly as the validator reports them.

<div class="rules-card" markdown="1">

### Any object {#any-object}

Applies to every object in the document.

| Rule | Severity | Message |
|---|---|---|
| **14999**<br><code class="rule-name">DUPLICATE_<wbr>KEYS</code> | <span class="badge badge-error">Error</span> | an object cannot contain duplicate keys |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Arazzo Specification Object {#arazzo-object}

The document root.

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9020100**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>ARAZZO_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have an \'arazzo\' version field |  |
| **9020101**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>ARAZZO_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | arazzo version must be a string |  |
| **9020102**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>ARAZZO_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | arazzo version must match the pattern 1.0.x or 1.1.x |  |
| **9020200**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>INFO_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have an \'info\' object |  |
| **9020201**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>INFO_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | info must be an object |  |
| **9020300**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>SOURCE_<wbr>DESCRIPTIONS_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'sourceDescriptions\' list |  |
| **9020301**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>SOURCE_<wbr>DESCRIPTIONS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | sourceDescriptions must be an array of Source Description Objects |  |
| **9020302**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>SOURCE_<wbr>DESCRIPTIONS_<wbr>NON_<wbr>EMPTY</code> | <span class="badge badge-error">Error</span> | sourceDescriptions must have at least one entry |  |
| **9020400**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>WORKFLOWS_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'workflows\' list |  |
| **9020401**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>WORKFLOWS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflows must be an array of Workflow Objects |  |
| **9020402**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>WORKFLOWS_<wbr>NON_<wbr>EMPTY</code> | <span class="badge badge-error">Error</span> | workflows must have at least one entry |  |
| **9020500**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>COMPONENTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | components must be an object |  |
| **9020700**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>$SELF_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | $self must be a string | <span class="badge badge-version">1.1.0</span> |
| **9020701**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>$SELF_<wbr>FORMAT_<wbr>URI</code> | <span class="badge badge-error">Error</span> | $self must be in the format of a URI-reference. | <span class="badge badge-version">1.1.0</span> |
| **9020702**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>FIELD_<wbr>$SELF_<wbr>NO_<wbr>FRAGMENT</code> | <span class="badge badge-error">Error</span> | $self MUST NOT contain a fragment identifier | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Info Object {#info-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9010100**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | description must be a string |
| **9010101**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>RECOMMENDED</code> | <span class="badge badge-warning">Warning</span> | Info \'description\' should be present and non-empty string. |
| **9010200**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>TITLE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'title\' |
| **9010201**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>TITLE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | title must be a string |
| **9010300**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>VERSION_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'version\' |
| **9010301**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>VERSION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | version must be a string |
| **9010400**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>SUMMARY_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | summary must be a string |
| **9010401**<br><code class="rule-name">ARAZZO_<wbr>INFO_<wbr>FIELD_<wbr>SUMMARY_<wbr>RECOMMENDED</code> | <span class="badge badge-hint">Hint</span> | Info \'summary\' is recommended to be present and a non-empty string. |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown title must not contain \"&lt;script&gt;\" tags. |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown description must not contain \"&lt;script&gt;\" tags. |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown summary must not contain \"&lt;script&gt;\" tags. |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Source Description Object {#source-description-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9030100**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>NAME_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'name\' |  |
| **9030101**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>NAME_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | name must be a string |  |
| **9030102**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>NAME_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | name SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9030200**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>URL_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'url\' |  |
| **9030201**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>URL_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | url must be a string |  |
| **9030300**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be a string |  |
| **9030301**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'openapi\', \'arazzo\' | <span class="badge badge-version">1.0.x</span> |
| **9030301**<br><code class="rule-name">ARAZZO_<wbr>SOURCE_<wbr>DESCRIPTION_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'openapi\', \'arazzo\', \'asyncapi\' | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Workflow Object {#workflow-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown summary must not contain \"&lt;script&gt;\" tags. |  |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown description must not contain \"&lt;script&gt;\" tags. |  |
| **9040100**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'workflowId\' |  |
| **9040101**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId must be a string |  |
| **9040102**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | workflowId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9040103**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Every workflow must have a unique \'workflowId\'. |  |
| **9040200**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>SUMMARY_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | summary must be a string |  |
| **9040201**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | description must be a string |  |
| **9040202**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>RECOMMENDED</code> | <span class="badge badge-warning">Warning</span> | Workflow \'description\' should be present and non-empty string. |  |
| **9040203**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>SUMMARY_<wbr>RECOMMENDED</code> | <span class="badge badge-hint">Hint</span> | Workflow \'summary\' is recommended to be present and a non-empty string. |  |
| **9040300**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>INPUTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | inputs must be a JSON Schema object |  |
| **9040400**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>STEPS_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'steps\' list |  |
| **9040401**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>STEPS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | steps must be an array of Step Objects |  |
| **9040402**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>STEPS_<wbr>NON_<wbr>EMPTY</code> | <span class="badge badge-error">Error</span> | steps must have at least one entry |  |
| **9040500**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | dependsOn must be an array of strings |  |
| **9040501**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | \'dependsOn\' entries must be unique. |  |
| **9040502**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | \"dependsOn\" entries must reference existing workflow IDs. |  |
| **9040503**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | dependsOn entry references a sourceDescription that is not of type \'arazzo\' |  |
| **9040600**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>SUCCESS_<wbr>ACTIONS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | successActions must be an array of Success Action or Reusable Objects |  |
| **9040700**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>FAILURE_<wbr>ACTIONS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | failureActions must be an array of Failure Action or Reusable Objects |  |
| **9040800**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | outputs must be an object |  |
| **9040801**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | output keys must match the pattern [a-zA-Z0-9.\\-_]+ |  |
| **9040802**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | output values must be strings (Runtime Expressions) | <span class="badge badge-version">1.0.x</span> |
| **9040802**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | output values must be strings (Runtime Expressions) or Selector Objects | <span class="badge badge-version">1.1.0</span> |
| **9040803**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>NAMES_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Workflow output names must be unique. |  |
| **9040804**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>RUNTIME_<wbr>EXPRESSION</code> | <span class="badge badge-error">Error</span> | Workflow output values must be valid Arazzo Runtime Expressions. |  |
| **9040900**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>PARAMETERS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters must be an array of Parameter or Reusable Objects |  |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Step Object {#step-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown description must not contain \"&lt;script&gt;\" tags. |  |
| **9040403**<br><code class="rule-name">ARAZZO_<wbr>WORKFLOW_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Every step must have a unique \'stepId\' within a workflow. |  |
| **9050100**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'stepId\' |  |
| **9050101**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | stepId must be a string |  |
| **9050102**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | stepId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9050200**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | description must be a string |  |
| **9050201**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DESCRIPTION_<wbr>RECOMMENDED</code> | <span class="badge badge-warning">Warning</span> | Step \'description\' should be present and non-empty string. |  |
| **9050300**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | operationId must be a string |  |
| **9050301**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>PATH_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | operationPath must be a string |  |
| **9050302**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId must be a string |  |
| **9050303**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>PATH_<wbr>PREFER_<wbr>OPERATION_<wbr>ID</code> | <span class="badge badge-hint">Hint</span> | It is recommended to use \'operationId\' rather than \'operationPath\'. |  |
| **9050304**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | Step \"workflowId\" must reference an existing workflow. |  |
| **9050305**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | workflowId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9050306**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>ID_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | operationId references a sourceDescription that is not of type \'openapi\' | <span class="badge badge-version">1.0.x</span> |
| **9050306**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>ID_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | operationId references a sourceDescription that is not of type \'openapi\' or \'asyncapi\' | <span class="badge badge-version">1.1.0</span> |
| **9050307**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId references a sourceDescription that is not of type \'arazzo\' |  |
| **9050400**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>REQUEST_<wbr>BODY_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | requestBody must be a Request Body Object |  |
| **9050500**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>SUCCESS_<wbr>CRITERIA_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | successCriteria must be an array of Criterion Objects |  |
| **9050600**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>ON_<wbr>SUCCESS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | onSuccess must be an array of Success Action or Reusable Objects |  |
| **9050700**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>ON_<wbr>FAILURE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | onFailure must be an array of Failure Action or Reusable Objects |  |
| **9050800**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | outputs must be an object |  |
| **9050801**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | output keys must match the pattern [a-zA-Z0-9.\\-_]+ |  |
| **9050802**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | output values must be strings (Runtime Expressions) | <span class="badge badge-version">1.0.x</span> |
| **9050802**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | output values must be strings (Runtime Expressions) or Selector Objects | <span class="badge badge-version">1.1.0</span> |
| **9050803**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>NAMES_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Step output names must be unique. |  |
| **9050804**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OUTPUTS_<wbr>VALUES_<wbr>RUNTIME_<wbr>EXPRESSION</code> | <span class="badge badge-error">Error</span> | Step output values must be valid Arazzo Runtime Expressions. |  |
| **9050900**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>PARAMETERS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters must be an array of Parameter or Reusable Objects |  |
| **9051000**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | operationId is mutually exclusive with operationPath, channelPath and workflowId |  |
| **9051001**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>OPERATION_<wbr>PATH_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | operationPath is mutually exclusive with operationId, channelPath and workflowId |  |
| **9051002**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | workflowId is mutually exclusive with operationId, operationPath and channelPath |  |
| **9051100**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>CHANNEL_<wbr>PATH_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | channelPath must be a string | <span class="badge badge-version">1.1.0</span> |
| **9051101**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>CHANNEL_<wbr>PATH_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | channelPath is mutually exclusive with operationId, operationPath and workflowId | <span class="badge badge-version">1.1.0</span> |
| **9051200**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>TIMEOUT_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | timeout must be an integer | <span class="badge badge-version">1.1.0</span> |
| **9051300**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>CORRELATION_<wbr>ID_<wbr>ONLY_<wbr>ACTION_<wbr>RECEIVE</code> | <span class="badge badge-error">Error</span> | correlationId only applies when action is \'receive\' | <span class="badge badge-version">1.1.0</span> |
| **9051301**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>CORRELATION_<wbr>ID_<wbr>REQUIRES_<wbr>ACTION</code> | <span class="badge badge-error">Error</span> | correlationId requires action to be present and set to \'receive\' | <span class="badge badge-version">1.1.0</span> |
| **9051400**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>ACTION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | action must be a string | <span class="badge badge-version">1.1.0</span> |
| **9051401**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>ACTION_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | action must be one of: \'send\', \'receive\' | <span class="badge badge-version">1.1.0</span> |
| **9051500**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | dependsOn must be an array of strings | <span class="badge badge-version">1.1.0</span> |
| **9051501**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | \'dependsOn\' entries must be unique. | <span class="badge badge-version">1.1.0</span> |
| **9051502**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | \"dependsOn\" entries must reference an existing stepId or a valid runtime expression. | <span class="badge badge-version">1.1.0</span> |
| **9051503**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>DEPENDS_<wbr>ON_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | dependsOn entry references a sourceDescription that is not of type \'arazzo\' | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Parameter Object {#parameter-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9050901**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>PARAMETERS_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Parameters must be unique by \'name\' and \'in\' combination. |
| **9060100**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>NAME_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'name\' |
| **9060101**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>NAME_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | name must be a string |
| **9060200**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>IN_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | in must be a string |
| **9060201**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>IN_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | in must be one of: \'path\', \'query\', \'header\', \'cookie\' |
| **9060300**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>VALUE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'value\' |
| **9060301**<br><code class="rule-name">ARAZZO_<wbr>PARAMETER_<wbr>FIELD_<wbr>VALUE_<wbr>RUNTIME_<wbr>EXPRESSION</code> | <span class="badge badge-error">Error</span> | Parameter value starting with \"$\" must be a valid Arazzo Runtime Expression. |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Success Action Object {#success-action-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9050601**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>SUCCESS_<wbr>ACTIONS_<wbr>NAMES_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Every success action must have a unique \'name\'. |  |
| **9070100**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>NAME_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'name\' |  |
| **9070101**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>NAME_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | name must be a string |  |
| **9070200**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'type\' |  |
| **9070201**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be a string |  |
| **9070202**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'end\', \'goto\' |  |
| **9070300**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId must be a string |  |
| **9070301**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | Success action \"workflowId\" must reference an existing workflow. |  |
| **9070302**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | workflowId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9070303**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId references a sourceDescription that is not of type \'arazzo\' |  |
| **9070400**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | stepId must be a string |  |
| **9070401**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | Success action \"stepId\" must reference an existing step in the same workflow. |  |
| **9070402**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | stepId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9070500**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>CRITERIA_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | criteria must be an array of Criterion Objects |  |
| **9070600**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | workflowId is mutually exclusive with stepId |  |
| **9070601**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | stepId is mutually exclusive with workflowId |  |
| **9070700**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>PARAMETERS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters must be an array of Parameter or Reusable Objects | <span class="badge badge-version">1.1.0</span> |
| **9070701**<br><code class="rule-name">ARAZZO_<wbr>SUCCESS_<wbr>ACTION_<wbr>FIELD_<wbr>PARAMETERS_<wbr>ONLY_<wbr>WORKFLOW_<wbr>ID</code> | <span class="badge badge-warning">Warning</span> | parameters only applies when workflowId is set | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Failure Action Object {#failure-action-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9050701**<br><code class="rule-name">ARAZZO_<wbr>STEP_<wbr>FIELD_<wbr>FAILURE_<wbr>ACTIONS_<wbr>NAMES_<wbr>UNIQUE</code> | <span class="badge badge-error">Error</span> | Every failure action must have a unique \'name\'. |  |
| **9080100**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>NAME_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'name\' |  |
| **9080101**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>NAME_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | name must be a string |  |
| **9080200**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'type\' |  |
| **9080201**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be a string |  |
| **9080202**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'end\', \'goto\', \'retry\' |  |
| **9080300**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId must be a string |  |
| **9080301**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | Failure action \"workflowId\" must reference an existing workflow. |  |
| **9080302**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | workflowId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9080303**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>SOURCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | workflowId references a sourceDescription that is not of type \'arazzo\' |  |
| **9080400**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | stepId must be a string |  |
| **9080401**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>RESOLVED</code> | <span class="badge badge-error">Error</span> | Failure action \"stepId\" must reference an existing step in the same workflow. |  |
| **9080402**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>PATTERN</code> | <span class="badge badge-warning">Warning</span> | stepId SHOULD match the pattern [A-Za-z0-9_\\-]+ |  |
| **9080500**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>AFTER_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | retryAfter must be a number |  |
| **9080501**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>AFTER_<wbr>NON_<wbr>NEGATIVE</code> | <span class="badge badge-error">Error</span> | retryAfter must be a non-negative number |  |
| **9080600**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>LIMIT_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | retryLimit must be a number |  |
| **9080601**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>LIMIT_<wbr>NON_<wbr>NEGATIVE</code> | <span class="badge badge-error">Error</span> | retryLimit must be a non-negative integer |  |
| **9080700**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>CRITERIA_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | criteria must be an array of Criterion Objects |  |
| **9080800**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>WORKFLOW_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | workflowId is mutually exclusive with stepId |  |
| **9080801**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>STEP_<wbr>ID_<wbr>MUTUALLY_<wbr>EXCLUSIVE</code> | <span class="badge badge-error">Error</span> | stepId is mutually exclusive with workflowId |  |
| **9080900**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>AFTER_<wbr>ONLY_<wbr>RETRY</code> | <span class="badge badge-warning">Warning</span> | retryAfter only applies when type is \"retry\" |  |
| **9080901**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>RETRY_<wbr>LIMIT_<wbr>ONLY_<wbr>RETRY</code> | <span class="badge badge-warning">Warning</span> | retryLimit only applies when type is \"retry\" |  |
| **9081000**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>PARAMETERS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters must be an array of Parameter or Reusable Objects | <span class="badge badge-version">1.1.0</span> |
| **9081001**<br><code class="rule-name">ARAZZO_<wbr>FAILURE_<wbr>ACTION_<wbr>FIELD_<wbr>PARAMETERS_<wbr>ONLY_<wbr>WORKFLOW_<wbr>ID</code> | <span class="badge badge-warning">Warning</span> | parameters only applies when workflowId is set | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Components Object {#components-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9090100**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>INPUTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | inputs must be an object |
| **9090101**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>INPUTS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | inputs values must be JSON Schema Objects |
| **9090102**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>INPUTS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | component keys must match the pattern [a-zA-Z0-9.\\-_]+ |
| **9090200**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>PARAMETERS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters must be an object |
| **9090201**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>PARAMETERS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | parameters values must be Parameter Objects |
| **9090202**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>PARAMETERS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | component keys must match the pattern [a-zA-Z0-9.\\-_]+ |
| **9090300**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>SUCCESS_<wbr>ACTIONS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | successActions must be an object |
| **9090301**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>SUCCESS_<wbr>ACTIONS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | successActions values must be Success Action Objects |
| **9090302**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>SUCCESS_<wbr>ACTIONS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | component keys must match the pattern [a-zA-Z0-9.\\-_]+ |
| **9090400**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>FAILURE_<wbr>ACTIONS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | failureActions must be an object |
| **9090401**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>FAILURE_<wbr>ACTIONS_<wbr>VALUES_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | failureActions values must be Failure Action Objects |
| **9090402**<br><code class="rule-name">ARAZZO_<wbr>COMPONENTS_<wbr>FIELD_<wbr>FAILURE_<wbr>ACTIONS_<wbr>KEYS_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | component keys must match the pattern [a-zA-Z0-9.\\-_]+ |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Reusable Object {#reusable-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9140100**<br><code class="rule-name">ARAZZO_<wbr>REUSABLE_<wbr>FIELD_<wbr>REFERENCE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'reference\' |
| **9140101**<br><code class="rule-name">ARAZZO_<wbr>REUSABLE_<wbr>FIELD_<wbr>REFERENCE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | reference must be a string (Runtime Expression) |
| **9140200**<br><code class="rule-name">ARAZZO_<wbr>REUSABLE_<wbr>FIELD_<wbr>VALUE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | value must be a string |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Criterion Object {#criterion-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9100100**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONDITION_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'condition\' |
| **9100101**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONDITION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | condition must be a string |
| **9100102**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONDITION_<wbr>REGEX_<wbr>VALID</code> | <span class="badge badge-error">Error</span> | Criterion \"condition\" must be a valid regular expression when type is \"regex\". |
| **9100200**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONTEXT_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | context must be a string (Runtime Expression) |
| **9100201**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONTEXT_<wbr>RUNTIME_<wbr>EXPRESSION</code> | <span class="badge badge-error">Error</span> | Criterion \"context\" must be a valid Arazzo Runtime Expression. |
| **9100301**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-warning">Warning</span> | type must be one of: \'simple\', \'regex\', \'jsonpath\', \'xpath\', or an Expression Type Object |
| **9100400**<br><code class="rule-name">ARAZZO_<wbr>CRITERION_<wbr>FIELD_<wbr>CONTEXT_<wbr>REQUIRED_<wbr>WHEN_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | context MUST be provided when type is specified |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Criterion Expression Type Object {#expression-type-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9110100**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>TYPE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'type\' |  |
| **9110101**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be a string |  |
| **9110102**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'jsonpath\', \'xpath\' | <span class="badge badge-version">1.0.x</span> |
| **9110102**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'jsonpath\', \'xpath\', \'jsonpointer\' | <span class="badge badge-version">1.1.0</span> |
| **9110200**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>VERSION_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'version\' | <span class="badge badge-version">1.0.x</span> |
| **9110201**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>VERSION_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | version must be a string |  |
| **9110300**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>VERSION_<wbr>EQUALS_<wbr>JSONPATH</code> | <span class="badge badge-error">Error</span> | when type is \'jsonpath\', version must be one of: \'rfc9535\', \'draft-goessner-dispatch-jsonpath-00\' |  |
| **9110301**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>VERSION_<wbr>EQUALS_<wbr>XPATH</code> | <span class="badge badge-error">Error</span> | when type is \'xpath\', version must be one of: \'xpath-10\', \'xpath-20\', \'xpath-30\', \'xpath-31\' |  |
| **9110302**<br><code class="rule-name">ARAZZO_<wbr>EXPRESSION_<wbr>TYPE_<wbr>FIELD_<wbr>VERSION_<wbr>EQUALS_<wbr>JSONPOINTER</code> | <span class="badge badge-error">Error</span> | when type is \'jsonpointer\', version must be \'rfc6901\' |  |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Request Body Object {#request-body-object}

| Rule | Severity | Message |
|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |
| **9120100**<br><code class="rule-name">ARAZZO_<wbr>REQUEST_<wbr>BODY_<wbr>FIELD_<wbr>CONTENT_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | contentType must be a string |
| **9120101**<br><code class="rule-name">ARAZZO_<wbr>REQUEST_<wbr>BODY_<wbr>FIELD_<wbr>CONTENT_<wbr>TYPE_<wbr>FORMAT</code> | <span class="badge badge-warning">Warning</span> | Request body \"contentType\" should be a valid MIME type (e.g. \"application/json\"). |
| **9120200**<br><code class="rule-name">ARAZZO_<wbr>REQUEST_<wbr>BODY_<wbr>FIELD_<wbr>REPLACEMENTS_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | replacements must be an array of Payload Replacement Objects |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Payload Replacement Object {#payload-replacement-object}

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields |  |
| **9130100**<br><code class="rule-name">ARAZZO_<wbr>PAYLOAD_<wbr>REPLACEMENT_<wbr>FIELD_<wbr>TARGET_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'target\' |  |
| **9130101**<br><code class="rule-name">ARAZZO_<wbr>PAYLOAD_<wbr>REPLACEMENT_<wbr>FIELD_<wbr>TARGET_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | target must be a string (JSON Pointer or XPath Expression) |  |
| **9130200**<br><code class="rule-name">ARAZZO_<wbr>PAYLOAD_<wbr>REPLACEMENT_<wbr>FIELD_<wbr>VALUE_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | should always have a \'value\' |  |
| **9130300**<br><code class="rule-name">ARAZZO_<wbr>PAYLOAD_<wbr>REPLACEMENT_<wbr>FIELD_<wbr>TARGET_<wbr>SELECTOR_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | targetSelectorType must be a string or an Expression Type Object | <span class="badge badge-version">1.1.0</span> |
| **9130301**<br><code class="rule-name">ARAZZO_<wbr>PAYLOAD_<wbr>REPLACEMENT_<wbr>FIELD_<wbr>TARGET_<wbr>SELECTOR_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | targetSelectorType must be one of: \'jsonpointer\', \'jsonpath\', \'xpath\', or an Expression Type Object | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Selector Object {#selector-object}

Arazzo 1.1.0 only.

| Rule | Severity | Message | Only in |
|---|---|---|---|
| **15000**<br><code class="rule-name">NOT_<wbr>ALLOWED_<wbr>FIELDS</code> | <span class="badge badge-error">Error</span> | Object includes not allowed fields | <span class="badge badge-version">1.1.0</span> |
| **9150101**<br><code class="rule-name">ARAZZO_<wbr>SELECTOR_<wbr>FIELD_<wbr>CONTEXT_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | context must be a string (Runtime Expression) | <span class="badge badge-version">1.1.0</span> |
| **9150201**<br><code class="rule-name">ARAZZO_<wbr>SELECTOR_<wbr>FIELD_<wbr>SELECTOR_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | selector must be a string | <span class="badge badge-version">1.1.0</span> |
| **9150301**<br><code class="rule-name">ARAZZO_<wbr>SELECTOR_<wbr>FIELD_<wbr>TYPE_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be a string or an Expression Type Object | <span class="badge badge-version">1.1.0</span> |
| **9150302**<br><code class="rule-name">ARAZZO_<wbr>SELECTOR_<wbr>FIELD_<wbr>TYPE_<wbr>EQUALS</code> | <span class="badge badge-error">Error</span> | type must be one of: \'jsonpointer\', \'jsonpath\', \'xpath\', or an Expression Type Object | <span class="badge badge-version">1.1.0</span> |
{: .rules-table}

</div>

<div class="rules-card" markdown="1">

### Schema Object {#schema-object}

JSON Schemas under `workflow.inputs` and `components.inputs`.

| Rule | Severity | Message |
|---|---|---|
| **10001**<br><code class="rule-name">SCHEMA_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | type must be one of allowed values |
| **10002**<br><code class="rule-name">SCHEMA_<wbr>MAXLENGTH</code> | <span class="badge badge-error">Error</span> | maxLength must be a non-negative integer |
| **10003**<br><code class="rule-name">SCHEMA_<wbr>MAXLENGTH_<wbr>NONSTRING</code> | <span class="badge badge-warning">Warning</span> | maxLength has no effect on non strings |
| **10004**<br><code class="rule-name">SCHEMA_<wbr>MINLENGTH</code> | <span class="badge badge-error">Error</span> | minLength must be a non-negative integer |
| **10005**<br><code class="rule-name">SCHEMA_<wbr>MINLENGTH_<wbr>NONSTRING</code> | <span class="badge badge-warning">Warning</span> | minLength has no effect on non strings |
| **10009**<br><code class="rule-name">SCHEMA_<wbr>ENUM</code> | <span class="badge badge-error">Error</span> | enum\' value must be an array with unique values |
| **10010**<br><code class="rule-name">SCHEMA_<wbr>MULTIPLEOF</code> | <span class="badge badge-error">Error</span> | multipleOf\' value must be a number &gt; 0 |
| **10011**<br><code class="rule-name">SCHEMA_<wbr>PATTERN</code> | <span class="badge badge-error">Error</span> | pattern\' value must be a string |
| **10014**<br><code class="rule-name">SCHEMA_<wbr>MAXIMUM</code> | <span class="badge badge-error">Error</span> | \'maximum\' value must be a number |
| **10015**<br><code class="rule-name">SCHEMA_<wbr>MINUMUM</code> | <span class="badge badge-error">Error</span> | \'minimum\' value must be a number |
| **10016**<br><code class="rule-name">SCHEMA_<wbr>EXCLUSIVEMAXIMUM</code> | <span class="badge badge-error">Error</span> | \'exclusiveMaximum\' value must be a number |
| **10017**<br><code class="rule-name">SCHEMA_<wbr>EXCLUSIVEMINUMUM</code> | <span class="badge badge-error">Error</span> | \'exclusiveMinimum\' value must be a number |
| **10018**<br><code class="rule-name">SCHEMA_<wbr>ITEMS</code> | <span class="badge badge-error">Error</span> | items must be a schema or array of schemas |
| **10019**<br><code class="rule-name">SCHEMA_<wbr>ITEMS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | items has no effect on non arrays |
| **10020**<br><code class="rule-name">SCHEMA_<wbr>ADDITIONALITEMS</code> | <span class="badge badge-error">Error</span> | additionalItems must be a schema object or a boolean JSON schema |
| **10021**<br><code class="rule-name">SCHEMA_<wbr>ADDITIONALITEMS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | additionalItems has no effect on non arrays |
| **10022**<br><code class="rule-name">SCHEMA_<wbr>MAXITEMS</code> | <span class="badge badge-error">Error</span> | maxItems must be a non-negative integer |
| **10023**<br><code class="rule-name">SCHEMA_<wbr>MAXITEMS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | maxItems has no effect on non arrays |
| **10024**<br><code class="rule-name">SCHEMA_<wbr>MINITEMS</code> | <span class="badge badge-error">Error</span> | minItems must be a non-negative integer |
| **10025**<br><code class="rule-name">SCHEMA_<wbr>MINITEMS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | minItems has no effect on non arrays |
| **10026**<br><code class="rule-name">SCHEMA_<wbr>UNIQUEITEMS</code> | <span class="badge badge-error">Error</span> | uniqueItems must be a boolean |
| **10027**<br><code class="rule-name">SCHEMA_<wbr>UNIQUEITEMS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | uniqueItems has no effect on non arrays |
| **10028**<br><code class="rule-name">SCHEMA_<wbr>CONTAINS</code> | <span class="badge badge-error">Error</span> | contains must be a schema object or a boolean JSON schema |
| **10029**<br><code class="rule-name">SCHEMA_<wbr>CONTAINS_<wbr>NONARRAY</code> | <span class="badge badge-warning">Warning</span> | contains has no effect on non arrays |
| **10030**<br><code class="rule-name">SCHEMA_<wbr>MAXPROPERTIES</code> | <span class="badge badge-error">Error</span> | maxProperties must be a non-negative integer |
| **10031**<br><code class="rule-name">SCHEMA_<wbr>MAXPROPERTIES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | maxProperties has no effect on non objects |
| **10032**<br><code class="rule-name">SCHEMA_<wbr>MINPROPERTIES</code> | <span class="badge badge-error">Error</span> | minProperties must be a non-negative integer |
| **10033**<br><code class="rule-name">SCHEMA_<wbr>MINPROPERTIES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | minProperties has no effect on non objects |
| **10034**<br><code class="rule-name">SCHEMA_<wbr>REQUIRED</code> | <span class="badge badge-error">Error</span> | required must be an array of strings |
| **10035**<br><code class="rule-name">SCHEMA_<wbr>REQUIRED_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | required has no effect on non objects |
| **10036**<br><code class="rule-name">SCHEMA_<wbr>REQUIRED_<wbr>WITHOUT_<wbr>PROPERTIES</code> | <span class="badge badge-warning">Warning</span> | required properties should be defined in \`properties\` when \`additionalProperties\` is false |
| **10037**<br><code class="rule-name">SCHEMA_<wbr>PROPERTIES</code> | <span class="badge badge-error">Error</span> | properties members must be schemas |
| **10038**<br><code class="rule-name">SCHEMA_<wbr>PROPERTIES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | properties has no effect on non objects |
| **10039**<br><code class="rule-name">SCHEMA_<wbr>PROPERTIES_<wbr>OBJECT</code> | <span class="badge badge-error">Error</span> | properties must be an object |
| **10040**<br><code class="rule-name">SCHEMA_<wbr>PATTERNPROPERTIES</code> | <span class="badge badge-error">Error</span> | patternProperties members must be schema objects or boolean JSON schemas |
| **10041**<br><code class="rule-name">SCHEMA_<wbr>PATTERNPROPERTIES_<wbr>KEY</code> | <span class="badge badge-error">Error</span> | patternProperties keys must be valid regex |
| **10042**<br><code class="rule-name">SCHEMA_<wbr>PATTERNPROPERTIES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | patternProperties has no effect on non objects |
| **10043**<br><code class="rule-name">SCHEMA_<wbr>PATTERNPROPERTIES_<wbr>OBJECT</code> | <span class="badge badge-error">Error</span> | patternProperties must be an object |
| **10044**<br><code class="rule-name">SCHEMA_<wbr>ADDITIONALPROPERTIES</code> | <span class="badge badge-error">Error</span> | additionalProperties must be a Schema or a Boolean |
| **10045**<br><code class="rule-name">SCHEMA_<wbr>ADDITIONALPROPERTIES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | additionalProperties has no effect on non objects |
| **10046**<br><code class="rule-name">SCHEMA_<wbr>PROPERTYNAMES</code> | <span class="badge badge-error">Error</span> | propertyNames must be a schema object or a boolean JSON schema |
| **10047**<br><code class="rule-name">SCHEMA_<wbr>PROPERTYNAMES_<wbr>NONOBJECT</code> | <span class="badge badge-warning">Warning</span> | propertyNames has no effect on non objects |
| **10048**<br><code class="rule-name">SCHEMA_<wbr>IF</code> | <span class="badge badge-error">Error</span> | \"if\" must be a schema object or a boolean JSON schema |
| **10049**<br><code class="rule-name">SCHEMA_<wbr>IF_<wbr>NONTHEN</code> | <span class="badge badge-warning">Warning</span> | \"if\" has no effect without a \"then\" |
| **10050**<br><code class="rule-name">SCHEMA_<wbr>ELSE</code> | <span class="badge badge-error">Error</span> | \"else\" must be a schema object or a boolean JSON schema |
| **10051**<br><code class="rule-name">SCHEMA_<wbr>ELSE_<wbr>NONIF</code> | <span class="badge badge-warning">Warning</span> | \"else\" has no effect without a \"if\" |
| **10052**<br><code class="rule-name">SCHEMA_<wbr>THEN</code> | <span class="badge badge-error">Error</span> | \"then\" must be a schema object or a boolean JSON schema |
| **10053**<br><code class="rule-name">SCHEMA_<wbr>THEN_<wbr>NONIF</code> | <span class="badge badge-warning">Warning</span> | \"then\" has no effect without a \"if\" |
| **10054**<br><code class="rule-name">SCHEMA_<wbr>ALLOF</code> | <span class="badge badge-error">Error</span> | allOf must be a non-empty array of schema objects or boolean JSON schemas |
| **10055**<br><code class="rule-name">SCHEMA_<wbr>ONEOF</code> | <span class="badge badge-error">Error</span> | oneOf must be a non-empty array of schema objects or boolean JSON schemas |
| **10056**<br><code class="rule-name">SCHEMA_<wbr>ANYOF</code> | <span class="badge badge-error">Error</span> | anyOf must be a non-empty array of schema objects or boolean JSON schemas |
| **10057**<br><code class="rule-name">SCHEMA_<wbr>NOT</code> | <span class="badge badge-error">Error</span> | \"not\" must be a schema object or a boolean JSON schema |
| **10058**<br><code class="rule-name">SCHEMA_<wbr>FORMAT</code> | <span class="badge badge-error">Error</span> | \'format\' value must be a string |
| **10063**<br><code class="rule-name">SCHEMA_<wbr>TITLE</code> | <span class="badge badge-error">Error</span> | title\' value must be a string |
| **10064**<br><code class="rule-name">SCHEMA_<wbr>DESCRIPTION</code> | <span class="badge badge-error">Error</span> | description\' value must be a string |
| **10065**<br><code class="rule-name">SCHEMA_<wbr>READONLY</code> | <span class="badge badge-error">Error</span> | readOnly must be a boolean |
| **10066**<br><code class="rule-name">SCHEMA_<wbr>WRITEONLY</code> | <span class="badge badge-error">Error</span> | writeOnly must be a boolean |
| **10067**<br><code class="rule-name">SCHEMA_<wbr>EXAMPLES</code> | <span class="badge badge-error">Error</span> | examples must be an array |
| **10072**<br><code class="rule-name">SCHEMA_<wbr>MISSING_<wbr>CORE_<wbr>FIELDS</code> | <span class="badge badge-hint">Hint</span> | Schema does not include any Schema Object keywords |
| **10075**<br><code class="rule-name">SCHEMA_<wbr>TYPE_<wbr>ARRAY_<wbr>NON_<wbr>ITEMS</code> | <span class="badge badge-error">Error</span> | Schemas with \"type: array\" require a sibling \"items\" field |
| **10076**<br><code class="rule-name">SCHEMA_<wbr>DEPRECATED</code> | <span class="badge badge-error">Error</span> | deprecated must be a boolean |
| **8030100**<br><code class="rule-name">JSON_<wbr>SCHEMA_<wbr>2020_<wbr>12_<wbr>KEYWORD_<wbr>$ID_<wbr>FORMAT_<wbr>URI</code> | <span class="badge badge-error">Error</span> | $id value must be a valid URI-reference |
| **8030200**<br><code class="rule-name">JSON_<wbr>SCHEMA_<wbr>2020_<wbr>12_<wbr>KEYWORD_<wbr>$SCHEMA_<wbr>FORMAT_<wbr>URI</code> | <span class="badge badge-error">Error</span> | The value of $schema keyword MUST be a URI [RFC3986] containing a scheme |
| **8030300**<br><code class="rule-name">JSON_<wbr>SCHEMA_<wbr>2020_<wbr>12_<wbr>KEYWORD_<wbr>$REF_<wbr>FORMAT_<wbr>URI</code> | <span class="badge badge-error">Error</span> | The value of the \"$ref\" keyword MUST be a string which is a URI-Reference. |
| **8030400**<br><code class="rule-name">JSON_<wbr>SCHEMA_<wbr>2020_<wbr>12_<wbr>KEYWORD_<wbr>$COMMENT_<wbr>TYPE</code> | <span class="badge badge-error">Error</span> | $comment value must be a string |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown title must not contain \"&lt;script&gt;\" tags. |
| **9020600**<br><code class="rule-name">ARAZZO_<wbr>SPEC_<wbr>NO_<wbr>SCRIPT_<wbr>TAGS</code> | <span class="badge badge-error">Error</span> | Markdown description must not contain \"&lt;script&gt;\" tags. |
{: .rules-table}

</div>

## Supported versions {#versions}

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0)

Both JSON and YAML are accepted for every version. The format is detected from the content, not the file extension.

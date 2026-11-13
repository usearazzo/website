---
title: "Arazzo Runner API Reference: @usearazzo/runner"
description: "Run Arazzo workflows against live APIs from JavaScript. Every building block, option, result field, and error of @usearazzo/runner."
lead: "Run Arazzo workflows step by step against the live APIs behind their OpenAPI source descriptions, from JavaScript. Every building block, option, result field, and error of @usearazzo/runner."
date: 2026-10-25
last_modified_at: 2026-11-13
package:
  name: "@usearazzo/runner"
  npm: https://www.npmjs.com/package/@usearazzo/runner
  github: https://github.com/usearazzo/arazzo-toolkit/tree/main/packages/runner
toc:
  - id: install
    title: Installation
  - id: quick-start
    title: Run a workflow
  - id: exports
    title: Exports
  - id: arazzo-runner
    title: ArazzoRunner
    children:
      - id: arazzo-runner-options
        title: Load options
      - id: arazzo-runner-registry
        title: One registry, one document
      - id: document-retrieval
        title: Document retrieval
  - id: architecture
    title: Four building blocks
  - id: document-registry
    title: DocumentRegistry
  - id: workflow-executor
    title: WorkflowExecutor
    children:
      - id: workflow-executor-options
        title: Constructor options
      - id: execute-options
        title: Execute options
      - id: source-options
        title: Options per API
      - id: result
        title: The result
  - id: control-flow
    title: Control flow
    children:
      - id: retry
        title: Retries
      - id: transfer
        title: Transfer to another workflow
      - id: settled-status
        title: settledStatus
      - id: budgets
        title: Budgets
  - id: composing
    title: Composing workflows
    children:
      - id: sub-workflows
        title: Sub-workflow steps
      - id: depends-on
        title: dependsOn
      - id: cross-document
        title: Other Arazzo documents
  - id: inheritance
    title: What steps inherit
  - id: cancellation
    title: Cancellation
  - id: step-executor
    title: StepExecutor
    children:
      - id: request-body
        title: Request body payloads
  - id: operation-executor
    title: OpenAPIOperationExecutor
    children:
      - id: server
        title: Choosing the server
      - id: http-client
        title: The HTTP client
      - id: authentication
        title: Authentication
      - id: standalone
        title: Without a workflow
  - id: errors
    title: Errors
  - id: versions
    title: Supported versions
---

`@usearazzo/runner` executes an Arazzo workflow. It sends real HTTP requests to the APIs the workflow's OpenAPI source descriptions describe, one step at a time. It evaluates each step's success criteria, follows the control flow the document declares (`goto`, `retry`, `end`), runs sub-workflows, and hands back a trace of every step.

Today it is a library. [`ArazzoRunner`](#arazzo-runner) loads a document and runs its workflows in two calls, and the four building blocks it wires stay public for when you need to swap one.

## Installation {#install}

```sh
npm install @usearazzo/runner
```

The package ships ESM and CommonJS builds with TypeScript declarations, and requires Node.js 20.10 or newer. It is pre-1.0: the version documented here is an alpha, and the API may still change before the stable release.

## Run a workflow {#quick-start}

Let's run a real workflow end to end. [`petstore-order.arazzo.yaml`](/assets/reference/runner/petstore-order.arazzo.yaml) logs a user in, finds an available pet, orders it, and checks the order. Its source description is the Swagger Petstore's OpenAPI document.

The public Petstore at `petstore3.swagger.io` answers every order with a 500, so run your own copy. It is the same image the toolkit's CI runs this workflow against:

```sh
docker run --rm -p 8080:8080 swaggerapi/petstore3:1.0.28
```

Save this script as `run.mjs` and run it with `node run.mjs`. It loads the workflow straight from this site:

```js
import { ArazzoRunner } from '@usearazzo/runner';

const runner = await ArazzoRunner.load(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
);

const result = await runner.execute('authenticateAndOrderPet', {
  inputs: {
    username: 'theUser',
    password: '12345',
    preferredPetStatus: 'available',
    orderQuantity: 1,
    shipDate: '2026-11-01T10:00:00.000Z',
  },
  executeOptions: { petstoreAPI: { server: 'http://localhost:8080/api/v3' } },
});

console.log(result.status);
console.log(result.outputs);
for (const step of result.steps) {
  console.log(step.stepId, step.successful, step.attempts, `${Math.round(step.durationMs)} ms`);
}
```

```text
completed
{
  petName: 'Cat 1',
  petCategory: 'Cats',
  petId: 1,
  orderId: 0,
  orderStatus: 'placed',
  orderQuantity: 1,
  orderShipDate: '2026-11-01T10:00:00.000+00:00'
}
loginUser true 1 746 ms
findAvailablePets true 1 17 ms
placeOrder true 1 16 ms
retrieveOrderedPetDetails true 1 8 ms
verifyOrderConfirmation true 1 7 ms
```

Five requests went out, each judged by its step's `successCriteria`, and the workflow's `outputs` were resolved from what came back. `executeOptions` is keyed by source description name. The workflow calls its API `petstoreAPI`, so that entry's `server` points those steps at your local Petstore instead of the server the OpenAPI document declares (see [Options per API](#source-options) and [Choosing the server](#server)).

Notice that every input is passed in. The runner does not fill in `default` values from the workflow's `inputs` schema, so pass every input a step reads.

## Exports {#exports}

These are the main exports:

| Export | Kind | What it is |
|---|---|---|
| `ArazzoRunner` | class | Loads an Arazzo document and runs its workflows. Start here. |
| `DocumentRegistry` | class | Loads and caches the Arazzo document and its source descriptions. |
| `WorkflowExecutor` | class | Runs a whole workflow and returns its result. |
| `StepExecutor` | class | Runs one step that calls an OpenAPI operation. |
| `OpenAPIOperationExecutor` | class | Builds, sends, and reads back one OpenAPI operation. |
| `httpClientFetch` | function | The default HTTP client: global `fetch`. |
| `settledResult` | function | Follows a transferred result to the run it ended in. |
| `WorkflowExecutionState` | class | Run state, for calling `StepExecutor` on its own. |
| `ArazzoWorkflowExtractor`, `ArazzoStepExtractor` | class | Pull a workflow or a step out of a loaded document by id. |
| `ArazzoRunnerError` | class | Base class of every error the runner throws. |
| `ExecutionError`, `ClientError`, `ResolverError`, `CriterionError`, `RuntimeExpressionError`, `InvalidEntryDocumentError`, `DocumentLoadError` | class | The errors you are most likely to catch. See [Errors](#errors). |

Every type on this page is exported too: `ArazzoRunnerLoadOptions`, `ArazzoRunnerOptions`, `ArazzoRunnerReferenceOptions`, `WorkflowExecutionResult`, `StepRunRecord`, `WorkflowExecuteOptions`, `StepExecuteOptions`, `OpenAPIOperationSecurities`, `OpenAPIOperationSecurityCredential`, `HTTPClient`, `RequestInterceptor`, `RequestContext`, `OpenAPIOperationSourceDescription`, and the rest. The package also exports the lower-level pieces the four building blocks are made of (normalizers, resolvers, criterion evaluators, document providers). Among them, `OpenAPIOperationLocatorNormalizer` resolves a step's `operationId` or `operationPath` to an operation, and `ArazzoWorkflowLocatorNormalizer` resolves a `workflowId` to a workflow, both through `$sourceDescriptions` and both extending `SourceDescriptionsLocatorNormalizer`. Those are for replacing one part of the pipeline; the TypeScript declarations document them.

## ArazzoRunner {#arazzo-runner}

```ts
ArazzoRunner.load(uri: string, options?: ArazzoRunnerLoadOptions): Promise<ArazzoRunner>
runner.execute(workflowId: string, options?: WorkflowExecuteOptions): Promise<WorkflowExecutionResult>
```

The way to run a workflow. `load` reads the Arazzo document at `uri` (a path or a URL) and wires the [four building blocks](#architecture) with their defaults. `execute` runs one workflow of that document:

```js
import { ArazzoRunner } from '@usearazzo/runner';

const runner = await ArazzoRunner.load(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
);
const result = await runner.execute('authenticateAndOrderPet', { inputs });
```

`execute` is [`WorkflowExecutor.execute`](#workflow-executor): it takes the same [execute options](#execute-options) and returns the same [result](#result). One runner can run any workflow of its document, as many times as you like; each run gets fresh state.

### Load options {#arazzo-runner-options}

Every option is a seam of a building block the runner wires:

| Option | Goes to | Meaning |
|---|---|---|
| `registry` | `DocumentRegistry` | The registry to load into. A new one by default. |
| `reference` | The registry's providers and the normalizers | How documents are retrieved. See [Document retrieval](#document-retrieval). |
| `httpClient` | `OpenAPIOperationExecutor` | Sends the requests. See [The HTTP client](#http-client). |
| `requestInterceptor` | `OpenAPIOperationExecutor` | Changes every request before it is sent. See [Authentication](#authentication). |
| `maxSteps`, `maxWorkflowDepth`, `sleep`, `now` | `WorkflowExecutor` | See [Constructor options](#workflow-executor-options). |

```js
const runner = await ArazzoRunner.load(uri, {
  requestInterceptor: async (request) => {
    request.headers.Authorization = `Bearer ${await acquireToken()}`;
  },
});
```

`runner.document` is the loaded Arazzo document, and `runner.registry` the registry holding it and its source descriptions.

To see what a document offers before running it, call `listWorkflows()` on `runner.document`. It returns a `WorkflowDescriptor` for every workflow `execute` accepts, in document order:

```js
const runner = await ArazzoRunner.load('https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml');

runner.document.listWorkflows();
// [
//   {
//     workflowId: 'authenticateAndOrderPet',
//     jsonPointer: '/workflows/0',
//     summary: 'Complete pet ordering workflow with authentication',
//     description: 'Authenticate user, discover available pets, place order, retrieve details, and return comprehensive order summary'
//   }
// ]
```

`jsonPointer` locates the workflow in the document. `summary` and `description` are there only when the document gives them as strings; `description` is the CommonMark as written. A workflow without a `workflowId` cannot be run, so it is not listed. The call reads the loaded document only: source descriptions are not loaded, and workflows of other Arazzo documents they point at are not listed.

A document that declares the same `workflowId` or `operationId` more than once is invalid, and the [validator](/docs/validator/) reports a duplicate `workflowId` as an error. The runner still loads such a document, so one from a third party stays usable, and the first occurrence wins: `execute` runs, and `listWorkflows` lists, the first workflow of a duplicated `workflowId`, and a step's `operationId` calls the first operation that declares it. To call a later one, address it by `operationPath`.

Steps that share a `stepId` within a workflow all run, in list order. A `goto` or `retry` naming that `stepId` lands on the first of them. `$steps.<stepId>` holds the most recent run, the same as when a `goto` back or a retry runs a step again. So a step between the two reads the first one's outputs, and anything after the second reads the second's. Every run records its outputs, so a later step with no `outputs` leaves `$steps.<stepId>.outputs` empty.

### One registry, one document {#arazzo-runner-registry}

A registry backs one entry document. Loading the same document into a registry again is fine; loading a different one throws `InvalidEntryDocumentError`:

```js
const registry = new DocumentRegistry();
await ArazzoRunner.load('https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml', { registry });
await ArazzoRunner.load('https://usearazzo.com/assets/guides/arazzo-document-resolving/adopt-a-pet.arazzo.yaml', { registry });
// InvalidEntryDocumentError: Document at "https://usearazzo.com/assets/guides/arazzo-document-resolving/adopt-a-pet.arazzo.yaml"
// is not the entry document of the given registry
```

To bind a runner to a document you already loaded, use the constructor. It takes the load options above, with `document` and `registry` required, and throws `InvalidEntryDocumentError` unless `document` is the entry document of `registry`:

```js
const registry = new DocumentRegistry();
const document = await registry.acquireEntryDocument(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
);
const runner = new ArazzoRunner({ document, registry });
```

A document that is not Arazzo throws `InvalidEntryDocumentError` from `load`, and one that cannot be read or loaded throws `DocumentLoadError`, as they do from `acquireEntryDocument`.

### Document retrieval {#document-retrieval}

The runner has two HTTP stacks, kept apart on purpose. One calls the APIs while a workflow runs. The other retrieves the documents: the entry document, its source descriptions, and every externally referenced document.

| Behaviour | Calling APIs | Retrieving documents |
|---|---|---|
| Sent by | The [`httpClient`](#http-client), global `fetch` by default | The HTTP resolver of [ApiDOM reference](https://github.com/speclynx/apidom/tree/main/packages/apidom-reference#resolver-plugin-options), built on Axios |
| Configured with | `httpClient`, `requestInterceptor`, `executeOptions` | `reference` |
| Timeout | None. Cancel with a [`signal`](#cancellation). | 15 seconds per document |
| Redirects | Followed, as `fetch` does | Up to five |
| Cache | None | Per process, see [The document cache](#retrieval-cache) |
| Local files | Not applicable | `.json`, `.yaml`, and `.yml` |

Nothing crosses from one column to the other. `reference` never applies to an API call, and `httpClient`, `requestInterceptor`, and `executeOptions` never apply to document retrieval. So credentials for an API cannot reach a host that only serves a document, and the other way round.

`reference` takes the `resolve` options of ApiDOM reference. Only `resolve` is passed on, whatever else the object carries. Its type is `ArazzoRunnerReferenceOptions`.

#### Resolver options {#retrieval-options}

The settings of the document stack live in `reference.resolve.resolverOpts`:

| Option | Default | Meaning |
|---|---|---|
| `timeout` | `15000` | Milliseconds to wait for one document. |
| `redirects` | `5` | The most redirects to follow. |
| `withCredentials` | `false` | Whether cross-site requests carry credentials. It matters in a browser only. |
| `axiosConfig` | none | An Axios request configuration, for headers, agents, a proxy, and request or response `interceptors`. |
| `fileAllowList` | `.json`, `.yaml`, `.yml` | Patterns a local file must match to be read. A list you pass replaces the default. |

```js
const runner = await ArazzoRunner.load(uri, {
  reference: {
    resolve: { resolverOpts: { timeout: 3000 } },
  },
});
```

A document that takes longer throws `DocumentLoadError` from `load`. To replace the resolvers themselves, pass `resolve.resolvers`, as [The document cache](#retrieval-cache) shows.

#### Documents behind a token {#protected-documents}

Add the header with a request interceptor of the document fetcher, and check the origin in it:

```js
const documents = 'https://specs.example.com';

const runner = await ArazzoRunner.load(`${documents}/orders.arazzo.yaml`, {
  reference: {
    resolve: {
      resolverOpts: {
        axiosConfig: {
          interceptors: {
            request: [
              (config) => {
                if (new URL(config.url).origin === documents) {
                  config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
              },
            ],
          },
        },
      },
    },
  },
});
```

The origin check matters. Plain `axiosConfig.headers` are sent to every host a document or a reference points at.

Every fetch goes through these options: the entry document, the source descriptions, and the external references of a workflow's `inputs` or of an OpenAPI operation, which are fetched lazily during a run. Without them, a protected entry document throws `DocumentLoadError` from `load`, and the `cause` chain ends at the HTTP error.

#### Mutual TLS {#mutual-tls}

A client certificate is configured once per mechanism. Here the same certificate serves both:

```js
import https from 'node:https';
import { fetch, Agent } from 'undici';
import { ArazzoRunner } from '@usearazzo/runner';

const tls = { cert, key, ca };
const dispatcher = new Agent({ connect: tls });

const runner = await ArazzoRunner.load(uri, {
  // document retrieval
  reference: {
    resolve: { resolverOpts: { axiosConfig: { httpsAgent: new https.Agent(tls) } } },
  },
  // API calls
  httpClient: (request) => fetch(request.url, { ...request, dispatcher }),
});
```

Leave out `reference` and the documents do not load. Leave out `httpClient` and the documents load, but the first API call throws `ClientError`.

#### Credentials in errors {#retrieval-errors}

A failed download throws with the HTTP error on its `cause` chain, and that error carries the request configuration. Standard credentials in it are masked: the `Authorization`, `Proxy-Authorization`, and `Cookie` headers, `auth`, `password`, and the agents.

- A custom header is masked only when you list it in `axiosConfig.redact`.
- That list replaces the default one. Spread `HTTPResolverAxios.defaultRedact` into it to keep the defaults.
- Credentials embedded in a URL are not masked.

```js
import HTTPResolverAxios from '@speclynx/apidom-reference/resolve/resolvers/http-axios';

const axiosConfig = {
  headers: { 'X-Docs-Key': key },
  redact: [...HTTPResolverAxios.defaultRedact, 'x-docs-key'],
};
```

#### With your own registry {#retrieval-registry}

A registry you build is configured through its providers, and both need the options. Pass the same options to `load` as `reference` too:

```js
import {
  ArazzoRunner,
  DocumentRegistry,
  ArazzoDocumentRegistryProvider,
  OpenAPIDocumentRegistryProvider,
} from '@usearazzo/runner';

const resolve = { resolverOpts: { axiosConfig } };

const registry = new DocumentRegistry({
  providers: [
    new ArazzoDocumentRegistryProvider({ resolve }),
    new OpenAPIDocumentRegistryProvider({ resolve }),
  ],
});

const runner = await ArazzoRunner.load(uri, { registry, reference: { resolve } });
```

The providers load the entry document and the source descriptions. `reference` reaches the normalizers, which fetch external references. Without it, a workflow whose `inputs` reference a protected schema throws `NormalizationError` when it runs.

#### The document cache {#retrieval-cache}

Documents retrieved over HTTP are cached per process, by URL, for all registries. The cache holds the six most recent documents, each for two minutes. Within that time, a second runner that loads the same URL is served from the cache and sends no request, whatever its options are. Local files are not cached.

To keep a cache private, give the providers an HTTP resolver of their own in `resolve.resolvers`. That list replaces the default one, so include a file resolver if you load local documents. A file resolver reads only the files its `fileAllowList` matches:

```js
import FileResolver from '@speclynx/apidom-reference/resolve/resolvers/file';
import HTTPResolverAxios from '@speclynx/apidom-reference/resolve/resolvers/http-axios';

const resolve = {
  resolvers: [
    new FileResolver({ fileAllowList: [/\.json$/i, /\.ya?ml$/i] }),
    new HTTPResolverAxios({ axiosConfig }),
  ],
};
```

Give `resolve` to both providers of a registry, and to `load` as `reference`, as [above](#retrieval-registry).

## Four building blocks {#architecture}

`ArazzoRunner` wires these for you. Use them directly when you need to swap one, or to run a single step or operation on its own. Running a workflow is a pipeline of four parts, each with one job:

| Building block | Job |
|---|---|
| `DocumentRegistry` | Loads and caches the entry Arazzo document and its OpenAPI source descriptions, so each is fetched and parsed once. |
| `WorkflowExecutor` | Runs a workflow's steps in order, owns the run state, and acts on the control flow (`goto`, `retry`, `end`). |
| `StepExecutor` | Runs one step that calls an operation: finds the operation, resolves the step's inputs, evaluates its criteria and outputs, and picks the next action. |
| `OpenAPIOperationExecutor` | Runs one OpenAPI operation: builds the HTTP request, sends it through the HTTP client, and reads the response. |

<figure class="mb-6">
  <svg viewBox="0 0 720 470" role="img" aria-labelledby="arch-title arch-desc" class="w-full h-auto max-w-3xl mx-auto">
    <title id="arch-title">Runner architecture</title>
    <desc id="arch-desc">WorkflowExecutor calls StepExecutor, which calls OpenAPIOperationExecutor, which sends the built request through HTTPClient. DocumentRegistry supplies loaded documents to all three executors.</desc>
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280"/>
      </marker>
      <marker id="arrow-dotted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF"/>
      </marker>
    </defs>
    <g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
      <!-- main chain -->
      <g>
        <rect x="20" y="20" width="330" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
        <text x="185" y="47" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">WorkflowExecutor</text>
        <text x="185" y="68" text-anchor="middle" font-size="12" fill="#4B5563">iterates steps &#183; owns state &#183; control flow</text>
      </g>
      <g>
        <rect x="20" y="140" width="330" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
        <text x="185" y="167" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">StepExecutor</text>
        <text x="185" y="188" text-anchor="middle" font-size="12" fill="#4B5563">runs one Arazzo step</text>
      </g>
      <g>
        <rect x="20" y="260" width="330" height="66" rx="8" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
        <text x="185" y="287" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">OpenAPIOperationExecutor</text>
        <text x="185" y="308" text-anchor="middle" font-size="12" fill="#4B5563">builds request &#183; normalizes response</text>
      </g>
      <g>
        <rect x="20" y="380" width="330" height="66" rx="8" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="5 4"/>
        <text x="185" y="407" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">HTTPClient</text>
        <text x="185" y="428" text-anchor="middle" font-size="12" fill="#4B5563">sends it &#183; global fetch by default</text>
      </g>
      <!-- chain arrows -->
      <line x1="185" y1="86" x2="185" y2="134" stroke="#6B7280" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="197" y="115" font-size="11" fill="#4B5563">execute step</text>
      <line x1="185" y1="206" x2="185" y2="254" stroke="#6B7280" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="197" y="235" font-size="11" fill="#4B5563">execute OpenAPI operation</text>
      <line x1="185" y1="326" x2="185" y2="374" stroke="#6B7280" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="197" y="355" font-size="11" fill="#4B5563">send the built request</text>
      <!-- registry -->
      <g>
        <path d="M 470 150 a 70 14 0 0 1 140 0 v 66 a 70 14 0 0 1 -140 0 z" fill="#3A6B1F"/>
        <ellipse cx="540" cy="150" rx="70" ry="14" fill="#6BA543"/>
        <text x="540" y="196" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">DocumentRegistry</text>
        <text x="540" y="215" text-anchor="middle" font-size="11" fill="#E5EFD8">loads &#38; caches</text>
      </g>
      <!-- registry feeds each executor -->
      <path d="M 470 170 C 410 170 400 60 356 55" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrow-dotted)"/>
      <path d="M 470 190 C 420 190 410 175 356 175" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrow-dotted)"/>
      <path d="M 470 210 C 410 210 400 288 356 293" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrow-dotted)"/>
      <text x="540" y="255" text-anchor="middle" font-size="11" fill="#4B5563">supplies documents to all three</text>
    </g>
  </svg>
</figure>

`HTTPClient` is drawn dashed because it is the seam you are meant to replace.

You compose them bottom-up: the operation executor goes into the step executor, and the step executor goes into the workflow executor. Each takes its collaborator rather than building one, so you can drop a stub in at any level in tests.

Only `WorkflowExecutor` writes to the run state. The layers beneath it read the state and return what they found.

## DocumentRegistry {#document-registry}

```ts
new DocumentRegistry(options?: { providers?: DocumentRegistryProvider[] })
```

Loads and caches Arazzo and OpenAPI documents. A source description that many steps use is fetched and parsed once.

```js
import { DocumentRegistry } from '@usearazzo/runner';

const registry = new DocumentRegistry();

// the entry Arazzo document: a path, a file: URL, or an http(s) URL
const document = await registry.acquireEntryDocument(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
);

// a source description, by name, as an absolute URI
const uri = document.resolveSourceDescriptionURI('petstoreAPI');
const openapi = await registry.acquire(uri);

registry.clear(); // drop every cached document
```

| Member | What it does |
|---|---|
| `acquireEntryDocument(uri)` | Loads the Arazzo document a run starts from. Throws `InvalidEntryDocumentError` when the document is not Arazzo, and `DocumentLoadError` when it cannot be read or loaded. |
| `acquire(uri)` | Loads any Arazzo or OpenAPI document, or returns the cached one. Throws `DocumentLoadError` when the document cannot be read or loaded. |
| `get(uri)` | Returns a document already loaded, or `undefined`. Never loads. |
| `entryDocument` | The entry document, once acquired. |
| `clear()` | Drops every cached document. |

A relative path resolves against the working directory. The executors load each source description when a step first needs it, so you never have to acquire them yourself.

An Arazzo document from the registry also answers `resolveSourceDescriptionURI(name)`, `resolveSourceDescriptionField(name, field)`, and `sourceDescriptionURIs()`. An OpenAPI document carries an `operationIndex`, which maps an `operationId` to its JSON Pointer (see [Without a workflow](#standalone)). Both serialize with `toJSON()` and `toYAML()`.

## WorkflowExecutor {#workflow-executor}

```ts
new WorkflowExecutor(options: WorkflowExecutorOptions)
executor.execute(workflowId: string, options?: WorkflowExecuteOptions): Promise<WorkflowExecutionResult>
```

Runs a whole workflow. You give it the entry document, the registry, and a step executor once. Then you call `execute` once per run, with a `workflowId` and its inputs.

All run state is local to one `execute` call, so concurrent runs on one executor do not interfere. The result is read-only.

### Constructor options {#workflow-executor-options}

| Option | Default | Meaning |
|---|---|---|
| `document` | required | The entry Arazzo document. |
| `registry` | required | The `DocumentRegistry` the document came from. |
| `stepExecutor` | required | The `StepExecutor` every step goes to. |
| `maxSteps` | `1000` | The most step attempts one run may make. See [Budgets](#budgets). |
| `maxWorkflowDepth` | `32` | How deeply workflows may nest, counting the one you called. |
| `sleep` | a real timer | `(ms, signal) => Promise<void>`, awaited between retry attempts. Pass a no-op in tests. |
| `now` | `performance.now` | The clock behind every `durationMs`. |
| `workflowNormalizer` | a new `ArazzoWorkflowNormalizer` | Dereferences a workflow before it runs. Pass one built with `resolve` options when external references need them. See [Document retrieval](#document-retrieval). |

### Execute options {#execute-options}

| Option | Meaning |
|---|---|
| `inputs` | The workflow's inputs, read through `$inputs`. |
| `executeOptions` | Options for the APIs the workflow calls, keyed by source description name. See [Options per API](#source-options). |
| `dependencyInputs` | Inputs for the workflows run to satisfy `dependsOn`, keyed by the entry as written. See [dependsOn](#depends-on). |
| `runDependencies` | Run the `dependsOn` workflows first. Defaults to `true`. |
| `signal` | An `AbortSignal` that cancels the run. See [Cancellation](#cancellation). |

### Options per API {#source-options}

`executeOptions` is a map. Each key is the `name` of a source description in the entry Arazzo document. Each value holds the options for the API that source description points at, and reaches only the steps that call it:

```js
const result = await runner.execute('buyPet', {
  inputs,
  executeOptions: {
    petstoreAPI: {
      server: 'http://localhost:8080/api/v3',
      securities: { authorized: { api_key: 'KEY' } },
    },
    paymentsAPI: {
      securities: { authorized: { bearerAuth: 'TOKEN' } },
    },
  },
});
```

An entry takes the [execute options of the operation executor](#operation-executor). This is where the static settings of one API go: its [`server`](#server) and `serverVariables`, and its [credentials](#authentication).

One rule decides who gets an entry: it configures one OpenAPI document, addressed by the name the entry Arazzo document gives it. So:

- An API without an entry gets no options.
- Two APIs that name a security scheme alike never see each other's credentials.
- A workflow of another Arazzo document that calls the same OpenAPI document gets the entry too, whatever name that document uses for it.
- A nested Arazzo document that reuses the name for a different document gets nothing.
- An OpenAPI document that only a nested Arazzo document declares has no name here. Declare it in the entry document's `sourceDescriptions`, or use a [`requestInterceptor`](#request-interceptor), which can pick out its requests by [source description](#request-context).

A mistake in the map throws `ExecutionError` before the first request:

| Mistake | `reason` |
|---|---|
| A key names no source description of the entry document | `source-description-not-found` |
| A key names an Arazzo source description | `source-description-not-openapi` |
| Two keys point at the same document | `ambiguous-execute-options` |
| An entry is not an object | `unknown-execute-option` |

The first row is also what a flat bag such as `{ server: '...' }` gets: `server` is read as a source description name.

A `signal` in an entry is dropped. Cancel a run with the [`signal`](#cancellation) option.

### The result {#result}

`execute` resolves with a `WorkflowExecutionResult`:

| Field | Meaning |
|---|---|
| `workflowId` | The workflow that was called. |
| `status` | `'completed'`, `'ended'`, `'failed'`, or `'transferred'`. |
| `settledStatus` | `'completed'`, `'ended'`, or `'failed'`: where the run actually landed. See [settledStatus](#settled-status). |
| `outputs` | The workflow's `outputs`, resolved against the final state. Always `{}` on a transferred run. |
| `steps` | One `StepRunRecord` per step that ran, in run order. |
| `durationMs` | How long the run took, including dependencies, sub-workflows, and retry waits. |
| `dependencies` | The `dependsOn` runs, in declaration order. Present only when there were any. |
| `transferredTo` | The result of the workflow control was handed to. Present only when `status` is `'transferred'`. |

The four statuses mean:

- **`completed`**: the steps ran to the end of the list.
- **`ended`**: an `end` action stopped the run early.
- **`failed`**: a step failed and no `onFailure` action redirected it, or a `dependsOn` workflow failed.
- **`transferred`**: a `goto` handed control to another workflow for good.

Each `StepRunRecord` in `steps` carries:

| Field | Meaning |
|---|---|
| `stepId` | The step. |
| `successful` | Whether its `successCriteria` passed, on the last attempt. |
| `action` | The `onSuccess` or `onFailure` action that was selected, or `undefined` when none matched. |
| `attempts` | How many times the step ran: `1`, or more after retries. |
| `durationMs` | Time across every attempt and the waits between them. |
| `successCriteria` | One record per entry of the step's `successCriteria`, on the last attempt, in order. |
| `actionCriteria` | One record per criterion of the actions the last attempt considered: its `onSuccess` actions when it succeeded, its `onFailure` actions otherwise. |
| `subWorkflows` | One result per attempt, on a step that calls a workflow. |
| `retryReferences` | One record per [retry reference](#retry) that fired. |

Each criterion record is a `CriterionEvaluationRecord`: the `condition` as written, whether it was `met`, the `actionName` for an action criterion, and a `diagnostic` when the condition could not be evaluated. The diagnostic has a machine-readable `code` (a [`CriterionError` reason](#criterion-error-reasons), or `RuntimeExpressionError.UnavailableExpression`, `'unavailable-expression'`) and a human-readable `message`. Records never hold request or response data.

```js
result.steps[0].successCriteria;
// [
//   { condition: '$statusCode == 200', met: false },
//   {
//     condition: '^(200',
//     met: false,
//     diagnostic: {
//       code: 'invalid-regex',
//       message: 'Invalid regex criterion condition "^(200": Invalid regular expression: /^(200/: Unterminated group',
//     },
//   },
// ]
```

Every criterion in a list is evaluated, not only up to the first unmet one, so a single run shows every reason a step failed. The regex and JSONPath messages include the engine's explanation; XPath messages name the condition only, because a query can put values from the response into its own error.

A step that fails its criteria is not an error. It makes a `failed` result, which you read like any other. Only a broken document, a failed transport, or a cancelled run throws (see [Errors](#errors)).

## Control flow {#control-flow}

After each step, the first matching `onSuccess` or `onFailure` action decides what happens next:

| Action | What happens |
|---|---|
| none matched | Success moves on to the next step. Failure stops the run with `status: 'failed'`. |
| `end` | Stops the run with `status: 'ended'`. |
| `goto` a `stepId` | Jumps to that step in the current workflow. |
| `goto` a `workflowId` | Hands control to that workflow and does not come back. See [Transfer](#transfer). |
| `retry` | Runs the step again. See [Retries](#retry). |

### Retries {#retry}

A `retry` action runs the step again up to its `retryLimit` (default `1`), waiting `retryAfter` seconds before each attempt. A `retryLimit` of `3` therefore means up to four attempts in all. The trace's `attempts` field counts them.

Per the specification, the retries run out before later failure actions are considered. An exhausted `retry` falls through to the next matching failure action. That may be another `retry` with its own budget, or an `end` or a `goto`. When none is left, the run fails.

A `retry` may also name a `stepId` or a `workflowId` to run before each attempt, for example a step that logs in again. The reference runs once per attempt, after the wait. A failed reference does not stop the retries: the specification speaks of the reference completing, not succeeding. A `workflowId` reference receives the action's `parameters` as its inputs, resolved again before every attempt (see [Action parameters](#action-parameters)); without them it runs with no inputs. Its outputs are recorded under `$workflows.<id>`, as for a sub-workflow step. A `stepId` reference counts against the step budget like any other attempt. The reference's own success and failure actions are not followed.

### Transfer to another workflow {#transfer}

A `goto` that names a `workflowId` hands control over for good. The specification calls `goto` "a one-way transfer of workflow control". The calling workflow stops there:

- its `status` is `'transferred'`;
- its `outputs` are `{}`, since it never reaches its own end;
- its `steps` hold the trace up to the `goto`;
- `transferredTo` holds the target's own result. A chain of transfers nests: `transferredTo.transferredTo`.

The target receives the action's `parameters` as its inputs (see [Action parameters](#action-parameters)); without them it runs with no inputs. Entering it does not count against the [step budget](#budgets): a `goto` fires once per step, so it cannot spin the way a retry can.

A transfer stays on the caller's call stack. A workflow that transfers back to one already on the chain throws `workflow-cycle`, even when the loop would have ended on its own. A long chain of distinct workflows throws `workflow-depth` past `maxWorkflowDepth`. So model a state machine of workflows as a bounded sequence. A loop that polls until something changes belongs in a `goto` to a `stepId`, which has no such limit.

### Action parameters {#action-parameters}

Arazzo 1.1.0 lets a success or failure action that names a `workflowId` pass `parameters` to that workflow. The runner honors them on a `goto` transfer and on a `retry` reference:

```yaml
onFailure:
  - name: reportError
    type: goto
    workflowId: handleError
    parameters:
      - name: status
        value: $statusCode
      - name: petId
        value: $steps.findPet.outputs.petId
```

- **Names.** Each parameter becomes the input of the same `name`, as for a step that calls a workflow. If a name repeats, the first entry wins. `parameters: []` passes no inputs.
- **Values.** They resolve against the step that took the action, in the same context as the action's `criteria`: `$statusCode`, `$response.*`, `$request.*`, `$url`, `$method`, `$inputs`, and, for a step that calls a workflow, `$outputs`. `$steps.<stepId>.outputs` holds the outputs that attempt just produced, even mid-retry, before the step's outputs are recorded. `$components` resolve against the calling document, also when the target lives in another one.
- **When.** Only the action that fires is resolved, when it fires, so a broken parameter on an action that is never taken does not fail the run. A `retry` reference resolves its parameters again before every attempt, against the attempt that just failed, before the reference counts against the [step budget](#budgets).
- **Recording.** A `retry` reference with `parameters` records the inputs it ran with under `$workflows.<id>.inputs`. Without `parameters`, inputs an earlier call to the same workflow recorded are kept. A `goto` transfer records nothing in the caller, which ends there.
- **`in`.** The specification says the `in` field must not be used on these parameters. An `in` written on one throws `ResolverError` with `reason: 'action-parameter-location'`. One that arrives through a `$components.parameters` reference is fine and maps by name: a shared component carries `in` for the operation steps that use it.
- **Checked up front.** An inline `in`, or a `parameters` that is not a list (`reason: 'malformed-parameters'`), throws before the workflow's first request, on any action of any of its steps or among the workflow's own `successActions` and `failureActions`, as a malformed `successCriteria` does.
- **No `workflowId`.** Valid `parameters` on an action that names no `workflowId` (an `end`, a `goto` to a `stepId`, a `retry` with no reference or a `stepId` one) are ignored. The validator reports them as a warning.

An action that names a `workflowId` and has no `parameters` runs its target with no inputs. The caller's own `$inputs` are not forwarded. Every 1.x document gets this behavior; the validator flags action `parameters` in a 1.0.x document.

### settledStatus {#settled-status}

`'transferred'` says where control went, not whether the run succeeded. `settledStatus` gives you the verdict. It follows the `transferredTo` chain to the run that did not transfer and repeats its status. On a run that did not transfer, it is the same as `status`.

So check `settledStatus`, not `status`, when you ask whether a run failed:

```js
const result = await executor.execute('myWorkflow');

if (result.settledStatus === 'failed') {
  // an ordinary failed run, or one that transferred into a failing chain
}
```

A plain `result.status === 'failed'` check misses the second case. For the result the chain ended in, with its `outputs` and `steps`, use `settledResult`:

```js
import { settledResult } from '@usearazzo/runner';

const landedOn = settledResult(result);
console.log(landedOn.workflowId, landedOn.outputs);
```

The runner judges nested runs the same way. A sub-workflow step, a `dependsOn` workflow, or a retry reference whose chain settles `'completed'` or `'ended'` counts as a success.

### Budgets {#budgets}

`maxSteps` (default `1000`) bounds a runaway `goto` loop, a runaway `retry`, and a runaway tree of sub-workflow calls alike. Every attempt of every step counts. The budget is shared by the whole call tree, so a sub-workflow cannot escape the limit the caller set. Going over it throws `ExecutionError` with `reason: 'step-budget'` and the chain of workflows in progress as `path`.

## Composing workflows {#composing}

### Sub-workflow steps {#sub-workflows}

A step with a `workflowId` calls another workflow. Its `parameters` become that workflow's inputs, matched by `name`. The run is recorded under `$workflows.<id>`, and the step's own `successCriteria` and `outputs` are then evaluated.

Parameters the calling workflow passed down reach it too. A called workflow that fails puts the step on its failure path. `onFailure` then applies exactly as for an operation step, and a `retry` runs the whole sub-workflow again.

The specification does not say what the HTTP expressions mean in such a step, since it sent no request. The runner reads them this way:

- **`$outputs.<name>` is the called workflow's output** in the step's `successCriteria`, `outputs`, and action `criteria`. Every example in the specification that uses it relies on this reading. `$workflows.<id>.outputs.<name>` works everywhere.
- **`$statusCode`, `$url`, `$method`, `$request.*`, and `$response.*` fail a criterion** in the step's `successCriteria` or an action's `criteria`. The record carries a `diagnostic` with `code: 'unavailable-expression'`, so the mistake stays visible. A failed `successCriteria` sends the step down its failure path, where `onFailure` applies, and a workflow-wide default action written for operation steps simply does not match. In the step's `outputs` they throw a `RuntimeExpressionError` with `reason: 'unavailable-expression'`, since an output has no failed state to fall back to.

```yaml
- stepId: place-order
  workflowId: place-order
  successCriteria:
    - condition: $outputs.workflow_order_id != null # not $statusCode == 200
  outputs:
    my_order_id: $outputs.workflow_order_id
```

### dependsOn {#depends-on}

A workflow's `dependsOn` workflows run to completion before its own steps. Each one's outputs are readable as `$workflows.<id>.outputs`. A dependency that already completed in the same run is not run again, so a diamond does not repeat its side effects. A dependency that fails makes the run `failed` before any of its own steps run.

The specification gives `dependsOn` no way to pass inputs. A dependency that needs them takes them from `dependencyInputs`, keyed by the `dependsOn` entry as written:

```js
await executor.execute('placeOrder', {
  inputs: { petId: 1 },
  dependencyInputs: { login: { username: 'theUser', password: '12345' } },
});
```

Pass `runDependencies: false` when the dependencies were already satisfied some other way. That covers the workflow you name and no more. A sub-workflow it calls still runs its own dependencies, which you may not even know about.

A nested run records the workflow that was called, not the one control ended up in. So when a called workflow transfers onward, `$workflows.<id>.outputs` is `{}`, for the same reason its own `outputs` are. The final outputs are on the nested result itself: follow `transferredTo` on the step's `subWorkflows` entry or the result's `dependencies` entry. A result may carry both `dependencies` and `transferredTo`; a workflow that ran its prerequisites and then transferred reports both.

Re-entering a workflow already in progress throws `ExecutionError` with `reason: 'workflow-cycle'` (or `'dependsOn-cycle'` when every edge of the loop is a `dependsOn` edge). A diamond is not a cycle: a workflow that finished may run again.

### Other Arazzo documents {#cross-document}

Anywhere a workflow is named (a step's `workflowId`, a `dependsOn` entry, a `retry` reference, a `goto`), it may be a workflow of another Arazzo document:

```yaml
- stepId: order
  workflowId: $sourceDescriptions.petstoreFlows.authenticateAndOrderPet
```

The named source description has to be an Arazzo document. The runner checks what the document actually is rather than trusting its `type`.

A workflow from another document runs against that document. Its `operationId`s, its expressions, and its own workflow references resolve there. Source description names belong to the document they are written in, so two documents may each have a `petstoreAPI` that means different APIs.

Two details follow from the runtime expression grammar:

- **`$workflows.<id>` uses the bare workflow id.** If two documents both have a workflow `login` and one run calls both, the later run wins under that key. Cycle detection and caching tell the two apart; an error `path` shows a foreign workflow as `<documentURI>#<workflowId>`.
- **`dependencyInputs` uses the entry as written**: the bare id for the same document, the whole `$sourceDescriptions.<name>.<workflowId>` expression for another one.

## What steps inherit {#inheritance}

A workflow hands its steps two things, default actions and parameters, and both follow the same rule: a step can override what it inherits but never remove it.

**Default actions merge by name.** A workflow's `successActions` and `failureActions` "can be overridden at the step level but cannot be removed there", as the specification puts it. A step's own action replaces the workflow action with the same `name`, and every workflow action the step does not name still applies. Each step gets its own actions first, in order, followed by the workflow actions it did not override. Order matters because the first action whose `criteria` match is the one taken. So `onFailure: []` gets every workflow failure action, and a step with its own `goto` still falls through to the workflow's `end` when the `goto` does not match. A step's own list is kept as written. Within the workflow's list, the first action with a given `name` wins. Success and failure merge separately.

**Parameters merge.** A workflow's `parameters` reach every step. The specification lets a step override an inherited parameter but never remove one, so each step gets both lists, its own declaration winning. A parameter is identified by its `name` and `in` together: a step's `trace` query parameter overrides an inherited `trace` query parameter, and leaves an inherited `trace` header alone.

Inheritance copies declarations, not values. A workflow parameter with the value `$steps.login.outputs.token` is evaluated for each step when that step runs, so every step sees the token as it is at that moment. Every step sends its inherited parameters, including to an operation that does not declare them, so a parameter only some operations take belongs on those steps rather than on the workflow.

For a step that calls an operation, a parameter's `in` must be `path`, `query`, `header`, `cookie`, or `querystring`. Any other location throws `ResolverError` with `reason: 'invalid-location'` before any request is sent. That includes `body`, which Arazzo 1.0.0 listed and 1.0.1 removed: it is rejected in every version. A payload belongs in the step's `requestBody`, which reaches an OpenAPI 2.0 operation's body parameter too.

A step's parameters are sent even when the operation does not declare them. Header, query, and cookie parameters are delivered, including an `Authorization` header, which OpenAPI 3 cannot declare. A header replaces any value the request would otherwise carry, such as the default `Accept`. Header and cookie values are serialized the way a declared parameter without `style` or `explode` would be, so an array is sent as `a,b` and an object as `k,v,k2,v2`. Cookie values are percent-encoded, and a `null` value sends nothing. A path parameter fills a matching `{name}` in the operation's path, and throws a `ClientError` when the path has none.

Steps that call a workflow inherit both too. Their parameters are inputs, with no `in`, so the name alone decides what overrides what. An inherited parameter that does carry an `in` arrives as an input under its bare name.

## Cancellation {#cancellation}

Pass an `AbortSignal` as `signal` to cancel a run:

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

const result = await executor.execute('authenticateAndOrderPet', {
  inputs,
  signal: controller.signal,
});
```

The runner checks the signal before each step, before each retry attempt, and before entering a sub-workflow or a `dependsOn` workflow. A retry wait is cut short. The signal also reaches the HTTP client, so the request in flight is cancelled rather than awaited.

A cancelled run throws `ExecutionError` with `reason: 'aborted'`. The error names where the run stopped (`workflowId`, `stepId`, `path`), and its `cause` is the signal's reason. It does not resolve as a `failed` result: the steps that never ran did not fail. A request the HTTP client dropped because of the signal is reported the same way, as `aborted`, not as the `ClientError` a request failing on its own would raise.

A client that ignores the signal costs one request in flight; the run still stops at the next boundary. The `signal` option is the only way to cancel a run: a `signal` inside an `executeOptions` entry is dropped. `StepExecutor` honours a `signal` in its execute options on its own: an aborted signal throws `aborted` before any request goes out.

## StepExecutor {#step-executor}

```ts
new StepExecutor(options: { document: ArazzoDocument; registry: DocumentRegistry; operationExecutor: OpenAPIOperationExecutor })
stepExecutor.execute(step, state, executeOptions?: StepExecuteOptions, workflowId?): Promise<StepExecutionResult>
```

Runs one step that calls an OpenAPI operation. It does four things in order:

1. finds the step's operation (`operationId` or `operationPath`);
2. resolves the step's `parameters` and `requestBody` against `$inputs`, `$steps.*.outputs`, and the rest of the state;
3. sends the operation through the `OpenAPIOperationExecutor`;
4. evaluates `successCriteria`, resolves `outputs`, and selects the `onSuccess` or `onFailure` action against the response.

`WorkflowExecutor` calls it for you. You call it directly to run one step on its own.

Here `executeOptions` is not keyed by source description. It is one bag of [operation execute options](#operation-executor), or a function `(locator) => bag` that returns the bag for the operation the step was located to:

```js
import {
  DocumentRegistry,
  ArazzoWorkflowExtractor,
  ArazzoStepExtractor,
  WorkflowExecutionState,
  OpenAPIOperationExecutor,
  StepExecutor,
} from '@usearazzo/runner';

const registry = new DocumentRegistry();
const document = await registry.acquireEntryDocument(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
);

const workflow = new ArazzoWorkflowExtractor().extract(document, 'authenticateAndOrderPet');
const step = new ArazzoStepExtractor().extract(workflow, 'findAvailablePets');

const stepExecutor = new StepExecutor({
  document,
  registry,
  operationExecutor: new OpenAPIOperationExecutor(),
});
const state = new WorkflowExecutionState({ inputs: { preferredPetStatus: 'available' } });

const outcome = await stepExecutor.execute(step, state, { server: 'http://localhost:8080/api/v3' });

outcome.successful; // true when every successCriterion passed
outcome.outputs; // the step's outputs, by name
outcome.action; // the selected onSuccess / onFailure action, or undefined
outcome.successCriteria; // one CriterionEvaluationRecord per successCriterion
outcome.actionCriteria; // one per criterion of the actions considered
outcome.actionContext; // the context the step's actions are taken in
outcome.response; // the response, with the request as sent

// record the outputs so a later step can read $steps.findAvailablePets.outputs
state.setStepOutputs(outcome.stepId, outcome.outputs);
```

`StepExecutor` changes nothing in the state. It returns the outputs and the action for the caller to record and act on. `matchedActions` lists every action that matched, in order; `action` is the first.

A step whose criteria go unmet is a normal outcome, `successful: false`, not a throw. So is a criterion whose condition cannot be evaluated: an invalid regex, JSONPath, XPath or simple condition, or non-XML data under an `xpath` query, counts as unmet, as Arazzo 1.1.0 requires. In an action's `criteria` it makes the action not match. Every criterion is evaluated, so one that is malformed throws even after an earlier criterion was unmet. These throw:

- a step with no operation (`missing-operation`), more than one target (`ambiguous-target`), or an operation that cannot be found (`operation-not-found`, or another reason from [Errors](#errors) when the reference itself is wrong): `ExecutionError`;
- an `outputs` value that is not a runtime expression: `ResolverError` with `reason: 'invalid-expression'`. `$response.body.id` is not Arazzo syntax; `$response.body#/id` is;
- a criterion `context` that is not a runtime expression, whatever the criterion `type`: `CriterionError` with `reason: 'invalid-context'`;
- a `successCriteria` that is not a list of Criterion Objects: `ResolverError` with `reason: 'malformed-criteria'` when it is not a list, or `'malformed-criterion'` when an entry is not a Criterion Object. It throws before the request, rather than skipping the entry and letting the step pass on less than the author asserted.

Pass `workflowId`, the id of the workflow the step belongs to, and every error the step raises carries it next to `stepId`: step ids are only unique within a workflow. `WorkflowExecutor` always passes it.

Parameter and payload values may be literals, since the specification types them `Any`.

A step that calls a workflow is not an operation step, and `execute` throws on it. `WorkflowExecutor` runs those itself, through `evaluateCriteria`, `selectActions` and `actionContext`, which are public for that reason. `evaluateCriteria` returns the `successCriteria` records; `selectActions` returns `{ matchedActions, actionCriteria }`; `actionContext(context, stepId, outputs)` returns the context with `$steps.<stepId>.outputs` replaced by `outputs`, which is what [action parameters](#action-parameters) resolve against. Both take the same optional `workflowId` as `execute`. `forDocument(document)` returns a sibling executor bound to another Arazzo document.

### Request body payloads {#request-body}

A parameter `value` or an `outputs` entry is either a literal or one whole runtime expression. A `requestBody` payload is different: the specification says it can *contain* expressions, so the runner walks it. Every string inside it follows one rule:

- a whole expression (`$inputs.petId`) becomes its value, with its type;
- any other string has its `{expression}` parts filled in, as a string (`"Order for {$inputs.name}"`). Braces that are not an expression stay as written, so a JSON or XML template works as is.

```yaml
requestBody:
  contentType: application/json
  payload:
    petId: $inputs.pet_id # the number 10
    couponCode: $inputs.coupon_code # left out when no coupon_code was given
    note: 'Order for {$inputs.name}' # a string
```

Object keys are never evaluated, and neither are values read from inputs. Filled-in values go in as they are, with `null` as an empty string and objects as JSON text. Escaping them for the content type is up to you. A `replacements` entry's `value` is not walked: like a parameter value, it is a literal or one whole expression, so `'{$inputs.petId}'` there stays as written.

An expression that does not resolve counts as not provided. An object member is left out, and so is a `replacements` entry. Where leaving it out is impossible (a whole-expression payload, an array element, a `{...}` inside a string), the step throws `ResolverError` with `reason: 'unresolved-expression'` and the location as `target`. A `{$` that does not parse, like `{$inputs.}`, throws with `reason: 'invalid-expression'` rather than going out as text. A value that resolves to `null` is provided and kept.

## OpenAPIOperationExecutor {#operation-executor}

```ts
new OpenAPIOperationExecutor(options?: OpenAPIOperationExecutorOptions)
executor.execute(locator: { document; jsonPointer; sourceDescription? }, options?): Promise<OpenAPIOperationResponse>
```

Runs one OpenAPI operation and returns its response. It knows nothing about Arazzo: it does not find operations or resolve expressions. Given the operation's document and JSON Pointer, it:

1. **builds** the HTTP request: parameter serialization (`style`, `explode`), security, and the server, for OpenAPI 2.0 through 3.1;
2. **sends** it through the HTTP client (global `fetch` by default);
3. **reads** the `Response` by its content type into an `OpenAPIOperationResponse`, which is what `$response.*` and criteria see.

| Constructor option | Meaning |
|---|---|
| `httpClient` | Sends the request. See [The HTTP client](#http-client). |
| `requestInterceptor` | Changes every request before it is sent. See [Authentication](#authentication). |
| `responseNormalizer`, `operationExtractor`, `operationNormalizer`, `documentAssembler` | Replace one stage of the pipeline. Rarely needed. |

| Execute option | Meaning |
|---|---|
| `parameters` | Parameter values, by name. |
| `requestBody`, `requestContentType` | The body and its media type. |
| `responseContentType` | Sent as `Accept`. Defaults to the media types of the operation's 2xx responses. |
| `server`, `serverVariables` | Where the request goes. See [Choosing the server](#server). |
| `securities` | Credentials for the security schemes the document declares. See [Authentication](#securities). |
| `requestInterceptor` | Changes this request, after the constructor's interceptor. |
| `step` | The Arazzo step the request is for, `{ stepId, workflowId? }`, handed to the interceptors. The step executor sets it. |
| `signal` | An `AbortSignal`. |

The response has `status`, `statusText`, `ok`, `url`, `headers`, and `body`. `body` is the content parsed by its media type, which is what `$response.body` reads. The content itself is read with `text()`, `blob()`, and `bytes()`, named after the `fetch` `Response` methods but synchronous. They return empty values when the response has no body, as with `204` or `304`. `bytes()` and `blob()` always return the bytes the server sent, in any charset. Header values stay strings, as the server sent them. A repeated header, `Set-Cookie` included, is joined with `", "`. `response.request` is the request **as it was sent**: final URL, method, headers, and body. That is what `$url`, `$method`, and `$request.*` read.

`requestContentType` is matched against the operation's declared media types ignoring case and parameters, and a declared range covers a concrete type: `application/json; charset=utf-8` matches `application/json` and `*/*`. The form types, `application/x-www-form-urlencoded` and `multipart/form-data`, must be declared exactly, since they decide how the body is encoded. A media type that matches nothing throws a `ClientError` instead of sending a wrongly encoded body. Swagger 2.0, which has no request body object, takes the body as its `body` or `formData` parameter.

### Choosing the server {#server}

By default a request goes to the first server the operation declares. For Swagger 2.0 that is `schemes`, `host`, and `basePath`. A relative server resolves against the URL the document was loaded from, so a document from `https://petstore3.swagger.io/api/v3/openapi.json` that declares `/api/v3` needs no configuration.

`server` does two jobs:

```js
// selection: the value matches a declared server, so its variable defaults
// come along and only the ones you name change
await executor.execute(locator, {
  server: 'https://{region}.example.com/{basePath}', // the template, as declared
  serverVariables: { region: 'us' }, // basePath keeps its default
});

// override: the value matches nothing declared, so it is the base URL
await executor.execute(locator, { server: 'http://localhost:8080/api/v3' });
```

There is no silent fallback. A `server` that matches nothing declared is never swapped for the first declared one, so a typo fails at the network instead of reaching the wrong host. An override replaces the base path too, so include it (`/api/v3`). Overrides work on Swagger 2.0; selection and `serverVariables` are OpenAPI 3.x only. For a document loaded from disk with relative servers, pass an absolute `server`.

In a workflow, pass `server` in the API's entry of `executeOptions`, and it applies to every step that calls that API. See [Options per API](#source-options).

### The HTTP client {#http-client}

The HTTP client is a function from the built request to a WHATWG `Response`:

```ts
type HTTPClient = (request: OpenAPIOperationRequest) => Promise<Response>;
```

The default, `httpClientFetch`, is one line: `(request) => fetch(request.url, request)`. Any HTTP stack drops in:

```js
import { fetch, Agent } from 'undici';
import { OpenAPIOperationExecutor } from '@usearazzo/runner';

// undici with a dispatcher global fetch cannot take:
// connection pooling, a proxy, client certificates
const dispatcher = new Agent({ connections: 128, keepAliveTimeout: 60_000 });

const pooledExecutor = new OpenAPIOperationExecutor({
  httpClient: (request) => fetch(request.url, { ...request, dispatcher }),
});

// canned responses in a test: no network
const offlineExecutor = new OpenAPIOperationExecutor({
  httpClient: async () =>
    new Response('[{"id":1,"status":"available"}]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
});
```

A client you write has three rules to follow:

- **Resolve with a `Response` for every HTTP status.** A 404 or a 500 is a valid outcome for a step's `successCriteria` to judge, not an error.
- **Throw only when the request could not be made.** The executor wraps the error in a `ClientError`, with the original as `cause`.
- **Honor `request.signal`** when it is present, so a cancelled run cancels the request.

The response is read on the executor's side of the client, so `$response.body` means the same thing whichever client you plug in. A client that only adds behaviour around the request can call `httpClientFetch` instead of reimplementing it.

The client is also where credentials of the connection go: a client certificate or an authenticating proxy. They never appear in a request, so `securities` and interceptors cannot carry them. See [Authentication](#authentication). [Mutual TLS](#mutual-tls) shows a client that presents a certificate.

### Authentication {#authentication}

Arazzo says nothing about credentials, so they come from outside the workflow. There are three places to put them. Start with the first, and fall back to the next when it cannot express what you need:

1. [**`securities`**](#securities), for static credentials of the security schemes an OpenAPI document declares.
2. [**`requestInterceptor`**](#request-interceptor), for credentials computed per request, and for anything `securities` cannot express.
3. [**Custom HTTP client**](#http-client), for credentials that belong to the connection and never appear in a request: a client certificate (mutual TLS) or an authenticating proxy.

The three combine. Credentials from `securities` are already on the request when an interceptor sees it, and the client sends what the interceptors leave.

The runner runs no OAuth flow. You supply the tokens.

Credentials for an API never reach document retrieval. Documents behind a token or a client certificate are configured separately, see [Document retrieval](#document-retrieval).

#### securities {#securities}

`securities` is an execute option: `{ authorized: { <scheme name>: <credential> } }`. The names are the ones under `components.securitySchemes` in the API's OpenAPI document (`securityDefinitions` in OpenAPI 2.0). In a workflow, it goes in the API's entry of [`executeOptions`](#source-options):

```js
await runner.execute('buyPet', {
  inputs,
  executeOptions: {
    petstoreAPI: {
      securities: { authorized: { api_key: 'KEY' } },
    },
    paymentsAPI: {
      securities: {
        authorized: {
          bearerAuth: 'TOKEN',
          basicAuth: { username: 'user', password: 'pass' },
        },
      },
    },
  },
});
```

The form of a credential depends on its scheme:

| Scheme | Credential |
|---|---|
| `apiKey` | The key as a string, or `{ value }`. It goes in the header, query, or cookie the scheme names. |
| `http` with `bearer` | The token as a string, or `{ value }`. |
| `http` with `basic` | `{ username, password }`. |
| `oauth2`, `openIdConnect` | `{ token: { access_token, token_type? } }`. `token_type` defaults to `Bearer`. |

Each credential is applied only to the operations that require its scheme. An operation with `security: []` gets none.

Nothing checks a credential against its scheme. A mistyped scheme name sends the request without the credential, a wrong form sends a broken one, and either way the API answers `401`.

#### requestInterceptor {#request-interceptor}

A `requestInterceptor` runs after the request is built and before it is sent. It may be async, and it may change the request or return a new one:

```js
const executor = new OpenAPIOperationExecutor({
  requestInterceptor: async (request) => {
    request.headers.Authorization = `Bearer ${await acquireToken()}`;
  },
});
```

It sets headers directly, so it works however the OpenAPI document declares its security schemes, or if it declares none. A `requestInterceptor` in the execute options runs after this one.

In a workflow, an interceptor given to `ArazzoRunner.load` sees every request. One inside an API's entry of [`executeOptions`](#source-options) sees only the requests to that API.

Interceptors run after the body is serialized, so a plain-object body is already a JSON string and a signature covers the exact bytes sent. They run before the request is recorded for `$request.*` and handed to the HTTP client.

##### The request context {#request-context}

An interceptor gets a second argument that says what the request is for. Use it to change the requests of one step, one operation, or one source description, without matching on the URL:

```js
const runner = await ArazzoRunner.load(
  'https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml',
  {
    requestInterceptor: (request, ctx) => {
      if (ctx.step?.stepId === 'placeOrder') {
        request.headers['Idempotency-Key'] = crypto.randomUUID();
      }
    },
  },
);
```

For the `loginUser` step of the [sample workflow](#quick-start), `ctx` is:

```json
{
  "operation": {
    "documentURI": "https://petstore3.swagger.io/api/v3/openapi.json",
    "jsonPointer": "/paths/~1user~1login/get",
    "operationId": "loginUser",
    "sourceDescription": {
      "name": "petstoreAPI",
      "documentURI": "https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml"
    }
  },
  "step": { "workflowId": "authenticateAndOrderPet", "stepId": "loginUser" }
}
```

| Field | Meaning |
|---|---|
| `operation.documentURI`, `operation.jsonPointer` | The operation: its OpenAPI document and where it is in it. Always present. |
| `operation.operationId` | The `operationId` the OpenAPI document declares. Absent when it declares none. |
| `operation.sourceDescription` | The source description the step reached the operation through: its `name`, and the `documentURI` of the Arazzo document that declares it. Names belong to the document that declares them, so the pair tells an entry document's `petstoreAPI` from a nested document's own. Absent for an `operationPath` with a literal URL. |
| `step` | `{ stepId, workflowId }` of the step the request is for. |

Where a field is missing, it is left out rather than set to `undefined`. Which fields arrive depends on what sends the request:

| Called through | `operation` | `step` |
|---|---|---|
| `ArazzoRunner`, `WorkflowExecutor` | ✓ | `stepId` and `workflowId` |
| `StepExecutor` on its own | ✓ | `stepId`, and `workflowId` if you pass one |
| `OpenAPIOperationExecutor` on its own | ✓, without `sourceDescription` unless the locator carries one | only if you pass `step` in the execute options |

Two source descriptions can point at the same OpenAPI document, one API used with two accounts, say. Their requests share a `documentURI` and a `jsonPointer`, so `sourceDescription.name` is the only field that tells them apart.

Interceptors that take one argument keep working.

`request.headers` is a plain object, and the case of a header name in it can differ. For an OpenAPI 2.0 document, credentials from `securities` arrive under lower-case `authorization`. So:

- Match header names case-insensitively.
- Delete the existing key before you replace a header. The same header under two spellings is sent as one header with both values.

Change requests here rather than in a custom HTTP client. The runner records `response.request` after the interceptors run and before the client is called, so only interceptor changes show up in `$request.*` and the trace.

### Without a workflow {#standalone}

The operation executor works on its own, with an OpenAPI document and an `operationId`. The document's `operationIndex` maps the `operationId` to the JSON Pointer the executor needs:

```js
import { DocumentRegistry, OpenAPIOperationExecutor } from '@usearazzo/runner';

const registry = new DocumentRegistry();
const openapi = await registry.acquire('https://petstore3.swagger.io/api/v3/openapi.json');

const locator = {
  document: openapi,
  jsonPointer: openapi.operationIndex.get('getPetById'),
};

const executor = new OpenAPIOperationExecutor();
const response = await executor.execute(locator, { parameters: { petId: 1 } });

console.log(response.status, response.headers['content-type']);
console.log(response.request.method, response.request.url);
```

```text
200 application/json
GET https://petstore3.swagger.io/api/v3/pet/1
```

A response with a non-2xx status comes back like any other: a missing pet gives `404` with `ok: false`. Whether that counts as success is a step's `successCriteria` to judge. What throws is an operation that cannot be found, an unsupported OpenAPI version, a request that cannot be built (a required parameter is missing), and a transport failure. The last two are `ClientError`s.

## Errors {#errors}

The runner keeps two things apart:

- **A run that fails** resolves normally, with `status: 'failed'`. A step's criteria went unmet, or a `dependsOn` workflow failed. That is an outcome about the API, not a mistake in your code.
- **A run that cannot go on** throws: the document is wrong, a request could not be built or sent, or you cancelled it.

Every error the runner throws extends `ArazzoRunnerError`:

| Error | Thrown when | Extra fields |
|---|---|---|
| `ExecutionError` | The document cannot be run as written, a budget ran out, or the run was cancelled. | `reason`, `workflowId`, `stepId`, `path` |
| `ClientError` | A request could not be built (a required parameter is missing, a media type matches nothing, a path parameter has no place in the path) or sent. The underlying error is on `cause`. | `operationId`, `operationPath`, `uri` |
| `ResolverError` | A parameter, body, or output could not be resolved. | `reason`, `workflowId`, `stepId`, `target` |
| `CriterionError` | A criterion is malformed as written: a missing `condition`, an unknown `type`, an unsupported expression `version`, a `context` that is missing or not an expression. A condition that cannot be evaluated is not an error; the criterion is unmet. | `reason`, `condition`, `type` |
| `RuntimeExpressionError` | An expression cannot be evaluated where it is used. | `reason`, `expression` |
| `InvalidEntryDocumentError` | The entry document is not Arazzo, or a registry passed to `ArazzoRunner` backs a different entry document. | `uri` |
| `DocumentLoadError` | A document cannot be read or loaded: a missing file, an HTTP error, an unresolvable reference. Applies to the entry document and to a source description loaded during a run. The underlying error is on `cause`. | `uri` |

`CriterionEvaluationError` extends `CriterionError`. The criterion evaluators (`RegexCriterionEvaluator`, `JSONPathCriterionEvaluator`, `XPathCriterionEvaluator`, `SimpleCriterionEvaluator`) throw it for a condition they cannot evaluate, and `CriterionEvaluator` turns it into an unmet criterion: `evaluate` returns a `CriterionOutcome`, `{ met, error? }`, whose `error` is that `CriterionEvaluationError`. Call an evaluator directly and you catch it yourself; an evaluator you inject through `CriterionEvaluatorOptions` throws it to fail a criterion, and anything else it throws propagates. It carries the same reasons as `CriterionError`, so `CriterionEvaluationError.InvalidRegex` is `CriterionError.InvalidRegex`.

`ExecutionError`, `ResolverError`, `CriterionError`, and `RuntimeExpressionError` list the reasons they carry as static fields on the class: `ExecutionError.WorkflowNotFound` is `'workflow-not-found'`. Compare `error.reason` against the static rather than a string literal; in TypeScript, `reason` is typed as the class's own union (`ExecutionErrorReason`, `ResolverErrorReason`, `CriterionErrorReason`, `RuntimeExpressionErrorReason`), so a misspelled reason does not compile. The tables below list every reason.

```js
import { ExecutionError, ClientError } from '@usearazzo/runner';

try {
  const result = await executor.execute('authenticateAndOrderPet', { inputs });
  if (result.settledStatus === 'failed') {
    // the API said no: read result.steps to see where
  }
} catch (error) {
  if (error instanceof ExecutionError) {
    error.reason === ExecutionError.WorkflowNotFound; // true
    error.message; // 'workflow "nope" not found in Arazzo document at "https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml"'
  }
  if (error instanceof ClientError) {
    error.cause; // what the HTTP client threw
  }
  throw error;
}
```

`ExecutionError` names its cause in `reason`:

| `reason` | Static | Cause |
|---|---|---|
| `workflow-not-found` | `WorkflowNotFound` | No workflow has that id. The message names the document searched. For a reference to a missing workflow (a `dependsOn` entry, a step that calls a workflow, or a `goto` or `retry` action), `workflowId` is the workflow making the reference, `stepId` is the step it sits on (there is none for `dependsOn`), and the message quotes the reference as written. For an unknown id passed to `execute`, `workflowId` is that id. |
| `operation-not-found` | `OperationNotFound` | No operation answers a step's `operationId` or `operationPath`: the operation is not in its OpenAPI source description, the document has no OpenAPI source description, or the `operationPath` pointer locates no operation. `workflowId` and `stepId` name the step. |
| `goto-target-not-found` | `GotoTargetNotFound` | A `goto` names a step that does not exist. |
| `goto-target-missing` | `GotoTargetMissing` | A `goto` names neither a `stepId` nor a `workflowId`. |
| `retry-target-not-found` | `RetryTargetNotFound` | A `retry` references a step the workflow does not have. |
| `ambiguous-target` | `AmbiguousTarget` | A step, `goto`, or `retry` names more than one target. |
| `missing-operation` | `MissingOperation` | An operation step has neither an `operationId` nor an `operationPath`. |
| `workflow-step` | `WorkflowStep` | `StepExecutor` was given a step that calls a workflow. `WorkflowExecutor` runs those itself. |
| `unknown-action-type` | `UnknownActionType` | An action's `type` is not `end`, `goto`, or `retry`. |
| `malformed-steps`, `malformed-dependsOn` | `MalformedSteps`, `MalformedDependsOn` | A workflow's `steps` or `dependsOn` is present but malformed. |
| `workflow-cycle`, `dependsOn-cycle` | `WorkflowCycle`, `DependsOnCycle` | A workflow is entered again while it is still running. |
| `workflow-depth` | `WorkflowDepth` | Workflows nest deeper than `maxWorkflowDepth`. |
| `step-budget` | `StepBudget` | The run made more than `maxSteps` step attempts. |
| `aborted` | `Aborted` | The run was cancelled. |
| `invalid-workflow-reference` | `InvalidWorkflowReference` | A `$`-prefixed workflow reference is not `$sourceDescriptions.<name>.<workflowId>`. |
| `invalid-operation-reference` | `InvalidOperationReference` | A `$`-prefixed `operationId` is not `$sourceDescriptions.<name>.<operationId>`, or an `operationPath` has no source URL or an invalid JSON Pointer. |
| `source-description-not-found` | `SourceDescriptionNotFound` | The named source description does not exist, whether a workflow reference, an operation reference, or a key of `executeOptions` names it. |
| `source-description-not-arazzo` | `SourceDescriptionNotArazzo` | A workflow reference points into a document that is not Arazzo. |
| `source-description-not-openapi` | `SourceDescriptionNotOpenAPI` | An operation reference points into a document that is not OpenAPI, or a key of `executeOptions` names an Arazzo source description. |
| `unknown-execute-option` | `UnknownExecuteOption` | `execute` was passed an option it does not take, or an `executeOptions` entry is not an object. |
| `ambiguous-execute-options` | `AmbiguousExecuteOptions` | Two keys of `executeOptions` point at the same document. See [Options per API](#source-options). |
| `retry-reference-unsupported` | `RetryReferenceUnsupported` | A `retry` action references a step or workflow, but the `StepRetryRunner` was given no way to run it. |
| `unknown-transition-kind` | `UnknownTransitionKind` | A step produced a transition the workflow executor does not recognize. This is a runner bug, not a document mistake. |

`ResolverError` names its cause in `reason`, with the field at fault in `target`:

| `reason` | Static | Cause |
|---|---|---|
| `malformed-parameters` | `MalformedParameters` | `parameters` is present but is not a list. |
| `action-parameter-location` | `ActionParameterLocation` | A parameter of a success or failure action declares an `in`. Thrown before the workflow's first request. See [Action parameters](#action-parameters). |
| `missing-name` | `MissingName` | A parameter has a missing or non-string `name`. |
| `missing-location` | `MissingLocation` | A parameter of a step that calls an operation has no `in`. |
| `malformed-location` | `MalformedLocation` | A parameter's `in` is not a string. |
| `invalid-location` | `InvalidLocation` | A parameter's `in` is not `path`, `query`, `header`, `cookie`, or `querystring`. |
| `ambiguous-delivery` | `AmbiguousDelivery` | A parameter cannot be delivered unambiguously at its location. |
| `malformed-request-body` | `MalformedRequestBody` | `requestBody` is present but is not a map. |
| `malformed-replacements` | `MalformedReplacements` | `requestBody.replacements` is present but is not a list. |
| `unsupported-target` | `UnsupportedTarget` | A `replacements` target is not a JSON Pointer. |
| `unresolved-target` | `UnresolvedTarget` | A `replacements` target does not resolve in the payload. |
| `unresolved-expression` | `UnresolvedExpression` | An expression in the request body did not resolve where it cannot be left out. |
| `invalid-expression` | `InvalidExpression` | An `outputs` value or a `{$...}` in the request body is not a valid runtime expression. |
| `malformed-outputs` | `MalformedOutputs` | A step's or workflow's `outputs` is present but is not a map. |
| `malformed-criteria` | `MalformedCriteria` | A step's `successCriteria` or an action's `criteria` is present but is not a list. |
| `malformed-criterion` | `MalformedCriterion` | A criteria list has an entry that is not a Criterion Object. |
| `malformed-actions` | `MalformedActions` | A step's `onSuccess` or `onFailure` is present but is not a list. |
| `malformed-action-entry` | `MalformedActionEntry` | An `onSuccess` or `onFailure` list has an entry that is not a Success or Failure Action Object. |

`CriterionError` names its cause in `reason`, with the criterion's `condition` and `type`:
{: #criterion-error-reasons}

| `reason` | Static | Cause |
|---|---|---|
| `invalid-criterion` | `InvalidCriterion` | The element is not a Criterion Object. |
| `missing-condition` | `MissingCondition` | The `condition` is missing or empty. |
| `invalid-type` | `InvalidType` | The `type` is present but unreadable. |
| `unknown-type` | `UnknownType` | The `type` names no known criterion type. |
| `invalid-version` | `InvalidVersion` | The expression type `version` is present but not a string. |
| `unsupported-version` | `UnsupportedVersion` | The expression type `version` is not one the runner supports. |
| `invalid-context` | `InvalidContext` | The `context` is not a runtime expression. |
| `missing-context` | `MissingContext` | A `regex`, `jsonpath`, or `xpath` criterion has no `context`. |
| `invalid-simple` | `InvalidSimple` | The `simple` condition cannot be parsed. |
| `invalid-regex` | `InvalidRegex` | The `regex` condition is not a valid regular expression. |
| `invalid-jsonpath` | `InvalidJSONPath` | The `jsonpath` condition is not a valid JSONPath query. |
| `invalid-xpath` | `InvalidXPath` | The `xpath` condition is invalid or fails to evaluate. |
| `invalid-xpath-context` | `InvalidXPathContext` | The resolved `xpath` context is not XML. |

The last five are thrown as `CriterionEvaluationError` and make the criterion unmet, with the reason as the record's diagnostic `code`; a run never throws them.

`RuntimeExpressionError` names its cause in `reason`, with the `expression` as written:

| `reason` | Static | Cause |
|---|---|---|
| `invalid-expression` | `InvalidExpression` | The expression is not a valid runtime expression. |
| `parse-error` | `ParseError` | The runtime expression parser failed on the expression. |
| `unresolved-reference` | `UnresolvedReference` | The expression cannot be resolved against the run. |
| `unavailable-expression` | `UnavailableExpression` | The expression reads `$statusCode`, `$url`, `$method`, `$request`, or `$response` in a step that calls a workflow, which made no HTTP call. |
| `unsupported-node` | `UnsupportedNode` | The parsed expression contains a node the runner does not evaluate. |

A workflow's `steps`, `dependsOn`, and `outputs`, and every step's `successCriteria`, are checked before anything runs, so those mistakes never send a request. Other mistakes inside one step are found when the run reaches it, after earlier steps have run. That is deliberate: a broken step that a run never reaches should not fail the run.

## Supported versions {#versions}

Arazzo documents:

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0)

OpenAPI documents, as source descriptions:

- [OpenAPI 2.0](https://spec.openapis.org/oas/v2.0)
- [OpenAPI 3.0.x](https://spec.openapis.org/oas/v3.0.4)
- [OpenAPI 3.1.x](https://spec.openapis.org/oas/v3.1.2)

Arazzo documents are also accepted as source descriptions, for [workflows in other documents](#cross-document). OpenAPI 3.2 and AsyncAPI source descriptions are not supported yet.

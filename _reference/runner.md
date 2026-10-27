---
title: "Arazzo Runner API Reference: @usearazzo/runner"
description: "Run Arazzo workflows against live APIs from JavaScript. Every building block, option, result field, and error of @usearazzo/runner."
lead: "Run Arazzo workflows step by step against the live APIs behind their OpenAPI source descriptions, from JavaScript. Every building block, option, result field, and error of @usearazzo/runner."
date: 2026-10-25
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
      - id: request-interceptor
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
  executeOptions: { server: 'http://localhost:8080/api/v3' },
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

Five requests went out, each judged by its step's `successCriteria`, and the workflow's `outputs` were resolved from what came back. The `server` option points every step at your local Petstore instead of the server the OpenAPI document declares (see [Choosing the server](#server)).

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
| `ExecutionError`, `ClientError`, `ResolverError`, `CriterionError`, `RuntimeExpressionError`, `InvalidEntryDocumentError` | class | The errors you are most likely to catch. See [Errors](#errors). |

Every type on this page is exported too: `ArazzoRunnerLoadOptions`, `ArazzoRunnerOptions`, `WorkflowExecutionResult`, `StepRunRecord`, `WorkflowExecuteOptions`, `HTTPClient`, `RequestInterceptor`, and the rest. The package also exports the lower-level pieces the four building blocks are made of (normalizers, resolvers, criterion evaluators, document providers). Among them, `OpenAPIOperationLocatorNormalizer` resolves a step's `operationId` or `operationPath` to an operation, and `ArazzoWorkflowLocatorNormalizer` resolves a `workflowId` to a workflow, both through `$sourceDescriptions` and both extending `SourceDescriptionsLocatorNormalizer`. Those are for replacing one part of the pipeline; the TypeScript declarations document them.

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
| `httpClient` | `OpenAPIOperationExecutor` | Sends the requests. See [The HTTP client](#http-client). |
| `requestInterceptor` | `OpenAPIOperationExecutor` | Changes every request before it is sent. See [Authentication](#request-interceptor). |
| `maxSteps`, `maxWorkflowDepth`, `sleep`, `now` | `WorkflowExecutor` | See [Constructor options](#workflow-executor-options). |

```js
const runner = await ArazzoRunner.load(uri, {
  requestInterceptor: async (request) => {
    request.headers.Authorization = `Bearer ${await acquireToken()}`;
  },
});
```

`runner.document` is the loaded Arazzo document, and `runner.registry` the registry holding it and its source descriptions.

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

A document that is not Arazzo throws `InvalidEntryDocumentError` from `load`, as it does from `acquireEntryDocument`.

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
| `acquireEntryDocument(uri)` | Loads the Arazzo document a run starts from. Throws `InvalidEntryDocumentError` when the document is not Arazzo. |
| `acquire(uri)` | Loads any Arazzo or OpenAPI document, or returns the cached one. |
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

### Execute options {#execute-options}

| Option | Meaning |
|---|---|
| `inputs` | The workflow's inputs, read through `$inputs`. |
| `executeOptions` | Passed to every step's operation, for example a [`server`](#server) or a [`requestInterceptor`](#request-interceptor). |
| `dependencyInputs` | Inputs for the workflows run to satisfy `dependsOn`, keyed by the entry as written. See [dependsOn](#depends-on). |
| `runDependencies` | Run the `dependsOn` workflows first. Defaults to `true`. |
| `signal` | An `AbortSignal` that cancels the run. See [Cancellation](#cancellation). |

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
| `subWorkflows` | One result per attempt, on a step that calls a workflow. |
| `retryReferences` | One record per [retry reference](#retry) that fired. |

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

A `retry` may also name a `stepId` or a `workflowId` to run before each attempt, for example a step that logs in again. The reference runs once per attempt, after the wait. A failed reference does not stop the retries: the specification speaks of the reference completing, not succeeding. A `workflowId` reference runs with no inputs, because the specification gives it no way to pass any. Its outputs are recorded under `$workflows.<id>`, as for a sub-workflow step. A `stepId` reference counts against the step budget like any other attempt. The reference's own success and failure actions are not followed.

### Transfer to another workflow {#transfer}

A `goto` that names a `workflowId` hands control over for good. The specification calls `goto` "a one-way transfer of workflow control". The calling workflow stops there:

- its `status` is `'transferred'`;
- its `outputs` are `{}`, since it never reaches its own end;
- its `steps` hold the trace up to the `goto`;
- `transferredTo` holds the target's own result. A chain of transfers nests: `transferredTo.transferredTo`.

The target runs with no inputs, because a `goto` carries no parameters. Entering it does not count against the [step budget](#budgets): a `goto` fires once per step, so it cannot spin the way a retry can.

A transfer stays on the caller's call stack. A workflow that transfers back to one already on the chain throws `workflow-cycle`, even when the loop would have ended on its own. A long chain of distinct workflows throws `workflow-depth` past `maxWorkflowDepth`. So model a state machine of workflows as a bounded sequence. A loop that polls until something changes belongs in a `goto` to a `stepId`, which has no such limit.

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
- **`$statusCode`, `$url`, `$method`, `$request.*`, and `$response.*` throw** a `RuntimeExpressionError` with `reason: 'unavailable-expression'` in the step's `successCriteria` or `outputs`. In an action's `criteria` they make the action not match instead, so a workflow-wide default written for operation steps does not stop the run.

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

A workflow hands its steps two things, and they behave in opposite ways.

**Default actions replace.** A workflow's `successActions` and `failureActions` apply to every step that declares none of its own. A step that declares `onSuccess` or `onFailure` replaces the workflow's list entirely; there is no merging. Success and failure fall back separately. Declaring the key is what counts: `onFailure: []` means no failure actions, not the workflow's.

**Parameters merge.** A workflow's `parameters` reach every step. The specification lets a step override an inherited parameter but never remove one, so each step gets both lists, its own declaration winning. A parameter is identified by its `name` and `in` together: a step's `trace` query parameter overrides an inherited `trace` query parameter, and leaves an inherited `trace` header alone.

Inheritance copies declarations, not values. A workflow parameter with the value `$steps.login.outputs.token` is evaluated for each step when that step runs, so every step sees the token as it is at that moment.

Steps that call a workflow inherit both too. Their parameters are inputs, with no `in`, so the name alone decides what overrides what. An inherited parameter that does carry an `in` arrives as an input under its bare name.

One limit: resolved values are handed to the request builder keyed by `name` alone. Two parameters that differ only in `in` collapse into one there, and the step's own wins. A step can never lose to something it inherited.

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

A client that ignores the signal costs one request in flight; the run still stops at the next boundary. A `signal` passed in `executeOptions` cancels the run too, and the `signal` option wins when both are given. `StepExecutor` honours a `signal` in its execute options on its own: an aborted signal throws `aborted` before any request goes out.

## StepExecutor {#step-executor}

```ts
new StepExecutor(options: { document: ArazzoDocument; registry: DocumentRegistry; operationExecutor: OpenAPIOperationExecutor })
stepExecutor.execute(step, state, executeOptions?): Promise<StepExecutionResult>
```

Runs one step that calls an OpenAPI operation. It does four things in order:

1. finds the step's operation (`operationId` or `operationPath`);
2. resolves the step's `parameters` and `requestBody` against `$inputs`, `$steps.*.outputs`, and the rest of the state;
3. sends the operation through the `OpenAPIOperationExecutor`;
4. evaluates `successCriteria`, resolves `outputs`, and selects the `onSuccess` or `onFailure` action against the response.

`WorkflowExecutor` calls it for you. You call it directly to run one step on its own:

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
outcome.response; // the response, with the request as sent

// record the outputs so a later step can read $steps.findAvailablePets.outputs
state.setStepOutputs(outcome.stepId, outcome.outputs);
```

`StepExecutor` changes nothing in the state. It returns the outputs and the action for the caller to record and act on. `matchedActions` lists every action that matched, in order; `action` is the first.

A step whose criteria go unmet is a normal outcome, `successful: false`, not a throw. These throw:

- a step with no operation, more than one target, or an operation that cannot be found: `ExecutionError`;
- an `outputs` value that is not a runtime expression: `ResolverError` with `reason: 'invalid-expression'`. `$response.body.id` is not Arazzo syntax; `$response.body#/id` is;
- a criterion `context` that is not a runtime expression, whatever the criterion `type`: `CriterionError` with `reason: 'invalid-context'`.

Parameter and payload values may be literals, since the specification types them `Any`.

A step that calls a workflow is not an operation step, and `execute` throws on it. `WorkflowExecutor` runs those itself, through `evaluateCriteria` and `selectActions`, which are public for that reason. `forDocument(document)` returns a sibling executor bound to another Arazzo document.

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
executor.execute(locator: { document; jsonPointer }, options?): Promise<OpenAPIOperationResponse>
```

Runs one OpenAPI operation and returns its response. It knows nothing about Arazzo: it does not find operations or resolve expressions. Given the operation's document and JSON Pointer, it:

1. **builds** the HTTP request: parameter serialization (`style`, `explode`), security, and the server, for OpenAPI 2.0 through 3.1;
2. **sends** it through the HTTP client (global `fetch` by default);
3. **reads** the `Response` by its content type into an `OpenAPIOperationResponse`, which is what `$response.*` and criteria see.

| Constructor option | Meaning |
|---|---|
| `httpClient` | Sends the request. See [The HTTP client](#http-client). |
| `requestInterceptor` | Changes every request before it is sent. See [Authentication](#request-interceptor). |
| `responseNormalizer`, `operationExtractor`, `operationNormalizer`, `documentAssembler` | Replace one stage of the pipeline. Rarely needed. |

| Execute option | Meaning |
|---|---|
| `parameters` | Parameter values, by name. |
| `requestBody`, `requestContentType` | The body and its media type. |
| `responseContentType` | Sent as `Accept`. Defaults to the media types of the operation's 2xx responses. |
| `server`, `serverVariables` | Where the request goes. See [Choosing the server](#server). |
| `requestInterceptor` | Changes this request, after the constructor's interceptor. |
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

In a workflow, pass `server` in `executeOptions` and it applies to every step.

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

### Authentication {#request-interceptor}

Arazzo says nothing about credentials, so the runner does not model them either. You add them with a `requestInterceptor`. It runs after the request is built and before it is sent. It may be async, and it may change the request or return a new one:

```js
const executor = new OpenAPIOperationExecutor({
  requestInterceptor: async (request) => {
    request.headers.Authorization = `Bearer ${await acquireToken()}`;
  },
});
```

A `requestInterceptor` in the execute options runs after this one. Since the interceptor sets headers directly, it works however the OpenAPI document declares its security schemes, or if it declares none. To apply credentials from those declarations instead, in the header, query, or cookie each scheme names, pass a `securities` object in the execute options. It reaches the request builder untouched; it is not part of the typed options.

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
| `ClientError` | A request could not be built (a required parameter is missing, a media type matches nothing) or sent. The underlying error is on `cause`. | `operationId`, `operationPath`, `uri` |
| `ResolverError` | A parameter, body, or output could not be resolved. | `reason`, `workflowId`, `stepId`, `target` |
| `CriterionError` | A criterion could not be evaluated, for example a `context` that is not an expression. | `reason`, `condition`, `type` |
| `RuntimeExpressionError` | An expression cannot be evaluated where it is used. | `reason`, `expression` |
| `InvalidEntryDocumentError` | The entry document is not Arazzo, or a registry passed to `ArazzoRunner` backs a different entry document. | `uri` |

A document that cannot be read at all (a missing file, an HTTP error) throws the parser's own error, not one of these.

```js
import { ExecutionError, ClientError } from '@usearazzo/runner';

try {
  const result = await executor.execute('authenticateAndOrderPet', { inputs });
  if (result.settledStatus === 'failed') {
    // the API said no: read result.steps to see where
  }
} catch (error) {
  if (error instanceof ExecutionError) {
    error.reason; // 'workflow-not-found'
    error.message; // 'workflow "nope" not found in Arazzo document at "https://usearazzo.com/assets/reference/runner/petstore-order.arazzo.yaml"'
  }
  if (error instanceof ClientError) {
    error.cause; // what the HTTP client threw
  }
  throw error;
}
```

`ExecutionError` names its cause in `reason`:

| `reason` | Cause |
|---|---|
| `workflow-not-found` | No workflow has that id. The message names the document searched. |
| `goto-target-not-found` | A `goto` names a step that does not exist. |
| `goto-target-missing` | A `goto` names neither a `stepId` nor a `workflowId`. |
| `retry-target-not-found` | A `retry` references a step the workflow does not have. |
| `ambiguous-target` | A step, `goto`, or `retry` names more than one target. |
| `unknown-action-type` | An action's `type` is not `end`, `goto`, or `retry`. |
| `malformed-steps`, `malformed-dependsOn` | A workflow's `steps` or `dependsOn` is present but malformed. |
| `workflow-cycle`, `dependsOn-cycle` | A workflow is entered again while it is still running. |
| `workflow-depth` | Workflows nest deeper than `maxWorkflowDepth`. |
| `step-budget` | The run made more than `maxSteps` step attempts. |
| `aborted` | The run was cancelled. |
| `invalid-workflow-reference` | A `$`-prefixed workflow reference is not `$sourceDescriptions.<name>.<workflowId>`. |
| `source-description-not-found` | The named source description does not exist. |
| `source-description-not-arazzo` | A workflow reference points into a document that is not Arazzo. |

A workflow's `steps` and `dependsOn` are checked before anything runs, so those mistakes never send a request. A mistake inside one step is found when the run reaches it, after earlier steps have run. That is deliberate: a broken step that a run never reaches should not fail the run.

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

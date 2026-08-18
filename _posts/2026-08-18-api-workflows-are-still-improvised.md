---
title: "API Workflows Are Still Improvised. Here Is What We Are Doing About It"
description: "OpenAPI describes endpoints, not the order you call them in. Arazzo fixes that on paper. UseArazzo is building the tooling that makes it real, in the open."
date: 2026-08-18
image:
  path: /assets/images/blog/api-workflows-are-still-improvised.png
  width: 1200
  height: 630
  alt: "One path splitting into two parallel green tracks that rejoin, on a dark green background"
  caption: "One step splits, two run, they rejoin. The shape behind the UseArazzo mark, and behind every Arazzo workflow."
---

I keep building API tools. This time, I'm building a home for quality Arazzo tooling.

## The gap OpenAPI leaves open

A single API call is a solved problem: OpenAPI describes it, generators wrap it, every HTTP client on earth can make it. But the order you call the endpoints in, what you carry from one response into the next request, and how you know you're done? That's been improvised. Scripts, tribal knowledge, agents winging it at runtime. If you maintain an API, test one, or build agents on top of one, you've written that glue yourself.

Improvisation is exactly what you don't want in production. That glue is rarely reviewed, rarely versioned alongside the API it drives, and it breaks quietly when the API changes.

If you haven't met it yet: [Arazzo](https://spec.openapis.org/arazzo/latest.html) is the OpenAPI Initiative's specification for multi-step API workflows, authored by Frank Kilcommins, and it fixes that on paper. Where OpenAPI answers "what can I call?", Arazzo answers "in what order, with what, and until when?". A workflow document lists its source descriptions (usually OpenAPI documents), then a set of workflows made of steps. Each step points at an operation, says which parameters and body to send, declares what counts as success, and names the outputs it makes available to later steps.

A minimal document looks like this:

```yaml
arazzo: 1.0.1
info:
  title: Place an order
  description: Look a product up by SKU, then order it.
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: placeOrder
    description: Two calls, in order, with the product id carried between them.
    inputs:
      type: object
      properties:
        sku:
          type: string
    steps:
      - stepId: findProduct
        description: Resolve the SKU to a product id.
        operationId: getProduct
        parameters:
          - name: sku
            in: path
            value: $inputs.sku
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          productId: $response.body#/id
      - stepId: createOrder
        description: Order the product found in the previous step.
        operationId: createOrder
        requestBody:
          contentType: application/json
          payload:
            productId: $steps.findProduct.outputs.productId
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          orderId: $response.body#/id
    outputs:
      orderId: $steps.createOrder.outputs.orderId
```

Nothing here is code. It's a plain document you can check into the repository next to the OpenAPI description it depends on, review in a pull request, and hand to any tool that understands the specification. If you stop using one toolkit, the workflow keeps working with the next one.

And here is what comes back when you run it. Hand the document and its inputs to the Runner (more on it below) and instead of a script that just ran, you get a record of the run:

```js
const result = await executor.execute('placeOrder', { inputs: { sku: 'AZ-1001' } });

result.status;   // 'completed'
result.outputs;  // { orderId: 'ord_8f2c' }
result.steps;
// [
//   { stepId: 'findProduct', successful: true, action: undefined, attempts: 1, durationMs: 142 },
//   { stepId: 'createOrder', successful: true, action: undefined, attempts: 1, durationMs: 208 },
// ]
```

Each step in run order: whether it succeeded, which success or failure action was selected, how many attempts it took, and how long. When the second call fails at 2 a.m., that's the difference between reading a trace and reading someone's shell script.

## The problem isn't the spec, it's the tooling

Tooling for Arazzo exists. But it's scattered across the ecosystem: a validator in one project, execution in another, nothing sharing an engine or a set of conventions. Each tool has to parse the document and resolve references its own way, so they can disagree on the edge cases.

So that's the mission with UseArazzo: concentrate quality Arazzo tooling in one place, all of it sharing one engine. We're starting with the three pieces everything else depends on.

- **[Validator]({{ '/validator/' | relative_url }})**: every specification violation, pinned to the exact location in the document that caused it, as LSP-compatible diagnostics.
- **[Runner]({{ '/runner/' | relative_url }})**: executes workflows against live APIs described by OpenAPI source descriptions, step by step, and returns the trace you saw above.
- **[CLI]({{ '/cli/' | relative_url }})**: validate and run in one command, on your machine and in CI. A design sketch so far. No package exists yet, and the page says so.

Underneath them sit `@usearazzo/parser` and `@usearazzo/resolver`, the lower-level packages the products are built from, for people building their own Arazzo tooling. That shared engine is the point. When the Validator and the Runner disagree about a document, that's a bug, not a difference of opinion.

That engine is built on [SpecLynx](https://github.com/speclynx), our own API tooling foundation: the semantic parsing core, reference resolution, and standards discipline that came out of years of Swagger and OpenAPI work. Between the two of us, [Francesco]({{ '/about/#francesco-tumanischvili' | relative_url }}) and I were core contributors to the Swagger open-source projects on both the JavaScript and the Java side, and we contribute to the OpenAPI, AsyncAPI, and Arazzo specifications themselves. The [About page]({{ '/about/#our-team' | relative_url }}) has the receipts. That's why the toolkit handles malformed documents, external references, and specification edge cases from day one instead of learning them the hard way.

Three principles guide the work:

- **Deterministic execution.** A workflow that ran yesterday runs the same today. Agents get autonomy at the decision boundary, not inside the steps.
- **The standard is the product.** We implement Arazzo exactly as the specification defines it. When something needs fixing, we fix it in the specification by contributing upstream, instead of adding private extensions only our tools can read.
- **Portable artifacts.** Plain Arazzo documents in your repository, driven from your own code, your CI pipeline, or an agent.

## A word of honesty before you click

This is raw. Heavy development, pre-1.0, nothing published to npm yet, APIs changing under our feet. Everything lives in one monorepo, [usearazzo/arazzo-toolkit](https://github.com/usearazzo/arazzo-toolkit), under Apache 2.0.

I'm announcing it anyway. Everything is built in the open, and I'd rather have you watching, questioning, and shaping it from day one than unveil a polished black box a year from now.

Today the toolkit validates and runs Arazzo 1.0.0 and 1.0.1 workflows against OpenAPI 2.0, 3.0.x, and 3.1.x source descriptions. Arazzo 1.1.0 runs partially and doesn't validate yet, and AsyncAPI isn't supported. The [compatibility table]({{ '/#compatibility' | relative_url }}) on the homepage is where we keep that current, and every product page tells you exactly where that piece stands, including what doesn't exist yet. No smoke, no mirrors.

## Where it's headed

None of this is built. It's where the toolkit is going, written down so you can tell what exists from what doesn't.

Next to the three products we want a Language Service, so any editor gets Arazzo validation, completion, and navigation, and an Editor and a VS Code extension built on it. We want GitHub Actions that annotate violations on the diff and render the run trace into the job summary. We want agents to be able to author, validate, and run workflows, through Agent Skills, a generic MCP Server over any document, and an MCP Compiler that turns one workflow into one typed tool. And we want Arazzo Transformers: explicit, versioned transformations for reshaping data between steps, declared as ordinary API calls the toolchain can validate.

We'll write about each of these here as it moves from idea to code.

## Follow along

- Star and read the [arazzo-toolkit](https://github.com/usearazzo/arazzo-toolkit) repository.
- Tell us what you would need from an Arazzo toolchain in [Discussions](https://github.com/orgs/usearazzo/discussions).
- Subscribe to the [RSS feed]({{ '/feed.xml' | relative_url }}) for release notes and deeper posts on how the Validator and Runner work.
- Or just [email us](mailto:info@usearazzo.com).

We're early enough that your input actually shapes the thing.

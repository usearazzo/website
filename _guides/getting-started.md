---
title: "Getting Started with UseArazzo"
description: "Take one Arazzo workflow from broken to validated to run against a live API. Six steps, one file, about ten minutes."
summary: "Take one Arazzo workflow from broken to validated to run against a live API, in six steps."
lead: "Take one Arazzo workflow from broken to validated to run against a live API. Six steps, one file, about ten minutes."
order: 1
featured: true
date: 2026-11-12
image:
  path: /assets/images/guides/getting-started.png
  webp: /assets/images/guides/getting-started.webp
  width: 1200
  height: 630
  alt: "The UseArazzo Fork mark on the left, joined by a line to a play button in the middle and an open book on the right"
  caption: "Start here: one workflow, the whole toolkit."
toc:
  - id: get-the-sample
    title: 1. Get the sample workflow
  - id: validate
    title: 2. Validate it from the terminal
  - id: fix
    title: 3. Fix the two mistakes
  - id: ci
    title: 4. Gate CI
  - id: run
    title: 5. Run it against a live API
  - id: check-before-run
    title: 6. Check before you run
  - id: next-steps
    title: Next steps
---

You have an OpenAPI description, and somewhere a script that calls a few of its operations in the right order. The script works until the API changes. Then it breaks quietly, and nobody notices until something downstream does.

An [Arazzo](https://spec.openapis.org/arazzo/latest.html) document describes the same sequence as data: which operations to call, in what order, and what to pass from one to the next. A document can be checked before it runs. UseArazzo is the toolkit that checks it and runs it.

This guide follows one small workflow through the whole toolkit. Here is where it ends, a workflow run against a live API with every step accounted for:

```text
✓ findPets   1389 ms
✓ getPet      357 ms

completed in 1750 ms
{ petId: 99, name: 'fido' }
```

By the end you will have:

- seen two mistakes reported with their exact line and column, and fixed them,
- a `validate` command that fails a CI job when the workflow regresses,
- a script that runs the workflow against a live API and prints what happened at each step,
- the same script refusing to run a workflow that does not validate.

## Step 1: Get the sample workflow {#get-the-sample}

Make an empty directory and save this file in it as `find-a-pet.arazzo.yaml`, or [download it]({{ '/assets/guides/getting-started/find-a-pet.arazzo.yaml' | relative_url }}).

```yaml
arazzo: 1.0.1
info:
  title: Find a pet
  summary: Find a pet by status, then fetch its details
  description: A two-step workflow against the Swagger Petstore.
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    url: https://petstore3.swagger.io/api/v3/openapi.json
    type: openapi
workflows:
  - workflowId: findAPet
    summary: Find a pet by status, then fetch its details
    description: Lists the pets with the given status and fetches the first one.
    inputs:
      type: object
      properties:
        status:
          type: string
      required:
        - status
    steps:
      - stepId: findPets
        description: List the pets that have the given status
        operationId: findPetsByStatus
        parameters:
          - name: status
            in: query
            value: $inputs.status
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          petId: $response.body#/0/id
      - stepId: getPet
        description: Fetch the first pet from the list
        operationId: getPetById
        parameters:
          - name: petId
            in: paths
            value: $steps.findPets.outputs.petId
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          name: $response.body#name
    outputs:
      petId: $steps.findPets.outputs.petId
      name: $steps.getPet.outputs.name
```
{: .numbered}

What is happening here? The workflow has two steps. `findPets` asks the public [Swagger Petstore](https://petstore3.swagger.io/) for every pet with a given status and keeps the id of the first one. `getPet` fetches that pet and keeps its name. The Petstore's own OpenAPI description, listed under `sourceDescriptions`, says what `findPetsByStatus` and `getPetById` are.

The file has two deliberate mistakes. Both are one character long. Don't look for them yet.

## Step 2: Validate it from the terminal {#validate}

Let's ask the CLI what it thinks. You need [Node.js](https://nodejs.org/) 20.10 or newer. `npx` fetches the CLI on first use, so there is nothing else to install:

```bash
npx @usearazzo/cli validate find-a-pet.arazzo.yaml
```

```text
find-a-pet.arazzo.yaml
  39:17-39:22  error  9060201  in must be one of: 'path', 'query', 'header', 'cookie'
  44:11-44:36  error  9050804  Step output values must be valid Arazzo Runtime Expressions.

✖ 2 problems (2 errors)
```

Two problems, each with the line and column where it starts and ends. Lines and columns count from 1, so you can jump straight to them in your editor. The number in the third column is the rule's code. The [Validator reference]({{ '/docs/validator/#rules' | relative_url }}) lists every rule.

Because it found errors, the command exits with `1`. Keep that in mind for step 4.

Notice that nothing is wrong with the YAML. Any YAML loader reads this file without a complaint. The mistakes are in the Arazzo, and that is what `validate` checks.

## Step 3: Fix the two mistakes {#fix}

Open the file at the two places the report names:

- **Line 39:** `in: paths` should be `in: path`. A parameter lives in the path, the query, a header, or a cookie.
- **Line 44:** `$response.body#name` should be `$response.body#/name`. What follows the `#` is a JSON Pointer, and a JSON Pointer starts with a slash.

Save the file and run the same command again:

```bash
npx @usearazzo/cli validate find-a-pet.arazzo.yaml
```

```text
No problems found
```

This time the command exits with `0`.

## Step 4: Gate CI {#ci}

The terminal catches mistakes while you write. CI catches the ones that get committed anyway.

The broken file made the command exit with `1`, the fixed one with `0`. That exit code is the whole CI story. If the workflow lives in a GitHub repository, save this next to it as `.github/workflows/arazzo.yml`:

```yaml
name: Arazzo
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - name: Validate Arazzo workflows
        run: npx @usearazzo/cli validate find-a-pet.arazzo.yaml
```

The path in the last line is relative to the root of the repository. By default only errors fail the run. Add `--fail-severity warning` and warnings fail it too. The [CLI reference]({{ '/docs/cli/' | relative_url }}) covers every option.

## Step 5: Run it against a live API {#run}

A valid document is a good start. Now let's make the calls it describes.

The Runner is a library. It runs in Node.js and in the browser, and so does the Validator. This guide stays in Node.js. Install the Runner in the same directory:

```bash
npm install @usearazzo/runner
```

Save this script there as `run.mjs`:

```js
import { ArazzoRunner } from '@usearazzo/runner';

const uri = 'find-a-pet.arazzo.yaml';

const runner = await ArazzoRunner.load(uri);

const result = await runner.execute('findAPet', {
  inputs: { status: 'available' },
});

for (const step of result.steps) {
  const mark = step.successful ? '✓' : '✗';
  const time = `${Math.round(step.durationMs)} ms`;
  console.log(`${mark} ${step.stepId.padEnd(10)}${time.padStart(8)}`);
}
console.log(`\n${result.status} in ${Math.round(result.durationMs)} ms`);
console.log(result.outputs);

process.exitCode = result.status === 'completed' ? 0 : 1;
```

`load` reads the document and the OpenAPI description behind it. `execute` runs one workflow by its `workflowId`, with the inputs the workflow asks for. The last line makes the script exit with `1` when the workflow does not complete. Run it:

```bash
node run.mjs
```

```text
✓ findPets   1389 ms
✓ getPet      357 ms

completed in 1750 ms
{ petId: 99, name: 'fido' }
```

Two real API calls went to the Petstore. Each step was judged by its own `successCriteria`, and the id that `findPets` kept was handed to `getPet`. The last line is the workflow's `outputs`.

The Petstore is a public server that anyone can write to, so your pet and your timings will differ. If a step shows `✗`, or `name` is `undefined`, someone changed the data under you. Run it again, or try `status: 'sold'`.

## Step 6: Check before you run {#check-before-run}

What happens if you run a workflow that does not validate? Put the first mistake back for a moment: change `in: path` on line 39 to `in: paths`, and run the script again:

```bash
node run.mjs
```

Node prints a stack trace. The line that matters is this one:

```text
ResolverError: Parameter "petId" has location "paths", which is not one of path, query, header, cookie, querystring
```

The Runner stops with an error, and that is right. But look at where it stops: at the second step. The first API call had already been made. Here that was a harmless read. In a workflow that places an order first, it would not be.

So let's check the document before a single API call goes out. The CLI's `validate` command is a thin wrapper around one function, `validateURI`. Your code can call it directly. Install the Validator:

```bash
npm install @usearazzo/validator
```

Then put the check at the top of `run.mjs`. This is the finished script, which you can also [download]({{ '/assets/guides/getting-started/run.mjs' | relative_url }}):

```js
import { ArazzoRunner } from '@usearazzo/runner';
import { validateURI, DiagnosticSeverity } from '@usearazzo/validator';

const uri = 'find-a-pet.arazzo.yaml';

const diagnostics = await validateURI(uri);
const errors = diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error);

if (errors.length > 0) {
  for (const { range, message } of errors) {
    console.error(`${uri}:${range.start.line + 1}:${range.start.character + 1}  ${message}`);
  }
  process.exit(1);
}

const runner = await ArazzoRunner.load(uri);

const result = await runner.execute('findAPet', {
  inputs: { status: 'available' },
});

for (const step of result.steps) {
  const mark = step.successful ? '✓' : '✗';
  const time = `${Math.round(step.durationMs)} ms`;
  console.log(`${mark} ${step.stepId.padEnd(10)}${time.padStart(8)}`);
}
console.log(`\n${result.status} in ${Math.round(result.durationMs)} ms`);
console.log(result.outputs);

process.exitCode = result.status === 'completed' ? 0 : 1;
```

Run it while the mistake is still in the file:

```bash
node run.mjs
```

```text
find-a-pet.arazzo.yaml:39:17  in must be one of: 'path', 'query', 'header', 'cookie'
```

The script exits with `1` and no API call is made. Diagnostics follow the Language Server Protocol, which counts lines and characters from 0. That is why the script adds one to each.

Now change `paths` back to `path` and run it one more time. The two ticks are back.

So there it is. One file went from two errors to a validated workflow, a CI gate, and a run with a result.

## Next steps {#next-steps}

- The [CLI]({{ '/cli/' | relative_url }}) page shows what else `validate` does: JSON output, a problem cap, and a configuration file. Every flag is in the [CLI reference]({{ '/docs/cli/' | relative_url }}).
- The [Validator]({{ '/validator/' | relative_url }}) page covers validation from your own code, and the [API reference]({{ '/docs/validator/' | relative_url }}) lists every rule.
- The [Runner]({{ '/runner/' | relative_url }}) page runs a longer workflow that logs in, places an order, and checks it. Servers, [authentication]({{ '/docs/runner/#authentication' | relative_url }}), and retries are in the [API reference]({{ '/docs/runner/' | relative_url }}).
- Does your workflow span several files? [Resolving Arazzo Documents]({{ '/docs/guides/arazzo-document-resolving/' | relative_url }}) explains what bundling and dereferencing do, and the [resolver reference]({{ '/docs/resolver/' | relative_url }}) shows how to do both from code.
- New to Arazzo itself? The [specification](https://spec.openapis.org/arazzo/latest.html) is short, and the [Ecosystem page]({{ '/ecosystem/' | relative_url }}) collects articles, videos, and examples.
- Stuck, or something here is wrong? Say so in [Discussions](https://github.com/orgs/usearazzo/discussions).

---
title: "Validate Arazzo Documents From the Command Line"
description: "An Arazzo workflow can be valid YAML, pass its JSON Schema, and still be broken. The Arazzo Validator now catches that with one command, locally and in CI."
date: 2026-10-11
image:
  path: /assets/images/blog/validate-arazzo-documents-from-the-command-line.png
  webp: /assets/images/blog/validate-arazzo-documents-from-the-command-line.webp
  width: 1200
  height: 630
  alt: "A dark terminal window outlined in bright green on a dark green ground, holding a prompt chevron and a solid green slab with a check mark"
  caption: "The Validator, wearing a terminal."
---

If you keep Arazzo documents in a repository and review them in pull requests, this post was written just for you.

Years ago, I worked with Ubiquiti ([I wrote about it in 2021](https://vladimirgorej.com/blog/how-to-validate-openapi-definitions-in-swagger-editor-using-github-actions/)). We designed our REST API first, as an OpenAPI definition, and reviewed every change in a pull request. Part of the review was manual: the reviewer pasted the definition from the pull request into Swagger Editor, to see if no errors were introduced. Today I'd immediately think about how to automate that, and make Continuous Integration do the work for us.

Arazzo documents have the same problem, and a sharper version of it.

## What can't a reviewer see?

Here is a workflow that finds a pet and adopts it. Read it the way a reviewer would:

```yaml
arazzo: 1.0.1
info:
  title: Adopt a pet
  summary: Find a pet and adopt it.
  description: Find an available pet in the store and adopt it.
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    url: ./petstore.openapi.yaml
    type: openapi
workflows:
  - workflowId: adopt-a-pet
    summary: Adopt a pet.
    description: Find an available pet and adopt it.
    steps:
      - stepId: find-pet
        description: Find an available pet.
        operationId: findPetsByStatus
        parameters:
          - name: status
            in: query
            value: available
        successCriteria:
          - condition: $statusCode == 200
        onSuccess:
          - name: adopt
            type: goto
            stepId: adopt-pets
        outputs:
          petId: $response.body#/0/id
      - stepId: adopt-pet
        description: Adopt the pet.
        operationId: updatePet
        requestBody:
          payload:
            id: $steps.find-pet.outputs.petId
            status: sold
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          status: $response.body#status
```
{: .numbered}

Looks fine, right? Well, it has two mistakes, and each one is a single character:

- Line 28 jumps to `adopt-pets`. The step is called `adopt-pet`.
- Line 41 reads `$response.body#status`. A JSON Pointer starts with a slash, so it should be `$response.body#/status`.

Neither shows up until someone runs the workflow against a live API.

## Why isn't schema validation enough?

The usual answer to "is this file valid?" is a YAML parser and a JSON Schema. So let's try both. The YAML parses without a complaint. For the JSON Schema, we can ask the Validator to check the document against the Arazzo JSON Schema and nothing else, with a small configuration file:

```yaml
# schema-only.yaml
languageService:
  validationContext:
    semanticValidation: false
    jsonSchemaValidation: true
```

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml -c schema-only.yaml
No problems found
```

What is happening here? Well, a JSON Schema checks the **shape** of a document. It knows that `stepId` must be a string, and `adopt-pets` is a string. It knows that an output value must be a string, and `$response.body#status` is a string. What it can't know is what those strings **mean**: that one names a step which must exist, and the other is a runtime expression with a grammar of its own.

That's the gap. A document can be valid YAML, pass its schema, and still be broken.

## So what do we do?

We check the meaning, not just the shape. That's the job of the [Arazzo Validator]({{ '/validator/' | relative_url }}). It knows that a `goto` must land on a step in the same workflow, and that a runtime expression must parse.

Until recently, using it meant writing code against the library. Now the Validator has a command line, the [UseArazzo CLI]({{ '/cli/' | relative_url }}), and it takes one command:

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml
adopt-a-pet.arazzo.yaml
  28:21-28:31  error  9070401  Success action "stepId" must reference an existing step in the same workflow.
  41:11-42:1   error  9050804  Step output values must be valid Arazzo Runtime Expressions.

✖ 2 problems (2 errors)
```

There it is. Both mistakes, each with the line it sits on, a severity, and the code of the rule it broke. Fix the two characters, and run it again:

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml
No problems found
```

Notice that nothing had to be installed. `npx` fetches the CLI on first use.

## Where does the check belong?

In two places: on your machine before you push, and in the pull request, where the manual review used to be.

On your machine, it's the command above. In the pull request, it's a CI step. The command exits with `1` when it finds an error, so the step fails and the pull request shows it. Here is a complete GitHub Actions workflow. Save it as `.github/workflows/arazzo.yml` in your repository:

```yaml
# .github/workflows/arazzo.yml
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
        run: npx @usearazzo/cli validate workflows/adopt-a-pet.arazzo.yaml
```

Nobody has to remember to paste anything anywhere. The check runs on every change, and it runs the same way for everyone.

### A word on warnings

Warnings, such as a step without a description, don't fail the run by default. If your team wants them to, the [CLI reference]({{ '/docs/cli/#fail-severity' | relative_url }}) shows how, along with the JSON output and the configuration file.

## What can't it catch yet?

It's important to be honest about the edges. Today the Validator checks a document against itself: its own steps, its own workflows, its own expressions. It doesn't yet check a workflow against the OpenAPI documents it points at. So if `updatePet` doesn't exist in your OpenAPI description, nothing will tell you before a run.

That's next. The goal is to catch as much as possible without running a workflow against a real API: runtime expressions in the positions where they make sense, criteria, and every `operationId` checked against the OpenAPI document it names ([toolkit #197](https://github.com/usearazzo/arazzo-toolkit/issues/197)). If you have a rule idea, add it there.

## Closing words

A workflow that looks right isn't the same as a workflow that is right, and a schema can't tell the two apart. The Validator can, and now it's one command away. Run it on a workflow you've written, put it in your pipeline, and tell me which mistake it missed in [Discussions](https://github.com/orgs/usearazzo/discussions).

To see every rule it checks, start with the [Validator API reference]({{ '/docs/validator/#rules' | relative_url }}).

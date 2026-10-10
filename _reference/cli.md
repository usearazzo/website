---
title: "Arazzo CLI Reference: @usearazzo/cli"
description: "Validate and lint Arazzo documents from the terminal and CI. Every command, option, output format, exit code, and setting of @usearazzo/cli."
lead: "Validate and lint Arazzo documents from your terminal or CI pipeline. Every command, option, output format, exit code, and configuration setting of @usearazzo/cli."
date: 2026-10-10
status: Published
package:
  name: "@usearazzo/cli"
  npm: https://www.npmjs.com/package/@usearazzo/cli
  github: https://github.com/usearazzo/arazzo-toolkit/tree/main/packages/cli
toc:
  - id: install
    title: Installation
  - id: usage
    title: Usage
  - id: validate
    title: validate
    children:
      - id: validate-input
        title: The document
      - id: validate-options
        title: Options
  - id: stylish
    title: Stylish output
  - id: json
    title: JSON output
  - id: exit-codes
    title: Exit codes
    children:
      - id: fail-severity
        title: Choosing what fails
      - id: errors
        title: Errors
  - id: config
    title: Configuration file
    children:
      - id: config-discovery
        title: Where it is found
      - id: config-shape
        title: What it holds
      - id: config-precedence
        title: Precedence
  - id: ci
    title: Running in CI
  - id: versions
    title: Supported versions
---

`@usearazzo/cli` puts the toolkit behind one binary, `usearazzo`. Its one command today is `validate`, a thin wrapper around [`@usearazzo/validator`](/docs/validator/): it checks an Arazzo document and prints every problem with the location that caused it. The checks, the rule codes, and their messages are the Validator's, so its [Rules](/docs/validator/#rules) section is the list of what `validate` can report.

## Installation {#install}

```sh
npm install --global @usearazzo/cli
```

Or run it without installing:

```sh
npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml
```

The package requires Node.js 20.10 or newer. It is pre-1.0: the version documented here is an alpha, and options and output may still change before the stable release.

## Usage {#usage}

```text
usearazzo [options] [command]
```

| Option | Description |
|---|---|
| `-V, --version` | Print the version number. |
| `-h, --help` | Print help. `usearazzo validate --help` prints the help of one command. |

| Command | Description |
|---|---|
| `validate [options] <uri>` | Validate and lint an Arazzo document. |
| `help [command]` | Print help for a command. |

Running `usearazzo` with no command prints the help and exits with `1`.

## validate {#validate}

```text
usearazzo validate [options] <uri>
```

Here is a document whose two steps on lines 16 and 19 are both called `find-pet`:

```yaml
arazzo: 1.0.1
info:
  title: Adopt a pet
  summary: Find a pet and adopt it.
  description: Find an available pet in the store and adopt it.
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    url: ./petstore.openapi.json
    type: openapi
workflows:
  - workflowId: adopt-a-pet
    summary: Adopt a pet.
    description: Find an available pet and adopt it.
    steps:
      - stepId: find-pet
        description: Find an available pet.
        operationId: findPetsByStatus
      - stepId: find-pet
        description: Adopt the pet.
        operationId: updatePet
```
{: .numbered}

And here is what `validate` makes of it. The second range ends at line 22, column 1: the position just after the file's last line break.

```text
$ usearazzo validate adopt-a-pet.arazzo.yaml
adopt-a-pet.arazzo.yaml
  16:9-18:38  error  9040403  Every step must have a unique 'stepId' within a workflow.
  19:9-22:1   error  9040403  Every step must have a unique 'stepId' within a workflow.

✖ 2 problems (2 errors)
```

The run exits with `1`, because the document has errors.

### The document {#validate-input}

`<uri>` is one of:

- a path, absolute or relative to the current working directory
- a `file:` URI, such as `file:///home/you/adopt-a-pet.arazzo.yaml`
- an HTTP or HTTPS URL

A local file must end in `.json`, `.yaml`, or `.yml`. Whether it is JSON or YAML is read from the content.

The source descriptions the document names are fetched and parsed too, unless the [configuration file](#config-shape) turns that off. No rule checks them yet, so a missing or broken source description produces no problem. The [Validator reference](/docs/validator/#parse-context) has the details.

### Options {#validate-options}

| Option | Default | Description |
|---|---|---|
| `-f, --format <format>` | `stylish` | Output format: [`stylish`](#stylish) or [`json`](#json). |
| `--json` | | Shorthand for `--format json`. Wins when both are given. |
| `-o, --output <file>` | stdout | Write the report to a file instead. The path may not be the input document. |
| `-c, --config <file>` | see [below](#config-discovery) | The [configuration file](#config) to use, relative to the current working directory. |
| `--json-schema-validation` | off | Also check the document against the Arazzo JSON Schema for its version. |
| `--max-problems <n>` | all | Report at most `n` problems, a positive integer. The exit code still counts all of them. |
| `--fail-severity <severity>` | `error` | Lowest severity that fails the run: `error`, `warning`, `info`, or `hint`. See [Choosing what fails](#fail-severity). |

JSON Schema validation is off by default because the rules already report most of what it finds, so turning it on mostly doubles the output. The [Validator reference](/docs/validator/#validation-context) shows what it adds.

## Stylish output {#stylish}

The default format prints the document's name, one row per problem, and a summary. Problems are sorted by line, then column, then severity.

```text
onboarding.arazzo.yaml
  16:9-18:1  warning  9050201  Step 'description' should be present and non-empty string.

⚠ 1 problem (1 warning)
```

Each row has four columns:

| Column | Example | What it is |
|---|---|---|
| Location | `16:9-18:1` | Where the problem starts and ends, as `line:column`. Both count from 1, the way editors show them. A problem that starts and ends at the same spot prints one `line:column`. |
| Severity | `warning` | `error`, `warning`, `info`, or `hint`. |
| Code | `9050201` | Usually the rule's numeric code, listed in the [Validator's rules](/docs/validator/#rules). `json-schema` for a problem found by JSON Schema validation. Empty for a YAML or JSON syntax error, whose code is `0`. |
| Message | | What is wrong. |

The summary starts with `✖` when there is at least one error and `⚠` otherwise. With `--max-problems`, a last line says how many were left out:

```text
$ usearazzo validate adopt-a-pet.arazzo.yaml --max-problems 1
adopt-a-pet.arazzo.yaml
  16:9-18:38  error  9040403  Every step must have a unique 'stepId' within a workflow.

✖ 1 problem (1 error)
(showing 1 of 2 problems)
```

A document with no problems prints `No problems found`.

Output to a terminal is coloured. Piped output and output to a file are plain text.

## JSON output {#json}

`--json` prints the problems as a JSON array of [Language Server Protocol diagnostics](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic), in the same order as the stylish rows:

```text
$ usearazzo validate adopt-a-pet.arazzo.yaml --json --max-problems 1
[
  {
    "range": {
      "start": {
        "line": 15,
        "character": 8
      },
      "end": {
        "line": 17,
        "character": 37
      }
    },
    "message": "Every step must have a unique 'stepId' within a workflow.",
    "severity": 1,
    "code": 9040403,
    "source": "apilint",
    "data": {}
  }
]
```

This is exactly what `validateURI` returns, so the [Validator reference](/docs/validator/#diagnostic-shape) describes every field. Two differences from the stylish format matter:

- Lines and characters count from 0, as the protocol defines them. Line 15 here is line 16 in the stylish output.
- Severity is a number: `1` error, `2` warning, `3` information, `4` hint.

A document with no problems prints `[]`.

## Exit codes {#exit-codes}

| Code | When |
|---|---|
| `0` | No problem at or above `--fail-severity`. |
| `1` | At least one problem at or above `--fail-severity`, or the run could not finish. |

The exit code is computed from every problem, before `--max-problems` cuts the list, so a cap never hides a failure.

### Choosing what fails {#fail-severity}

By default only errors fail a run. The onboarding document above has a warning and nothing else, so it exits with `0`. Lower the threshold, and the same document fails:

```text
$ usearazzo validate onboarding.arazzo.yaml --fail-severity warning
onboarding.arazzo.yaml
  16:9-18:1  warning  9050201  Step 'description' should be present and non-empty string.

⚠ 1 problem (1 warning)
$ echo $?
1
```

`--fail-severity hint` fails on any problem at all.

### Errors {#errors}

When the run cannot finish, the reason goes to stderr, prefixed with `Error:`, and nothing goes to stdout. The reason includes the whole chain of causes, down to the file system or HTTP error:

```text
$ usearazzo validate https://example.com/nope.arazzo.yaml
Error: Failed to read Arazzo Document at "https://example.com/nope.arazzo.yaml": Error while reading file "https://example.com/nope.arazzo.yaml": Error downloading "https://example.com/nope.arazzo.yaml": Request failed with status code 404
```

The same happens when:

- the document cannot be read
- the configuration file cannot be read, is not valid YAML or JSON, or is not a mapping
- `--output` points at the input document: `Error: --output path must differ from the input file`
- the report cannot be written to the `--output` file

An invalid option value is caught before anything runs, and also exits with `1`:

```text
$ usearazzo validate adopt-a-pet.arazzo.yaml --max-problems 0
error: option '--max-problems <n>' argument '0' is invalid. must be a positive integer.
```

A problem *in* the document is never an error. A YAML syntax error, for example, is reported as a problem like any other.

## Configuration file {#config}

A configuration file holds the validation settings, so every run, and everyone on the team, uses the same ones.

### Where it is found {#config-discovery}

Without `--config`, `usearazzo` looks in the current working directory for these names, in this order, and uses the first one it finds:

1. `.usearazzo.yaml`
2. `.usearazzo.yml`
3. `.usearazzo.json`
4. `usearazzo.yaml`
5. `usearazzo.yml`
6. `usearazzo.json`

Parent directories are not searched. With none of them present, the defaults apply. `--config` points at any other file, and that file must exist.

### What it holds {#config-shape}

The file is YAML or JSON. Its one key, `languageService`, takes the same options as the Validator's [second argument](/docs/validator/#options), and they are merged over the Validator's defaults:

```yaml
languageService:
  validationContext:
    jsonSchemaValidation: true # default: false
    semanticValidation: true # default: true
    referenceValidation: true # default: true
  parseContext:
    arazzo:
      sourceDescriptionsResolution: true # fetch and parse source descriptions (default: true)
```

Setting `semanticValidation: false` turns every rule off. With JSON Schema validation off as well, `validate` then reports only YAML and JSON syntax errors. The [Validator reference](/docs/validator/#validation-context) explains what each option does.

For a document you did not write, turn off everything beyond the document itself:

```yaml
languageService:
  parseContext:
    fileAllowList: []
    arazzo:
      sourceDescriptionsResolution: false
```

An empty file means no configuration.

### Precedence {#config-precedence}

Command-line flags win over the configuration file, and the configuration file wins over the Validator's defaults. A flag only overrides when you give it: without `--json-schema-validation`, the file's `jsonSchemaValidation` stands.

## Running in CI {#ci}

Nothing beyond the command is needed. A failing document fails the step through its exit code. Here is a complete GitHub Actions workflow, saved as `.github/workflows/arazzo.yml`:

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

To keep the report as a build artifact, write it as JSON and upload it. The validate step still fails on errors, so the upload step needs `if: always()` to run after a failure:

```yaml
      - name: Validate Arazzo workflows
        run: npx @usearazzo/cli validate workflows/adopt-a-pet.arazzo.yaml --json -o arazzo-report.json
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: arazzo-report
          path: arazzo-report.json
```

## Supported versions {#versions}

- [Arazzo 1.0.0](https://spec.openapis.org/arazzo/v1.0.0)
- [Arazzo 1.0.1](https://spec.openapis.org/arazzo/v1.0.1)
- [Arazzo 1.1.0](https://spec.openapis.org/arazzo/v1.1.0)

Both JSON and YAML are accepted for every version.

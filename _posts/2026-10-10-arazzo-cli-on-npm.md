---
title: "@usearazzo/cli Is on npm. Here Is What It Took"
description: "The UseArazzo CLI is published, as an alpha, with one command: validate. Why a command line is a contract, and what it took to keep it."
date: 2026-10-10
image:
  path: /assets/images/blog/arazzo-cli-on-npm.png
  webp: /assets/images/blog/arazzo-cli-on-npm.webp
  width: 1200
  height: 630
  alt: "Four stacked rounded slabs on a dark green ground; the lower three are solid bright green, and the top one is a dark tile outlined in green holding a prompt chevron, a line, and a cursor"
  caption: "A fourth layer on top. The front door to the other three."
---

The fourth package from the UseArazzo toolkit is on npm: [@usearazzo/cli](https://www.npmjs.com/package/@usearazzo/cli), as an alpha. The [validator post]({{ '/blog/arazzo-validator-on-npm/' | relative_url }}) promised that the command line would get one home, and that validation would be its first command. Well, here it is.

```bash
npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml
```

## Why a command line of its own?

The [validator post]({{ '/blog/arazzo-validator-on-npm/' | relative_url }}) explained why the validator's own command line went away ([toolkit #7](https://github.com/usearazzo/arazzo-toolkit/issues/7)). The short version: one home for the command line, not one per package.

So the CLI is a thin layer. It parses flags, loads a configuration file, formats the diagnostics, and sets the exit code. Everything else is the validator's `validateURI`. That means the CLI and the library can never disagree about a document. If a rule fires in one, it fires in the other.

## How do I use it?

Let me show you. Here is `adopt-a-pet.arazzo.yaml` from the validator post again. The two steps on lines 16 and 19 are both called `find-pet`:

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

Last time it took a script to find them. Now it takes one command:

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml
adopt-a-pet.arazzo.yaml
  16:9-18:38  error  9040403  Every step must have a unique 'stepId' within a workflow.
  19:9-22:1   error  9040403  Every step must have a unique 'stepId' within a workflow.

✖ 2 problems (2 errors)
```

Quite simple. Notice that lines count from 1 here, not from 0. That's the script's `+ 1`, done for you, so you can jump straight to the line in your editor. The number in the third column is the rule's code, and the [Validator API reference]({{ '/docs/validator/#rules' | relative_url }}) lists every one.

Prefer it installed? `npm install --global @usearazzo/cli` gives you a `usearazzo` binary. The argument can be a path, a `file:` URI, or an HTTP(S) URL.

From here, the place to go is the [CLI reference]({{ '/docs/cli/' | relative_url }}). It covers every option, both output formats, the exit codes, and the configuration file.

## What does a pipeline actually read?

Not the output. It reads the exit code. People wire a command into CI and stop looking at it, so the exit code has to mean exactly one thing, every time.

By default, only errors fail a run. A warning is advice, not a violation, so a document with warnings exits with `0`. Take `onboarding.arazzo.yaml`, whose only problem is a step without a description. It passes. Want stricter? Lower the threshold:

```text
$ npx @usearazzo/cli validate onboarding.arazzo.yaml --fail-severity warning
onboarding.arazzo.yaml
  16:9-18:1  warning  9050201  Step 'description' should be present and non-empty string.

⚠ 1 problem (1 warning)
$ echo $?
1
```

Now, what if the report is long? A hundred problems clutter a CI log, so `--max-problems` caps the list. But we can see an obvious problem here. Picture a hundred warnings and one error at the very end. Show the first ten, and the error isn't among them. Should the run pass? Of course not. So the exit code is computed from every problem, before the list is cut, and the output says how many were left out:

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml --max-problems 1
adopt-a-pet.arazzo.yaml
  16:9-18:38  error  9040403  Every step must have a unique 'stepId' within a workflow.

✖ 1 problem (1 error)
(showing 1 of 2 problems)
```

There's one more trap, and it's a quiet one. The obvious way to end a Node.js CLI is `process.exit()`. Well, it can cut your output short. When stdout is a pipe, writes are asynchronous, and exiting early drops whatever is still in the buffer, at around 64 KB. A big JSON report piped into another tool would arrive broken, with no error anywhere. So the CLI sets the exit code and lets the process end on its own. The test suite pipes more than 64 KB of JSON through it, to keep it that way.

## Can it overwrite my files?

No. A validator reads your files. It should never write over them.

`-o` writes the report to a file. Point it at the input document by mistake, and you'd replace your workflow with a list of its problems. So the CLI refuses:

```text
$ npx @usearazzo/cli validate adopt-a-pet.arazzo.yaml -o adopt-a-pet.arazzo.yaml
Error: --output path must differ from the input file
```

It's important to realize that comparing path strings isn't enough for that. A symlink, a hard link, or a case-insensitive file system can give the same file a different name. So the CLI also compares what the paths point at on disk.

### A word on the configuration file

The configuration file follows the same thinking. It holds your validation settings, and the CLI finds it in the working directory: `.usearazzo.yaml`, `usearazzo.json`, and a few spellings in between. It's YAML or JSON only, and that's deliberate.

## What does alpha mean here?

Alpha means options and output can still move before 1.0. Concretely:

- One command, `validate`. It accepts the same versions as the rest of the toolkit: Arazzo 1.0.0, 1.0.1, and 1.1.0, in JSON and YAML.
- Two output formats. `stylish` is for people. `--json` prints Language Server Protocol diagnostics, exactly what the library returns, for other tools.
- Exit code `1` when a problem at or above `--fail-severity` is found, or when the run can't finish. `0` otherwise.
- Settings come from the validator's defaults, then the configuration file, then the flags. The last one wins.
- `--help` and `--version` answer in about a tenth of a second. The validator is loaded only when a command needs it.

**The feedback I want most:**

- Which flag did you reach for that isn't there?
- What does your CI need from the output that it doesn't get?

[Discussions](https://github.com/orgs/usearazzo/discussions) is the place, and the [monorepo](https://github.com/usearazzo/arazzo-toolkit) is where the issues go.

## What are the future plans?

Two things matter most to me for the CLI itself.

The first is **custom rules**. The built-in rules check what the Arazzo specification says. But every team has conventions of its own: how a `stepId` is named, which fields a workflow must carry, which source descriptions are allowed. Those belong in the same run, with the same output and the same exit code. The catch is that a rule is code, and a YAML configuration file can only carry data. Rules would arrive through JavaScript configuration files. Loading one means running code from whatever directory you validate, so that's deferred on purpose until it has a careful design ([toolkit #219](https://github.com/usearazzo/arazzo-toolkit/issues/219)).

The second is **more output formats**. Today there are two: `stylish` for people, and `json` for other tools. The validator's old command line also had a `codeframe` format, which prints the offending lines of the document under each problem, and a `github-actions` format, which turns each problem into an annotation on the pull request diff ([toolkit #7](https://github.com/usearazzo/arazzo-toolkit/issues/7)). They didn't make the first release of the CLI, and I'd like them back.

Beyond validation, the CLI will grow commands for the rest of the toolkit ([toolkit #84](https://github.com/usearazzo/arazzo-toolkit/issues/84)). `run-workflow` and `run-operation` arrive when the [Runner]({{ '/runner/' | relative_url }}) is published, and the [CLI page]({{ '/cli/#commands' | relative_url }}) describes the rest.

Which of these would you use first? Nothing here is built yet, so this is the cheapest moment to change it.

## Closing words

Validating an Arazzo document in CI is now one line in your workflow file. No script, no glue. Sounds pretty easy, right? Give it a try, and let me know in [Discussions](https://github.com/orgs/usearazzo/discussions) which flag you missed.

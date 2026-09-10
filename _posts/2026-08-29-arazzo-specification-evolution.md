---
title: "I Diffed Every Arazzo Release So You Don't Have To"
description: "Three releases in two years. A guide to what each one changed, which changes can trip up an existing document, and what 1.1.0 lets you describe that 1.0 couldn't."
date: 2026-08-29
image:
  path: /assets/images/blog/arazzo-specification-evolution.png
  webp: /assets/images/blog/arazzo-specification-evolution.webp
  width: 1200
  height: 630
  alt: "Five green figures standing on a ground line, left to right, evolving from a seed into a stalk, a fork, and finally a full workflow shape whose two branches rejoin at the top"
  caption: "The march of progress, Arazzo edition."
---

When you write an Arazzo document, "which version" is a line at the top you rarely think about. When you implement Arazzo, it's most of the job. A validator has to know exactly what 1.0.0 accepted that 1.0.1 doesn't, and a runner has to know what a success criterion means under 1.1.0 when 1.0.1 never quite said.

So while building the [UseArazzo toolkit](https://github.com/usearazzo/arazzo-toolkit), I couldn't rely on a rough sense of how the specification has evolved. I needed the exact diff. I downloaded the three spec texts, diffed them line by line, cross-checked every hunk against the release notes and the pull requests behind it, and kept notes as I went, because the [Validator]({{ '/validator/' | relative_url }}) has to draw the line per version and the [Runner]({{ '/runner/' | relative_url }}) has to honour it.

Those notes, tidied up, are this article. It's for anyone who has to care what the `arazzo:` line at the top of a document means: people writing the documents, and people writing the tools that read them. If yours still say `arazzo: 1.0.0`, here is what changed since, what you need to do about it, and what you're now allowed to say that you couldn't before.

## Three releases at a glance {#at-a-glance}

| Version | Released | Nature |
|---------|----------|--------|
| [1.0.0](https://spec.openapis.org/arazzo/v1.0.0.html) | September 2024 | Initial stable release |
| [1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html) | January 2025 | Patch: erratum fixes and clarifications, plus the first official JSON Schema |
| [1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html) | May 2026 | Minor: AsyncAPI v3 sources, Selector Objects, step dependencies, document identity, tightened evaluation semantics |

The short version: 1.0.1 removed three things that never worked and fixed the examples. 1.1.0 added a lot and, on paper, broke nothing. The rest of the post is the long version.

## From 1.0.0 to 1.0.1: the patch {#from-1-0-0-to-1-0-1}

1.0.1 adds no objects, no fields, and no enum values. Every change is an erratum fix or a clarification. A patch release isn't allowed to break anything, and this one doesn't in the versioning sense: what it removes never worked. But if a document relied on one of those leftovers, removal feels like breakage, so those come first.

<div class="post-callout" markdown="1">

### Gotchas

- **`$message` removed from the runtime expression grammar.** AsyncAPI support was dropped before 1.0.0 shipped, but `$message.` survived in the ABNF: grammatically legal, resolving to nothing. 1.0.1 removes it. It returns in 1.1.0 with real semantics.
- **`in: body` removed from the Parameter Object.** Request bodies are expressed through the step's `requestBody`, so `in: body` had no defined meaning. `in` is now `path`, `query`, `header`, or `cookie`.
- **`workflowId` references into an external `arazzo` source always need the runtime expression form.** 1.0.0 required `$sourceDescriptions.<name>.<workflowId>` only when *multiple* `arazzo` source descriptions existed. 1.0.1 requires it whenever the referenced workflow lives in an `arazzo` source description at all. Local workflows still use the bare `workflowId`. Applies to the Step, Success Action, and Failure Action Objects. Strictly a clarification, but it's the one that can make a previously accepted document fail a linter.

</div>

### Changes

- **Step output expressions in the examples are now `$steps.<stepId>.outputs.<name>`.** The 1.0.0 grammar always said `.outputs.`, but the spec's own example wrote `$steps.getPetStep.availablePets` without it, and people copied the example. Any parser that accepted the short form was matching a spec bug. If your documents use it, they were never valid; fix them whichever version you target.
- **`retryAfter` applies only to `type: retry`.** 1.0.0 also mentioned `type: function`, which never existed (the allowed types are `end`, `retry`, and `goto`).

### Clarifications

- **Examples table gained JSON Pointer fragments** like `$steps.someStepId.outputs.pets#/0/id` and `$workflows.foo.outputs.mappedResponse#/name`, and the "Workflow output value" note now describes payload fragments the same way step outputs do.
- **[RFC 7230](https://www.rfc-editor.org/rfc/rfc7230) and [7231](https://www.rfc-editor.org/rfc/rfc7231) references became [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110).** Request bodies are well-defined for POST, PUT, and PATCH; on GET, HEAD, and DELETE they're permitted but have no well-defined semantics and should be avoided. Header field names are case-insensitive.
- **A lowercase "must" became a normative MUST** in the multi-document section: external documents MUST be included as a Source Description Object.
- **Typos, a misplaced parenthesis, link labels, and "runtime expression" capitalized to "Runtime Expression" throughout.** No change in meaning.

### Additions

- **The first official JSON Schema** for Arazzo. Not part of the spec text, but if you validate documents in CI with a generic JSON Schema validator, this is when that became possible. Schemas are published per minor release as dated iterations under [spec.openapis.org/arazzo/](https://spec.openapis.org/arazzo/#schema-iterations), and the latest date within a minor is the correct schema for every patch in it: for 1.0 that is [2025-10-15](https://spec.openapis.org/arazzo/1.0/schema/2025-10-15), which covers both 1.0.0 and 1.0.1 and supersedes the original 2024-12-16 iteration.

## From 1.0.1 to 1.1.0: the minor release {#from-1-0-1-to-1-1-0}

1.1.0 is where the specification grew. It removes no fields, no enum values, and no expression roots. Bump the version string and a 1.0.1 document is a 1.1.0 document. The categories below are ordered by how likely they are to matter to an existing document.

<div class="post-callout" markdown="1">

### Gotchas

A minor release can't break existing documents, and 1.1.0 removes nothing. Two things can still change how an existing document *behaves*, because they define what 1.0 left to the implementation:

- **Criterion evaluation rules are pinned down further** (see Changes). A runner that previously had to guess at, say, comparisons against `null` or string case may now give a different answer. The condition grammar itself is still unspecified, so not every guess went away.
- **Forward references are an error in sequential workflows.** If a step references the outputs of a step that appears *later* in the `steps` array, and the workflow doesn't use `dependsOn`, implementations should now reject it.

</div>

### Additions

- **AsyncAPI v3 source descriptions.** `type: asyncapi` joins `openapi` and `arazzo`, and the Step Object gains the fields to talk to an event channel:
  - `channelPath`: a source description plus a JSON Pointer to a channel, for AsyncAPI operations that have no `operationId`. Mutually exclusive with `operationId` and `workflowId`. When the operation does have an `operationId`, the spec says to reference it that way instead, the same rule as `operationPath` for OpenAPI sources.
  - `action`: `send` or `receive`.
  - `correlationId`: for `receive` steps, which message to wait for. Must match the correlation ID in the AsyncAPI document.
  - `timeout`: milliseconds to wait.

  A `send` step completes when the message is sent; Arazzo doesn't model broker acknowledgment. A `receive` step completes when a matching message arrives within the timeout, or fails and triggers `onFailure`. With no `successCriteria`, any matching message is success. The spec's own example, trimmed:

  ```yaml
  - stepId: confirmOrder
    operationId: $sourceDescriptions.asyncOrderApi.confirmOrder
    action: receive
    correlationId: $inputs.correlationId
    dependsOn:
      - placeOrder
    timeout: 6000
    outputs:
      orderId: $message.payload.orderId
  ```

  Scope note: 1.1.0 supports AsyncAPI **v3 only**. The final text links to the v3 Operations Object, `send`/`receive` is v3 terminology, and the only example is `asyncapi: 3.0.0`. Nothing addresses v2.
- **[Selector Object](https://spec.openapis.org/arazzo/v1.1.0.html#selector-object).** Apply JSONPath, XPath, or JSON Pointer to structured data instead of reaching for a runtime expression with a pointer suffix. `context` is a runtime expression that must evaluate to structured data, `selector` is the expression, `type` is `jsonpath`, `xpath`, `jsonpointer`, or an Expression Type Object:

  ```yaml
  outputs:
    firstPetId:
      context: $response.body
      selector: $[0].id
      type: jsonpath
  ```

  Allowed anywhere a value used to be just a runtime expression: workflow `outputs`, step `outputs`, a parameter's `value`, a request body's `payload` (nested at any depth), and a Payload Replacement's `value`. This is the addition I expect to see in the most documents.
- **Step-level `dependsOn`.** A list of `stepId`s that must complete before this step runs. Cross-workflow: `$workflows.<workflowId>.steps.<stepId>`. Cross-document: `$sourceDescriptions.<name>.<workflowId>.steps.<stepId>`. Intended as a join point for in-flight async work; for purely synchronous workflows the recommendation is still to order the array and not use it.
- **`parameters` on Success Action and Failure Action Objects.** An action with a `workflowId` can now hand inputs to the workflow it starts. `in` must not be used on them.
- **`$self` on the Arazzo Object.** A URI reference that is the document's canonical identity and the base URI for its relative references. Must not contain a fragment; may itself be relative, resolved against the retrieval URI. If you know JSON Schema, `$self` is to an Arazzo document what `$id` is to a schema resource.
- **`$message` and `$self` as runtime expression roots.** `$message` sources are `header.`, `query.`, `path.`, `body`, and `payload`.

### Extended functionality

- **Expression Type Object** (renamed from Criterion Expression Type Object, now shared by Criterion and Selector Objects): `type` gains `jsonpointer`; `version` gains `rfc9535` ([JSONPath](https://www.rfc-editor.org/rfc/rfc9535)), `xpath-31` ([XPath 3.1](https://www.w3.org/TR/xpath-31/)), and `rfc6901` ([JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)), which are now the explicit defaults.
- **Payload Replacement Object**: `target` may be a JSONPath as well as a JSON Pointer or XPath, and the new `targetSelectorType` says which. Defaults: JSON Pointer for `application/json`, XPath for XML media types. `value` accepts a Selector Object.
- **Parameter Object**: `in` gains `querystring` (the OpenAPI 3.2 concept where the whole query string is one pre-formatted value); `value` accepts a Selector Object; `in` may be omitted whenever the step, success action, or failure action in context targets a `workflowId`.
- **Workflow and step `outputs`** accept a Selector Object as well as a runtime expression.
- **Runtime expressions**: `$inputs.` and `$outputs.` formally allow a `#json-pointer` suffix; `$components.` covers `successActions` and `failureActions` alongside `parameters`; `$sourceDescriptions.<name>.<x>` gets a resolution order (operation or workflow ID first, then a Source Description field such as `url` or `type`); `{...}` embedding is formally defined, with serialization rules (scalars to strings, objects and arrays to JSON, strings as-is).

### Changes

- **Criterion evaluation rules.** For `regex`, `jsonpath`, and `xpath` conditions, runtime expressions must be embedded as `{$expr}` and substituted before evaluation. Truthiness per type: a simple condition as written, a regex must match, a JSONPath must produce a non-empty nodelist, an XPath uses its effective boolean value. An evaluation error is a failed criterion. Multiple criteria are combined with logical AND. Simple conditions: `null` equals only `null`, numeric strings coerce to numbers, string comparison is case-insensitive. What 1.1.0 still doesn't provide is a grammar for simple conditions: the operators are listed, but tokenization and precedence are left to the implementation, unlike runtime expressions, which get a full ABNF. I wrote about [one 1.0 condition no tool could evaluate safely](https://vladimirgorej.com/blog/the-one-arazzo-condition-no-tool-can-evaluate-safely/) for exactly this reason; that article proposes a grammar and evaluation semantics, and adding them to the specification is proposed in [#518](https://github.com/OAI/Arazzo-Specification/issues/518) and [#517](https://github.com/OAI/Arazzo-Specification/issues/517).
- **`successCriteria`, if present, must contain at least one Criterion Object.**
- **Schema only:** `retryAfter` is no longer required when `type: retry`, and a `retry` failure action no longer has to name a `stepId` or `workflowId`. Both bring the schema in line with what the prose always allowed. The 1.1 schema is a separate iteration, [2026-04-15](https://spec.openapis.org/arazzo/1.1/schema/2026-04-15).

### Clarifications

- **Step dependencies and execution order.** Output references like `$steps.stepId.outputs.field` are implicit dependencies and tools must satisfy them; tools must also respect every declared `dependsOn`.
- **Defining success for asynchronous steps**, as summarized under AsyncAPI above.
- **Parsing documents.** A document must be parsed whole before references are resolved; parsing a fragment is undefined behaviour.
- **Identity-based referencing.** A reference to another Arazzo document must use its `$self` if it has one, and absolute source `url`s resolve by identity, not location, so a document already loaded under its `$self` isn't fetched again.
- **Base URI resolution**, spelled out: `$self`, then the encapsulating entity, then the retrieval URI, then an application default. New Appendix B walks through examples. Relative references in API URLs resolve against the OpenAPI Server Object, not the Arazzo base URI.
- **Runtime expression ABNF rewritten** to state formally what the prose already said: `$steps.` is `step-id ".outputs." output-name ["#" json-pointer]`, `$workflows.` likewise, plus a strict identifier form without dots.
- **Example fixes**: `$steps.loginUser` to `$steps.loginStep`, `"{$statusCode == 401}"` to `"$statusCode == 401"`, JSONPath examples updated to [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535).

## A migration checklist {#migration-checklist}

**Moving a document from 1.0.0 to 1.0.1:**

1. Change `arazzo: 1.0.0` to `arazzo: 1.0.1`.
2. Search for `$message.` and remove it; there was nothing for it to resolve against.
3. Search for `in: body` and move that data into the step's `requestBody`.
4. Search for `$steps.` references missing `.outputs.` and add it. These were never valid.
5. If any `workflowId` points into an external `arazzo` source description, write it as `$sourceDescriptions.<name>.<workflowId>`, even if there's only one such source.

**Moving from 1.0.1 to 1.1.0:**

1. Change the version string. That's the required part.
2. If a runner evaluates your `successCriteria`, re-read them against the new condition semantics, especially anything comparing to `null` or relying on case.
3. Then, optionally, start using what 1.1.0 gives you: Selector Objects in outputs, `parameters` on actions, `$self` on multi-document setups, and AsyncAPI v3 sources with `dependsOn` for the join points.

The 1.1.0 release is three months old, and most of the documents I've come across still say 1.0.1. That makes now a good time to read the changes, before habits form around the old ones.

## Sources

- [Arazzo 1.0.0](https://github.com/OAI/Arazzo-Specification/releases/tag/1.0.0), [1.0.1](https://github.com/OAI/Arazzo-Specification/releases/tag/1.0.1), and [1.1.0](https://github.com/OAI/Arazzo-Specification/releases/tag/1.1.0) release notes
- [1.0.0 to 1.0.1 diff](https://github.com/OAI/Arazzo-Specification/compare/1.0.0...1.0.1) and [1.0.1 to 1.1.0 diff](https://github.com/OAI/Arazzo-Specification/compare/1.0.1...1.1.0)

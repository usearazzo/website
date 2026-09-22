---
title: "Resolving Arazzo Documents"
description: "An Arazzo document looks like one self-contained file. As soon as its inputs use the JSON Schema $ref keyword, it is one file of several, and only bundling makes it a compound document again. What resolving, bundling, and dereferencing each do to those references, why a schema's identity is not its location, and what to expect from a good implementation of each."
summary: "Why an Arazzo document is rarely the one file it looks like, and what resolving, bundling, and dereferencing each do about it."
date: 2026-09-22
image:
  path: /assets/images/guides/arazzo-document-resolving.png
  webp: /assets/images/guides/arazzo-document-resolving.webp
  width: 1200
  height: 630
  alt: "Three document sheets on the left, the first pointing at the other two with dotted arrows and the third pointing back at itself; an arrow leads to one taller sheet on the right that holds three stacked blocks"
  caption: "Resolving: several files in, one document out, and the loop still there."
toc:
  - id: the-end-result
    title: What a resolved document looks like
  - id: not-one-file
    title: Why an Arazzo document is not one file
  - id: three-jobs
    title: Three jobs behind one word
  - id: why-hard
    title: Why resolving Arazzo is hard
  - id: by-hand
    title: Doing it by hand
  - id: a-good-resolve
    title: What a good implementation gives you
  - id: not-resolving
    title: Where resolving should stop
  - id: next-steps
    title: Next steps
faq:
  - question: "Is an Arazzo document self-contained?"
    answer: |
      Not necessarily. A workflow's `inputs` is a JSON Schema, and so is every schema under `components.inputs`. A JSON Schema can use `$ref` to point at another file, and that file can point at others. The Arazzo document is then the entry point to a set of files, not a document on its own. It is self-contained only when every `$ref` points inside it, or when it has been bundled into a compound document.
  - question: "What is a compound Arazzo document?"
    answer: |
      One file that embeds several schemas, each keeping its own identity. An Arazzo document whose `$ref`s all point inside it is already one. An Arazzo document whose `$ref`s point at other files is not, until it is bundled: each external schema is copied under `components.inputs` with an `$id` recording where it came from, and the `$ref`s that pointed at it keep working. The result is the compound document. The term comes from [JSON Schema's own definition](https://json-schema.org/blog/posts/bundling-json-schema-compound-documents).
  - question: "Where can $ref appear in an Arazzo document?"
    answer: |
      Only inside JSON Schemas: a workflow's `inputs`, and the schemas under `components.inputs`. Steps, parameters, and success criteria do not use `$ref`. They reuse content through the Reusable Object, whose `reference` field holds a `$components.<type>.<name>` expression that always points inside the same document.
  - question: "What is the difference between bundling and dereferencing?"
    answer: |
      Both produce one document with no external dependencies, and both are loosely called "resolving", which is why the precise words matter. Bundling keeps the references and copies their targets into the document, so the result still reads like the original and can still express a cycle. Dereferencing, also called inlining or inline bundling, replaces every reference with its target, so the result has no references left, is larger, and, when the schemas contain a cycle, cannot be written to a file without a rule for it. Bundle to get a portable file. Dereference to get a document a program can walk without following pointers.
  - question: "How do I bundle an Arazzo document into one file?"
    answer: |
      Walk every `$ref` in the document's schemas, fetch each external target once, copy it under `components.inputs`, and give the copy an `$id` that records the location it came from, relative to the entry document. Leave the `$ref`s as written: under JSON Schema 2020-12 rules they now resolve against those `$id`s instead of the file system. Then move the file somewhere else and confirm it still resolves. If it does not, it was not bundled.
  - question: "How are relative references resolved in an Arazzo document?"
    answer: |
      Against the base URI of the schema they sit in. For a schema with no `$id` of its own, that is the location the document was read from: the file path or URL. For a schema that declares `$id`, it is that `$id`, wherever the file was actually read from, and a relative `$id` is itself resolved against the enclosing schema's `$id`. A reference is matched against the identities already read before anything is fetched. A document parsed from a string or an object has no location, so a tool needs to be told one before any relative reference can resolve.
  - question: "What happens to circular references when dereferencing?"
    answer: |
      A schema that refers to itself, such as an `adopter` with a `referredBy` that is another `adopter`, would inline forever. A dereferencer has to detect the reference that closes the loop and do one of three things with it: leave the in-memory graph looping, replace that one reference with a marker such as the target's URI, or refuse. Which one is right depends on what happens next: a program walking the graph can live with a loop, a file cannot.
  - question: "Do source descriptions get resolved with the Arazzo document?"
    answer: |
      They are a separate axis. A source description names another API description, which has its own references. Resolving the Arazzo document's `$ref`s does not require reading them, and bundling does not copy them in: the `sourceDescriptions` array keeps pointing at them. A tool may offer to follow them as well, in which case each one is resolved as its own document.
  - question: "Does resolving an Arazzo document validate it?"
    answer: |
      No. Resolving answers "what does this reference point at, and is it there?" A reference that points nowhere is a resolution error. Whether the schema it points at is a valid schema, whether a step's `operationId` exists in the API it names, and whether the workflow makes sense are validation, a separate job with its own rules.
---

Most Arazzo documents look like one file. Open one and you see the whole workflow: the APIs it calls, the steps, the inputs, the success criteria. It is tempting to treat that file as the document, load it, and get on with whatever you are building.

Then an `inputs` block says `$ref: ./schemas/adoption.yaml`, and the file you have is no longer the document. It is the entry point to a set of files, held together by JSON Schema's own rules about what a reference means. A tool that wants the whole thing has to go and get it. That is resolving, and this guide is about what it involves, whichever tool does it.

The guide is for anyone building on Arazzo documents: a runner that needs the complete input schema, an editor that needs to show what a reference points at, a build step that has to produce one portable file. It describes the problems and the results to expect. It does not describe a product.

## What a resolved document looks like {#the-end-result}

Here is the destination first. The sample workflow is [`adopt-a-pet.arazzo.yaml`]({{ '/assets/guides/arazzo-document-resolving/' | relative_url }}adopt-a-pet.arazzo.yaml). Its inputs live in a second file, and that file points at a third:

```yaml
arazzo: 1.0.1
info:
  title: Pet adoption
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    type: openapi
    url: ./petstore.openapi.yaml
workflows:
  - workflowId: adopt-a-pet
    inputs:
      $ref: ./schemas/adoption.yaml
    steps:
      - stepId: find-pet
        operationId: getPetById
        parameters:
          - reference: $components.parameters.petId
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          name: $response.body#/name
      - stepId: adopt
        operationId: adoptPet
        parameters:
          - reference: $components.parameters.petId
components:
  parameters:
    petId:
      name: petId
      in: path
      value: $inputs.petId
```
{: .numbered}

[`schemas/adoption.yaml`]({{ '/assets/guides/arazzo-document-resolving/' | relative_url }}schemas/adoption.yaml) describes the inputs and points at the adopter:

```yaml
type: object
required:
  - petId
properties:
  petId:
    type: string
  adopter:
    $ref: ./adopter.yaml
```

And [`schemas/adopter.yaml`]({{ '/assets/guides/arazzo-document-resolving/' | relative_url }}schemas/adopter.yaml) points at itself, because an adopter can be referred by another adopter:

```yaml
type: object
properties:
  name:
    type: string
  referredBy:
    $ref: ./adopter.yaml
```

Three files, four references, one loop. "Resolving" this can mean three different results, and a good tool offers all three.

**The reference set.** The cheapest result: which files does the workflow reach through its references, and what is in each? Nothing is changed. This is the graph of files the workflow consists of.

```text
/home/you/adoption/adopt-a-pet.arazzo.yaml
/home/you/adoption/schemas/adoption.yaml
/home/you/adoption/schemas/adopter.yaml
```

`petstore.openapi.yaml` is not in the set. A source description is not a reference. More on that below.

**The bundled document.** One file that still reads like the original. The workflow is untouched. The two external schemas have been copied under `components.inputs`, each with an `$id` recording where it came from, and every `$ref` is exactly as it was written:

```yaml
workflows:
  - workflowId: adopt-a-pet
    inputs:
      $ref: ./schemas/adoption.yaml
    # steps unchanged
components:
  parameters:
    # petId, unchanged
  inputs:
    adopter:
      type: object
      properties:
        name:
          type: string
        referredBy:
          $ref: ./adopter.yaml
      $id: schemas/adopter.yaml
    adoption:
      type: object
      required:
        - petId
      properties:
        petId:
          type: string
        adopter:
          $ref: ./adopter.yaml
      $id: schemas/adoption.yaml
```

Copy this file to another machine and it still resolves. The `$ref`s no longer point at the file system; they point at the `$id`s. The loop is still there, written down as a `$ref`, which a file can hold and a program can follow.

**The dereferenced document.** Every reference replaced by what it points at, including the Reusable Object references, which are now the parameter itself:

```yaml
workflows:
  - workflowId: adopt-a-pet
    inputs:
      type: object
      required:
        - petId
      properties:
        petId:
          type: string
        adopter:
          type: object
          properties:
            name:
              type: string
            referredBy:
              # the adopter schema again: a loop the tool has to do something about
    steps:
      - stepId: find-pet
        operationId: getPetById
        parameters:
          - name: petId
            in: path
            value: $inputs.petId
        # ...
      - stepId: adopt
        operationId: adoptPet
        parameters:
          - name: petId
            in: path
            value: $inputs.petId
```

This is the document a runner wants: no pointers to chase while executing. It is also the one that this sample cannot simply write to a file, because of that loop. A dereferenced document with no cycles can be saved, but at a cost: it is larger, by one copy of each target per reference site, and it has lost some meaning. `petId` now appears three times, and nothing in the file says it was defined once. The reader cannot tell a shared parameter from three that happen to match.

For the schemas the loss goes deeper than readability: JSON Schema cannot be fully dereferenced without giving up some of its semantics. A `$ref` may sit beside other keywords, and both apply, so replacing the `$ref` with its target either drops the siblings or has to fold both into an `allOf`, which is a different schema. A target with its own `$id` establishes a base URI that its inlined copy no longer has. And `$dynamicRef` is resolved against the dynamic scope of an evaluation, which a document at rest does not have. A dereferenced schema is a convenience for tools that only read structure, not a replacement for the original.

## Why an Arazzo document is not one file {#not-one-file}

Two features of the specification put references into an Arazzo document, and they work in opposite ways.

**JSON Schema, wherever there is a schema.** A workflow's `inputs` is a JSON Schema. So is every schema under `components.inputs`. JSON Schema has `$ref`, and `$ref` can point anywhere: another part of the same file, another file, a URL. The moment someone factors a shared input schema out into a `schemas/` directory, the Arazzo document depends on a file it does not contain. This is the same mechanism that makes an OpenAPI description spread across files, and it brings the same rules with it, including the one about `$id` that takes up most of this guide.

**Reusable Objects, which never leave the file.** Steps do not use `$ref`. A step that wants a shared parameter, success criterion, or action uses a [Reusable Object](https://spec.openapis.org/arazzo/latest.html#reusable-object), whose `reference` field holds an expression such as `$components.parameters.petId`. That expression is a lookup into the same document's `components`. It cannot point outside it. So a Reusable Object never makes the document depend on another file, but a tool still has to resolve it: the step wants the parameter, not the pointer.

And then there is a third thing that looks like a reference and is not. `sourceDescriptions` names the API descriptions the workflow calls, each a separate document with references of its own. They are dependencies of the workflow, not parts of the document. Bundling does not copy them in, and dereferencing the Arazzo document does not require reading them. A tool may offer to follow them too, and then each one is resolved as its own document, on its own terms. The [Parsing Arazzo Documents]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}) guide covers that network.

So a self-contained Arazzo document is one whose every `$ref` points inside it. Many are, and a schema shared between workflows in the same document can live under `components.inputs` without breaking that. A schema shared between documents cannot: it lives in a file of its own, and every document that uses it stops being self-contained.

## Three jobs behind one word {#three-jobs}

Ask three tool builders to "resolve the references" and you get three different programs. "Resolving" is the ambiguous word here: people use it for any of them, and for all of them together. The precise terms are worth learning, because tools, specifications, and bug reports mean different things by the loose one.

| Job | What happens to a reference | What you get | Use it for |
|---|---|---|---|
| **Resolve** | Left alone. The document it names is fetched and parsed, and so is every document that one names. | The reference set: the graph of documents the workflow consists of, each with its absolute URI | Dependency lists, reviews, "what will this touch?" |
| **Bundle** | Kept as written. Its external target is copied into the entry document. | One compound (self-contained) file that reads like the original | Publishing, sharing, anything that moves the file |
| **Dereference**, also called inlining or inline bundling | Replaced by its target. | One document with no references left | Executing, evaluating, anything that reads the content |

Underneath all three sits one mechanical step, **URI resolution**: turning a reference as written (`./adopter.yaml`) into an absolute canonical URI against the right base, so it can be fetched. It is a step, not a job, and most of the difficulty in the next section is about getting it right.

Resolving is the prerequisite of the other two: nothing can be copied or inlined until it has been fetched. The other two are alternatives, and choosing between them is the first decision a tool makes. Bundle when the output is a file. Dereference when the output is a data structure in memory. Doing the wrong one shows up later as a bundle nobody can read or a dereferenced tree nobody can save.

This guide uses the three precise words from here on, and "resolving" in the loose sense only in its title.

## Why resolving Arazzo is hard {#why-hard}

Each of the three jobs looks like a loop over references with a file read inside it. Here is where that loop goes wrong.

### Relative to what?

`./adopter.yaml` means nothing on its own. It is relative to a base URI, and the first question is which one. The obvious answer, the location the document was read from, is right only when the document was read from somewhere. A document handed over as a string, from an editor buffer or an HTTP body, has no location. A tool that resolves references from in-memory content needs to be told a base, or every relative reference in it is unresolvable. Arazzo 1.1.0 adds `$self`, which lets a document state its own URI, and an implementation has to honour that over the retrieval location when both are present.

### Identity is not location

This is the one that takes longest to get right, and it sits under bundling and dereferencing alike.

Under the JSON Schema 2020-12 rules that Arazzo and OpenAPI 3.1 use, a schema can declare its own identity with `$id`. That identity is a URI, and it is what references are matched against. Where the schema was read from is a separate fact, and it is the less important of the two. Three consequences follow, and a second sample, [`adopt-a-pet.identities.arazzo.yaml`]({{ '/assets/guides/arazzo-document-resolving/' | relative_url }}adopt-a-pet.identities.arazzo.yaml), shows all three. It is the same workflow with its schemas embedded, each carrying an `$id`:

```yaml
workflows:
  - workflowId: adopt-a-pet
    inputs:
      $ref: https://example.com/schemas/adoption.yaml
    # steps as before
components:
  inputs:
    adoption:
      $id: https://example.com/schemas/adoption.yaml
      type: object
      properties:
        petId:
          type: string
        adopter:
          $ref: adopter.yaml
      $defs:
        adopter:
          $id: adopter.yaml
          type: object
          properties:
            name:
              type: string
```

**A reference is matched by identity before anything is fetched.** `inputs` points at `https://example.com/schemas/adoption.yaml`. There is no such server. Dereferencing succeeds anyway, without a network request, because a schema in the document declares that URI as its `$id`. The reference set of this document is one file. A tool that treats a `$ref` as an instruction to fetch has this backwards: the first question is whether something already read answers to that name.

**A relative `$id` resolves against the enclosing `$id`.** The nested schema says `$id: adopter.yaml`. That is not a file. It is relative to the base URI in force where it appears, which is its parent's `https://example.com/schemas/adoption.yaml`, so the nested schema's identity is `https://example.com/schemas/adopter.yaml`. Identities nest the way directories do, except that nothing on disk has to match.

**A relative `$ref` resolves against the enclosing `$id` too.** `$ref: adopter.yaml` sits inside the schema whose `$id` is `https://example.com/schemas/adoption.yaml`, so it means `https://example.com/schemas/adopter.yaml`, and that is exactly the identity the nested schema just declared. The two meet, and the `$ref` is satisfied from inside the document. Dereferenced, `adopter` is inlined and the result is the same schema a file on that server would have given.

Now put the rule the other way round. Take the first sample, whose `schemas/adoption.yaml` is a real file on disk, and give it one line at the top:

```yaml
$id: https://example.com/schemas/adoption.yaml
type: object
# ...
properties:
  adopter:
    $ref: ./adopter.yaml
```

The file is still read from `schemas/adoption.yaml`. But `./adopter.yaml` inside it now means `https://example.com/schemas/adopter.yaml`, nothing in the document answers to that name, and a dereferencer that goes looking for it on the local disk is wrong. A correct one fails with a message like:

```text
Cannot resolve $ref "./adopter.yaml": Error while reading file "https://example.com/schemas/adopter.yaml"
```

That failure is the right answer. The schema said where it lives.

The consequence for a tool: it cannot resolve references with a base URI it worked out once, at the top, and it cannot go to the file system first. It needs an index of every `$id` in every document it has read, each made absolute against its parent, and every lookup goes through that index before any fetch. And because bundling changes the document while walking it, the index has to reflect the document as it is now, not as it was when parsing finished. An index taken as a snapshot is wrong the moment the first schema is copied.

### Bundling is relocating

Copying a schema into `components.inputs` moves it. Every relative `$ref` inside it meant something at the old location. At the new one, without help, it means something else or nothing. So a bundler is not copying content, it is relocating it, and it has to leave the content able to find its targets from where it now sits.

The JSON Schema answer is to give the copy an `$id` recording its origin, relative to the entry document (`schemas/adopter.yaml` above), so its `$ref`s keep resolving against that. Two ways to get this wrong are common. Assign the copy's absolute retrieval path as its `$id`, and the bundle carries a path from your machine and works only there. Skip the `$id` and rewrite each `$ref` to `#/components/inputs/adopter` instead, and it works until a schema declares its own `$id`, at which point the rewritten reference and the schema disagree about what the schema is called.

The test is simple. A bundle is only a bundle if you can move it. If the output still needs the directory it was made in, or the network, it is not self-contained, whatever it looks like.

### One target, many sites

`$components.parameters.petId` is referenced from both steps. In the dereferenced document, each step has its own copy of the parameter, or does it? If the copies are separate, the dereferenced document is larger than the original by the number of reference sites, and a large shared schema referenced from twenty places is inlined twenty times. If they are shared, changing one changes them all, which surprises anyone who thought they were editing a tree.

Neither answer is wrong, but a tool has to pick one and say so, because the caller's code depends on it. Copies give a tree that can be mutated freely and grows with every reference site. Sharing gives a graph, not a tree, even when nothing loops: smaller, but a change in one place shows up in every other, and anything that mutates it has to clone first.

### The loop

`adopter.yaml` refers to itself. Dereferencing replaces `referredBy` with the adopter schema, whose `referredBy` is the adopter schema, and so on. The first thing a dereferencer needs is to notice the reference that closes the loop. The second is a policy for it, and there are three defensible ones:

- **Leave it.** The in-memory graph loops. Fine for a program that walks it with a visited set. Fatal for `JSON.stringify`, and quietly wrong for a YAML serializer that writes `null` where the loop closes.
- **Replace it.** The closing reference becomes a marker, typically the target's URI, and the graph is acyclic again. The output can be saved. Whoever reads it needs to know what the marker means.
- **Refuse.** Some tools are entitled to say that cycles are not allowed in their input.

Bundling has none of this trouble. A `$ref` can point at its own container, so the loop is simply written down. When the goal is a file, that is a strong reason to bundle rather than dereference.

### Two document families, three reference systems

An Arazzo document has JSON Schema references and Reusable Object references. The OpenAPI descriptions it names have Reference Objects, and in OpenAPI 2.0 and 3.0 those are not JSON Schema references: a Reference Object is a plain pointer to a location, with no `$id` and no relocation rules, while in OpenAPI 3.1 a schema `$ref` is full JSON Schema again. A tool that resolves an Arazzo document and offers to follow its source descriptions is resolving under three sets of rules, and bundling under two: a hoisted 3.0 schema gets its `$ref` rewritten to point into `components`, a hoisted 3.1 schema keeps its `$ref` and gains an `$id`.

### What to do when a reference is dangling

`$ref: ./schemas/nope.yaml`. The file is not there. For a build step, stopping at the first unresolvable reference is right: nothing downstream should run on a document with a hole in it. For an editor or a linter it is exactly wrong: the tool should process everything that resolves and report everything that does not, with the reference and where it sits. A dereferencer or bundler needs both modes, and the second one has to leave the dangling reference in place, as written, so the report can point at it. The same goes for a Reusable Object whose `$components` target does not exist: same hole, same two modes.

## Doing it by hand {#by-hand}

How far does a loader plus a file read get? Worth seeing, because that is where first attempts start:

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

async function load(file) {
  return YAML.parse(await readFile(file, 'utf8'));
}

async function dereference(node, dir) {
  if (Array.isArray(node)) return Promise.all(node.map((item) => dereference(item, dir)));
  if (node === null || typeof node !== 'object') return node;
  if (typeof node.$ref === 'string') {
    const target = path.resolve(dir, node.$ref);
    return dereference(await load(target), path.dirname(target));
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) out[key] = await dereference(value, dir);
  return out;
}

const doc = await dereference(await load('./adopt-a-pet.arazzo.yaml'), '.');
```

Twenty lines, and it works on the sample right up to `adopter.yaml`, which it reads, and reads again, and never returns from. Fix that with a visited set and you have a working first version. The trouble is everything the first version does not know:

- **It resolves against the directory, always.** Add an `$id` to a schema and it reads the wrong file, silently, because a file with that name may well exist.
- **It only knows `$ref`.** `reference: $components.parameters.petId` is a string to it. Steps stay unresolved.
- **It only knows files.** A `$ref` to a URL, a `file://` URL, or a JSON Pointer fragment (`#/definitions/adopter`) is a read error or a wrong path.
- **It copies.** Every reference site gets its own inlined copy, so a shared schema is read and inlined once per site. On a document with real reuse, the output is many times the input.
- **It has one policy for a cycle** (whatever the visited set does), one policy for a missing file (throw), and no way to bundle at all, because bundling needs the `$id` bookkeeping it skipped.
- **It has no positions.** When it fails, it cannot say which line the reference was on.

Each of these is a solved problem somewhere: the resolution rules are in [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986), the `$id` and bundling rules in [JSON Schema](https://json-schema.org/blog/posts/bundling-json-schema-compound-documents), pointers in [RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901). The cost is in assembling them, and in fixtures. A test suite whose files all sit in one directory tests nothing about location, and location is the whole problem. A saved expected output proves only that the output has not changed, never that it was right.

## What a good implementation gives you {#a-good-resolve}

Turn the problems around and you get a checklist, for an implementation you pick or one you build. It describes results, not an API.

- **All three jobs, separately, under their own names.** Resolve returns the reference set, each document with its absolute URI. Bundle returns one file. Dereference returns one structure. The caller chooses; the tool does not guess.
- **A base URI for everything.** Documents read from a location carry it. In-memory documents can be given one. `$self` is honoured. Nothing relative is resolved against "the current directory" by accident.
- **An `$id` index that is live.** Every lookup goes through the identities declared in the documents read so far, each made absolute against its parent, as they are now, before any file or network read. A schema that says where it lives is believed.
- **A bundle you can move.** Hoisted schemas get an `$id` relative to the entry document, never an absolute path from the machine that made it. `$ref`s are left as written where JSON Schema 2020-12 rules apply and rewritten where Reference Object rules apply. The result resolves from any directory, offline.
- **Sharing you can predict.** The dereferenced result's sharing rule is stated: what is copied, what is shared, and what to clone before mutating.
- **A named policy for cycles.** Leave, replace, or refuse, chosen by the caller, with a serializer that does not silently write holes.
- **Two modes for dangling references.** Stop at the first, or continue and report each one with the reference text and its position, leaving it in place.
- **Reusable Objects resolved too.** `$components` references are pointers in every sense that matters to a step, and they are resolved, reported, and skipped under the same rules as `$ref`.
- **Source descriptions as an option, not a side effect.** Following them is a separate choice, with its own depth limit, and each is resolved under the rules of its own document kind.
- **Errors that say which reference.** The message names the reference as written and the document it sits in, and the underlying cause (file not found, wrong document kind, cycle refused) is attached, not flattened into a string.

## Where resolving should stop {#not-resolving}

Knowing where these jobs stop is as useful as knowing what they do. Three things look like resolving and are not:

- **Validation.** A reference that points nowhere is a resolution error. Whether the schema it points at is a valid JSON Schema, whether `getPetById` exists in the API the source description names, whether the workflow makes sense: those are validation, judged by rules that change with every release of the specification.
- **Evaluation.** `$inputs.petId` is not a reference. It is a runtime expression, and its value exists only during a run. Dereferencing leaves it alone; the thing that executes the workflow evaluates it.
- **Fetching with credentials, caching across runs, retrying.** Resolving fetches what a reference names, over the file system or HTTP. Authentication, proxies, and caches are the calling tool's concern and belong in the implementation only as pluggable pieces.

So the jobs line up: a parser reads a document, these three follow its references, a validator judges the result, and a runner evaluates it. The parser guide draws the first line. This one draws the second.

## Next steps {#next-steps}

- UseArazzo's own answer to this checklist is `@usearazzo/resolver`, for JavaScript and TypeScript: resolve, bundle, and dereference, for Arazzo and OpenAPI documents. Its [API reference]({{ '/docs/resolver/' | relative_url }}) documents every function and option.
- The layer below this one is the subject of [Parsing Arazzo Documents]({{ '/docs/guides/arazzo-document-parsing/' | relative_url }}): what it takes to read one document properly, including the network of source descriptions this guide set aside.
- The rules all three jobs implement are in three documents: [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986) for reference resolution, [RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901) for JSON Pointer fragments, and JSON Schema's [bundling article](https://json-schema.org/blog/posts/bundling-json-schema-compound-documents) for `$id` and compound documents.
- The specification's own text on the two Arazzo-specific pieces: the [Reusable Object](https://spec.openapis.org/arazzo/latest.html#reusable-object) and the [Components Object](https://spec.openapis.org/arazzo/latest.html#components-object).
- The [Ecosystem page]({{ '/ecosystem/#tools' | relative_url }}) lists the Arazzo tools that exist today, including ones that bundle and dereference.
- Something here is wrong, or missing? Say so in [Discussions](https://github.com/orgs/usearazzo/discussions).

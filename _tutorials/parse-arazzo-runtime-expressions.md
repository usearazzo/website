---
title: "Parse and Validate Arazzo Runtime Expressions"
description: "A runtime expression such as $steps.find-pet.outputs.petId is a small language inside an Arazzo document, and a YAML loader cannot check it. Parse one into a syntax tree, tell a valid one from an invalid one with the exact spot where it broke, and see where parsing ends and Arazzo document validation begins."
lead: "A runtime expression such as `$steps.find-pet.outputs.petId` is a small language inside an Arazzo document, and a YAML loader cannot check it. Parse one into a syntax tree, tell a valid one from an invalid one with the exact spot where it broke, and see where parsing ends and Arazzo document validation begins."
summary: "Parse a runtime expression into a syntax tree, find the exact spot where an invalid one breaks, and see where parsing ends and Arazzo document validation begins."
date: 2026-10-01
image:
  path: /assets/images/tutorials/parse-arazzo-runtime-expressions.png
  webp: /assets/images/tutorials/parse-arazzo-runtime-expressions.webp
  width: 1200
  height: 630
  alt: "A rounded-square document with five text lines; the middle line is broken in two with a glowing caret pointing at the gap, and a dotted line from the document stops at a bar before a run node with a play triangle"
  caption: "One line does not parse, the caret says where, and the run waits."
stylesheets:
  - /assets/css/ast-tree.css
toc:
  - id: the-end-result
    title: The end result
  - id: install
    title: Install the parser
  - id: parse-one
    title: Parse one expression
  - id: valid-or-not
    title: Tell valid from invalid
  - id: run
    title: Run it on a document
  - id: where-parsing-ends
    title: Where parsing ends
  - id: next-steps
    title: Next steps
faq:
  - question: "How do I parse an Arazzo runtime expression in JavaScript?"
    answer: |
      Call `parseRuntimeExpression` from `@usearazzo/parser` with the bare expression, without the `{}` braces that embed it in a string. It is synchronous and needs no document. The `tree` is a syntax tree whose root `type` names what the expression reads from:

      ```js
      import { parseRuntimeExpression } from '@usearazzo/parser';

      const { result, tree } = parseRuntimeExpression('$steps.find-pet.outputs.petId');
      result.success; // true
      tree; // { type: 'StepsExpression', stepId: 'find-pet', field: 'outputs', outputName: 'petId' }
      ```

      The grammar is the [Runtime Expressions](https://spec.openapis.org/arazzo/latest.html#runtime-expressions) section of Arazzo 1.1.0, which also covers the 1.0.x forms.
  - question: "How do I validate an Arazzo runtime expression?"
    answer: |
      Parse it. `parseRuntimeExpression` never throws on bad syntax. Instead `result.success` is `false` and `result.maxMatched` is the offset of the first character the grammar could not accept:

      ```js
      const { result } = parseRuntimeExpression('$steps.find-pet.output.petId');
      result.success; // false
      result.maxMatched; // 15, the offset of "output"
      ```

      That is syntax. Whether the expression is the right kind for where it sits, and whether the step and output it names exist, are Arazzo document validation, not parsing.
  - question: "How do I get the line number of a runtime expression in an Arazzo document?"
    answer: |
      Parse the document with source maps on, `parseArazzo(file, { parse: { parserOpts: { sourceMap: true, strict: false } } })`, and every element of the typed tree carries `startLine`, `startCharacter`, `endLine`, and `endCharacter`, zero-based, plus `startOffset` and `endOffset`. A step's first parameter value, for example, is `workflow.steps.get(0).parameters.get(0).value`, and its `startLine` is the line the expression is written on. Source maps need the parser's tolerant mode, `strict: false`. The script in this tutorial uses them to report each problem as file, line, and column.
  - question: "Where can runtime expressions appear in an Arazzo document?"
    answer: |
      In many places, and in two forms. As the whole value of a field:

      - a parameter's `value`, on a step, a workflow, or an action
      - every `outputs` map, on a step and on a workflow
      - the `context` of a criterion, in `successCriteria` and in the `criteria` of a success or failure action, and the `context` of a Selector Object
      - a request body's `payload` and the `value` of each of its replacements
      - the `reference` of a reusable object
      - `operationId`, `operationPath`, `channelPath`, `workflowId`, and `dependsOn`, when they point into another document with `$sourceDescriptions.<name>...`

      Embedded in a longer string, wrapped in `{}` braces:

      - anywhere inside a request body's `payload`, at any depth, which is where most embedded expressions live: `"Adopting {$steps.find-pet.outputs.name}"`
      - in `operationPath` and `channelPath` again, in front of a JSON Pointer: `{$sourceDescriptions.petstore.url}#/paths/~1pets/get`
      - in any other string value, such as a parameter's `value`
      - in Arazzo 1.1.0, inside a `regex`, `jsonpath`, or `xpath` condition

      The same fields count under `components`. A `simple` criterion `condition` is neither form: it is a grammar of its own that has runtime expressions as operands.
  - question: "Which runtime expressions can be used in a parameter value?"
    answer: |
      The ones whose value exists before the request is sent: `$inputs.<name>`, `$outputs.<name>`, `$steps.<stepId>.outputs.<name>`, `$workflows.<workflowId>.inputs.<name>` or `.outputs.<name>`, a source description's field such as `$sourceDescriptions.<name>.url`, and `$self`. A `$response.body#/id` in a parameter value parses fine, but there is no response yet when a parameter is evaluated, so it cannot mean what its author intended, which was usually the previous step's output, `$steps.<stepId>.outputs.<name>`. The specification implies this rule rather than stating it, and checking it is a validator's job.
  - question: "Why does my runtime expression not parse?"
    answer: |
      Usually one of these, and `result.maxMatched` points at the first character that broke the grammar:

      - A prefix that is almost right: `$input.` for `$inputs.`, `$output.` for `$outputs.`, or `$response.headers.` for `$response.header.`. When the prefix itself is unknown, `maxMatched` is `0`.
      - A JSON Pointer without its leading slash: `$response.body#name` instead of `$response.body#/name`.
      - A `$steps.` or `$workflows.` expression that stops early. `$steps.find-pet` needs `.outputs.<name>` after the step id.
      - Whitespace or a stray brace at the end, left over from an edit.
      - A character Arazzo 1.1.0 no longer allows in an id. Step ids, workflow ids, and source description names may contain only letters, digits, `-`, and `_`, so a dotted step id fails.

      Parse with `{ trace: true }` and `trace.displayTrace()` shows every rule the grammar tried on the way there.
  - question: "Does the parser check that the step or output an expression names exists?"
    answer: |
      No. Parsing checks that the expression is written in the grammar, and nothing more. `$steps.find-pet.outputs.petId` parses whether or not the workflow has a step called `find-pet` with an output called `petId`. That check, and the check that a `$response` expression is not sitting in a parameter, are Arazzo document validation, not expression parsing. They need the whole document, and they are the [Validator](/validator/)'s job. The syntax check is still worth running on its own, because it needs nothing but the string and takes microseconds.
---

An Arazzo workflow is a document. But a good part of what it says is written inside small strings: `$inputs.petId`, `$steps.find-pet.outputs.petId`, `$response.body#/id`. Each one is a **runtime expression**, and each one tells a run where to get a value.

So what do we have inside such a string? A small language of its own. It is defined in ABNF in the [Runtime Expressions](https://spec.openapis.org/arazzo/latest.html#runtime-expressions) section of the specification, and a YAML loader has no opinion about it. `$steps.find-pet.output.petId`, with `output` where the grammar wants `outputs`, is a perfectly good string. So the typo waits for a run against a live API, and shows up at the step that uses it.

This tutorial is about that small language, using `@usearazzo/parser` to tackle its complexities. We will parse an expression into a syntax tree. We will tell a valid one from an invalid one, with the exact spot where it broke. And we will see where parsing ends and Arazzo document validation begins. The script is under forty lines, and you will have it running in a few minutes.

## The end result {#the-end-result}

Here is where we will end up. Type any runtime expression below. The parser takes it apart into a tree, or shows the exact character where it stops making sense.

<form id="rex-demo" class="rex-demo my-6 rounded-lg border border-gray-200 bg-[#F0F5E7] p-4 sm:p-6" data-parser-src="https://unpkg.com/@usearazzo/parser@1.0.1-alpha.5/dist/arazzo-parser.browser.min.js" data-parser-integrity="sha384-2EzdIMvhnZ/SAmCyAOtQH2E8DSt1l0hYE55Zz5L1Q+iw9zS0jNDJguObw2nbYoyC">
  <label for="rex-demo-input" class="block text-sm font-semibold text-primary-dark mb-2">A runtime expression</label>
  <div class="flex flex-col sm:flex-row gap-2">
    <input id="rex-demo-input" type="text" required spellcheck="false" autocomplete="off" value="$steps.find-pet.outputs.petId" class="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-primary-dark focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light">
    <button id="rex-demo-run" type="submit" class="primary-cta text-white font-bold py-2 px-5 rounded disabled:opacity-60 disabled:cursor-wait">Parse</button>
  </div>
  <p class="mt-2 mb-0 text-sm text-gray-600">Try <a href="#rex-demo-input" data-rex-demo-expression="$response.body#/pets/0/id" class="text-primary-light underline hover:no-underline"><code>$response.body#/pets/0/id</code></a> with a JSON Pointer, <a href="#rex-demo-input" data-rex-demo-expression="$steps.find-pet.output.petId" class="text-primary-light underline hover:no-underline"><code>$steps.find-pet.output.petId</code></a> with a typo, or <a href="#rex-demo-input" data-rex-demo-expression="$inputs.petId}" class="text-primary-light underline hover:no-underline"><code>$inputs.petId}</code></a> with a stray brace.</p>
  <p id="rex-demo-status" class="mt-4 mb-0 flex items-center gap-2 text-sm text-gray-700" role="status" aria-live="polite" hidden><span class="dep-demo-spinner" aria-hidden="true"></span><span id="rex-demo-status-text"></span></p>
  <div id="rex-demo-error" class="mt-4 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert" hidden></div>
  <div id="rex-demo-result" class="mt-4" aria-live="polite"><figure class="ast" aria-label="Syntax tree of $steps.find-pet.outputs.petId"><p class="ast-source">$steps.find-pet.outputs.petId</p><div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-rex"><small>StepsExpression</small>$steps</span><ul><li><span class="ast-node ast-rex"><small>stepId</small>find-pet</span></li><li><span class="ast-node ast-rex"><small>field</small>outputs</span></li><li><span class="ast-node ast-rex"><small>outputName</small>petId</span></li></ul></li></ul></div><p class="ast-problems"><b class="ast-ok">result.success</b>true</p><figcaption><span class="ast-key ast-rex">runtime expression node</span></figcaption></figure></div>
</form>

That is the whole idea in one picture. A runtime expression looks like a string, and to a YAML loader it is one. To the parser it is a small program with parts: what it reads from, which step or input, which field, which pointer into a body. A tool can act on the parts, and it can report the exact stopping point.

Now let's build the same thing as a Node script, and then run it over a real document.

The document is [adopt-a-pet.arazzo.yaml]({{ '/assets/tutorials/parse-arazzo-runtime-expressions/' | relative_url }}adopt-a-pet.arazzo.yaml), an Arazzo 1.1.0 workflow. Download it, along with the [petstore.openapi.yaml]({{ '/assets/tutorials/parse-arazzo-runtime-expressions/' | relative_url }}petstore.openapi.yaml) it names and the finished script, [check-expressions.mjs]({{ '/assets/tutorials/parse-arazzo-runtime-expressions/' | relative_url }}check-expressions.mjs), into a directory of their own.

Two lines in it deserve a look. Line 30 has a JSON Pointer without its slash, and the script will find it. Line 36 holds an expression that is valid and still wrong. The [last section](#where-parsing-ends) is about that one.

```yaml
arazzo: 1.1.0
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
      type: object
      properties:
        petId:
          type: string
    steps:
      - stepId: find-pet
        operationId: $sourceDescriptions.petstore.getPetById
        parameters:
          - name: petId
            in: path
            value: $inputs.petId
        successCriteria:
          - condition: $statusCode == 200
          - context: $response.body#/status
            condition: ^available$
            type: regex
        outputs:
          petId: $response.body#/id
          name: $response.body#name
      - stepId: adopt
        operationId: $sourceDescriptions.petstore.adoptPet
        parameters:
          - name: petId
            in: path
            value: $response.body#/id
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          adoptionId: $response.body#/id
    outputs:
      adoptionId: $steps.adopt.outputs.adoptionId
```
{: .numbered}

Notice where the runtime expressions sit: the two `operationId` fields (lines 17 and 32), the two parameter values (21 and 36), the one criterion `context` (24), and the four `outputs` (28, 29, 40, and 42). The two `condition` fields are not runtime expressions. A `simple` condition is a grammar of its own that has runtime expressions as operands, and a `regex` condition is a regular expression.

## Install the parser {#install}

In that directory:

```bash
npm install @usearazzo/parser @speclynx/apidom-core
```

Why two packages? `@usearazzo/parser` does the parsing. It gives us `parseRuntimeExpression` for the expressions, which is what this tutorial is about, and `parseArazzo` for the sample document in the last step. `@speclynx/apidom-core` gives us `toValue`. We will need it at the end, to get a plain string out of a node of the parsed document.

## Parse one expression {#parse-one}

Let's start with one expression and see what the parser makes of it. `parseRuntimeExpression` takes the expression and parses it with the grammar from the specification. It is synchronous, and it needs no document. Save this as `check-expressions.mjs`:

```js
import { parseRuntimeExpression } from '@usearazzo/parser';

const { result, tree } = parseRuntimeExpression('$steps.find-pet.outputs.petId');

console.log(result.success);
console.log(JSON.stringify(tree, null, 2));
```

Run it:

```bash
node check-expressions.mjs
```

```text
true
{
  "type": "StepsExpression",
  "stepId": "find-pet",
  "field": "outputs",
  "outputName": "petId"
}
```

<figure class="ast" aria-label="Syntax tree of $steps.find-pet.outputs.petId">
<p class="ast-source">$steps.find-pet.outputs.petId</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-rex"><small>StepsExpression</small>$steps</span><ul><li><span class="ast-node ast-rex"><small>stepId</small>find-pet</span></li><li><span class="ast-node ast-rex"><small>field</small>outputs</span></li><li><span class="ast-node ast-rex"><small>outputName</small>petId</span></li></ul></li></ul></div>
<p class="ast-problems"><b class="ast-ok">result.success</b>true</p>
<figcaption><span class="ast-key ast-rex">runtime expression node</span></figcaption>
</figure>

What have we just done? Well, we turned a string into a **syntax tree**. Drawn, that object is the tree the playground showed: the expression taken apart into which step, which field, which output.

Notice the root `type`. It names what the expression reads from. `$steps` gave us a `StepsExpression`, and every other prefix has a type of its own: `$inputs` an `InputsExpression`, `$response` a `ResponseExpression`, `$statusCode` a `StatusCodeExpression`, and so on, thirteen in all. The playground is the quickest way to meet the rest. Try `$response.body#/id` there, and notice how the JSON Pointer on the end becomes a node too, with its reference tokens split out.

The grammar is Arazzo 1.1.0's. It covers the 1.0.x forms too, with one tightening: a step id, workflow id, or source description name may contain only letters, digits, `-`, and `_`.

## Tell valid from invalid {#valid-or-not}

So what happens when the expression is wrong? Nothing is thrown. `parseRuntimeExpression` reports bad syntax through its result: `result.success` is `false`, and `result.maxMatched` is the offset up to which parsing succeeded. That is the first character the grammar could not accept, and it is an error message on its own: a caret under the spot.

Let's see it. Replace the script with a `check` function and three calls, one valid and two typical typos:

```js
import { parseRuntimeExpression } from '@usearazzo/parser';

function check(expression) {
  const { result } = parseRuntimeExpression(expression);
  if (!result.success) {
    console.log(`${expression}\n${' '.repeat(result.maxMatched)}^ does not parse`);
  }
}

check('$steps.find-pet.outputs.petId');
check('$steps.find-pet.output.petId');
check('$response.body#name');
```

```text
$steps.find-pet.output.petId
               ^ does not parse
$response.body#name
               ^ does not parse
```

The valid one printed nothing. The first typo parsed as far as `$steps.find-pet`, then met `.output.` where the grammar wants `.outputs.`. The second parsed `$response.body#` and then found `n`, where a JSON Pointer has to start with `/`.

<figure class="ast" aria-label="How far the parser got into $steps.find-pet.output.petId before it stopped">
<p class="ast-source">$steps.find-pet.output.petId</p>
<div class="ast-scroll"><ul class="ast-tree"><li><span class="ast-node ast-rex"><small>StepsExpression</small>$steps</span><ul><li><span class="ast-node ast-rex"><small>stepId</small>find-pet</span></li><li><span class="ast-node ast-gone"><small>not accepted</small>.output.petId<em>from offset 15</em></span></li></ul></li></ul></div>
<p class="ast-problems"><b>invalid</b>parsing stopped at offset 15, where the grammar wants <code>.outputs.</code><span>result.maxMatched: 15</span></p>
<figcaption><span class="ast-key ast-rex">matched</span><span class="ast-key ast-gone">not accepted, no tree is returned</span></figcaption>
</figure>

So there it is: valid or not, and if not, exactly where.

## Run it on a document {#run}

Now let's feed `check` real expressions from the sample instead of three literals. We also want to say where each problem is in a way you can find: the file, the line, and the column.

This is a demonstration, so the script looks at one kind of field only: the `outputs` of every step. An output is always a runtime expression, which makes it the simplest place to start. The other places are listed in [Next steps](#next-steps).

### Give `check` the element

So far `check` has been getting strings. But a string does not know where it came from, and we want line numbers. So what does know? The parsed document. `parseArazzo` reads the file and returns a typed tree, and with `sourceMap: true` every element in that tree remembers its line and column. One catch: source maps need `strict: false`, the parser's tolerant mode.

Replace the import line with these two:

```js
import { parseArazzo, parseRuntimeExpression, ParseError } from '@usearazzo/parser';
import { toValue } from '@speclynx/apidom-core';
```

Now let's hand `check` an element of that tree instead of a string. It gets the value out with `toValue`, and puts the element's position in front of each problem. Notice the two `+ 1`. `startLine` and `startCharacter` count from zero, and people count from one. Replace `check` and the three calls with:

```js
const file = process.argv[2];
let problems = 0;

function check(element) {
  const expression = String(toValue(element));
  const { result } = parseRuntimeExpression(expression);
  if (result.success) return;
  const where = `${file}:${element.startLine + 1}:${element.startCharacter + 1}`;
  console.log(`${where}  invalid runtime expression\n  ${expression}\n  ${' '.repeat(result.maxMatched)}^ does not parse from here\n`);
  problems += 1;
}
```

### Walk the outputs

And finally the document itself. `parseArazzo` throws a `ParseError` for a file that is not Arazzo or cannot be read. The script then exits with `2`, so a broken file is never mistaken for a clean one.

```js
let parseResult;
try {
  parseResult = await parseArazzo(file, { parse: { parserOpts: { sourceMap: true, strict: false } } });
} catch (error) {
  if (error instanceof ParseError) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

parseResult.api.workflows.forEach((workflow) => {
  workflow.steps.forEach((step) => {
    step.outputs?.forEach((value) => check(value));
  });
});

console.log(`${problems || 'no'} problem${problems === 1 ? '' : 's'}`);
process.exit(problems > 0 ? 1 : 0);
```

Notice how the typed tree reads like the document: `workflow.steps`, then `step.outputs`. Lists and maps have `forEach`, a map's callback gets the value first, and a step without outputs has no such field, hence the `?.`.

### Run the script

The complete script is [check-expressions.mjs]({{ '/assets/tutorials/parse-arazzo-runtime-expressions/' | relative_url }}check-expressions.mjs), thirty-four lines. Run it against the sample:

```bash
node check-expressions.mjs adopt-a-pet.arazzo.yaml
```

```text
adopt-a-pet.arazzo.yaml:30:17  invalid runtime expression
  $response.body#name
                 ^ does not parse from here

1 problem
```

Line 30 is the one from the listing at the top of the page, and the column is where the expression starts. The exit status, `echo $?`, is `1`. Fix it, `#/name`, and run the script again:

```text
no problems
```

The exit status is now `0`. So the script is something to put in front of a run, in a pre-commit hook or a CI job.

## Where parsing ends {#where-parsing-ends}

One more thing before we finish. A valid expression is not automatically one that belongs where it sits.

Look at line 36. The `adopt` step passes `$response.body#/id` as a parameter. Paste it into the playground at the top and it parses: it is a well-formed `ResponseExpression`. And it is still wrong. A parameter is read before the request is sent, so at that moment there is no response. What its author meant was the pet found by the previous step, `$steps.find-pet.outputs.petId`.

So why can't the parser catch it? Because the parser told us everything it can. The string is well formed, and it reads from a response. Whether a response expression belongs in a parameter is a rule about the document, not about the string. The same goes for whether `find-pet` is a step in this workflow, whether `petId` is one of its outputs, and whether `getPetById` is an operation in the petstore description.

Those questions need the whole document and the descriptions it names. They are **Arazzo document validation**, and they are what the [Validator]({{ '/validator/' | relative_url }}) is for. Parsing comes first, because it needs nothing but the string.

## Next steps {#next-steps}

- The script looks at step `outputs` only. A real document holds runtime expressions in many more places, on their own or embedded in a longer string with `{}`, a request body's `payload` above all. The full list is in the [FAQ](#faq) below, under "Where can runtime expressions appear in an Arazzo document?"
- The [runtime expression section]({{ '/docs/parser/#parse-runtime-expression' | relative_url }}) of the reference lists the options and the two errors `parseRuntimeExpression` can throw, neither of which is invalid syntax.
- When an expression fails somewhere you did not expect, pass `{ trace: true }` to `parseRuntimeExpression`. The result then carries a `trace`, and `trace.displayTrace()` is a line-by-line account of every rule the grammar tried.
- The positions the report uses are on every element of the typed tree, not only the expressions, along with end positions and offsets. See [Source maps]({{ '/docs/parser/#source-maps' | relative_url }}) in the parser reference.
- Something did not work as described? Say so in [Discussions](https://github.com/orgs/usearazzo/discussions).

<script src="{{ '/assets/js/tutorials/parse-arazzo-runtime-expressions.js' | relative_url }}" defer></script>

---
title: "@usearazzo/runner Is on npm. Here Is What It Took"
description: "The Runner was the point of UseArazzo from day one. Everything before it was groundwork. Here is the story, and what alpha honestly means."
date: 2026-10-26
image:
  path: /assets/images/blog/arazzo-runner-on-npm.png
  webp: /assets/images/blog/arazzo-runner-on-npm.webp
  width: 1200
  height: 630
  alt: "Five stacked rounded slabs on a dark green ground; the lower four are solid bright green, and the top one is a dark tile outlined in green holding three checked step markers joined by a line"
  caption: "A fifth layer on top. It runs what the other four read, resolve, and check."
---

The fifth package from the UseArazzo toolkit is on npm: [@usearazzo/runner](https://www.npmjs.com/package/@usearazzo/runner), as an alpha. It runs Arazzo workflows against live APIs, step by step.

```bash
npm install @usearazzo/runner
```

If you keep multi-step API flows in scripts, this one is for you. Log in, find a pet, order it, check the order: the Runner does that from a document instead of from code.

This package is different from the four before it. The Runner was the point from the very first day. Everything published before it was groundwork. So this post isn't about one package. It's about the road to it.

## Where did it start?

I keep building API tools. I spent years on Swagger Editor and Swagger UI, and on the OpenAPI specification itself. This summer, I started something new: a home for quality [Arazzo](https://spec.openapis.org/arazzo/latest.html) tooling.

The reason was a gap. A single API call is a solved problem. OpenAPI describes it, and every HTTP client can make it. Everything above that call isn't solved. Which endpoint comes first? What do you carry from one response into the next request? How do you know you're done? Today that lives in scripts, in tribal knowledge, and in agents winging it at runtime. I wrote about it in [API workflows are still improvised]({{ '/blog/api-workflows-are-still-improvised/' | relative_url }}).

Arazzo fixes that on paper. It writes the workflow down as a document: the steps, the data passed between them, and what counts as success. Tooling for it existed, but it was scattered. A validator in one project, execution in another, and nothing sharing an engine. So two tools could read the same document two different ways.

And a document on paper doesn't call an API. Something has to read it and make the calls. That something is a runner. So that was the goal: run an Arazzo workflow against a real API, the same way every time, and say what happened at each step.

## Why not start with the Runner?

Because a runner is the last thing you can build, not the first. It stands on everything else. If you set out to build your own, this is what it needs before it can send a single request:

- **Read the document,** every part of it, including the runtime expressions and conditions inside its strings.
- **Follow its references** into the OpenAPI documents it names, and into other Arazzo documents.
- **Know the document is valid.** A broken workflow shouldn't fail halfway through, with half its requests already sent.
- **Know what each version of Arazzo means.** 1.0.0, 1.0.1, and 1.1.0 don't say the same things.

Each of those became its own piece of work, and each one shipped on its own:

1. **The specification itself.** I [diffed every Arazzo release]({{ '/blog/arazzo-specification-evolution/' | relative_url }}) line by line, because a runner can't guess what changed. Where the specification was ambiguous, I filed it upstream. That's ten issues since July. They cover the runtime expression grammar, criterion semantics, and the JSON Schemas.
2. **The [parser]({{ '/blog/arazzo-parser-on-npm/' | relative_url }}),** in September. It reads a document and everything it points at. Writing its docs turned up five bugs.
3. **The [resolver]({{ '/blog/arazzo-resolver-on-npm/' | relative_url }}),** ten days later. It follows references. It took ten fixes in the layer underneath.
4. **The [validator]({{ '/blog/arazzo-validator-on-npm/' | relative_url }}),** in early October. It finds what's wrong with a document before a run does.
Along the way, the [CLI]({{ '/blog/arazzo-cli-on-npm/' | relative_url }}) shipped too, a week after the validator. It puts validation behind one command, for your terminal and your CI.

Notice the order. The Runner reads documents with the parser. It follows their references with the resolver. And it carries out the same Arazzo semantics the validator checks. When the two disagree about a document, that's a bug, not a difference of opinion.

Three months, 251 commits across the [UseArazzo organization](https://github.com/usearazzo) (not counting bots), five packages. The Runner is where all of it comes together.

## So what does it do?

Let me show you. Here is a workflow that logs in, finds an available pet, orders it, and checks the order. Start a local Petstore for it to call:

```bash
docker run --rm -p 8080:8080 swaggerapi/petstore3:1.0.28
```

Now load the workflow and run it:

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
  },
  executeOptions: { server: 'http://localhost:8080/api/v3' },
});

for (const step of result.steps) {
  const mark = step.successful ? '✓' : '✗';
  const time = `${Math.round(step.durationMs)} ms`;
  console.log(`${mark} ${step.stepId.padEnd(26)}${time.padStart(7)}`);
}
console.log(`\n${result.status} in ${Math.round(result.durationMs)} ms`);
```

```text
✓ loginUser                  681 ms
✓ findAvailablePets           13 ms
✓ placeOrder                  12 ms
✓ retrieveOrderedPetDetails    9 ms
✓ verifyOrderConfirmation      6 ms

completed in 726 ms
```

Five real requests, each judged by its step's success criteria. The `server` option sends them to your local Petstore.

Notice what came back. Not a pass or a fail, but a trace. Every step is there in run order: whether it passed, which action it picked, and how many attempts it took. When a step fails at two in the morning, the trace tells you which one, and why.

Real workflows aren't a straight line, and the Runner doesn't assume they are. A step can jump to another step, retry after a pause, or end the run early. A workflow can call another workflow, even one from a different Arazzo document. So the flow you'd otherwise script by hand stays in the document. The [API reference]({{ '/docs/runner/' | relative_url }}) covers all of it.

## What does alpha mean here?

It means exactly what it says. The Runner is young. I'm catching a lot of bugs, and the API is still changing. I'd rather tell you that up front.

How young? The first version went to npm on October 22, and there have been four releases so far. A few examples of what changed in them:

- **A bug only real responses showed.** Response headers containing a comma were split into a list. `$response.header.Date` came back as two values, so any criterion comparing it was wrong ([toolkit #259](https://github.com/usearazzo/arazzo-toolkit/pull/259)).
- **A bug only real OpenAPI documents showed.** A request body declared as `application/json; charset=utf-8` could not be sent at all ([toolkit #265](https://github.com/usearazzo/arazzo-toolkit/pull/265)).
- **A new API, three days in.** Running a workflow used to mean wiring four building blocks by hand. The `ArazzoRunner` facade does that for you now, so a run is a `load` and an `execute` ([toolkit #271](https://github.com/usearazzo/arazzo-toolkit/pull/271)). The code above uses it.

And there's more to find. Writing the reference already turned up the next issue ([toolkit #272](https://github.com/usearazzo/arazzo-toolkit/issues/272)). The building blocks under the `ArazzoRunner` facade may still change shape before 1.0. One gap is known. The Runner doesn't fill in `default` values from a workflow's inputs schema yet, so pass every input a step reads ([toolkit #97](https://github.com/usearazzo/arazzo-toolkit/issues/97)).

What doesn't change is how it's tested. Every change runs two real workflows, end to end, against a real Petstore over real HTTP. One of them is the official example from the Arazzo specification. A release can't go out without them passing.

**The feedback I want most:**

- Which workflow did it run differently than you expected?
- Where did you have to read the trace twice to understand what happened?

[Discussions](https://github.com/orgs/usearazzo/discussions) is the place, and the [monorepo](https://github.com/usearazzo/arazzo-toolkit) is where the issues go.

## Closing words

So there it is. Three months ago, nothing from UseArazzo was on npm. Now it reads, resolves, validates, and runs Arazzo workflows. Start with the [API reference]({{ '/docs/runner/' | relative_url }}), point the Runner at a workflow of your own, and tell me what broke.

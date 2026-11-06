---
title: "Four Arazzo Rules That Quietly Change How a Workflow Runs"
seo_title: "Arazzo Rules That Quietly Change How a Workflow Runs"
description: "Four Arazzo rules that are easy to miss, whether you write workflows or build the tools that run them: what each one says, how it goes wrong, and how to check."
date: 2026-11-06
image:
  path: /assets/images/blog/arazzo-rules-that-quietly-change-how-a-workflow-runs.png
  webp: /assets/images/blog/arazzo-rules-that-quietly-change-how-a-workflow-runs.webp
  width: 1200
  height: 630
  alt: "Four rounded step tiles on a dark green ground; after the second, a faint dashed path runs straight on to two empty outlined tiles, while a solid bright green path bends down to two checked tiles, the last one dark and outlined"
  caption: "Every step checked, and still not the path the document describes."
---

Here is a run that looks fine. The Arazzo Specification has a login-then-call example: one step logs in, and the next sends `Authorization: $steps.loginStep.outputs.sessionToken`. Until recently, the Arazzo Runner sent that second request without the header. The run still reported `completed` ([toolkit #279](https://github.com/usearazzo/arazzo-toolkit/pull/279)).

Nothing crashed. Nothing warned. A runner that fails is annoying. A runner that quietly does something the document didn't say is worse, because you believe it.

If you write Arazzo workflows, or build the tools that run them, this post was written for you.

The Runner from UseArazzo, open source tooling for Arazzo, went on npm on October 22. In the two weeks after, I went through the [Arazzo Specification](https://spec.openapis.org/arazzo/) rule by rule, looking for places where the Runner did something the document didn't say. Here are four of the rules I found, what each one means for your workflows, and how to check it.

## Does every parameter reach the request?

It has to. A step's parameters are, in the words of the [Step Object](https://spec.openapis.org/arazzo/v1.0.1.html#step-object), parameters "that MUST be passed to an operation or workflow". All three versions of Arazzo say so. None of them says "if the OpenAPI document declares them".

So why does a header go missing? OpenAPI 3 describes authentication with security schemes, not parameters. It even ignores an `Authorization` header declared as a parameter. A tool that builds each request strictly from the OpenAPI operation has nowhere to put that header, so it drops it. That's what the Runner did.

**What it means for you:** if a step sends a header the operation doesn't declare, check that it actually goes out. A request log or an echo server tells you in a minute.

It cuts the other way too. A parameter declared on the workflow reaches every step's request, not only the operations that declare it. So a parameter only some operations take belongs on those steps.

## Can a step opt out of the workflow's failure actions?

No. A workflow can declare `failureActions` (and `successActions`) for all of its steps. The [Workflow Object](https://spec.openapis.org/arazzo/v1.0.1.html#workflow-object) says, in all three versions:

> These failure actions can be overridden at the step level but cannot be removed there.

Here is a workflow where that matters:

```yaml
workflows:
  - workflowId: adoptPet
    failureActions:
      - name: stop
        type: end
    steps:
      - stepId: getPet
        operationId: getPetById
        successCriteria:
          - condition: $statusCode == 200
        onFailure:
          - name: refresh
            type: goto
            stepId: refreshToken
            criteria:
              - condition: $statusCode == 401
```

The step's own action comes first, then the workflow's. A 401 goes to `refreshToken`. A 500 doesn't match `refresh`, falls through to `stop`, and the run ends there.

The tempting reading is that a step with its own `onFailure` replaces the workflow's list. Then `stop` disappears for `getPet`, and `onFailure: []` switches off every default. The Runner read it that way until [toolkit #288](https://github.com/usearazzo/arazzo-toolkit/pull/288).

**What it means for you:**

- **Workflow failure actions are a floor.** An unconditional `end` on the workflow applies to every step, including steps with their own `onFailure`.
- **`onFailure: []` doesn't opt out.** It inherits everything.
- **To change an action for one step, reuse its name.** A step action named `stop` replaces the workflow's `stop`.

That last point had a catch. The spec never said what makes two actions "the same". For parameters it does: "A unique parameter is defined by the combination of a `name` and `in` fields." For actions there was no such sentence. The Runner matches on `name`, which is required and the only reading that makes both halves of the rule true.

A reading isn't a rule, though. So I filed the gap upstream ([OAI/Arazzo-Specification#619](https://github.com/OAI/Arazzo-Specification/issues/619)) and proposed the missing sentence the same day ([#620](https://github.com/OAI/Arazzo-Specification/pull/620)). It was merged a day later, for the Arazzo 1.1.1 patch release:

> A unique failure action is defined by its `name`.

Until 1.1.1 is out, another runner may still read it differently, so check how the runner you use matches them.

## Can a step pass without checking anything?

It can, if your runner is forgiving. Look at the first step here:

```yaml
steps:
  - stepId: getOrder
    description: Fetch the order.
    operationId: getOrder
    successCriteria:
      - $statusCode == 200
  - stepId: getStatus
    description: Fetch the order status.
    operationId: getOrderStatus
    successCriteria:
      - context: $statusCode
        condition: "^(2"
        type: regex
```

The check under `getOrder` reads fine. But it's a plain string. Arazzo wants a list of Criterion Objects, each with a `condition` field. A runner that skips entries it can't read passes the step with no check at all. The Runner did that until [toolkit #284](https://github.com/usearazzo/arazzo-toolkit/pull/284). Now it refuses to start the workflow, before a single request goes out.

**What it means for you:** validate before you run. The [CLI]({{ '/cli/' | relative_url }}) catches it, along with the regex under `getStatus`, which is missing its closing parenthesis:

```text
$ npx @usearazzo/cli validate checks.arazzo.yaml
checks.arazzo.yaml
  19:9-19:24   error  9050500  successCriteria must be an array of Criterion Objects
  26:24-26:29  error  9100102  Criterion "condition" must be a valid regular expression when type is "regex".

✖ 2 problems (2 errors)
```

## What happens when a check can't be evaluated?

This rule is the odd one out. Here the Runner wasn't too quiet. It was too loud.

The step fails. That's new in Arazzo 1.1.0, in [Evaluation Errors](https://spec.openapis.org/arazzo/v1.1.0.html#evaluation-errors). A condition that can't be evaluated, such as an invalid regex, "MUST evaluate to fail". Implementations should also report why. Arazzo 1.0.0 and 1.0.1 left this open, and the Runner used to abort the whole run. Now it applies the 1.1.0 rule to every version ([toolkit #301](https://github.com/usearazzo/arazzo-toolkit/pull/301)).

**What it means for you:** a broken regex or JSONPath doesn't crash the run. It fails the step, and the step's failure actions run. So if a step fails against a response that looks right, suspect the criterion before the API. The Runner records each criterion's outcome in the run's trace, with the reason it couldn't be evaluated ([toolkit #302](https://github.com/usearazzo/arazzo-toolkit/pull/302)). And the validation above would have caught it first.

## What did fixing this take?

Seventeen releases in fourteen days, from October 23 to November 5. Four of them came on November 4. Each release carried one change, and went out the day it was merged. The [changelog](https://github.com/usearazzo/arazzo-toolkit/blob/main/CHANGELOG.md) has one entry per release.

That pace is on purpose. When a release changes how your workflow runs, you know which rule changed, and you can pin the version before it.

The Validator and the Runner share one engine. So when they disagree about a document, that's a bug. One turned up along the way: the Validator rejected `in: querystring` in Arazzo 1.1.0 documents, while the Runner ran it ([toolkit #299](https://github.com/usearazzo/arazzo-toolkit/pull/299)).

And not every fix went into code. Where the spec itself was silent, the fix went upstream, like the action identity sentence above.

The Runner is still an alpha, and its API may change before 1.0.0. The next rules to land are the Arazzo 1.1.0 constructs it doesn't run yet.

## Closing words

So there it is. Four rules, and a checklist for your own workflows:

- Check that headers the operation doesn't declare actually go out.
- Workflow failure actions apply to every step. Override one by reusing its name.
- Every `successCriteria` entry needs a `condition`.
- A criterion that can't be evaluated fails the step. Validate before you run.

To run your own workflows by these rules, install the Runner:

```bash
npm install @usearazzo/runner
```

The [Runner page]({{ '/runner/' | relative_url }}) shows what it does, and the [API reference]({{ '/docs/runner/' | relative_url }}) covers [what steps inherit]({{ '/docs/runner/' | relative_url }}#inheritance) and [how runs fail]({{ '/docs/runner/' | relative_url }}#errors) in full. The source is in the [arazzo-toolkit monorepo](https://github.com/usearazzo/arazzo-toolkit). If a workflow of yours runs differently than its document says, tell me in [Discussions](https://github.com/orgs/usearazzo/discussions).

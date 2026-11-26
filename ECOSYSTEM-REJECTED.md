# Ecosystem: considered and not listed

Resources that were looked at for the Ecosystem page (`pages/ecosystem.html`) and left out, with
the reason. Check this file before a sweep so the same candidates are not proposed again. A
resource can come back when its reason no longer holds (a stale repository gets new work, a
blocked page becomes reachable); move it out of this file when it is listed.

Earlier sweeps (2026-09-17, 2026-10-02) left resources out without recording which; their
session transcripts were deleted by the 30-day cleanup. This file starts with the 2026-11-26
sweep.

Add a row whenever a sweep or a submission leaves a resource out: the URL and one sentence of
reason, with the date when it matters.

## Probably skipped by an earlier sweep

These existed at the 2026-10-02 sweep, are not listed, and have not changed since.

| Resource | Reason |
|---|---|
| https://github.com/mpenet/ezu | Arazzo support since 2026-07-06, so the October sweep likely saw it. A general OpenAPI CLI and MCP bridge; Arazzo is one feature. |
| https://github.com/xiaohuij/arazzo-engine-rs | Rust port of Jentic's engine, which is listed. Last commit 2026-02-23. |
| https://github.com/jentic-community/arazzo-engine-cookbook | Recipes for Jentic's engine. Last commit 2025-09-30. |
| https://github.com/david-leyendecker/arazzo-builder | MVP visual builder, last commit 2025-12-29. The October sweep listed randallcmark/arazzo-builder instead. |

## Rejected in the 2026-11-26 sweep

| Resource | Reason |
|---|---|
| https://dev.to/rodriveraai/stop-building-brittle-agent-workflows-2g1k | Vendor promotion for Jentic's Arazzo Generator and Runner (listed as tools), ending in a Hacktoberfest call; one sentence on Arazzo; its sample is not valid Arazzo (parameters without `in`, `$steps.search-flights.outputs.flightOptions[0].id`). His fuller Jentic blog post is listed. Dropped from PR #37 on the owner's call, 2026-11-26. |
| https://github.com/specmatic/specmatic-arazzo-multi-api-sample | Dropped from PR #37 on the owner's call, 2026-11-26: its README describes "Arazzo Specification V1.2", a version that does not exist. |
| https://zuplo.com/blog/api-workflows-and-arazzo | Dropped from PR #37 on the owner's call, 2026-11-26. Guest post by Hunter Skrasek that mainly introduces his PHP parser (hskrasek/arazzo-parser, listed); its sample uses `$response.body.data[0].id`, not a valid runtime expression. |
| https://github.com/qconn-io/arazzo-skills | Dropped from PR #37, 2026-11-26 (owner left it to Claude): one commit, made in a single day (2026-09-20). Can come back once it shows sustained work. |
| https://github.com/CrAyoN-V587/procedure-ci | Dropped from PR #37, 2026-11-26 (owner left it to Claude): 8 commits over two days (2026-08-30/31), nothing since; README in Chinese. Can come back once it shows sustained work. |
| https://github.com/makecph/pkl-arazzo | Dropped from PR #37, 2026-11-26 (owner left it to Claude): 7 commits in one day (2026-10-29), marked experimental. Can come back once it shows sustained work. |
| https://github.com/YOU54F/arazzo-viewer | Dropped from PR #37, 2026-11-26 (owner left it to Claude): 28 commits over two days (2026-10-06/07), nothing since, and no license, so it cannot be reused. Can come back once it shows sustained work. |
| https://weesholapara.medium.com/weave-api-workflow-using-arazzo-openapis-new-spec-b633858d49f3 | Returns 404 (checked by the owner in a browser, 2026-11-26). |
| https://medium.com/@ronilmehta_95850/what-is-the-arazzo-specification-4c1bcf66cb60 | Basic 2024 introduction whose sample has errors: `$steps.userLogin.outputs.authorizationToken` names the operationId instead of the step (`stepToLoginUser`), `$response.body.temperature` is not a valid runtime expression, and the password is sent as a query parameter. Read from the owner's browser paste, 2026-11-26. |
| https://nordicapis.com/sessions/beyond-the-agent-hype-why-arazzo-and-workflows-matter-for-predictable-ai/ | Session page for Frank Kilcommins's Platform Summit 2025 talk (15 Oct 2025); its recording (youtu.be/0GslqyrsVR8) is already listed under Videos. Read from the owner's browser paste, 2026-11-26. |
| https://www.youtube.com/watch?v=j6Iz99gdkjU | Copy of the OpenAPI Initiative Hangout already listed (ivuEnIQA59c), on Erik Wilde's channel. |
| https://philsturgeon.medium.com/introducing-arazzo-describe-api-workflows-with-this-extension-to-openapi-62f35e7ece5c | Same post as the listed bump.sh/blog/arazzo-describe-api-workflows-extension-openapi/. |
| https://www.youtube.com/shorts/_eKyhwDQ1ck | 32-second Zuplo clip. |
| https://www.youtube.com/watch?v=yvBk8rMd3_k | 43-second Polish clip (title misspells Arazzo). |
| https://www.youtube.com/watch?v=a2Bo--ZJRjw | 56-second promo; the plugin it shows is listed as a tool (github-copilot-arazzo). |
| https://github.com/flarcos/arazzo-sdk | TypeScript SDK generator for the Open Payments API only. |
| https://github.com/flarcos/arazzo | Open Payments workflows; overlaps the listed laxlab/open-payments-arazzo. |
| https://github.com/diegotorreslopez81/openpay-kit | Open Payments workflows at grant-proposal stage. |
| https://github.com/oai-php/arazzo | Empty (1 KB, README only). |
| https://github.com/seanchatmangpt/arazzo-ai | Mostly claims, little substance. |
| https://github.com/itpay-ai/api-to-arazzo | Agent skill for importing an API into one vendor's product. |
| https://github.com/HimethW/arazzo-mcp-gen | No README. |
| https://github.com/tmcheung/arazzo-tools | Small 2024 collection, last commit 2024-11-30. |
| https://github.com/jordanwalsh23/arazzo-spectral-rules | 2024 Spectral rules, superseded by Spectral's built-in Arazzo ruleset (listed). |
| https://github.com/BillyRuffian/arazzo | Ruby parser with no README. |
| https://github.com/Pakisan/arazzo-idea-plugin | Source of the JetBrains plugin, which is listed by its Marketplace page. |
| https://github.com/connEthics/arazzo-demo | Source of the Arazzo Playground, which is listed (arazzo.connethics.com). |
| https://github.com/la-rebelion/be-hapi | Installer for HAPI MCP, which is listed. |
| https://github.com/workflows-guru/awesome-arazzo | An aggregator; credited in the curation note instead of listed. |


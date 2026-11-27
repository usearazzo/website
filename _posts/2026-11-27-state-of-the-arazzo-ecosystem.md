---
title: "The State of the Arazzo Ecosystem, Three Months In"
description: "The Arazzo Ecosystem page grew from 55 entries to 198 in three months. Here is what the list says about tools, Arazzo 1.1, and what is still missing."
date: 2026-11-27
image:
  path: /assets/images/blog/state-of-the-arazzo-ecosystem.png
  webp: /assets/images/blog/state-of-the-arazzo-ecosystem.webp
  width: 1200
  height: 630
  alt: "A row of stylized green plants on a dark green ground, grown tall and crowded, with one bare patch of soil marked by a dashed outline where nothing grows yet"
  caption: "Three months of growth, and one patch still bare."
---

In August I went looking for everything that exists around Arazzo, and [wrote down what I found]({{ '/blog/arazzo-ecosystem/' | relative_url }}). The notes became the **[Arazzo Ecosystem]({{ '/ecosystem/' | relative_url }})** page. It listed 55 entries on its first day.

That post named two things I found little of. One was Arazzo documents published by API providers for their own APIs. The other was anything on Arazzo 1.1, which had shipped in May.

Three months later the page listed 198 entries. So I went through all of them again, one by one, to see what the list says now. Did the two gaps close?

If you are deciding whether Arazzo is worth your time, or you build an Arazzo tool yourself, this post was written for you.

## How big is the list now?

Here are the two counts side by side:

| Section | 22 August | 27 November |
|---|---|---|
| Spec | 11 | 12 |
| Tools | 24 | 67 |
| Articles | 11 | 66 |
| Videos | 4 | 35 |
| Examples | 2 | 12 |
| Other | 3 | 6 |
| **Total** | **55** | **198** |

It's important to realize what this growth is. Most of these entries did not appear in the last three months. They were already out there, and the list caught up with them. Take the articles: only nine of the 66 carry a date after August. For the tools, about half of the repositories are older than this year.

The catching up came from three directions. People submitted their own work: Bruno Pedro sent five resources in the first week, Adrian Escutia added HAPI MCP, and Sergey Vilgelm walked me through ROAS. I ran three sweeps of GitHub, YouTube, and the web. And some things were simply new.

## Who is building the tools?

More people than I expected, and most of them quietly. One GitHub search for "arazzo" in September turned up 26 repositories that were not on the page. Nobody had announced them.

The 67 tool entries come from 49 different makers. I looked at every one that lives in a public GitHub repository, 45 repositories in total.

**What the repositories say:**

- **They are young.** 22 of the 45 were created this year, and 11 more in 2025.
- **They are spread across languages.** Twelve of them: TypeScript, JavaScript, Go, Java, Python, Rust, PHP, Ruby, Swift, C#, Elixir, and shell.
- **Many are one person's work.** 20 of the 45 sit under a personal account, not an organization.
- **Most are alive.** 27 had a commit in the last three months. 13 have not been touched for six months or more.

The largest group on the page is "Run & test", with 21 entries. In August it had six. Today there are tools that run or test workflows in Python, Go, Rust, Java, PHP, TypeScript, and Elixir.

Notice what that means if you are choosing a tool. You no longer pick the one runner that exists. You pick the one in your language, and then you check the date of its last commit.

## Does anything support Arazzo 1.1 yet?

Yes. In August I had found nothing.

Arazzo 1.1 added AsyncAPI support, so one workflow can mix HTTP calls and messages. I read the README of every tool repository and looked for a statement about versions.

Thirteen tool entries say they handle 1.1. Two of the thirteen are my own libraries, [Arazzo Criterion](https://github.com/swaggerexpert/arazzo-criterion) and [Arazzo Runtime Expression](https://github.com/swaggerexpert/arazzo-runtime-expression), so count eleven from other people: linters, runners, and libraries in Go, Rust, PHP, TypeScript, Elixir, Swift, and .NET. One of them says "partial" and publishes a matrix of what is missing. I liked that a lot.

A few say the opposite, just as clearly. One runner states that it supports 1.0 and rejects a 1.1 document. That's a good answer too.

But here is the catch. Most READMEs say nothing about versions at all. You have to try the tool with a 1.1 document to find out.

So if you maintain an Arazzo tool, here is the cheapest improvement I can suggest: write the Arazzo versions you support in the first screen of your README. One line is enough.

## Who is writing and talking about it?

One theme keeps coming back: AI agents. By my notes, 18 of the 66 articles and 13 of the 35 videos are about agents or MCP. The usual argument is this: an agent that has to guess the order of API calls gets it wrong, and a workflow document tells it the order.

And who is doing the writing? The 66 articles come from 35 different authors and publishers, and Kin Lane alone wrote 18 of them. The 35 videos are conference talks, vendor screencasts, and Erik Wilde's series. There is even an hour-long introduction in Spanish.

## What is still missing?

The provider gap from August did not close.

The Examples section went from 2 entries to 12. That looks like growth. Well, look at who published them. They are demos from tool vendors, samples from the people who design the specification, and large collections that third parties wrote for other companies' APIs.

As far as I can tell, not one of them is an API provider describing the workflows of its own API. The people who know best how their API is meant to be used are not publishing that knowledge as Arazzo yet.

That is the entry I'd most like to add. If your company publishes an OpenAPI description, one Arazzo document next to it for your most common flow would be the first of its kind on the page.

## What didn't make it?

A list that only grows stops being useful. So here is the other side.

**Some candidates were left out.** The November sweep added 18 resources and left out 29. The curation policy is still three short rules: about Arazzo, reachable at a stable URL, not a duplicate. About half of the 29 were duplicates, clips shorter than a minute, or repositories with a day or two of commits. Three were articles whose sample document is not valid Arazzo. One described a version of the specification that does not exist.

I read every article in full before listing it. A tutorial with a broken runtime expression teaches the mistake to everyone who copies it.

**Some entries died.** While writing this post, I checked every link on the page. Three tool repositories listed in September now return a 404. A fourth entry, an example repository, was emptied on November 1. I took all four off the page, so the count today is 194.

## Closing words

So that's the state of it. Three months ago the 1.1 gap looked wide open. Today it's closing. The provider gap is still there.

The rules of the page have not changed since day one: any vendor is welcome, and nothing is ranked.

If you have built, written, or recorded something about Arazzo and it's not on the page, [submit it](https://github.com/usearazzo/website/issues/new?template=submit-a-resource.yml). The form takes a minute. If something listed is wrong or gone, tell me that too.

**[See the Arazzo Ecosystem page]({{ '/ecosystem/' | relative_url }})**

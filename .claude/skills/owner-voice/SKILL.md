---
name: owner-voice
description: >-
  Write or rewrite UseArazzo site prose in the owner's (Vladimír Gorej's) own
  voice, distilled from his vladimirgorej.com blog posts from 2022 and
  earlier: walking beside the reader ("Let me show you"), a real origin
  story, question headings, "Well," bridges, short plain sentences, first
  person in blog posts but never in guides or tutorials. Use this whenever
  writing, drafting, or revising a blog post (_posts/), a guide (_guides/),
  or a tutorial (_tutorials/), or any longer prose for the site, even when
  the user does not mention voice or style; also when the user says "in my voice", "sounds like me", "make it
  read like my blog", or asks to redo a draft that reads clipped,
  impersonal, or like marketing copy. Pairs with content-strategy and
  developer-marketing, which decide what to write; this skill decides how
  it sounds.
---

# Owner voice

How Vladimír Gorej writes, for anyone drafting prose for this site in his voice. The source is his
own blog, [vladimirgorej.com/blog](https://vladimirgorej.com/blog/), posts from 2022 and earlier
(2017 to 2022). Before drafting anything long, read one or two of the models listed at the end.

Drafts are drafts. The owner rewrites what ships. These rules make a draft need less of that.

## How to use this

1. Read the models that fit the piece (a launch post, a how-to, a problem-and-fix piece).
2. Draft with the rules below. Keep facts sourced: code, issues, PRs, real runs.
3. Check before handing over: no em or en dashes, average sentence around 12 words, no invented
   experiences or opinions. Flag any sentence that puts an opinion in his mouth he has not stated,
   so he can keep or cut it.

## The stance

- **Walk beside the reader.** He writes as someone sitting next to you at the keyboard, not as a
  manual. "Again, let me show you some code." "Let's try to automate the workflow described above."
  "Now let's..."
- **Start from a real situation.** His best posts open with where the problem came from, often his
  own history: "A couple of years ago, I worked with Ubiquiti Inc. ... Today I'd immediately think
  about how to automate this workflow." Never invent an experience he did not have; use the ones
  on the record (his posts, his projects, the issues and PRs in the toolkit).
- **Say who it is for.** "If you're one of the people who write OpenAPI definition by hand in
  Swagger Editor, this article was written just for you."
- **Problem, then the fix, then its limit.** Show the simple version, point at what breaks ("We can
  see that there is an obvious problem."), fix it, then ask what still breaks ("This resolver
  solution obviously wouldn't scale. What if...?").
- **Honest about effort and history.** "The implementation wasn't that straightforward as I
  expected, but I still managed to..." "I did my homework." Admits what he did not know then.

## Sentences

- Short and plain. One idea per sentence. Lists for parallel items.
- Contractions are fine and natural: it's, I'd, we'll, don't, wasn't.
- Openers: "Well,", "OK,", "Now,", "But", "So". "Now, what if we introduce more arguments to our func?"
- Questions as bridges, then the answer: "What is happening here?", "So what do we do?". One per section at most; the chattiest ("Sounds pretty easy, right?")
  sparingly, at most once a post.
- Points at the material: "Notice how...", "As you can see", "It's important to realize that...".
- One short line hands over to code or output: "Here is the simplest possible example of memoization:", "Let's see
  some code now."
- A plain verdict after code: "Here, there it is. Quite simple."
- Idioms in moderation: "has one remaining trick up its sleeve", "gets really handy".
- **Bold** for the key term or the coined name of an idea ("**Dirty Containers**", "**heavy
  lifting**").

## Structure

- Question headings: "What is currying?", "How do I use it?", "Why Apache 2.0 license?", "What are
  the future plans?".
- "A word on X" for a short aside section ("A word on development dependencies").
- Bold labelled lists: "**My search criteria were:**".
- A launch post follows [Ramda Adjunct](https://vladimirgorej.com/blog/ramda-adjunct/): a short origin story, what it is, how to use
  it, what is next.
- Close with a section that wraps up and nudges: "Closing words", "So there it is", "So that's
  about it", "Sounds pretty easy, right?", and point at where to go next.

## Person

- **Blog posts:** first person singular, with opinions. "I immediately became a massive fan."
  "To tell you the truth, I immediately liked it better." "We" for the team.
- **Guides, tutorials, reference:** no "I" at all. "You", "we", "let's". A lone "I" on a page
  written as "you and we" sticks out, and the byline already says who wrote it.

## Leave out

- Emoticons (";]") and "IMHO" on this site, even in posts.
- Em dashes and en dashes, everywhere (site rule, see CLAUDE.md). Use a colon, comma, parentheses,
  or a new sentence.
- Marketing language: "powerful", "seamless", "blazing fast", "game-changer". He states what a
  thing does and lets the reader judge.
- Claims nobody can source. Every fact in a post comes from the code, an issue, a PR, or a real run.

## Models to read first

On his blog (read them online; fetch the page to get the text):

- [Ramda Adjunct](https://vladimirgorej.com/blog/ramda-adjunct/) (2017): launch post shape (origin, criteria list, future plans).
- [Function currying with default params in JavaScript](https://vladimirgorej.com/blog/function-currying-with-default-params-in-javascript/)
  (2017): question headings, "Well,".
- [How to validate OpenAPI definitions in Swagger Editor using GitHub Actions](https://vladimirgorej.com/blog/how-to-validate-openapi-definitions-in-swagger-editor-using-github-actions/)
  (2021): personal origin story, technical design, then usage.
- [Advanced memoization for JavaScript functions with lodash.memoize](https://vladimirgorej.com/blog/advanced-memoization-for-javascript-functions-with-lodash-memoize/)
  (2022): simple example, the obvious problem, the fix, its limit, the better fix.
- [How to apply Apache 2.0 license to your open source software project](https://vladimirgorej.com/blog/how-to-apply-apache2-license-to-your-open-source-software-project/)
  (2021): "Closing words" ending.

Do not use this site's own posts as voice models: several were drafted by AI and are the owner's to
rewrite.

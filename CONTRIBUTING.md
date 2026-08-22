# Contributing to the Arazzo Ecosystem registry

The [Arazzo Ecosystem](https://usearazzo.com/ecosystem/) page is a hand-edited registry of external
Arazzo resources. It is one file: `pages/ecosystem.html`.

Two ways to submit:

- **Easiest**: [open a resource issue](https://github.com/usearazzo/website/issues/new?template=submit-a-resource.yml)
  with the URL and a few details; a maintainer ports it to the page.
- **Pull request**: add the entry yourself as a one-block PR, as described below.

## How to add a resource

1. Open `pages/ecosystem.html` and find the right section: Articles, Videos, Tools (pick the
   right group), Spec, Examples, or Other.
2. Copy this snippet into that section's `<ul class="ecosystem-list">`. When unsure where, put
   it at the top; the maintainers order lists editorially and may move entries around:

```html
        <li>
          <a href="https://example.com/the-resource" target="_blank" rel="noopener noreferrer">Title of the resource</a>
          <small>Author or Org &middot; Aug 2026</small>
          <span class="note">Optional one-line note on why it is worth a reader's time.</span>
        </li>
```

3. `<small>` carries the author or organisation and, for dated content, a `&middot;` plus the
   month of publication as `Mon YYYY`. For living resources with no publication date (a
   repository, a product, a Slack channel), just the author or organisation. When crediting
   both a person and their organisation, write the person first, joined by a comma:
   `Jane Doe, Acme Inc.`
4. Drop the `<span class="note">` line if you have nothing to say.
5. Match the surrounding indentation so the diff stays one clean block.
6. For a YouTube video, add an embedded player as the last line inside the `<li>`, using the
   privacy-enhanced domain and the video's id:

```html
          <iframe class="ecosystem-video" src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Video title" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
```

7. For a visual resource (an infographic, a poster), you may add a thumbnail as the last line
   inside the `<li>`. Host a reduced copy under `assets/images/ecosystem/` (do not hotlink). It renders as
   a cropped teaser at the top of the card and links to the same URL as the title (the wrapper is
   hidden from screen readers and tab order so the link is not announced twice):

```html
          <a class="ecosystem-thumb-link" href="https://example.com/the-resource" target="_blank" rel="noopener noreferrer" aria-hidden="true" tabindex="-1"><img class="ecosystem-thumb" src="{{ '/assets/images/ecosystem/the-thumbnail.jpg' | relative_url }}" alt="" width="800" height="1127" loading="lazy"></a>
```

### Not sure where it goes?

The sections are broader than their names: podcasts and slide decks count as Videos, books and
courses read like long Articles, playgrounds and sandboxes are Tools, community links (Slack,
SIG) live in the Spec section's Participation group. If it truly fits nowhere, put it in Other
and say so in the PR. Other is a staging area, not a junk drawer: maintainers may re-file
entries into a proper section later, and a cluster forming inside Other is the signal to promote
it into a section of its own.

## Acceptance bar

Any vendor is welcome and listing is free. A resource is accepted when it:

1. is about Arazzo (on-topic),
2. is reachable at a stable URL, and
3. is not a duplicate of something already listed.

UseArazzo's own tools and content are not listed here; they have the rest of the site.

## Previewing locally

```bash
bundle exec jekyll serve
```

Then open `http://localhost:4000/ecosystem/`.

## Housekeeping (maintainers)

- Bump the "Last reviewed" date in the page header after checking the lists over.
- Site copy contains no em dashes or en dashes; keep new notes free of them too.

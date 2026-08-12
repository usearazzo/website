<div align="center">
    <h1>UseArazzo Website</h1>
</div>

Source code for the [UseArazzo website](https://usearazzo.com/): run Arazzo workflows, and see what happened at each step.

## Products

- **[CLI](https://usearazzo.com/cli/)**: one command-line interface across the toolchain: validate and run workflows on your machine and in CI (in development)
- **[Validator](https://usearazzo.com/validator/)**: `@usearazzo/validator`, semantic validation and linting for Arazzo documents (in development)
- **[Runner](https://usearazzo.com/runner/)**: `@usearazzo/runner`, step-by-step execution of Arazzo workflows against live APIs (in development)

All packages are pre-1.0 and none is published to npm yet.

Source: [usearazzo/arazzo-toolkit](https://github.com/usearazzo/arazzo-toolkit)

## Development

```bash
bundle install
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000/`.

## Tech Stack

- [Jekyll](https://jekyllrb.com/) static site generator
- [Tailwind CSS](https://tailwindcss.com/) via CDN
- [Prism.js](https://prismjs.com/) for syntax highlighting
- Hosted on [GitHub Pages](https://pages.github.com/)

## License

[Apache 2.0](LICENSE)

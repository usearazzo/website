// Tailwind runs on its default config: the brand colour utilities live in assets/css/main.css.
// Regenerate assets/css/tailwind.css whenever a page gains a Tailwind class it does not have yet:
//   npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i _tailwind/input.css -o assets/css/tailwind.css --minify
// CI (.github/workflows/tailwind.yml) fails when the committed file is stale.
module.exports = {
  content: [
    './pages/**/*.html',
    './_layouts/**/*.html',
    './_includes/**/*.html',
    './_posts/**/*.md',
    './_guides/**/*.md',
    './_tutorials/**/*.md',
    './_reference/**/*.md',
    './assets/js/**/*.js',
  ],
};

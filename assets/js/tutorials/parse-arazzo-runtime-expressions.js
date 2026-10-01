/*
 * "The end result" micro-app on /docs/tutorials/parse-arazzo-runtime-expressions/.
 *
 * The panel starts out showing the syntax tree of the sample expression (static
 * HTML). Submitting an expression loads the parser's browser build from a CDN
 * (once; URL and integrity hash are data attributes on the form), parses it with
 * parseRuntimeExpression, and redraws the panel: the tree when it parses, the
 * caret when it does not. The tree markup is the site's tree-figure markup
 * (assets/css/ast-tree.css), built generically from the AST: one node per object,
 * one leaf per scalar field.
 */
(() => {
  const form = document.getElementById('rex-demo');
  if (!form) return;

  const input = form.querySelector('#rex-demo-input');
  const button = form.querySelector('#rex-demo-run');
  const status = form.querySelector('#rex-demo-status');
  const statusText = form.querySelector('#rex-demo-status-text');
  const errorBox = form.querySelector('#rex-demo-error');
  const result = form.querySelector('#rex-demo-result');

  const TIMEOUT_MS = 60000;
  // A cached script and a short string parse in a few milliseconds; hold the
  // status line at least this long so it reads as a state, not a flicker.
  const MIN_STATUS_MS = 700;

  /* ---- loading ---------------------------------------------------------- */

  let loader = null;

  function loadParser() {
    if (window.arazzoParser) return Promise.resolve();
    if (!loader) {
      loader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = form.dataset.parserSrc;
        script.integrity = form.dataset.parserIntegrity;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => {
          loader = null;
          script.remove();
          reject(new Error(`Could not load the parser from ${new URL(script.src).host}. Check your connection and try again.`));
        };
        document.head.appendChild(script);
      });
    }
    return loader;
  }

  function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /* ---- drawing ---------------------------------------------------------- */

  const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isNode = (value) => value !== null && typeof value === 'object';
  const classFor = (type) => (/Pointer|Token/.test(type) ? 'ast-ptr' : 'ast-rex');

  function item(cls, label, body, children = '') {
    return `<li><span class="ast-node ${cls}"><small>${escape(label)}</small>${escape(body)}</span>${children ? `<ul>${children}</ul>` : ''}</li>`;
  }

  // One list item per AST node. Its label is the node's type and its body is the
  // node's `value` when it has one, else the field it hangs from. Scalar fields
  // become leaves labelled with the field name.
  function draw(node, body) {
    let children = '';
    for (const [field, value] of Object.entries(node)) {
      if (field === 'type' || (field === 'value' && value === body)) continue;
      if (Array.isArray(value)) children += value.map((entry) => draw(entry, entry.value ?? field)).join('');
      else if (isNode(value)) children += draw(value, value.value ?? field);
      else children += item(classFor(node.type), field, value);
    }
    return item(classFor(node.type), node.type, body, children);
  }

  function figure(expression, label, inner, strip, keys) {
    return `<figure class="ast" aria-label="${escape(label)}"><p class="ast-source">${escape(expression)}</p>${inner}${strip}<figcaption>${keys}</figcaption></figure>`;
  }

  function renderValid(expression, tree) {
    const prefix = (expression.match(/^\$[A-Za-z]+/) || [expression])[0];
    const inner = `<div class="ast-scroll"><ul class="ast-tree">${draw(tree, prefix)}</ul></div>`;
    const strip = '<p class="ast-problems"><b class="ast-ok">result.success</b>true</p>';
    const pointer = /Pointer/.test(JSON.stringify(tree)) ? '<span class="ast-key ast-ptr">JSON Pointer</span>' : '';
    return figure(expression, `Syntax tree of ${expression}`, inner, strip, `<span class="ast-key ast-rex">runtime expression node</span>${pointer}`);
  }

  function renderInvalid(expression, parsed) {
    const offset = parsed.result.maxMatched;
    const inner = `<div class="ast-scroll"><pre class="rex-demo-caret">${escape(expression)}\n${' '.repeat(offset)}^</pre></div>`;
    // No "expected" line: trace.inferExpectations() abbreviates terminals and lists
    // ones from before the failure offset (swaggerexpert/arazzo-runtime-expression#192).
    // Add it back once that is fixed upstream.
    const strip = `<p class="ast-problems"><b>invalid</b>does not parse from offset ${offset}<span>result.maxMatched: ${offset}</span></p>`;
    return figure(expression, `${expression} does not parse from offset ${offset}`, inner, strip, '<span class="ast-key ast-gone">the grammar stopped here</span>');
  }

  /* ---- running ---------------------------------------------------------- */

  function setStatus(text) {
    statusText.textContent = text;
    status.hidden = false;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  let current = 0;

  async function run() {
    const expression = input.value.trim();
    const token = ++current;
    errorBox.hidden = true;
    if (/^\{.*\}$/.test(expression)) {
      showError(`Pass the expression bare, without the braces that embed it in a string: ${expression.slice(1, -1)}`);
      return;
    }
    button.disabled = true;
    const started = Date.now();
    try {
      setStatus('Loading the parser');
      await withTimeout(loadParser(), TIMEOUT_MS, 'Loading the parser took more than a minute. Try again.');
      setStatus('Parsing');
      const parsed = window.arazzoParser.parseRuntimeExpression(expression);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, MIN_STATUS_MS - (Date.now() - started))));
      if (token !== current) return;
      result.innerHTML = parsed.result.success ? renderValid(expression, parsed.tree) : renderInvalid(expression, parsed);
    } catch (error) {
      if (token === current) showError(error.message);
    } finally {
      if (token === current) {
        status.hidden = true;
        button.disabled = false;
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  form.querySelectorAll('[data-rex-demo-expression]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      input.value = link.dataset.rexDemoExpression;
      run();
    });
  });
})();

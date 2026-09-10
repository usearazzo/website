/*
 * "The end result" micro-app on /docs/tutorials/list-arazzo-workflow-dependencies/.
 *
 * The panel starts out showing the script's output for the sample files (static
 * HTML). Submitting a URL loads the parser's browser build and Mermaid from a CDN
 * (once; URLs and integrity hashes are data attributes on the form), runs the same
 * walk as inventory.mjs, and replaces the three tabs with the live result.
 * Keep the walk in step with assets/tutorials/list-arazzo-workflow-dependencies/inventory.mjs.
 */
(() => {
  const form = document.getElementById('dep-demo');
  if (!form) return;

  const urlInput = form.querySelector('#dep-demo-url');
  const button = form.querySelector('#dep-demo-run');
  const status = form.querySelector('#dep-demo-status');
  const statusText = form.querySelector('#dep-demo-status-text');
  const errorBox = form.querySelector('#dep-demo-error');
  const graph = form.querySelector('#dep-demo-graph');
  const source = form.querySelector('#dep-demo-source');
  const problemsList = form.querySelector('#dep-demo-problems-list');
  const problemsCount = form.querySelector('#dep-demo-problems-count');
  const tabs = Array.from(form.querySelectorAll('[role="tab"]'));

  const TIMEOUT_MS = 60000;
  // Cached scripts and a small document finish in tens of milliseconds; hold the
  // status line at least this long so it reads as a state, not a flicker.
  const MIN_STATUS_MS = 700;

  // The sample URL is written root-relative so it always shares the page's origin
  // (localhost, 127.0.0.1, production). It travels in a data attribute rather than
  // `value`, because a relative string is not valid HTML in a type="url" input;
  // make it absolute here and prefill the field.
  const absolute = (value) => {
    try {
      return new URL(value, window.location.href).href;
    } catch {
      return value;
    }
  };
  urlInput.value = absolute(urlInput.dataset.depDemoSample || urlInput.value);
  form.querySelectorAll('[data-dep-demo-url]').forEach((link) => {
    link.dataset.depDemoUrl = absolute(link.dataset.depDemoUrl);
  });

  /* ---- tabs ------------------------------------------------------------- */

  function selectTab(tab) {
    tabs.forEach((other) => {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = tabs[(index + step + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
  selectTab(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);

  /* ---- loading ---------------------------------------------------------- */

  const loading = new Map();

  function loadScript(src, integrity, label) {
    if (!loading.has(src)) {
      loading.set(src, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (integrity) {
          script.integrity = integrity;
          script.crossOrigin = 'anonymous';
        }
        script.onload = () => resolve();
        script.onerror = () => {
          loading.delete(src);
          script.remove();
          reject(new Error(`Could not load ${label} from ${new URL(src).host}. Check your connection and try again.`));
        };
        document.head.appendChild(script);
      }));
    }
    return loading.get(src);
  }

  function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /* ---- the walk, ported from inventory.mjs ------------------------------ */

  // apidom-core's toValue: elements unwrap, primitives (retrievalURI is a plain string) pass through
  const toValue = (element) => (typeof element?.toValue === 'function' ? element.toValue() : element);

  function describe(api) {
    if (api.element === 'arazzoSpecification1') return `Arazzo ${toValue(api.arazzo)}`;
    if (api.element === 'swagger') return `OpenAPI ${toValue(api.swagger)}`;
    return `OpenAPI ${toValue(api.openapi)}`;
  }

  function fileName(parseResult) {
    const uri = toValue(parseResult.meta.get('retrievalURI'));
    try {
      return new URL(uri).pathname.split('/').filter(Boolean).pop() || uri;
    } catch {
      return uri;
    }
  }

  function inventory(parseResult) {
    const ids = new Map();
    const lines = ['graph LR'];
    const problems = [];

    function idFor(result) {
      if (!ids.has(result)) ids.set(result, `d${ids.size + 1}`);
      return ids.get(result);
    }

    function walk(result) {
      const from = idFor(result);
      const sourceDescriptions = result.api.sourceDescriptions ?? [];

      for (let i = 0; i < sourceDescriptions.length; i += 1) {
        const sourceDescription = sourceDescriptions.get(i);
        const nested = sourceDescription.meta.get('parseResult');
        const name = toValue(sourceDescription.name);
        const seen = ids.has(nested);
        const to = idFor(nested);

        if (nested.api) {
          if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>${describe(nested.api)}"]`);
          lines.push(`  ${from} -->|${name}| ${to}`);
        } else {
          if (!seen) lines.push(`  ${to}["${fileName(nested)}<br/>not parsed"]:::missing`);
          lines.push(`  ${from} -.->|${name}| ${to}`);
        }

        nested.errors.forEach((annotation) => problems.push(`${name}: ${toValue(annotation)}`));
        nested.warnings.forEach((annotation) => problems.push(`${name}: warning: ${toValue(annotation)}`));

        if (nested.api && !seen) walk(nested);
      }
    }

    lines.push(`  ${idFor(parseResult)}["${fileName(parseResult)}<br/>${describe(parseResult.api)}"]`);
    walk(parseResult);
    lines.push('  classDef missing stroke-dasharray: 6 4');

    return { text: lines.join('\n'), problems };
  }

  /* ---- rendering -------------------------------------------------------- */

  let mermaidReady = false;

  function initMermaid() {
    if (mermaidReady) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: {
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: '14px',
        primaryColor: '#F0F5E7',
        primaryBorderColor: '#3A6B1F',
        primaryTextColor: '#17210D',
        lineColor: '#6B7280',
        edgeLabelBackground: '#FFFFFF',
      },
    });
    mermaidReady = true;
  }

  function setStatus(text) {
    if (text) {
      statusText.textContent = text;
      status.hidden = false;
    } else {
      status.hidden = true;
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function messageFor(error) {
    const parser = window.arazzoParser;
    if (parser && error instanceof parser.ParseError) {
      // The parser wraps what went wrong in a cause chain; the deepest cause is the reason.
      let cause = error;
      while (cause.cause) cause = cause.cause;
      const reason = cause === error ? '' : String(cause.message || '').replace(/\.$/, '');
      if (/network error|failed to fetch/i.test(reason)) {
        return `${error.message}. The browser could not fetch it. Usually that means the server does not allow cross-origin requests (CORS); raw GitHub URLs do.`;
      }
      return reason ? `${error.message}. ${reason}.` : error.message;
    }
    return error && error.message ? error.message : String(error);
  }

  /* ---- the run ---------------------------------------------------------- */

  let runCount = 0;

  async function run() {
    let url;
    try {
      url = new URL(urlInput.value.trim(), window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('not http');
    } catch {
      showError('Enter a full URL starting with http:// or https://.');
      urlInput.focus();
      return;
    }

    runCount += 1;
    const current = runCount;
    button.disabled = true;
    errorBox.hidden = true;
    const startedAt = Date.now();

    try {
      setStatus('Loading the parser (about 400 KB, once)');
      await loadScript(form.dataset.parserSrc, form.dataset.parserIntegrity, 'the parser');

      setStatus('Loading Mermaid (about 1 MB, once)');
      await loadScript(form.dataset.mermaidSrc, form.dataset.mermaidIntegrity, 'Mermaid');

      setStatus(`Fetching and parsing ${url.href} and every document it names`);
      const parseResult = await withTimeout(
        window.arazzoParser.parseArazzo(url.href, {
          parse: { parserOpts: { sourceDescriptions: true } },
        }),
        TIMEOUT_MS,
        'Gave up after 60 seconds. The document, or one of the documents it names, is not answering.',
      );
      if (current !== runCount) return;

      const { text, problems } = inventory(parseResult);

      setStatus('Drawing the graph');
      initMermaid();
      const { svg } = await window.mermaid.render(`dep-demo-svg-${current}`, text);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, MIN_STATUS_MS - (Date.now() - startedAt))));
      if (current !== runCount) return;

      graph.innerHTML = svg;
      source.textContent = text;
      problemsList.textContent = problems.length ? problems.join('\n') : '(nothing)';
      problemsCount.textContent = problems.length ? String(problems.length) : '';
      problemsCount.hidden = problems.length === 0;
    } catch (error) {
      if (current === runCount) showError(messageFor(error));
    } finally {
      if (current === runCount) {
        setStatus(null);
        button.disabled = false;
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  form.querySelectorAll('[data-dep-demo-url]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      urlInput.value = link.dataset.depDemoUrl;
      run();
    });
  });
})();

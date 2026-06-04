export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: string;
  content: string; // Raw HTML content
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'web-workers-complete-guide-2026',
    title: 'Web Workers in 2026: Offload Heavy Work, Keep Your UI Responsive',
    description:
      'Web Workers run JavaScript in background threads so your UI never freezes. Dedicated workers, SharedWorkers, transferables for zero-copy performance, ESM module workers, OffscreenCanvas, and the Comlink RPC pattern — a complete guide to threading on the web.',
    date: '2026-06-04',
    author: 'DevBench',
    tags: ['JavaScript', 'Web Workers', 'Performance', 'Browser APIs', 'Multi-threading', 'SharedWorker', 'OffscreenCanvas', 'TypeScript', '2026'],
    readingTime: '8 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    Every JavaScript developer has hit this: you parse a 50MB JSON file, process a large dataset,
    or compress an image, and the <strong>entire page freezes</strong>. Buttons stop working.
    Animations stutter. Scroll janks. The fix isn't <code>setTimeout</code> or
    <code>requestAnimationFrame</code> — it's <strong>Web Workers</strong>: actual OS-level
    threads that run JavaScript in parallel with the main thread.
  </p>

  <h2>Web Workers 101</h2>

  <p>
    A Web Worker is a JavaScript file that runs on a separate thread. It has its own global scope
    (<code>self</code>), its own event loop, and <strong>no access to the DOM</strong>.
    Communication happens via <code>postMessage</code>:
  </p>

  <pre><code>// main.js
const worker = new Worker('worker.js');
worker.postMessage({ type: 'heavyComputation', data: hugeArray });
worker.onmessage = (e) => console.log('Result:', e.data);

// worker.js
self.onmessage = (e) => {
  const result = e.data.data.map(n => fibonacci(n));
  self.postMessage(result);
};</code></pre>

  <h2>Dedicated Workers vs SharedWorkers vs Service Workers</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Type</th><th>Scope</th><th>Lifetime</th><th>Use Case</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Dedicated Worker</strong></td><td>One tab</td><td>Tab lifetime</td><td>CPU-heavy tasks</td></tr>
        <tr><td><strong>SharedWorker</strong></td><td>Multiple tabs</td><td>Until all tabs close</td><td>Cross-tab state, WebSocket multiplexing</td></tr>
        <tr><td><strong>Service Worker</strong></td><td>Entire origin</td><td>Independently managed</td><td>Offline caching, push, background sync</td></tr>
      </tbody>
    </table>
  </div>

  <p>
    <strong>SharedWorkers</strong> are underrated. They run a single worker instance shared
    across all tabs/windows/iframes from the same origin — perfect for WebSocket connection
    pooling (one connection, N tabs), cross-tab state synchronization, and coordinated
    audio playback.
  </p>

  <h2>The Transferable Trick: Zero-Copy Data Transfer</h2>

  <p>
    The biggest performance bottleneck with Workers isn't computation — it's
    <strong>data transfer</strong>. By default, <code>postMessage</code> uses structured
    cloning, which copies the entire payload:
  </p>

  <pre><code>// Default: structured clone — copies 100MB array (slow, memory-hungry)
const bigArray = new Float64Array(100_000_000);
worker.postMessage(bigArray); // ❌ Copies 800 MB

// Transferable: zero-copy — transfers ownership (instant, no duplication)
worker.postMessage(bigArray, [bigArray.buffer]); // ✅ Zero-copy
// bigArray is now empty (transferred ownership)</code></pre>

  <p>
    <strong>Transferables</strong> move ownership instead of copying. The sender loses access;
    the receiver gains it. Supported types: <code>ArrayBuffer</code>, <code>MessagePort</code>,
    <code>ImageBitmap</code>, <code>OffscreenCanvas</code>, <code>ReadableStream</code>,
    <code>WritableStream</code>, <code>TransformStream</code>, and
    <code>WebTransportReceiveStream</code> (as of 2026).
  </p>

  <div class="highlight-box">
    <strong>Performance difference:</strong> For a 10-million float array (~80 MB), structured
    cloning takes ~120ms with 160 MB peak memory. Transferables take ~0.05ms with 80 MB peak
    memory. Use transferables for any buffer larger than 1KB.
  </div>

  <h2>Module Workers (ESM)</h2>

  <p>
    Since 2023, Workers support ES modules natively. No more <code>importScripts()</code>:
  </p>

  <pre><code>// Module worker
const worker = new Worker('worker.js', { type: 'module' });

// worker.js
import { fibonacci } from './utils.js';
import { processData } from './math.js';

self.onmessage = (e) => {
  const result = processData(e.data);
  self.postMessage(result);
};</code></pre>

  <p>
    Module workers support static imports, dynamic <code>import()</code>, and top-level
    <code>await</code>. They integrate with bundlers via
    <code>new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })</code>
    with full TypeScript support. Module Workers hit Baseline in 2024.
  </p>

  <h2>OffscreenCanvas: Render Graphics Off the Main Thread</h2>

  <p>
    <code>OffscreenCanvas</code> lets you render Canvas 2D and WebGL entirely in a Worker —
    all drawing commands execute off the main thread:
  </p>

  <pre><code>// main.js
const canvas = document.querySelector('canvas');
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// worker.js
self.onmessage = (e) => {
  const ctx = e.data.canvas.getContext('2d');
  function render() {
    ctx.fillStyle = 'dodgerblue';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  render();
};</code></pre>

  <h2>Comlink: The RPC Pattern for Workers</h2>

  <p>
    Raw <code>postMessage</code> works but doesn't scale. <strong>Comlink</strong> (2KB)
    turns Worker message passing into async function calls with full TypeScript types:
  </p>

  <pre><code>// worker.ts
import { expose } from 'comlink';

const api = {
  async fibonacci(n: number): Promise&lt;number&gt; {
    if (n &lt;= 1) return n;
    return (await api.fibonacci(n - 1)) + (await api.fibonacci(n - 2));
  }
};
expose(api);

// main.ts
import { wrap } from 'comlink';
const worker = new Worker(
  new URL('./worker.ts', import.meta.url),
  { type: 'module' }
);
const api = wrap&lt;typeof import('./worker').api&gt;(worker);

const result = await api.fibonacci(40); // Runs in worker!</code></pre>

  <p>
    Comlink uses <code>Proxy</code> to intercept calls and <code>postMessage</code> to send
    them. It supports callbacks (via <code>proxy()</code>), transferables, and
    <code>AbortSignal</code> integration — the de facto standard for Worker communication in 2026.
  </p>

  <h2>Real-World Use Cases</h2>

  <h3>1. Large File Processing</h3>
  <p>
    Parse, transform, and compress PDFs, images, and CSV files in a Worker while showing
    a progress bar on the main thread.
  </p>

  <h3>2. Real-Time Data Transformation</h3>
  <p>
    Receive WebSocket messages and parse/filter/aggregate them in a Worker — only send
    processed data to the main thread for rendering.
  </p>

  <h3>3. ML Inference</h3>
  <p>
    Load TensorFlow.js or ONNX models in a Worker and run predictions without blocking
    the UI thread.
  </p>

  <h3>4. Concurrent Processing with Thread Pools</h3>

  <pre><code>const pool = Array.from(
  { length: navigator.hardwareConcurrency },
  () => wrap(new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
);

const results = await Promise.all(
  items.map((item, i) => pool[i % pool.length].process(item))
);</code></pre>

  <h2>When NOT to Use Web Workers</h2>

  <ul>
    <li><strong>Small operations</strong> (&lt;1ms): <code>postMessage</code> overhead dominates.</li>
    <li><strong>DOM-dependent tasks</strong>: Workers can't access <code>document</code> or <code>window</code>.</li>
    <li><strong>Frequent callbacks</strong>: Thread boundary latency (~0.1–0.5ms). Batch updates instead.</li>
    <li><strong>State-heavy logic</strong>: Keeping worker and main-thread state in sync requires careful architecture.</li>
  </ul>

  <h2>Debugging Workers in 2026</h2>

  <p>Modern DevTools have first-class Worker support:</p>
  <ul>
    <li><strong>Chrome/Edge:</strong> Sources panel shows all Workers with dedicated scopes for breakpoints and variables.</li>
    <li><strong>Firefox:</strong> <code>about:debugging#workers</code> lists active Workers with dedicated debugger windows.</li>
    <li><strong>Performance panel:</strong> Worker activity appears alongside main-thread activity in flame charts.</li>
    <li>Chrome 130+ added <code>console.createTask()</code> for associating worker async tasks with their origin.</li>
  </ul>

  <h2>Security</h2>

  <p>Workers run in a restricted environment — no access to <code>document</code>, <code>window</code>,
    <code>localStorage</code>, <code>sessionStorage</code>, or <code>parent</code>. They can still
    use <code>fetch</code>, <code>WebSocket</code>, <code>IndexedDB</code>, and the <code>Cache API</code>.
    For extra isolation, restrict <code>worker-src</code> in your Content-Security-Policy.</p>

  <h2>Browser Support</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Feature</th><th>Chrome</th><th>Firefox</th><th>Safari</th><th>Edge</th></tr>
      </thead>
      <tbody>
        <tr><td>Dedicated Workers</td><td>4</td><td>3.5</td><td>4</td><td>12</td></tr>
        <tr><td>Shared Workers</td><td>4</td><td>29</td><td>16</td><td>79</td></tr>
        <tr><td>Module Workers</td><td>80</td><td>114</td><td>15.3</td><td>80</td></tr>
        <tr><td>OffscreenCanvas</td><td>69</td><td>105</td><td>16.4</td><td>79</td></tr>
        <tr><td>Transferables</td><td>21</td><td>15</td><td>7</td><td>12</td></tr>
        <tr><td><code>navigator.hardwareConcurrency</code></td><td>37</td><td>48</td><td>10.1</td><td>15</td></tr>
      </tbody>
    </table>
  </div>

  <h2>The Bottom Line</h2>

  <p>
    Web Workers are not exotic — they're fundamental. Every web application that handles data
    processing, image manipulation, real-time streams, or ML inference should use them. The API
    is simple, the tooling is mature, and the performance gains are dramatic.
  </p>

  <p>
    If your app has ever frozen during a heavy computation, you need a Worker. Start with a
    single Dedicated Worker + Comlink. Graduate to SharedWorkers when you have multi-tab
    coordination. Reach for OffscreenCanvas when rendering becomes a bottleneck.
  </p>

  <div class="highlight-box highlight-positive">
    <strong>Start today:</strong> Move your heaviest computation into a Worker. Even migrating
    one slow function will immediately improve your Core Web Vitals. Use the
    <a href="/tools/web-workers-playground/" class="inline-link">Web Workers Playground</a>
    on DevBench to experiment with the API before adding it to production code.
  </div>
</div>`,
  },
  {
    slug: 'view-transitions-api-guide',
    title: 'The View Transitions API: Smooth Page Transitions Without a Framework',
    description:
      'A deep dive into the View Transitions API — now Baseline 2026 — and how to build native cross-page animations with just CSS. No JavaScript libraries required.',
    date: '2026-06-04',
    author: 'DevBench',
    tags: ['CSS', 'View Transitions', 'Baseline 2026', 'Animation', 'Browser APIs'],
    readingTime: '7 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    For years, smooth page transitions meant reaching for heavy JavaScript frameworks or
    wrestling with FLIP animations. The <strong>View Transitions API</strong> — which
    reached <strong>Baseline status in 2026</strong> — changes everything. You can now
    create buttery-smooth cross-page (and cross-document) transitions with a single CSS
    at-rule and zero JavaScript.
  </p>

  <h2>What Are View Transitions?</h2>

  <p>
    The View Transitions API gives the browser the ability to capture snapshots of the old
    page state and the new page state, then animate between them. Think of it as the browser
    taking "before" and "after" photos and morphing between them — all natively, using the
    same compositor thread that drives CSS animations, so it's <em>buttery smooth</em> even
    on low-end devices.
  </p>

  <div class="highlight-box">
    <strong>Baseline 2026:</strong> The View Transitions API (both SPA and cross-document
    variants) shipped in Chrome 126+, Edge 126+, Safari 18.2+, and Firefox 138+. Every
    major browser now supports it.
  </div>

  <h2>The Magic One-Liner</h2>

  <p>
    For single-page applications, enabling view transitions is literally one line of
    JavaScript:
  </p>

  <pre><code>// Wrap your DOM update in startViewTransition
document.startViewTransition(() =&gt; {
  updateTheDOMSomehow();
});</code></pre>

  <p>
    The browser automatically:
  </p>

  <ul>
    <li>Captures a screenshot of the current state</li>
    <li>Runs your DOM update callback</li>
    <li>Captures a screenshot of the new state</li>
    <li>Animates between them using a default cross-fade</li>
  </ul>

  <h2>Cross-Document Transitions (MPA)</h2>

  <p>
    Even more exciting: you can enable transitions between <em>different pages</em> on your
    site without any JavaScript. Just add a meta tag and a CSS at-rule:
  </p>

  <pre><code>&lt;!-- In your &lt;head&gt; --&gt;
&lt;meta name="view-transition" content="same-origin" /&gt;</code></pre>

  <pre><code>/* CSS — customize the animation */
::view-transition-old(root) {
  animation: 300ms ease-out both fade-out;
}

::view-transition-new(root) {
  animation: 300ms ease-out both fade-in;
}</code></pre>

  <p>
    With just those two snippets, every navigation between same-origin pages gets a smooth
    cross-fade. No SPA router needed. No JavaScript. Pure native performance.
  </p>

  <h2>Named View Transitions</h2>

  <p>
    The real power comes from <strong>named view transitions</strong>. By giving elements
    the same <code>view-transition-name</code> on both pages, the browser automatically
    morphs them:
  </p>

  <pre><code>/* Product card on the list page */
.product-card-42 {
  view-transition-name: product-42;
}

/* Same product's hero image on the detail page */
.product-hero {
  view-transition-name: product-42;
}</code></pre>

  <p>
    The browser automatically animates the element from its position and size on the old
    page to its position and size on the new page — no manual calculations needed.
  </p>

  <h2>Pseudo-Element Tree</h2>

  <p>
    The API exposes a tree of pseudo-elements that you can style to control every aspect of
    the animation:
  </p>

  <pre><code>::view-transition
└── ::view-transition-group(root)
    ├── ::view-transition-image-pair(root)
    │   ├── ::view-transition-old(root)   ← outgoing snapshot
    │   └── ::view-transition-new(root)   ← incoming snapshot
    └── (no ::view-transition-image-pair for morphing elements)</code></pre>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Pseudo-element</th><th>Purpose</th></tr>
      </thead>
      <tbody>
        <tr><td><code>::view-transition</code></td><td>Root overlay; set duration, easing here</td></tr>
        <tr><td><code>::view-transition-group(name)</code></td><td>Container for each named element; animates position/size</td></tr>
        <tr><td><code>::view-transition-image-pair(name)</code></td><td>Isolation container; set mix-blend-mode here</td></tr>
        <tr><td><code>::view-transition-old(name)</code></td><td>Outgoing snapshot; animate opacity, clip, mask</td></tr>
        <tr><td><code>::view-transition-new(name)</code></td><td>Incoming snapshot; animate opacity, clip, mask</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Real-World Example: Product Gallery</h2>

  <p>
    Let's build a smooth product gallery transition. When a user clicks a product card, the
    image morphs to a hero banner, the title slides to a header, and the price moves to a
    sidebar — all natively animated:
  </p>

  <pre><code>/* Gallery page */
.gallery-item:nth-child(1) .image { view-transition-name: product-image-1; }
.gallery-item:nth-child(1) .title { view-transition-name: product-title-1; }
.gallery-item:nth-child(1) .price { view-transition-name: product-price-1; }

/* Detail page */
.product-detail .hero-image { view-transition-name: product-image-1; }
.product-detail .page-title   { view-transition-name: product-title-1; }
.product-detail .price-tag    { view-transition-name: product-price-1; }

/* Custom animation timing */
::view-transition-group(product-image-1) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}</code></pre>

  <h2>Common Pitfalls (and Fixes)</h2>

  <h3>1. <code>view-transition-name</code> must be unique per page</h3>
  <p>
    If two elements on the same page share a <code>view-transition-name</code>, the
    transition fails silently. Use unique per-instance names (e.g., append the item's ID).
  </p>

  <h3>2. Overflow clipping breaks morphing</h3>
  <p>
    Elements with <code>overflow: hidden</code> will clip the transition snapshot. Apply
    <code>view-transition-name</code> to the inner element instead, or use
    <code>overflow: clip</code> (which is compatible).
  </p>

  <h3>3. Stacking context changes cause flickers</h3>
  <p>
    During transitions, elements are promoted to their own stacking contexts. If your layout
    relies on z-index relationships, you may see flickers. Use
    <code>::view-transition-group(name) { z-index: ... }</code> to control stacking order.
  </p>

  <h2>Browser Support &amp; Progressive Enhancement</h2>

  <p>
    Since the API is now Baseline 2026, you can use it without a fallback. But for
    peace of mind, it degrades gracefully:
  </p>

  <pre><code>if (document.startViewTransition) {
  document.startViewTransition(() => updateDOM());
} else {
  updateDOM(); // Fallback: instant update
}</code></pre>

  <div class="highlight-box highlight-positive">
    <strong>Performance note:</strong> View transitions run on the compositor thread, so
    they stay smooth even when the main thread is busy. The browser captures snapshots
    as GPU textures and composites them — no layout or paint during the animation.
  </div>

  <h2>When to Use View Transitions</h2>

  <table>
    <thead>
      <tr><th>✅ Great for</th><th>❌ Not ideal for</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Page-to-page navigation</td>
        <td>Continuous animations (use WAAPI/CSS animations)</td>
      </tr>
      <tr>
        <td>List → detail morphing</td>
        <td>Infinite scroll (transitions have a fixed duration)</td>
      </tr>
      <tr>
        <td>Tab/content switching</td>
        <td>Real-time data streaming UIs</td>
      </tr>
      <tr>
        <td>Light/dark mode transitions</td>
        <td>Complex SVG animations</td>
      </tr>
    </tbody>
  </table>

  <h2>Try It Yourself on DevBench</h2>

  <p>
    Want to experiment with view transitions right now? Head over to our
    <a href="/tools/view-transitions-playground/" class="inline-link">View Transitions Playground</a>
    — a live, interactive editor with 9 built-in presets where you can tweak every aspect
    of the API and see real-time results.
  </p>

  <h2>The Bottom Line</h2>

  <p>
    The View Transitions API is one of the most impactful additions to the web platform in
    years. It takes something that used to require hundreds of lines of JavaScript (manual
    FLIP calculations, requestAnimationFrame loops, DOM measurement) and reduces it to a
    single CSS at-rule. As of 2026, it's Baseline everywhere — there's no reason not to
    use it in every new project.
  </p>

  <p class="callout">
    Start small: add the meta tag for cross-document transitions, then gradually name your
    key elements. Your users will notice the polish, and your bundle size will thank you.
  </p>
</div>`,
  },
  {
    slug: 'css-nesting-complete-guide-2026',
    title: 'CSS Nesting Is Here: Say Goodbye to Repetitive Selectors',
    description:
      'CSS Nesting reached Baseline in 2024 and now works in every browser. Learn the syntax rules, the "&" parent selector, nesting at-rules, common pitfalls, and how to migrate from Sass nesting today.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['CSS', 'CSS Nesting', 'Baseline 2024', 'CSS3', 'Frontend', 'Sass', 'PostCSS', 'Web Standards'],
    readingTime: '8 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    For two decades, CSS nesting was only available through preprocessors. Sass, Less, and
    Stylus gave us nested selectors, and they were so popular that the CSS Working Group
    standardized them. <strong>CSS Nesting</strong> shipped in every major browser
    by 2024 — Chrome 120, Safari 17.2, Firefox 117 — and it is now
    <strong>Baseline 2024</strong>. No <code>@supports</code> check
    needed. It is production-ready everywhere and it changes how you write CSS at a
    fundamental level.
  </p>

  <div class="highlight-box">
    <strong>Baseline 2024:</strong> CSS Nesting is supported in Chrome 120+,
    Edge 120+, Safari 17.2+, and Firefox 117+. Use it in production today — no preprocessor
    required.
  </div>

  <h2>Before and After: The Visual Difference</h2>

  <p>
    Here is a real-world card component with hover states, a title, a description,
    and a button. First, the old flat CSS:
  </p>

  <pre><code>/* Before: flat CSS — lots of repetition */
.card { background: var(--surface); border-radius: 8px; }
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.card .card-title { font-size: 1.25rem; font-weight: 600; }
.card .card-description { color: var(--muted); font-size: 0.875rem; }
.card .card-button { padding: 8px 16px; background: var(--brand); }
.card .card-button:hover { background: var(--brand-dark); }
.card.dark .card-title { color: white; }</code></pre>

  <p>
    And now, with native CSS nesting:
  </p>

  <pre><code>/* After: native CSS nesting */
.card {
  background: var(--surface);
  border-radius: 8px;

  &amp;:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .card-description {
    color: var(--muted);
    font-size: 0.875rem;
  }

  .card-button {
    padding: 8px 16px;
    background: var(--brand);

    &amp;:hover {
      background: var(--brand-dark);
    }
  }

  &amp;.dark {
    .card-title { color: white; }
    .card-description { color: rgba(255,255,255,0.7); }
  }
}</code></pre>

  <p>
    That is not just prettier — it is <strong>faster to write, easier to read, and
    harder to get wrong</strong>. No more retyping <code>.card</code>
    eight times. The parent-child relationship is visually explicit in the structure.
  </p>

  <h2>The Golden Rule: Every Nest Must Start With a Symbol</h2>

  <p>
    This is the single most important rule and the #1 source of confusion for people
    migrating from Sass. In Sass, you can nest a bare element selector inside a parent:
  </p>

  <pre><code>/* INVALID in CSS Nesting — works in Sass */
.card {
  h2 { color: red; }  /* &lt;--- No leading symbol! */
}</code></pre>

  <p>
    CSS Nesting requires <strong>every nested selector to start with a
    symbol</strong>: <code>&amp;</code> (parent reference),
    <code>.</code> (class), <code>#</code> (ID),
    <code>[</code> (attribute), <code>:</code> (pseudo-class),
    <code>::</code> (pseudo-element), or <code>@</code> (at-rule).
    A bare tag name like <code>h2</code> is not allowed.
  </p>

  <p>
    The fix is simple — use the <code>&amp;</code> parent selector:
  </p>

  <pre><code>/* Valid CSS Nesting */
.card {
  &amp; h2 { color: red; }       /* descendant combinator */
  &amp; &gt; h2 { color: blue; }    /* direct child combinator */
  &amp; + h2 { color: green; }   /* adjacent sibling */
}</code></pre>

  <h2><code>&amp;</code> — The Swiss Army Knife of Nesting</h2>

  <p>
    The <code>&amp;</code> character represents the parent selector and is
    the most powerful tool in your nesting toolkit. It works everywhere:
  </p>

  <pre><code>.button {
  background: var(--brand);

  &amp;:hover { background: var(--brand-dark); }
  &amp;:focus-visible { outline: 2px solid var(--brand); }

  /* BEM-style modifier */
  &amp;--large { padding: 16px 32px; font-size: 1.125rem; }
  &amp;--small { padding: 4px 12px; font-size: 0.75rem; }

  /* Combine with attribute selectors */
  &amp;[disabled] { opacity: 0.5; cursor: not-allowed; }

  /* Invert nesting — this compiles to ".theme-dark .button" */
  .theme-dark &amp; { background: var(--dark-surface); }
}</code></pre>

  <p>
    That last example — <code>.theme-dark &amp;</code> — inverts the nesting
    relationship, letting you define variant styles from <em>inside</em> the
    component's primary block instead of requiring a separate top-level selector.
  </p>

  <h2>Nesting @media and @container — The Real Game-Changer</h2>

  <p>
    One of the biggest ergonomic wins from CSS Nesting is colocating responsive
    breakpoints with the component they affect. No more separate <code>@media</code>
    blocks scattered across a file:
  </p>

  <pre><code>.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @container (min-width: 400px) {
    gap: 2rem;
  }
}</code></pre>

  <p>
    Everything about <code>.grid</code> is in one place. The browser compiles
    this to the equivalent flat CSS at parse time, so there is zero performance penalty.
  </p>

  <h2>Nesting @layer and @supports</h2>

  <p>
    Progressive enhancement becomes clean and self-contained:
  </p>

  <pre><code>.fancy-box {
  background: var(--fallback-bg);

  @supports (background: linear-gradient(in oklch, red, blue)) {
    background: linear-gradient(in oklch, var(--from), var(--to));
  }

  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
  }
}</code></pre>

  <h2>Specificity: Identical to Non-Nested CSS</h2>

  <p>
    A critical point: <strong>CSS Nesting produces exactly the
    same specificity as the equivalent flat CSS</strong>. The browser desugars nested
    selectors at parse time — there is no additional specificity from nesting depth.
  </p>

  <pre><code>/* Both produce .card .title — specificity (0,2,0) */
.card .title { color: red; }
.card { .title { color: red; } }</code></pre>

  <p>
    <strong>Nest for organization, not for specificity hacking.</strong>
  </p>

  <h2>Common Pitfalls (and How to Avoid Them)</h2>

  <h3>Pitfall 1: Forgetting the symbol rule</h3>
  <p>
    The browser <strong>silently ignores</strong> nested rules that do not
    start with a symbol — this is by design to avoid breaking existing pages. If your
    nested styles do not apply, check this first.
  </p>

  <h3>Pitfall 2: Over-nesting</h3>
  <p>
    Just because you <em>can</em> nest deeply does not mean you should. The
    "inception rule" from the Sass community applies: never nest more than 3 levels.
    Deep nesting creates long, fragile selectors that are hard to override.
  </p>

  <h3>Pitfall 3: Confusing <code>&amp;.active</code> with <code>&amp; .active</code></h3>
  <p>
    <code>&amp;.active</code> means <code>.card.active</code>
    (element has both classes). <code>&amp; .active</code> means
    <code>.card .active</code> (descendant with the class). The space is
    everything.
  </p>

  <h2>Migrating From Sass: A Cheat Sheet</h2>

  <table>
    <thead>
      <tr>
        <th>Sass Pattern</th>
        <th>CSS Nesting Equivalent</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>.parent { .child { } }</code></td>
        <td><code>.parent { &amp; .child { } }</code> — add <code>&amp;</code></td>
      </tr>
      <tr>
        <td><code>.parent { &amp;:hover { } }</code></td>
        <td><code>.parent { &amp;:hover { } }</code> — identical</td>
      </tr>
      <tr>
        <td><code>.parent { &amp;__child { } }</code></td>
        <td><code>.parent { &amp;__child { } }</code> — BEM works unchanged</td>
      </tr>
      <tr>
        <td><code>.parent { @media { } }</code></td>
        <td><code>.parent { @media { } }</code> — identical</td>
      </tr>
      <tr>
        <td>Sass color functions</td>
        <td>Use <code>color-mix()</code> or <code>oklch</code> relative color syntax</td>
      </tr>
    </tbody>
  </table>

  <h2>When to Use Native CSS Nesting vs. Keep Sass</h2>

  <div class="highlight-box">
    <strong>Use native CSS nesting when:</strong> you are starting a new project,
    want zero build-step overhead, or only need nesting + custom
    properties.<br/><br/>
    <strong>Keep Sass when:</strong> you heavily rely on mixins,
    <code>@extend</code>, loops, or color-manipulation functions that CSS does
    not yet have equivalents for.
  </div>

  <p>
    Many teams are adopting a hybrid approach: removing Sass nesting in favor of native CSS
    nesting (which means shipping plain <code>.css</code> files directly), while
    keeping Sass for complex mixins and design-token generation during the build step.
  </p>

  <h2>Browser DevTools Support</h2>

  <p>
    All major browser DevTools now show nested CSS exactly as you wrote it — not the
    desugared flat version. In Chrome 120+, Safari 17.2+, and Firefox 117+, the Styles
    pane displays nested rules with indentation, and you can edit them in place just like
    any other CSS.
  </p>

  <h2>Performance: Zero Cost</h2>

  <p>
    CSS Nesting is handled entirely at parse time by the browser's CSS parser. There is
    <strong>no runtime cost, no additional network payload, and no JavaScript
    overhead</strong>. The desugaring happens once when the stylesheet is parsed, and
    the resulting CSSOM is identical to flat CSS. This is one of the reasons nesting was
    able to standardize so quickly — it required zero changes to the rendering pipeline.
  </p>

  <h2>Try It on DevBench</h2>

  <p>
    Want to experiment with CSS nesting right now? DevBench has several tools that let you
    write and preview nested CSS live:
  </p>

  <ul>
    <li>
      <a href="/tools/css-nesting-playground/" class="inline-link">CSS Nesting Playground</a>
      — a dedicated editor for writing and testing nested CSS with live preview
    </li>
    <li>
      <a href="/tools/css-property-playground/" class="inline-link">CSS Property Playground</a>
      — explore how nesting interacts with every CSS property
    </li>
    <li>
      <a href="/tools/css-has-playground/" class="inline-link">CSS :has() Playground</a>
      — nesting pairs beautifully with the parent selector
    </li>
  </ul>

  <h2>The Bottom Line</h2>

  <p>
    CSS Nesting is the single biggest ergonomic improvement to the CSS language since
    Custom Properties. It eliminates selector repetition, keeps related styles together,
    and makes responsive design dramatically more maintainable by colocating media queries
    with their components. It is <strong>Baseline 2024</strong> — not
    experimental, not "coming soon." It is here, it is production-ready, and there is no
    reason not to use it in your next project.
  </p>

  <p class="callout">
    The symbol-first rule is all you need to remember. Start every nested selector with
    <code>&amp;</code>, <code>.</code>, <code>#</code>,
    <code>[</code>, <code>:</code>, <code>::</code>,
    or <code>@</code>, and you will never hit a silent failure. Happy nesting!
  </p>
</div>`,
  },
];
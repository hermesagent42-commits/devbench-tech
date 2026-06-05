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
  {
    slug: 'speculation-rules-api-instant-page-loads',
    title: 'Speculation Rules API: Instant Page Loads Are Finally Here — No JavaScript Framework Required',
    description:
      'The Speculation Rules API lets the browser prefetch and prerender entire pages before users click — delivering genuine zero-millisecond navigations. Define rules in a JSON script tag, and the browser handles the rest. Complete guide to prefetch vs prerender, eagerness strategies, scoring, and production deployment.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['Speculation Rules', 'Performance', 'Web Platform', 'Prerender', 'Prefetch', 'MPA', 'Chrome', '2026'],
    readingTime: '11 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    Imagine a user hovers over a link and the page loads <strong>instantly</strong> — no spinner, no white flash, no layout shift. Not "fast." <strong>Instant.</strong> The Speculation Rules API makes this real by letting the browser <em>prerender</em> entire pages before the user clicks, rendering them offscreen with JavaScript, CSS, and images fully executed. It is the single biggest navigation performance improvement since HTTP/2, and it works with <strong>any website</strong> — no framework, no service worker, no JavaScript library.
  </p>

  <h2>What Is the Speculation Rules API?</h2>

  <p>
    Speculation Rules is a JSON-based configuration that tells the browser: "Here are pages a user is likely to visit next. Please prefetch or prerender them." You ship a <code>&lt;script type="speculationrules"&gt;</code> tag, and the browser does the rest. No JavaScript SDK, no build step, no framework lock-in.
  </p>

  <p>There are two modes:</p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Mode</th><th>What It Does</th><th>When It Fires</th><th>Cost</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>prefetch</strong></td>
          <td>Fetches the page HTML and subresources (CSS, JS, images) into the HTTP cache</td>
          <td>Immediately on page load or on hover/click (configurable)</td>
          <td>Low — just bandwidth, no rendering</td>
        </tr>
        <tr>
          <td><strong>prerender</strong></td>
          <td>Fetches, parses, and fully renders the page in a hidden background tab — JavaScript executes, images decode, fonts load</td>
          <td>On hover/mousedown (eager) or immediately (moderate/conservative)</td>
          <td>High — uses memory, CPU, and bandwidth</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>The Simplest Possible Example</h2>

  <p>
    Drop this into your <code>&lt;head&gt;</code> and every same-origin link on the page gets prefetched when the user hovers over it:
  </p>

  <pre><code>&lt;script type="speculationrules"&gt;
{
  "prefetch": [
    {
      "source": "document",
      "where": {
        "href_matches": "/*"
      },
      "eagerness": "moderate"
    }
  ]
}
&lt;/script&gt;</code></pre>

  <p>
    That is it. Hover any link, and by the time the user clicks, the response is already in the cache. Navigation is instantaneous.
  </p>

  <h2>Eagerness: When Should the Browser Speculate?</h2>

  <p>
    The <code>eagerness</code> field controls when speculation triggers. There are four levels, and choosing the right one is the difference between "invisible magic" and "wasted bandwidth":
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Eagerness</th><th>Trigger</th><th>Best For</th><th>Risk</th></tr>
      </thead>
      <tbody>
        <tr><td><code>immediate</code></td><td>As soon as the rule is parsed</td><td>Single-page apps, landing pages with one obvious next step</td><td>High — speculates on pages user may never visit</td></tr>
        <tr><td><code>eager</code></td><td>Slight hover or pointer near the link</td><td>Navigation menus, "next article" links</td><td>Medium — fires early but still user-initiated</td></tr>
        <tr><td><code>moderate</code></td><td>200ms hover (intentional hover)</td><td>Content sites, blogs, documentation</td><td>Low — fires only when user shows intent</td></tr>
        <tr><td><code>conservative</code></td><td>Mousedown/touchstart (imminent click)</td><td>E-commerce, forms, any page where mis-prefetch costs money</td><td>Very low — fires right before navigation</td></tr>
      </tbody>
    </table>
  </div>

  <pre><code>// Immediate — prefetch the homepage from every page
{ "prefetch": [{ "source": "list", "urls": ["/"], "eagerness": "immediate" }] }

// Moderate — prefetch links on hover (200ms delay)
{ "prefetch": [{ "source": "document", "where": { "href_matches": "/blog/*" }, "eagerness": "moderate" }] }

// Conservative — prerender on mousedown for near-guaranteed clicks
{ "prerender": [{ "source": "document", "where": { "href_matches": "/checkout" }, "eagerness": "conservative" }] }</code></pre>

  <h2>Prerender: The Holy Grail of Instant Navigation</h2>

  <p>
    Prerendering goes far beyond prefetch. The browser loads the entire page in a hidden, unconnected renderer — JavaScript executes, CSS paints, images decode, WebSocket connections open. When the user clicks, the browser <strong>activates</strong> the prerendered page instantly, replacing the current page with zero visible transition.
  </p>

  <pre><code>&lt;script type="speculationrules"&gt;
{
  "prerender": [
    {
      "source": "document",
      "where": {
        "selector_matches": ".prerender-links a"
      },
      "eagerness": "moderate"
    }
  ]
}
&lt;/script&gt;</code></pre>

  <div class="callout-box">
    <strong>⚠️ Prerender constraints (2026):</strong>
    <ul>
      <li>Limited to same-origin URLs (cross-origin prerender is experimental)</li>
      <li>Only one prerender can be active at a time per page (new prerender cancels the old one)</li>
      <li>Uses memory (~50-100MB per prerendered page) — do not prerender everything</li>
      <li>The prerendered page cannot use <code>window.opener</code> or <code>BroadcastChannel</code> while hidden</li>
      <li>APIs like <code>Permission.query()</code> and <code>MediaDevices.getUserMedia()</code> are deferred until activation</li>
    </ul>
  </div>

  <h2>Document Rules vs List Rules</h2>

  <p>Speculation Rules support two <code>source</code> types:</p>

  <h3>Document Rules (<code>source: "document"</code>)</h3>
  <p>
    The browser finds matching links on the current page. Use <code>href_matches</code> for URL patterns and <code>selector_matches</code> for CSS selectors:
  </p>

  <pre><code>{
  "prefetch": [{
    "source": "document",
    "where": {
      "and": [
        { "href_matches": "/products/*" },
        { "selector_matches": ".featured-product a" }
      ]
    },
    "eagerness": "moderate"
  }]
}</code></pre>

  <h3>List Rules (<code>source: "list"</code>)</h3>
  <p>
    You specify exact URLs. Best for pages where the next step is predictable (e.g., a login page that always leads to /dashboard):
  </p>

  <pre><code>{
  "prerender": [{
    "source": "list",
    "urls": ["/dashboard", "/settings"],
    "eagerness": "immediate"
  }]
}</code></pre>

  <h2>Scoring: Making Smart Speculation Decisions</h2>

  <p>
    When multiple links match, the browser needs to decide which one to speculate on. You can attach scores to influence this decision:
  </p>

  <pre><code>{
  "prefetch": [{
    "source": "document",
    "where": {
      "or": [
        { "href_matches": "/checkout", "score": 0.9 },
        { "href_matches": "/cart", "score": 0.7 },
        { "href_matches": "/products/*", "score": 0.3 }
      ]
    },
    "eagerness": "eager"
  }]
}</code></pre>

  <p>
    Scores are relative within a ruleset — 0.9 beats 0.7, but there is no absolute scale. The browser also factors in its own heuristics: has the user visited this page before? Is the pointer moving toward this link? Is there available memory?
  </p>

  <h2>Prefetch + Prerender Together: The Perfect Combo</h2>

  <p>
    The most effective strategy layers both modes. Prefetch broadly — all links in a blog index. Prerender narrowly — the product page when someone hovers over a "Buy Now" button:
  </p>

  <pre><code>&lt;script type="speculationrules"&gt;
{
  "prefetch": [
    {
      "source": "document",
      "where": { "href_matches": "/blog/*" },
      "eagerness": "moderate"
    }
  ],
  "prerender": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/products/*" },
          { "selector_matches": ".cta-button" }
        ]
      },
      "eagerness": "moderate"
    }
  ]
}
&lt;/script&gt;</code></pre>

  <p>On a content site with this setup:</p>
  <ul>
    <li>Every blog post link prefetches on hover → instant load from cache</li>
    <li>Product pages with CTA buttons prerender on hover → zero-millisecond activation</li>
    <li>Non-matching links behave normally — no wasted resources</li>
  </ul>

  <h2>Detecting Prerender Activation in JavaScript</h2>

  <p>
    Sometimes your page JavaScript needs to know it is being prerendered (e.g., to defer analytics, skip API calls, or pause animations):
  </p>

  <pre><code>// Check if prerendered
if (document.prerendering) {
  // Defer non-critical work
  document.addEventListener('prerenderingchange', () => {
    // Page was just activated — safe to fire analytics, start animations
    gtag('event', 'page_view');
    startAnimations();
  });
}

// Or use the newer activationStart
const activationStart = performance.getEntriesByType('navigation')[0]?.activationStart;
if (activationStart > 0) {
  console.log(\`Page was prerendered. Activation took \${activationStart}ms\`);
}</code></pre>

  <h2>Monitoring: Did It Work?</h2>

  <p>
    Chrome DevTools has first-class speculation debugging. Open the <strong>Application</strong> panel → <strong>Speculative Loads</strong> to see all active prerenders, their status, and why they succeeded or failed. You can also use the Performance panel to measure activation time — look for the <strong>Activation</strong> marker in the timeline.
  </p>

  <p>For production monitoring, use the Performance API:</p>

  <pre><code>// Check if the current navigation was prerendered
const navEntry = performance.getEntriesByType('navigation')[0];

if (navEntry.activationStart > 0) {
  // This was a prerender activation
  const activationTime = navEntry.activationStart;
  const totalLoadTime = navEntry.loadEventEnd;

  console.log(\`Prerender activation: \${activationTime}ms\`);
  console.log(\`Total load (including prerender): \${totalLoadTime}ms\`);

  // Send to analytics
  gtag('event', 'prerender_activation', {
    activation_time: activationTime,
    total_time: totalLoadTime
  });
}</code></pre>

  <h2>Production Deployment: A Real-World Setup</h2>

  <p>For DevBench itself, here is the speculation rules configuration:</p>

  <pre><code>&lt;script type="speculationrules"&gt;
{
  "prefetch": [
    {
      "source": "document",
      "where": { "href_matches": "/tools/*" },
      "eagerness": "moderate"
    },
    {
      "source": "document",
      "where": { "href_matches": "/blog/*" },
      "eagerness": "moderate"
    },
    {
      "source": "list",
      "urls": ["/", "/tools/", "/blog/"],
      "eagerness": "immediate"
    }
  ],
  "prerender": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/tools/*" },
          { "not": { "href_matches": "/tools/json-formatter" } }
        ]
      },
      "eagerness": "eager"
    }
  ]
}
&lt;/script&gt;</code></pre>

  <p>This configuration:</p>
  <ul>
    <li>Prefetches all tool and blog pages on hover</li>
    <li>Immediately prefetches the homepage, tools index, and blog index from every page</li>
    <li>Prerenders tool pages on eager hover (excluding JSON formatter, which is client-heavy)</li>
  </ul>

  <h2>Browser Support and the Road Ahead</h2>

  <p>
    As of June 2026, the Speculation Rules API is supported in <strong>Chrome 121+</strong> and <strong>Edge 121+</strong>. Firefox and Safari have not yet shipped it, but the API is designed to be safely ignored: unsupported browsers simply skip the <code>&lt;script type="speculationrules"&gt;</code> tag with zero side effects. There is no polyfill needed, no feature detection, no fallback — it just works where supported and degrades gracefully everywhere else.
  </p>

  <p>
    The Chrome team is exploring <strong>cross-origin prerendering</strong> (with explicit opt-in from the target origin via <code>Supports-Loading-Mode: credentialed-prerender</code>), <strong>multiple simultaneous prerenders</strong> (memory permitting), and deeper integration with the <strong>Navigation API</strong> for single-page apps. The future of navigation is zero milliseconds.
  </p>

  <h2>When Not to Use Speculation Rules</h2>

  <p>
    Speculation Rules are not free. Every prerendered page consumes significant memory, and every prefetch consumes bandwidth. Avoid speculation when:
  </p>

  <ul>
    <li>Your users are on metered connections (use <code>navigator.connection.saveData</code> to check)</li>
    <li>Your pages have side effects on load (analytics, WebSocket connections, API calls)</li>
    <li>Your target pages are personalized or frequently invalidated</li>
    <li>You are already serving from a CDN with sub-100ms TTFB (the gain is marginal)</li>
  </ul>

  <p>For most content sites, documentation, blogs, and e-commerce, the trade-off is overwhelmingly positive. A moderate-eagerness prefetch rule costs kilobytes of bandwidth and delivers navigation that feels like a local app.</p>

  <p class="callout">
    The Speculation Rules API is the closest the web platform has come to eliminating navigation latency entirely. Drop a JSON script tag, and your users get instant page loads — no framework rewrite, no SPA migration, no JavaScript library. It is the simplest, highest-impact performance optimization you can deploy in 2026.
  </p>
</div>`,
  },
  {
    slug: 'navigation-api-complete-guide-2026',
    title: 'The Navigation API: Finally, a Sane Way to Handle Page Navigations — No More popstate Hacks',
    description:
      'The Navigation API replaces History with a modern, promise-based navigation model. Intercept navigations, manage state without serialization, integrate with View Transitions, and build fast SPA-like experiences with native browser APIs. A complete guide with real-world patterns.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['JavaScript', 'Navigation API', 'Browser APIs', 'Web Platform', 'SPA', 'MPA', 'View Transitions', '2026'],
    readingTime: '10 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    For 20 years, web navigation has been a mess of <code>window.onpopstate</code> handlers,
    manual URL manipulation, fragile scroll restoration, and the impossible task of intercepting
    navigations before they happen. The History API, introduced in 2011, gave us
    <code>pushState</code> and <code>replaceState</code> — but no way to <em>listen</em> for
    navigations, no way to <em>cancel</em> them, and no way to <em>react</em> before they complete.
  </p>

  <p>
    The <strong>Navigation API</strong> — shipping in Chrome 102+ and now Baseline — fixes all of this.
    It replaces the History API with a modern, event-driven, promise-based model that handles
    single-page navigation, multi-page transitions, and everything in between. If you have ever
    wrestled with React Router, Next.js App Router, or Nuxt navigation guards, this is the
    low-level API those frameworks <em>wish</em> existed when they were built.
  </p>

  <h2>The Core: navigation.navigate() vs history.pushState()</h2>

  <p>
    The most fundamental difference: <code>navigation.navigate()</code> is <strong>interceptable</strong>.
    When you call <code>history.pushState()</code>, the browser fires a <code>popstate</code>
    event — but only on <em>back/forward</em>, not on <code>pushState</code> itself.
    That is why every SPA router has to monkey-patch <code>pushState</code> to know about
    navigation events. The Navigation API fixes this:
  </p>

  <pre><code>// Old way: pushState + manual event dispatching
history.pushState({ page: 1 }, '', '/page/1');
window.dispatchEvent(new PopStateEvent('popstate')); // Manual hack

// New way: Navigation API — everything goes through navigate()
navigation.navigate('/page/1', { state: { page: 1 } });
// Fires 'navigate' event that you can intercept, cancel, or transform</code></pre>

  <p>
    Every navigation — programmatic, back/forward button, link click — fires the <code>navigate</code>
    event. You handle it <em>once</em> for everything:
  </p>

  <pre><code>navigation.addEventListener('navigate', (event) => {
  // event.destination.url — where we are going
  // event.canIntercept — can we intercept this?
  // event.intercept() — take over and handle as SPA
  // event.preventDefault() — cancel the navigation

  console.log('Navigating from', navigation.currentEntry?.url);
  console.log('Navigating to', event.destination.url);
  console.log('Navigation type:', event.navigationType); // push, replace, reload, traverse
  console.log('User gesture:', event.userInitiated);     // true if user clicked a link
  console.log('Hash change only:', event.hashChange);    // true if only the fragment changed
});</code></pre>

  <h2>The Intercept Pattern: SPA Navigation Without a Framework</h2>

  <p>
    The killer feature is <code>event.intercept()</code>. It lets you take control of a navigation
    and handle it as a single-page transition — fetch new content, swap DOM, update the URL —
    without a full page reload:
  </p>

  <pre><code>navigation.addEventListener('navigate', (event) => {
  // Only intercept same-origin navigations to specific paths
  if (!event.canIntercept || !event.destination.url.startsWith(location.origin)) {
    return;
  }

  event.intercept({
    handler: async () => {
      // The browser waits for this promise to resolve
      const response = await fetch(event.destination.url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContent = doc.querySelector('main');

      // Swap content
      document.querySelector('main')?.replaceWith(newContent);
    },
    // Optional: scroll behavior
    scroll: 'after-transition',
    // Optional: focus management
    focusReset: 'after-transition',
  });
});</code></pre>

  <div class="highlight-box">
    <strong>Key insight:</strong> The <code>handler</code> runs <em>after</em> the URL is updated
    in the address bar but <em>before</em> the transition is committed. If your handler throws or
    rejects, the navigation is rolled back — the old URL is restored. This gives you proper
    transactional navigation semantics, something no framework could provide before.
  </div>

  <h2>Navigation Entries: Richer State Without Serialization</h2>

  <p>
    The History API forces all state to be serializable (structured clone) because it needs to
    survive session restore. The Navigation API drops this constraint for in-session state:
  </p>

  <pre><code>// Old way: state must be serializable
history.pushState({ page: 1 }, ''); // OK
history.pushState({ fn: myCallback }, ''); // DataCloneError — cannot clone function

// New way: NavigationHistoryEntry.state accepts anything
await navigation.navigate('/page/1', {
  state: {
    page: 1,
    abortController: new AbortController(), // Functions, DOM nodes, anything
    renderCache: new Map(),
  }
});

// Access current entry
const entry = navigation.currentEntry;
console.log(entry.url, entry.key, entry.id, entry.index);
console.log(entry.getState().abortController); // Your live state object!</code></pre>

  <p>
    Each entry also has a unique <code>key</code> (persistent across sessions, useful for scroll
    restoration) and <code>id</code> (unique per entry, regenerated on reload). The
    <code>index</code> tells you where you are in the navigation history:
  </p>

  <pre><code>// Check if there is a next/previous entry
const canGoBack = navigation.canGoBack;   // like history.length > 1
const canGoForward = navigation.canGoForward;

// Get the full entry list
for (const entry of navigation.entries()) {
  console.log(entry.url, entry.index);
}

// Navigate back/forward
await navigation.back();
await navigation.forward();
await navigation.traverseTo('entry-key-abc123'); // Jump to specific entry by key</code></pre>

  <h2>Navigation Types: Push, Replace, Reload, Traverse</h2>

  <p>
    The Navigation API distinguishes four navigation types, each with different semantics:
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Type</th><th>Method</th><th>Effect</th><th>Use Case</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>push</strong></td><td><code>navigate(url)</code></td><td>New entry added to history</td><td>Normal link navigation</td></tr>
        <tr><td><strong>replace</strong></td><td><code>navigate(url, {history: "replace"})</code></td><td>Replaces current entry</td><td>Redirects, form submission responses</td></tr>
        <tr><td><strong>reload</strong></td><td><code>reload()</code></td><td>Full page reload</td><td>User presses reload button</td></tr>
        <tr><td><strong>traverse</strong></td><td><code>back()</code>, <code>forward()</code>, <code>traverseTo()</code></td><td>Move through existing history</td><td>Back/forward buttons</td></tr>
      </tbody>
    </table>
  </div>

  <p>
    The <code>navigate</code> event's <code>navigationType</code> property tells you which
    type the current transition is. This lets you optimize:
  </p>

  <pre><code>navigation.addEventListener('navigate', (event) => {
  if (event.navigationType === 'reload') {
    // Do not intercept — let the browser do a full reload
    return;
  }

  if (event.navigationType === 'traverse') {
    // Restore from cache instead of re-fetching
    const cached = sessionStorage.getItem(event.destination.url);
    if (cached) {
      event.intercept({
        handler: () => render(cached),
        scroll: 'manual',
      });
    }
    return;
  }

  // Push/replace: fetch fresh content
  event.intercept({ handler: () => fetchAndRender(event.destination.url) });
});</code></pre>

  <h2>Navigation + View Transitions: Native Page Animations</h2>

  <p>
    Combine the Navigation API with the View Transitions API for native, 60fps page transitions
    — no animation library required:
  </p>

  <pre><code>navigation.addEventListener('navigate', (event) => {
  if (!event.canIntercept) return;

  event.intercept({
    handler: async () => {
      // Start a view transition
      const transition = document.startViewTransition(async () => {
        const response = await fetch(event.destination.url);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Swap main content
        document.querySelector('main')?.replaceWith(
          doc.querySelector('main')
        );
      });

      await transition.finished;
    },
  });
});</code></pre>

  <h2>The dispose Event: Cleanup at the Right Time</h2>

  <p>
    The History API never tells you when an entry is permanently removed from the session history.
    The Navigation API fires a <code>dispose</code> event on entries that are evicted:
  </p>

  <pre><code>// When you navigate, you can store cleanup info
await navigation.navigate('/form', {
  state: { draftSaved: true }
});

// The current entry's dispose event fires when it is evicted
navigation.currentEntry.addEventListener('dispose', (event) => {
  const state = navigation.currentEntry.getState();
  if (state?.draftSaved) {
    // Clean up temp storage, abort pending requests
    state.abortController?.abort();
    localStorage.removeItem('form-draft');
  }
});</code></pre>

  <h2>Scroll Restoration: The Browser Handles It (Finally)</h2>

  <p>
    Scroll position restoration has been the bane of every SPA router. The Navigation API
    integrates directly with the browser's scroll restoration system:
  </p>

  <pre><code>// In the navigate event:
event.intercept({
  handler: fetchAndRender,
  scroll: 'after-transition', // Browser saves/restores scroll position automatically
});

// Manual control:
event.intercept({
  handler: fetchAndRender,
  scroll: 'manual', // You handle it yourself
});</code></pre>

  <div class="highlight-box">
    <strong>The scroll restoration problem:</strong> Before the Navigation API, every SPA router
    had to implement its own scroll saving/restoring logic using <code>history.scrollRestoration</code>
    and manual position tracking. The result was almost always janky — a brief flash of the
    wrong scroll position before correction. The Navigation API solves this at the engine level.
  </div>

  <h2>Practical Pattern: A Complete SPA Router in 60 Lines</h2>

  <p>
    Here is a production-ready SPA router using the Navigation API:
  </p>

  <pre><code>// router.js
class Router {
  #routes = new Map();
  #abortController = null;

  route(pattern, handler) {
    this.#routes.set(pattern, handler);
  }

  start() {
    navigation.addEventListener('navigate', (event) => {
      if (!event.canIntercept || !event.destination.sameDocument) return;
      if (event.hashChange) return;

      const handler = this.#match(event.destination.url);
      if (!handler) return;

      this.#abortController?.abort();
      this.#abortController = new AbortController();

      event.intercept({
        handler: async () => {
          document.body.classList.add('navigating');
          try {
            await handler({
              url: event.destination.url,
              signal: this.#abortController.signal,
              state: event.destination.getState(),
            });
          } finally {
            document.body.classList.remove('navigating');
          }
        },
        scroll: 'after-transition',
      });
    });
  }

  #match(url) {
    const pathname = new URL(url).pathname;
    for (const [pattern, handler] of this.#routes) {
      if (pathname.match(new RegExp(pattern))) return handler;
    }
    return null;
  }
}</code></pre>

  <h2>MPA to SPA Transition: Progressive Enhancement</h2>

  <p>
    One of the most powerful patterns: start with a traditional multi-page app (MPA), then
    progressively enhance to SPA-like behavior — no framework migration required:
  </p>

  <pre><code>// Progressive enhancement: MPA to SPA with one script
navigation.addEventListener('navigate', (event) => {
  if (!event.canIntercept || !event.destination.sameDocument) return;

  event.intercept({
    handler: async () => {
      const response = await fetch(event.destination.url);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      document.head.replaceWith(doc.head);
      document.body.replaceWith(doc.body);
      initComponents();
    },
    scroll: 'after-transition',
  });
});</code></pre>

  <p>
    This gives you instant SPA-like page transitions from a plain MPA. No double-rendering, no
    hydration mismatch, no SSR/CSR split.
  </p>

  <h2>Browser Support and Polyfill Strategy</h2>

  <p>
    As of June 2026, the Navigation API is Baseline — supported in Chrome 102+, Edge 102+,
    and Safari 26+. Firefox has an active implementation in progress. Feature-detect and fall back:
  </p>

  <pre><code>if ('navigation' in window) {
  setupNavigationRouter();
} else {
  // Traditional MPA — links work natively, or use polyfill
  import('@virtualstate/navigation').then(({ polyfill }) => polyfill());
}</code></pre>

  <p class="callout">
    The Navigation API is not just a new way to do what History did — it is a fundamentally better
    model. Interceptable navigations, promise-based transitions, non-serializable state, native
    scroll restoration, and first-class View Transition integration. It replaces not just
    <code>pushState</code> but entire router libraries. Sixty lines of JavaScript gives you
    a production SPA router with back/forward caching, abortable navigations, and native page
    transitions. The browser finally does what we have been hacking around for 15 years.
  </p>
</div>`,
  },
];

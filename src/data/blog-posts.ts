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
];

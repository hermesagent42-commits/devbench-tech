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
    slug: 'css-container-queries-complete-guide-2026',
    title: 'CSS Container Queries: The End of Media-Query-Only Responsive Design',
    description:
      'Container Queries let components respond to their own size — not the viewport. Now Baseline 2026 across all browsers, they fundamentally change how we build reusable, context-independent UI components. Complete guide: container-type, @container, container-name, style queries, container query units (cqw/cqh/cqi/cqb), and real-world component patterns.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['CSS', 'Container Queries', 'Baseline 2026', 'Responsive Design', 'Components', '@container', 'Style Queries', '2026'],
    readingTime: '11 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For 15 years, responsive design meant one thing: <strong>media queries</strong>. Every component's layout was dictated by the viewport width. A card in a 600px sidebar and a card in a 1200px hero section got the same styles — because both lived in a 1400px viewport. <strong>Container Queries</strong> — Baseline across all browsers since February 2026 — change this entirely. Components can now respond to <em>their own size</em>, not the page size.
  </p>

  <h2>The Problem Container Queries Solve</h2>

  <p>
    Here's the fundamental responsive-design problem: a reusable component lives in many contexts. A product card might appear in a 3-column grid, a 2-column sidebar, or full-width on mobile — all on the <em>same viewport</em>. With media queries alone, the card can't know its context. With Container Queries, it can:
  </p>

  <pre><code>/* ❌ Media Query: responds to viewport, not component context */
@media (min-width: 768px) {
  .card { grid-template-columns: 1fr 1fr; }
}

/* ✅ Container Query: responds to the card's own container */
@container (min-width: 400px) {
  .card { grid-template-columns: 1fr 1fr; }
}</code></pre>

  <h2>Container Queries 101</h2>

  <p>Container Queries have two parts: defining a <strong>containment context</strong> and writing a <strong>container query</strong>:</p>

  <pre><code>/* Step 1: Define the containment context */
.card-grid {
  container-type: inline-size;  /* Enable size queries on this element */
  container-name: card-grid;    /* Optional: name it for scoped queries */
}

/* Step 2: Write queries that target the container */
@container card-grid (min-width: 600px) {
  .card { display: grid; grid-template-columns: auto 1fr; }
  .card-image { grid-row: span 2; }
}

@container card-grid (max-width: 599px) {
  .card { display: flex; flex-direction: column; }
  .card-image { height: 200px; }
}</code></pre>

  <h2>container-type: Inline Size vs Size vs Normal</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>Queries Supported</th><th>Layout Impact</th><th>Use Case</th></tr>
      </thead>
      <tbody>
        <tr><td><code>inline-size</code></td><td>width, inline-size</td><td>Containment on inline axis only</td><td>Most common: card grids, sidebars, responsive components</td></tr>
        <tr><td><code>size</code></td><td>width, height, inline-size, block-size</td><td>Full size containment (both axes)</td><td>Height-responsive layouts, aspect-ratio-aware components</td></tr>
        <tr><td><code>normal</code></td><td>None</td><td>No size containment</td><td>Use with style queries only; avoids layout side effects</td></tr>
      </tbody>
    </table>
  </div>

  <div class="highlight-box">
    <strong>Start with <code>inline-size</code></strong> — it covers 90% of use cases. Setting <code>container-type: inline-size</code> enables querying the container's width (in the writing-mode direction). This is what most responsive components need.
  </div>

  <h2>Container Names: Scoped Queries</h2>

  <p>
    Without a container name, <code>@container (min-width: 400px)</code> queries the <em>nearest</em> ancestor with container-type set. With names, you can be explicit:
  </p>

  <pre><code>/* Define named containers */
.main-layout { container-name: main; container-type: inline-size; }
.sidebar    { container-name: sidebar; container-type: inline-size; }

/* Query a specific container */
@container main (min-width: 900px) { /* ... */ }
@container sidebar (max-width: 300px) { /* ... */ }

/* Query the nearest container (unnamed search) */
@container (min-width: 500px) { /* matches nearest container ancestor */ }</code></pre>

  <p>
    You can also define shorthand:
  </p>
  <pre><code>.sidebar {
  container: sidebar / inline-size; /* name + type */
}</code></pre>

  <h2>Container Query Length Units</h2>

  <p>
    Container Queries introduce 6 new CSS units — they're relative to the queried container, not the viewport:
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Unit</th><th>Relative To</th><th>Example</th></tr>
      </thead>
      <tbody>
        <tr><td><code>cqw</code></td><td>1% of container width</td><td><code>width: 50cqw</code> → half the container width</td></tr>
        <tr><td><code>cqh</code></td><td>1% of container height</td><td><code>height: 25cqh</code> → quarter of container height</td></tr>
        <tr><td><code>cqi</code></td><td>1% of container inline size</td><td>Writing-mode-aware width unit</td></tr>
        <tr><td><code>cqb</code></td><td>1% of container block size</td><td>Writing-mode-aware height unit</td></tr>
        <tr><td><code>cqmin</code></td><td>1% of min(cqw, cqh)</td><td>Like vmin but for containers</td></tr>
        <tr><td><code>cqmax</code></td><td>1% of max(cqw, cqh)</td><td>Like vmax but for containers</td></tr>
      </tbody>
    </table>
  </div>

  <pre><code>.card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-title { font-size: clamp(1rem, 8cqi, 2rem); }
  .card-image { width: 35cqi; } /* 35% of container inline-size */
}</code></pre>

  <div class="highlight-box">
    <strong>cqw vs vw:</strong> <code>vw</code> units are relative to the viewport — they stay the same regardless of where your component lives. <code>cqw</code> units are relative to the component's container — they change as the container resizes. This is the fundamental shift: components that adapt to <em>their</em> space, not the window.
  </div>

  <h2>Style Queries: Querying CSS Values</h2>

  <p>
    Container Queries can also query <strong>computed CSS values</strong> — not just size. This is called a <strong>Style Query</strong> and uses <code>style()</code>:
  </p>

  <pre><code>/* Parent sets a custom property */
.theme-container {
  --theme: dark;
}

/* Child queries that custom property */
@container style(--theme: dark) {
  .child { background: #1e293b; color: #f8fafc; }
}

@container style(--theme: light) {
  .child { background: #ffffff; color: #0f172a; }
}</code></pre>

  <p>
    Style queries support all CSS value types: keywords, numbers, colors, strings, custom idents. They're a declarative alternative to JavaScript prop-drilling for theming, layout modes, and design variants:
  </p>

  <pre><code>/* Layout variant switching without JS */
.layout { --layout-mode: grid; }

@container style(--layout-mode: grid) {
  .items { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}

@container style(--layout-mode: list) {
  .items { display: flex; flex-direction: column; }
}

/* Color theming */
.section { --accent: brand; }

@container style(--accent: brand) {
  .heading { color: var(--color-brand); border-left: 3px solid var(--color-brand); }
}

@container style(--accent: danger) {
  .heading { color: var(--color-danger); border-left: 3px solid var(--color-danger); }
}</code></pre>

  <h2>Real-World Component Pattern: Adaptive Product Card</h2>

  <pre><code>&lt;div class="product-grid"&gt;
  &lt;article class="product-card"&gt;
    &lt;img class="product-image" src="shoe.jpg" alt="" /&gt;
    &lt;div class="product-info"&gt;
      &lt;h3 class="product-title"&gt;Ultra Runner Pro&lt;/h3&gt;
      &lt;p class="product-price"&gt;$149.99&lt;/p&gt;
      &lt;p class="product-desc"&gt;Carbon-plated trail shoes...&lt;/p&gt;
      &lt;button class="product-cta"&gt;Add to Cart&lt;/button&gt;
    &lt;/div&gt;
  &lt;/article&gt;
&lt;/div&gt;

&lt;style&gt;
.product-grid {
  container: products / inline-size;
  display: grid;
  gap: 1rem;
}

/* Default: stack (narrow container) */
.product-card { display: flex; flex-direction: column; }
.product-image { width: 100%; aspect-ratio: 1; object-fit: cover; }
.product-desc { display: none; }

/* Medium: side-by-side with image */
@container products (min-width: 450px) {
  .product-card { flex-direction: row; gap: 1rem; }
  .product-image { width: 150px; height: 150px; flex-shrink: 0; }
  .product-desc { display: block; font-size: 0.875rem; }
}

/* Wide: full feature layout */
@container products (min-width: 700px) {
  .product-card { flex-direction: row; gap: 1.5rem; padding: 1.5rem; }
  .product-image { width: 250px; height: 250px; }
  .product-title { font-size: 1.5rem; }
  .product-price { font-size: 1.25rem; }
}
&lt;/style&gt;</code></pre>

  <p>
    This card works identically in a 250px sidebar, a 500px main column, or a 900px hero section — <strong>without any media queries</strong>. It adapts to its container, which is what responsive design always should have been about.
  </p>

  <h2>Container Queries vs Media Queries: When to Use What</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Decision Factor</th><th>Container Queries</th><th>Media Queries</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Responds to...</strong></td><td>Parent container size</td><td>Viewport / device size</td></tr>
        <tr><td><strong>Best for...</strong></td><td>Reusable components, design-system primitives, multi-context layouts</td><td>Page-level layout, global breakpoints, device features (hover, prefers-reduced-motion)</td></tr>
        <tr><td><strong>Component reusability</strong></td><td>✅ Portable across layouts</td><td>❌ Tied to page breakpoints</td></tr>
        <tr><td><strong>Nested contexts</strong></td><td>✅ Each container queries its own space</td><td>❌ Only the viewport matters</td></tr>
        <tr><td><strong>Performance</strong></td><td>Slight overhead from containment</td><td>Minimal overhead</td></tr>
      </tbody>
    </table>
  </div>

  <div class="highlight-box highlight-positive">
    <strong>The winning strategy:</strong> Use <strong>media queries</strong> for page-level layout (header, global nav, overall grid structure). Use <strong>container queries</strong> for every component inside those layouts. This gives you the best of both: global breakpoints for the shell, context-aware components for the content.
  </div>

  <h2>Container Query Performance</h2>

  <p>
    Setting <code>container-type</code> creates a <strong>containment boundary</strong> — the browser can skip layout recalculation for elements inside the container when only things outside change. This is actually a performance <em>win</em> for large applications:
  </p>

  <ul>
    <li><strong>Layout containment:</strong> The browser knows the container's children can't affect elements outside it (and vice versa for size containment).</li>
    <li><strong>Style containment:</strong> With <code>container-type: size</code>, the browser skips recalculating styles for elements outside the container when children change.</li>
    <li><strong>Paint containment:</strong> The browser can skip painting elements outside when only the container changes (and vice versa with <code>contain: paint</code>).</li>
  </ul>

  <p>In benchmarks, pages using container queries for component-level responsiveness show 15–30% faster layout recalculations compared to media-query-only approaches that depend on global breakpoints.</p>

  <h2>Nested Container Queries</h2>

  <p>Containers can be nested — each component queries its <em>nearest</em> container ancestor:</p>

  <pre><code>&lt;div class="page" style="container: page / inline-size"&gt;
  &lt;div class="section" style="container: section / inline-size"&gt;
    &lt;div class="card" style="container: card / inline-size"&gt;
      &lt;h3 class="title"&gt;Nested!&lt;/h3&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/div&gt;

@container page (min-width: 1000px) { /* Page-level: wide layout */ }
@container section (min-width: 600px) { /* Section-level: multi-column */ }
@container card (min-width: 300px) { /* Card-level: inline layout */ }</code></pre>

  <p>Each level of nesting creates its own query context. A card's layout depends on <em>its</em> size, not the page's — even though both the page and section containers exist above it.</p>

  <h2>Browser Support &amp; Baseline Status</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Browser</th><th>Container Queries (size)</th><th>Container Query Units</th><th>Style Queries</th></tr>
      </thead>
      <tbody>
        <tr><td>Chrome</td><td>105+ (Aug 2022)</td><td>105+</td><td>111+ (Mar 2023)</td></tr>
        <tr><td>Firefox</td><td>110+ (Feb 2023)</td><td>110+</td><td>135+ (Feb 2025)</td></tr>
        <tr><td>Safari</td><td>16+ (Sep 2022)</td><td>16+</td><td>17+ (Sep 2023)</td></tr>
        <tr><td>Edge</td><td>105+</td><td>105+</td><td>111+</td></tr>
      </tbody>
    </table>
  </div>

  <p><strong>Baseline status:</strong> Container size queries reached Baseline in <strong>February 2025</strong>. Style queries reached Baseline in <strong>February 2026</strong>. Container query length units reached Baseline with size queries in February 2025. As of mid-2026, all Container Query features are safe to use without fallbacks.</p>

  <h2>Progressive Enhancement</h2>

  <p>For older browsers, container queries degrade gracefully — the default (non-container-query) styles apply everywhere:</p>

  <pre><code>/* Default: works everywhere, even without container query support */
.card { display: flex; flex-direction: column; }

/* Enhancement: only applies when container queries are supported and container > 400px */
@container (min-width: 400px) {
  .card { flex-direction: row; }
}</code></pre>

  <p>You can also feature-detect in JavaScript:</p>

  <pre><code>if (CSS.supports('container-type', 'inline-size')) {
  // Container queries are supported
} else {
  // Fall back to media queries or a JS-based resize observer
}</code></pre>

  <h2>Common Pitfalls</h2>

  <h3>1. Forgetting to set container-type</h3>
  <p>Container queries only work on elements with <code>container-type</code> or the <code>container</code> shorthand. A <code>@container</code> rule without a containment context is a no-op.</p>

  <h3>2. Infinite loops with size containment</h3>
  <p>If a child's size change triggers a container query that changes the child's size, you create an infinite loop. The browser detects this and stops after one cycle, but results may be unexpected. Avoid querying the property that determines container size.</p>

  <h3>3. Height containment collapsing</h3>
  <p><code>container-type: size</code> prevents the container from growing with its children (size containment). If your container depends on children for height, use <code>container-type: inline-size</code> instead.</p>

  <h3>4. Style query scope</h3>
  <p>Style queries only read <em>inherited</em> or directly-set custom properties on the container. They cannot query properties set on children or computed from layout.</p>

  <h2>The Bottom Line</h2>

  <p>
    Container Queries mark the end of viewport-only responsive design. For 15 years, we made every component respond to the same breakpoints — regardless of whether it lived in a wide hero or a narrow sidebar. Container Queries fix this.
  </p>

  <p>
    <strong>Start today:</strong> Pick three reusable components in your design system. Wrap them with <code>container-type: inline-size</code>. Replace their inner <code>@media</code> rules with <code>@container</code> queries. You'll immediately notice how much cleaner — and more portable — your components become.
  </p>

  <div class="highlight-box highlight-positive">
    <strong>Try it now:</strong> Use the <a href="/tools/container-query-builder/" class="inline-link">Container Query Builder</a> on DevBench to visually construct container queries with live preview, range conditions, and production-ready CSS output. Build your first container query in 30 seconds.
  </div>
</div>`,
  },
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
  {
    slug: 'javascript-temporal-api-2026',
    title: 'JavaScript Temporal API in 2026: The End of Date Nightmares',
    description:
      'Temporal is the long-awaited replacement for JavaScript\'s broken Date object — immutable, timezone-aware, nanosecond-precise, and shipping in browsers this year. A complete guide to every Temporal type, real-world patterns, and how to migrate from Date today.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['JavaScript', 'Temporal', 'Date', 'Time Zones', 'TC39', 'Stage 3', '2026'],
    readingTime: '9 min read',
    content: `
<div class="prose-content">
  <p class="lead">
    For 28 years, JavaScript developers have suffered through the <code>Date</code> API — a hurried Java clone with mutable objects, zero timezone support, bizarre month indexing (January is 0!), and parsing behavior so unpredictable that every date library in existence was invented to escape it. In 2026, that finally ends. <strong>Temporal</strong> — the TC39 proposal that has been in development since 2017 — is shipping in browsers and Node.js as the <strong>modern, correct, and comprehensive</strong> replacement for <code>Date</code>.
  </p>

  <h2>Why Date Is Fundamentally Broken</h2>

  <p>
    The <code>Date</code> object was copied from <code>java.util.Date</code> in 1995 during a 10-day sprint to ship JavaScript. It carries design flaws that no amount of polyfills can fix:
  </p>

  <ul>
    <li><strong>Mutable:</strong> <code>date.setMonth(5)</code> mutates in place — impossible to use with React/Vue state, Redux, or any immutable data flow.</li>
    <li><strong>No timezone support:</strong> <code>Date</code> only works in the local timezone or UTC. There is no way to represent "June 5th at 3PM in Tokyo" — only the instant it maps to.</li>
    <li><strong>Unpredictable parsing:</strong> <code>new Date("2025-02-30")</code> silently rolls over to March 2nd instead of throwing. <code>Date.parse("01/02/2025")</code> means January 2nd in the US and February 1st in the UK.</li>
    <li><strong>Month zero-indexing:</strong> <code>new Date(2025, 0, 1)</code> is January 1st. This has caused more off-by-one bugs than any other API in web history.</li>
    <li><strong>No duration type:</strong> "Add 3 months" requires manual month/year rollover logic that breaks on month boundaries, DST transitions, and leap years.</li>
    <li><strong>Millisecond-only precision:</strong> Financial systems, scientific computing, and distributed tracing all need microsecond or nanosecond precision.</li>
  </ul>

  <div class="highlight-box">
    <strong>The cost of Date:</strong> Moment.js — the most popular date library — was downloaded <strong>12 million times per week</strong> at its peak, solely to patch holes in <code>Date</code>. The entire <code>date-fns</code>, <code>Luxon</code>, and <code>Day.js</code> ecosystem ($200M+ in engineering time) exists because the platform primitive was wrong. Temporal fixes the platform.
  </div>

  <h2>Temporal's Architecture: A Type for Every Use Case</h2>

  <p>
    Temporal is not one class — it is a <strong>family of types</strong>, each designed for a specific concept. Pick the right type and the API becomes self-documenting:
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Type</th><th>Represents</th><th>Example</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Temporal.Instant</code></td><td>A single point on the universal timeline</td><td>2026-06-05T17:00:00Z</td></tr>
        <tr><td><code>Temporal.PlainDate</code></td><td>A calendar date without time or timezone</td><td>2026-06-05</td></tr>
        <tr><td><code>Temporal.PlainTime</code></td><td>A wall-clock time without date or timezone</td><td>17:00:00.000</td></tr>
        <tr><td><code>Temporal.PlainDateTime</code></td><td>A date and time without timezone</td><td>2026-06-05T17:00:00</td></tr>
        <tr><td><code>Temporal.PlainYearMonth</code></td><td>A year and month (think: credit card expiry)</td><td>2026-06</td></tr>
        <tr><td><code>Temporal.PlainMonthDay</code></td><td>A month and day (think: birthday, holiday)</td><td>06-05</td></tr>
        <tr><td><code>Temporal.ZonedDateTime</code></td><td>A date and time anchored to a timezone</td><td>2026-06-05T17:00:00+09:00[Asia/Tokyo]</td></tr>
        <tr><td><code>Temporal.Duration</code></td><td>A length of time</td><td>P3M15DT2H30M (3 months, 15 days, 2.5 hours)</td></tr>
        <tr><td><code>Temporal.TimeZone</code></td><td>An IANA timezone</td><td>America/New_York</td></tr>
        <tr><td><code>Temporal.Calendar</code></td><td>A calendar system</td><td>iso8601, japanese, hebrew</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Immutability: The Killer Feature</h2>

  <p>
    Every Temporal type is <strong>deeply immutable</strong>. Methods like <code>.add()</code>, <code>.with()</code>, and <code>.round()</code> return new instances — the original is never modified:
  </p>

  <pre><code>const meeting = Temporal.ZonedDateTime.from('2026-06-05T09:00:00[America/New_York]');

// Move to next week — returns a new instance, original unchanged
const nextWeek = meeting.add({ weeks: 1 });

// Change the time — returns a new instance
const afternoon = meeting.with({ hour: 14 });

console.log(meeting.hour);  // 9 — still the original
console.log(nextWeek.hour); // 9
console.log(afternoon.hour); // 14</code></pre>

  <p>
    This is <strong>transformative</strong> for React, Vue, Redux, and any state management. You can pass Temporal objects through props, use them as <code>useMemo</code> dependencies (reference equality works!), and never worry about accidental mutation. Compare this to <code>Date</code> where <code>date.setHours(14)</code> silently changes the object and returns a timestamp number — one of the most confusing APIs ever designed.
  </p>

  <h2>Time Zones: Finally Done Right</h2>

  <p>
    This is where Temporal shines brightest. <code>ZonedDateTime</code> represents a specific wall-clock time in a specific IANA timezone — not just an offset:
  </p>

  <pre><code>// A ZonedDateTime knows its timezone, not just its UTC offset
const tokyoMeeting = Temporal.ZonedDateTime.from(
  '2026-06-05T17:00:00[Asia/Tokyo]'
);

// What time is it in New York?
const nyTime = tokyoMeeting.withTimeZone('America/New_York');
console.log(nyTime.toString());
// 2026-06-05T04:00:00-04:00[America/New_York]

// DST transitions are handled correctly
const beforeDST = Temporal.ZonedDateTime.from(
  '2026-03-08T01:30:00[America/New_York]'
);
const afterDST = beforeDST.add({ hours: 1 });
console.log(afterDST.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]
// Note: 02:30 doesn't exist — it skipped from 01:59 to 03:00</code></pre>

  <p>
    Temporal handles DST gaps (spring-forward: times that don't exist) and overlaps (fall-back: times that happen twice) with explicit disambiguation options (<code>'compatible'</code>, <code>'earlier'</code>, <code>'later'</code>, <code>'reject'</code>). No more silent 1-hour-off bugs when daylight saving time changes.
  </p>

  <h2>Duration: Arithmetic Without the Pain</h2>

  <p>
    <code>Temporal.Duration</code> represents a length of time — and unlike adding raw milliseconds to a <code>Date</code>, it understands calendar units:
  </p>

  <pre><code>// Add 1 month to January 31st — what should happen?
const jan31 = Temporal.PlainDate.from('2026-01-31');

// Temporal handles calendar-aware arithmetic
const oneMonthLater = jan31.add({ months: 1 });
console.log(oneMonthLater.toString()); // 2026-02-28
// Correctly constrained to the last valid day of February

// Date would silently roll to March 3rd — a 3-day error!

// Durations are precise
const duration = Temporal.Duration.from({
  years: 1,
  months: 2,
  weeks: 3,
  days: 4,
  hours: 5,
  minutes: 6,
  seconds: 7,
  milliseconds: 800,
  microseconds: 900,
  nanoseconds: 100,
});

// Balance and round
const balanced = duration.round({ largestUnit: 'days' });
// All smaller units are normalized into days with nanosecond precision</code></pre>

  <h2>Comparisons and Sorting</h2>

  <p>
    Temporal types can be compared with <code>.equals()</code> and sorted with <code>Temporal.*.compare()</code>:
  </p>

  <pre><code>const events = [
  Temporal.ZonedDateTime.from('2026-06-05T10:00:00[Europe/London]'),
  Temporal.ZonedDateTime.from('2026-06-05T09:00:00[America/New_York]'),
  Temporal.ZonedDateTime.from('2026-06-05T15:00:00[Asia/Tokyo]'),
];

// Sorted by the actual instant, across timezones
events.sort(Temporal.ZonedDateTime.compare);

// London 10AM = 09:00 UTC
// New York 9AM = 13:00 UTC  ← actually later than London!
// Tokyo 3PM    = 06:00 UTC

console.log(events.map(e => e.toString()));
// Tokyo 3PM, London 10AM, New York 9AM</code></pre>

  <p>
    Compare this to <code>Date</code> where sorting <code>["2025-01-02", "2025-02-01"]</code> requires knowing whether the strings are ISO or US format — and even then, timezone offsets can silently reorder your data. Temporal comparisons are unambiguous by construction.
  </p>

  <h2>Formatting with Intl (No toString() Guessing)</h2>

  <p>
    Temporal delegates all formatting to <code>Intl.DateTimeFormat</code> — no more calling <code>.toString()</code> and hoping the browser gives you what you want:
  </p>

  <pre><code>const now = Temporal.Now.zonedDateTimeISO();

// Full control over every aspect of formatting
const fmt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'America/New_York',
});

console.log(fmt.format(now));
// "Friday, June 5, 2026 at 1:00:00 PM EDT"

// Relative time
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const daysUntil = now.until(
  Temporal.ZonedDateTime.from('2026-06-15T00:00:00[America/New_York]'),
  { largestUnit: 'days' }
);
console.log(rtf.format(daysUntil.days, 'days'));
// "in 10 days"</code></pre>

  <h2>Real-World Patterns</h2>

  <h3>1. Calendar UI (PlainDate + PlainTime)</h3>
  <pre><code>// When building a date picker: use PlainDate
const selected = Temporal.PlainDate.from('2026-06-05');

// When building a time picker: use PlainTime
const startTime = Temporal.PlainTime.from('09:00');

// Combine only at submit time
const meetingStart = selected.toZonedDateTime({
  time: startTime,
  timeZone: Temporal.TimeZone.from('America/Chicago'),
});</code></pre>

  <h3>2. API Timestamps (Instant)</h3>
  <pre><code>// When storing or transmitting: always use Instant
const createdAt = Temporal.Now.instant();
const json = { createdAt: createdAt.toString() };
// "2026-06-05T17:00:00.123456789Z"

// Parse back
const parsed = Temporal.Instant.from(json.createdAt);</code></pre>

  <h3>3. Recurring Events (PlainMonthDay)</h3>
  <pre><code>// A birthday — just month and day, no year needed
const birthday = Temporal.PlainMonthDay.from('06-05');

// Check if today is the birthday
const today = Temporal.Now.plainDateISO();
if (today.month === birthday.month && today.day === birthday.day) {
  // Happy birthday!
}

// "What year will the next one be?"
const nextBirthday = birthday.toPlainDate({ year: today.year });
const adjusted = nextBirthday.day > today.day ? nextBirthday
  : birthday.toPlainDate({ year: today.year + 1 });</code></pre>

  <h3>4. Countdowns and Timers (Duration difference)</h3>
  <pre><code>const launch = Temporal.ZonedDateTime.from(
  '2026-12-31T23:59:59[America/New_York]'
);
const now = Temporal.Now.zonedDateTimeISO();
const remaining = now.until(launch, {
  largestUnit: 'days',
  smallestUnit: 'seconds',
});

console.log(
  remaining.days + ' days, ' + remaining.hours + ' hours, ' +
  remaining.minutes + ' minutes, ' + remaining.seconds + ' seconds'
);
// "209 days, 6 hours, 59 minutes, 59 seconds"</code></pre>

  <h2>Migration from Date: A Practical Path</h2>

  <p>
    You do not need to rewrite everything at once. Here is a pragmatic migration path:
  </p>

  <ol>
    <li><strong>Install the polyfill:</strong> <code>npm install @js-temporal/polyfill</code> — works in all browsers and Node.js versions today.</li>
    <li><strong>New code only:</strong> Write all new date logic with Temporal. Leave existing Date code alone.</li>
    <li><strong>Interop at the boundary:</strong> Temporal ↔ Date conversion is one-liners:
      <pre><code>// Date → Temporal
const t = new Date().toTemporalInstant();

// Temporal → Date
const d = new Date(
  Temporal.Now.instant().epochMilliseconds
);</code></pre>
    </li>
    <li><strong>Phased cleanup:</strong> Over time, replace Date-based utilities with Temporal equivalents. The immutability alone eliminates entire categories of bugs.</li>
  </ol>

  <h2>Browser Support and Status</h2>

  <p>
    As of June 2026, Temporal is <strong>Stage 3</strong> in the TC39 process — the final stage before Stage 4 (finished). It ships behind a flag in Chrome 127+ (<code>--harmony-temporal</code>), is available in Firefox Nightly, and has experimental support in Node.js 22+. The polyfill is production-ready and used by companies including Google, Bloomberg, and Igalia — the same team that implemented Temporal in V8 and SpiderMonkey.
  </p>

  <p class="callout">
    Temporal is the most important JavaScript API since Promises. It replaces not just <code>Date</code> but the entire ecosystem of date libraries built to work around <code>Date</code>. Immutable, timezone-native, nanosecond-precise, and shipping this year — it is the API JavaScript developers have been waiting for since 1995. Start using the polyfill today. Your future self (and your tests, and your DST bugs, and your international users) will thank you.
  </p>
</div>`,
  },
  {
    slug: 'popover-api-complete-guide-2026',
    title: 'The Popover API: Native Popovers, Tooltips, and Dropdowns — Zero JavaScript Libraries',
    description:
      'The Popover API replaces every JavaScript popover, tooltip, dropdown, and menu library with two HTML attributes — popover and popovertarget. Light-dismiss, top-layer rendering, anchor positioning, and keyboard accessibility built into the browser. Complete guide with production-ready patterns.',
    date: '2026-06-05',
    author: 'DevBench',
    tags: ['HTML', 'Popover API', 'Baseline 2024', 'Web Platform', 'CSS Anchor', 'Accessibility', 'Tooltip', 'Dropdown', '2026'],
    readingTime: '12 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For 20 years, every web developer has solved the same problem the same way: install a library to show a popover.
    Tooltips (<code>tippy.js</code>, <code>floating-ui</code>), dropdown menus (Headless UI, Radix), select menus, date pickers, context menus, toast notifications, dialogs — all require JavaScript to manage z-index stacking, focus trapping, light-dismiss behavior, and positioning relative to a trigger element.
  </p>
  <p>
    The <strong>Popover API</strong> — Baseline since May 2024 — makes all of this native HTML. Two attributes: <code>popover</code> and <code>popovertarget</code>. The browser handles rendering in the <strong>top layer</strong> (above everything, including <code>z-index: 999999</code>), light dismiss (click outside, press Escape), focus management, and keyboard accessibility. No JavaScript required for basic use cases.
  </p>
  <h2>Hello, Popover — The Simplest Example</h2>
  <pre><code>&lt;!-- A button that opens a popover --&gt;
&lt;button popovertarget="my-popover"&gt;Open Menu&lt;/button&gt;

&lt;!-- The popover itself --&gt;
&lt;div id="my-popover" popover&gt;
  &lt;ul&gt;
    &lt;li&gt;&lt;a href="/profile"&gt;Profile&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="/settings"&gt;Settings&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="/logout"&gt;Logout&lt;/a&gt;&lt;/li&gt;
  &lt;/ul&gt;
&lt;/div&gt;</code></pre>
  <p>
    That's it. Click the button — the popover appears in the top layer. Click outside or press Escape — it closes. No JavaScript. No library. No z-index wars.
  </p>
  <h2>What Is the Top Layer?</h2>
  <p>
    The top layer is a special rendering layer above the document — above every <code>z-index</code> value, every <code>position: fixed</code> element, everything. Only three APIs can place elements there: <code>&lt;dialog&gt;</code> with <code>.showModal()</code>, the Fullscreen API, and the Popover API (Baseline 2024).
  </p>
  <h2>Auto vs Manual Popovers</h2>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>Light Dismiss</th><th>Multiple Open</th><th>Use Case</th></tr>
      </thead>
      <tbody>
        <tr><td><code>auto</code></td><td>Yes — click outside or Escape closes it</td><td>Only one open at a time</td><td>Tooltips, dropdowns, menus</td></tr>
        <tr><td><code>manual</code></td><td>No — must close programmatically</td><td>Multiple can coexist</td><td>Toasts, persistent panels, wizards</td></tr>
      </tbody>
    </table>
  </div>
  <h2>The JavaScript API</h2>
  <pre><code>const popover = document.getElementById('menu');
popover.showPopover();   // Show
popover.hidePopover();   // Hide
popover.togglePopover(); // Toggle
console.log(popover.matches(':popover-open')); // Check state</code></pre>
  <h3>Events: beforetoggle and toggle</h3>
  <pre><code>popover.addEventListener('beforetoggle', (event) => {
  if (event.newState === 'open') fetchMenuItems().then(render);
  if (event.newState === 'closed') cleanup();
});
popover.addEventListener('toggle', (event) => {
  console.log(\`Popover now: \${event.newState}\`);
});</code></pre>
  <h2>Positioning with CSS Anchor Positioning</h2>
  <p>
    The Popover API handles <em>rendering</em>. But <em>positioning</em> the popover relative to its trigger requires <strong>CSS Anchor Positioning</strong>, Baseline since May 2026.
  </p>
  <pre><code>#trigger-btn { anchor-name: --menu-anchor; }
#menu {
  position: absolute;
  position-anchor: --menu-anchor;
  top: anchor(bottom);
  left: anchor(left);
  position-try-fallbacks: flip-block, flip-inline;
}</code></pre>
  <h2>Production-Ready Dropdown Menu</h2>
  <pre><code>&lt;button id="user-menu-btn" popovertarget="user-menu"&gt;
  &lt;img src="/avatar.jpg" alt="" /&gt; Profile
&lt;/button&gt;

&lt;div id="user-menu" popover="auto"&gt;
  &lt;a href="/profile"&gt;View Profile&lt;/a&gt;
  &lt;a href="/settings"&gt;Settings&lt;/a&gt;
  &lt;hr /&gt;
  &lt;a href="/logout"&gt;Sign Out&lt;/a&gt;
&lt;/div&gt;

&lt;style&gt;
#user-menu-btn { anchor-name: --user-menu-anchor; }
#user-menu {
  position: absolute; position-anchor: --user-menu-anchor;
  top: anchor(bottom); left: anchor(left);
  min-width: 200px; margin-top: 4px;
  border-radius: 8px; background: #1e293b;
  border: 1px solid #334155;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  padding: 4px;
  position-try-fallbacks: flip-block;
}
#user-menu a { display: block; padding: 8px 12px; color: #e2e8f0; text-decoration: none; border-radius: 4px; }
#user-menu a:hover { background: #334155; }
&lt;/style&gt;</code></pre>
  <h2>Tooltips: Manual Popovers + Hover/Focus</h2>
  <pre><code>&lt;button id="tip-btn"&gt;Hover me&lt;/button&gt;
&lt;div id="tip" popover="manual"&gt;This is a tooltip.&lt;/div&gt;

&lt;script&gt;
const btn = document.getElementById('tip-btn');
const tip = document.getElementById('tip');
btn.addEventListener('mouseenter', () => tip.showPopover());
btn.addEventListener('mouseleave', () => tip.hidePopover());
btn.addEventListener('focus', () => tip.showPopover());
btn.addEventListener('blur', () => tip.hidePopover());
&lt;/script&gt;</code></pre>
  <p>8 lines of JS. Using <code>popover="manual"</code> lets the user move their mouse to read the tooltip without it closing.</p>
  <h2>Select Menu: Popover + CSS Anchor</h2>
  <pre><code>&lt;div class="custom-select"&gt;
  &lt;button id="select-trigger" popovertarget="select-popover"&gt;
    &lt;span id="select-value"&gt;Choose an option&lt;/span&gt; ▾
  &lt;/button&gt;
  &lt;div id="select-popover" popover="auto" role="listbox"&gt;
    &lt;div role="option" tabindex="0"&gt;React&lt;/div&gt;
    &lt;div role="option" tabindex="0"&gt;Vue&lt;/div&gt;
    &lt;div role="option" tabindex="0"&gt;Svelte&lt;/div&gt;
  &lt;/div&gt;
&lt;/div&gt;

&lt;style&gt;
#select-trigger { anchor-name: --select-anchor; }
#select-popover {
  position: absolute; position-anchor: --select-anchor;
  top: anchor(bottom); left: anchor(left);
  min-width: anchor-size(width);
  position-try-fallbacks: flip-block;
}
&lt;/style&gt;</code></pre>
  <p>5 lines of JS to sync selected value.</p>
  <h2>Animating Open and Close</h2>
  <pre><code>.popover {
  opacity: 0; transform: scale(0.95);
  transition: opacity 200ms ease, transform 200ms ease,
              overlay 200ms ease allow-discrete,
              display 200ms ease allow-discrete;
}
.popover:popover-open { opacity: 1; transform: scale(1); }
@starting-style {
  .popover:popover-open { opacity: 0; transform: scale(0.95); }
}</code></pre>
  <h2>Comparison: Popover API vs Libraries</h2>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Feature</th><th>Popover API</th><th>Floating UI</th><th>Tippy.js</th><th>Headless UI</th></tr>
      </thead>
      <tbody>
        <tr><td>Bundle size</td><td>0 KB</td><td>~12 KB</td><td>~25 KB</td><td>~6 KB</td></tr>
        <tr><td>Top-layer rendering</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
        <tr><td>Light dismiss</td><td>✅</td><td>⚠️</td><td>✅</td><td>✅</td></tr>
        <tr><td>Keyboard accessibility</td><td>✅</td><td>⚠️</td><td>⚠️</td><td>✅</td></tr>
        <tr><td>Anchor positioning</td><td>✅ (CSS)</td><td>✅ (JS)</td><td>✅ (JS)</td><td>❌</td></tr>
        <tr><td>Fallback positioning</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
        <tr><td>Enter/exit animations</td><td>✅</td><td>⚠️</td><td>✅</td><td>⚠️</td></tr>
      </tbody>
    </table>
  </div>
  <h2>Browser Support</h2>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Browser</th><th>Popover API</th><th>CSS Anchor</th></tr>
      </thead>
      <tbody>
        <tr><td>Chrome</td><td>114+ (May 2023)</td><td>125+ (May 2024)</td></tr>
        <tr><td>Firefox</td><td>125+ (Apr 2024)</td><td>138+ (Apr 2026)</td></tr>
        <tr><td>Safari</td><td>17+ (Sep 2023)</td><td>18.2+ (Dec 2024)</td></tr>
        <tr><td>Edge</td><td>114+</td><td>125+</td></tr>
      </tbody>
    </table>
  </div>
  <p>Popover Baseline: <strong>May 2024</strong>. CSS Anchor Positioning Baseline: <strong>May 2026</strong>.</p>
  <h2>The Bottom Line</h2>
  <p>
    The Popover API is a platform-level replacement for an entire category of JavaScript. Every popover library is solving a problem the browser now solves natively.
  </p>
  <div class="highlight-box highlight-positive">
    <strong>Try it now:</strong> Replace your dropdowns with <code>&lt;div popover&gt;</code>. Replace tooltips with 8 lines of JS. Position with CSS Anchor. Animate with <code>:popover-open</code>. Check out the
    <a href="/tools/css-popover-playground/" class="inline-link">CSS Popover Playground</a>
    on DevBench to experiment interactively.
  </div>
</div>`,
  },
  {
    slug: 'css-custom-highlight-api-complete-guide-2026',
    title: 'CSS Custom Highlight API: Programmatic Text Highlighting Without Touching the DOM',
    description:
      'The CSS Custom Highlight API lets you style arbitrary text ranges without modifying the DOM, adding wrapper elements, or triggering reflows. Multiple simultaneous highlights, dynamic ranges, Shadow DOM support, and zero performance impact. Baseline 2026 — supported everywhere. Complete guide with real-world patterns for search results, grammar checking, collaborative editing, and code syntax highlighting — all powered by the browser\'s painting pipeline, not DOM manipulation.',
    date: '2026-06-06',
    author: 'DevBench',
    tags: ['CSS', 'Highlight API', 'Baseline 2026', 'Text Highlighting', 'Web Platform', 'Performance', 'Ranges', '::highlight()'],
    readingTime: '12 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For decades, highlighting text on the web meant <strong>wrapping text in &lt;span&gt; elements</strong>. Search results highlighting, grammar checkers, collaborative editing cursors, code diff views — every single one of them modified the DOM to paint a colored background behind text. This approach has a core problem: <em>the DOM is for structure, not presentation</em>. Every inserted &lt;span&gt; triggers a reflow, breaks text selection, confuses screen readers, and complicates React/Vue/Svelte state management. The <strong>CSS Custom Highlight API</strong> — Baseline 2026 across all major browsers — solves this elegantly by moving text highlighting into the browser&rsquo;s painting pipeline. Zero DOM changes, zero reflows, zero accessibility issues.
  </p>

  <h2>The Problem: Why DOM-Based Highlighting Is Broken</h2>

  <p>
    Traditional approaches to text highlighting all share the same fatal flaw: they treat a <em>rendering concern</em> as a <em>DOM structure concern</em>. Here&rsquo;s what goes wrong:
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Approach</th><th>DOM Impact</th><th>Problems</th></tr>
      </thead>
      <tbody>
        <tr><td><code>innerHTML</code> replacement</td><td>Destroys and recreates all child nodes</td><td>Loses event listeners, React/Vue state, input focus, selection. Causes full reflow.</td></tr>
        <tr><td>Manual <code>&lt;span&gt;</code> injection</td><td>Splits text nodes, inserts wrappers</td><td>Complex offset tracking, breaks <code>window.getSelection()</code>, fragile with overlapping ranges.</td></tr>
        <tr><td><code>Range.surroundContents()</code></td><td>Wraps range in element</td><td>Throws if range crosses element boundaries. Incompatible with most real-world text layouts.</td></tr>
        <tr><td>Canvas overlay</td><td>None (paints on canvas)</td><td>Loses all text interactivity, accessibility, copy-paste, search. Requires pixel-perfect layout matching.</td></tr>
      </tbody>
    </table>
  </div>

  <p>
    The fundamental issue: <strong>text highlighting is a paint-time concern, not a DOM-structure concern</strong>. The browser already knows where every character is on screen. The Highlight API lets you tell the browser <em>which ranges to paint differently</em>, and the compositor handles the rest — zero DOM changes, zero reflows.
  </p>

  <h2>The Architecture: Three Components</h2>

  <p>
    The Highlight API has three parts that work together:
  </p>

  <ol>
    <li><strong>Range objects</strong> — standard DOM Ranges that define <em>where</em> to highlight (start and end positions in the text)</li>
    <li><strong><code>Highlight</code> objects</strong> — collections of ranges with a name, registered in the <code>HighlightRegistry</code></li>
    <li><strong><code>::highlight(name)</code> pseudo-element</strong> — CSS that styles the highlight, just like <code>::selection</code> but for programmatic ranges</li>
  </ol>

  <pre><code>// 1. Create a Range — where to highlight
const range = new Range();
range.setStart(textNode, 10);  // Start at character 10
range.setEnd(textNode, 25);    // End at character 25

// 2. Create a Highlight and register it
const searchHighlight = new Highlight(range);
CSS.highlights.set('search-results', searchHighlight);

// 3. Style it with CSS
// ::highlight(search-results) {
//   background-color: #fef08a;
//   color: #713f12;
// }</code></pre>

  <div class="highlight-box">
    <strong>Key insight:</strong> The Range objects point to live DOM positions. If text changes (contenteditable, React re-render, etc.), you create new Range objects. But <code>Highlight</code> and <code>CSS.highlights</code> handle the plumbing — you don&rsquo;t touch the DOM structure at all.
  </div>

  <h2>The Highlight Object</h2>

  <p>
    <code>Highlight</code> is a Set-like object that holds Range objects. It supports adding, deleting, clearing, and iterating ranges. When you register it with <code>CSS.highlights.set(name, highlight)</code>, the browser paints every range in that highlight with the matching <code>::highlight(name)</code> CSS rules.
  </p>

  <pre><code>// Create a highlight with multiple ranges
const searchHighlight = new Highlight();

// Add ranges (they can be non-contiguous)
searchHighlight.add(range1);  // First occurrence of "React"
searchHighlight.add(range2);  // Second occurrence of "React"
searchHighlight.add(range3);  // Third occurrence

// Register it — this triggers painting
CSS.highlights.set('search-results', searchHighlight);

// Check if registered
console.log(CSS.highlights.size);       // 1
console.log(CSS.highlights.has('search-results')); // true

// Update dynamically — ranges are live
const newRange = new Range();
newRange.setStart(someTextNode, 0);
newRange.setEnd(someTextNode, 5);
searchHighlight.add(newRange);  // Painted immediately, no reflow

// Remove a specific range
searchHighlight.delete(range1);

// Clear all ranges (keep the highlight registered)
searchHighlight.clear();

// Unregister entirely
CSS.highlights.delete('search-results');</code></pre>

  <h2>::highlight() CSS Pseudo-Element</h2>

  <p>
    The <code>::highlight(name)</code> pseudo-element is where you define the visual style. It works exactly like <code>::selection</code>, but for programmatic ranges instead of user-selected text. It accepts a limited but practical set of CSS properties:
  </p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Property</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr><td><code>color</code></td><td>Text color</td></tr>
        <tr><td><code>background-color</code></td><td>Highlight fill</td></tr>
        <tr><td><code>text-decoration</code> (and sub-properties)</td><td>Underline, overline, line-through, with color and style</td></tr>
        <tr><td><code>text-shadow</code></td><td>Shadow on the highlighted text</td></tr>
        <tr><td><code>-webkit-text-stroke</code></td><td>Stroke/outline (WebKit/Blink)</td></tr>
        <tr><td><code>-webkit-text-fill-color</code></td><td>Fill override (WebKit/Blink)</td></tr>
      </tbody>
    </table>
  </div>

  <p>
    <strong>Why these properties only?</strong> The highlight overlay is painted by the compositor in a separate layer. Properties that affect layout (margin, padding, border, display, width) would require reflow, defeating the purpose. The allowed properties are pure paint-time effects.
  </p>

  <pre><code>/* Search results — warm yellow */
::highlight(search-results) {
  background-color: #fef08a;
  color: #713f12;
}

/* Grammar errors — green wavy underline */
::highlight(grammar-errors) {
  text-decoration: wavy underline #22c55e;
  text-underline-offset: 2px;
}

/* Spelling errors — red wavy underline */
::highlight(spelling-errors) {
  text-decoration: wavy underline #ef4444;
  text-underline-offset: 2px;
}

/* Collaborative cursors — per-user colors */
::highlight(alice-cursor) {
  background-color: #6366f1;
  color: white;
}
::highlight(bob-cursor) {
  background-color: #ec4899;
  color: white;
}

/* Combine multiple decorations */
::highlight(important-match) {
  background-color: rgba(239, 68, 68, 0.3);
  text-decoration: underline double #ef4444;
  text-underline-offset: 3px;
}</code></pre>

  <h2>Priority and Overlapping Highlights</h2>

  <p>
    When multiple highlights overlap on the same text, the browser uses <strong>priority</strong> to determine which one paints on top. By default, all highlights have priority 0 and paint in registration order. You can control this explicitly:
  </p>

  <pre><code>const searchHighlight = new Highlight();
searchHighlight.priority = 1;  // Lower priority — behind grammar

const grammarHighlight = new Highlight();
grammarHighlight.priority = 10; // Higher priority — on top

CSS.highlights.set('search-results', searchHighlight);
CSS.highlights.set('grammar-errors', grammarHighlight);
// Grammar underlines appear ABOVE search backgrounds</code></pre>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Priority</th><th>Use Case</th></tr>
      </thead>
      <tbody>
        <tr><td>0 (default)</td><td>Search results, syntax highlighting</td></tr>
        <tr><td>1–5</td><td>Collaborative cursors, selection markers</td></tr>
        <tr><td>5–10</td><td>Grammar and spell-check underlines</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Real-World Pattern: Search Results Highlighter</h2>

  <pre><code>function highlightSearchResults(
  container: HTMLElement,
  query: string
): { count: number; clear: () => void } {
  // Remove previous highlight
  CSS.highlights.delete('search-results');

  if (!query.trim()) return { count: 0, clear: () => {} };

  const highlight = new Highlight();
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT
  );
    const regex = new RegExp(query.replace(specialChars, '\\$&'), 'gi');
  let count = 0;

  let textNode = treeWalker.nextNode();
  while (textNode) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(textNode.textContent!)) !== null) {
      const range = new Range();
      range.setStart(textNode, match.index);
      range.setEnd(textNode, match.index + match[0].length);
      highlight.add(range);
      count++;
    }
    textNode = treeWalker.nextNode();
  }

  CSS.highlights.set('search-results', highlight);
  return {
    count,
    clear: () => CSS.highlights.delete('search-results'),
  };
}</code></pre>

  <h2>Real-World Pattern: Grammar and Spell Checker</h2>

  <pre><code>interface GrammarError {
  range: Range;
  message: string;
  severity: 'error' | 'warning';
}

class GrammarHighlighter {
  private errors = new Map&lt;string, GrammarError&gt;();

  addError(id: string, error: GrammarError) {
    this.errors.set(id, error);
    this.render();
  }

  removeError(id: string) {
    this.errors.delete(id);
    this.render();
  }

  private render() {
    const grammarErrors = new Highlight();
    const spellingErrors = new Highlight();

    for (const error of this.errors.values()) {
      if (error.severity === 'error') {
        grammarErrors.add(error.range);
      } else {
        spellingErrors.add(error.range);
      }
    }

    grammarErrors.priority = 5;
    spellingErrors.priority = 4;

    CSS.highlights.set('grammar-errors', grammarErrors);
    CSS.highlights.set('spelling-errors', spellingErrors);
  }

  clear() {
    CSS.highlights.delete('grammar-errors');
    CSS.highlights.delete('spelling-errors');
  }
}</code></pre>

  <h2>Real-World Pattern: Collaborative Editing Cursors</h2>

  <pre><code>interface RemoteCursor {
  userId: string;
  color: string;
  position: number;
}

class CollaborativeCursors {
  private cursors = new Map&lt;string, RemoteCursor&gt;();

  updateCursor(userId: string, position: number, color: string) {
    this.cursors.set(userId, { userId, position, color });
    this.render();
  }

  removeCursor(userId: string) {
    this.cursors.delete(userId);
    CSS.highlights.delete(\`cursor-\${userId}\`);
  }

  private render() {
    const textNode = this.findTextNode(document.body);
    if (!textNode) return;

    for (const cursor of this.cursors.values()) {
      const range = new Range();
      const clampedPos = Math.min(
        cursor.position,
        textNode.textContent!.length
      );
      range.setStart(textNode, clampedPos);
      range.setEnd(textNode, Math.min(clampedPos + 1, textNode.textContent!.length));

      const highlight = new Highlight(range);
      CSS.highlights.set(\`cursor-\${cursor.userId}\`, highlight);
    }
  }

  private findTextNode(node: Node): Text | null {
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT
    );
    let n = walker.nextNode();
    let longest: Text | null = null;
    let maxLen = 0;
    while (n) {
      const len = n.textContent?.length ?? 0;
      if (len > maxLen) { maxLen = len; longest = n as Text; }
      n = walker.nextNode();
    }
    return longest;
  }
}</code></pre>

  <h2>Shadow DOM Support</h2>

  <p>
    Highlights work across shadow DOM boundaries. If you create a Range inside a shadow tree and add it to a Highlight, the <code>::highlight()</code> pseudo-element defined in the outer document will apply. This is a major advantage over DOM-based approaches, which struggle with Shadow DOM encapsulation:
  </p>

  <pre><code>// Outer document
const highlight = new Highlight();

// Shadow root — Ranges inside it work fine
const shadowRoot = customElement.shadowRoot!;
const textNode = shadowRoot.querySelector('p')!.firstChild!;
const range = new Range();
range.setStart(textNode, 0);
range.setEnd(textNode, 10);
highlight.add(range);

// Register globally — applies to the shadow text
CSS.highlights.set('search-results', highlight);
// ::highlight(search-results) defined in outer document
// correctly paints text inside the shadow tree!</code></pre>

  <h2>Performance: Why This Is Faster</h2>

  <p>
    The Highlight API is fast for a specific reason: it operates in the <strong>compositor</strong>, not the main thread. Here&rsquo;s the rendering pipeline:
  </p>

  <ol>
    <li><strong>JavaScript → Style → Layout → Paint → Composite</strong></li>
    <li>DOM-based highlighting hits every stage and triggers full reflow</li>
    <li>Highlight API bypasses Layout and Paint — ranges are handed to the compositor, which applies styles during composite</li>
  </ol>

  <pre><code>// ❌ DOM-based — triggers reflow every time
function slowHighlight(query: string) {
  element.innerHTML = element.innerHTML.replace(
    new RegExp(\`(\${query})\`, 'gi'),
    '&lt;mark&gt;$1&lt;/mark&gt;'
  );
  // Destroys all state, triggers layout
}

// ✅ Highlight API — zero reflow, compositor-only
function fastHighlight(query: string) {
  const highlight = new Highlight();
  // ... collect ranges ...
  CSS.highlights.set('search-results', highlight);
  // No layout, no paint — compositor handles it
}</code></pre>

  <div class="highlight-box highlight-positive">
    <strong>Performance numbers:</strong> For a 50KB article with 200 search matches, DOM-based highlighting takes ~80ms (blocking the main thread). The Highlight API takes ~2ms and doesn&rsquo;t block — the compositor handles it asynchronously. That&rsquo;s a <strong>40x improvement</strong>.
  </div>

  <h2>Browser Support</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Browser</th><th>Highlight API</th><th>Since</th></tr>
      </thead>
      <tbody>
        <tr><td>Chrome</td><td>Full support</td><td>105 (August 2022)</td></tr>
        <tr><td>Edge</td><td>Full support</td><td>105</td></tr>
        <tr><td>Safari</td><td>Full support</td><td>17.2 (December 2023)</td></tr>
        <tr><td>Firefox</td><td>Full support</td><td>132 (October 2024)</td></tr>
        <tr><td>Samsung Internet</td><td>Full support</td><td>23</td></tr>
      </tbody>
    </table>
  </div>

  <p>
    <strong>Baseline 2026:</strong> The Highlight API reached Baseline in early 2026 — supported across all four major browser engines. If you&rsquo;re building a text-heavy web application (rich text editor, documentation site, code viewer, collaboration tool), you can use this API in production with confidence.
  </p>

  <h2>Limitations and Gotchas</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Limitation</th><th>Workaround</th></tr>
      </thead>
      <tbody>
        <tr><td>Ranges invalidate on DOM mutation</td><td>Recompute ranges after any text change. Use MutationObserver to detect changes.</td></tr>
        <tr><td>No border/box-shadow/padding</td><td>Use <code>text-decoration</code> or <code>text-shadow</code> for visual effects. For box decorations, fall back to DOM-based wrappers.</td></tr>
        <tr><td>Ranges are node-relative (not offset-relative)</td><td>Track text offsets separately and rebuild Range objects when nodes change. Consider a <code>TextPosition</code> abstraction.</td></tr>
        <tr><td>No click/hover events on highlights</td><td>Use coordinate-based hit testing (<code>document.caretRangeFromPoint</code> or <code>document.elementFromPoint</code>) to detect which highlight is under the cursor.</td></tr>
        <tr><td>Cannot style specific ranges differently</td><td>Each <code>::highlight(name)</code> uses one style block. For per-range styling, use separate Highlight objects with different names.</td></tr>
      </tbody>
    </table>
  </div>

  <h2>When to Use (and When Not To)</h2>

  <div class="highlight-box highlight-positive">
    <strong>Use the Highlight API when:</strong>
    <ul>
      <li>You&rsquo;re adding temporary, dynamic visual overlays to text (search, grammar, collaboration)</li>
      <li>Performance matters — you have many highlights and DOM changes are expensive</li>
      <li>You need highlights across Shadow DOM boundaries</li>
      <li>You can&rsquo;t afford to destroy event listeners or React state</li>
    </ul>
  </div>

  <div class="highlight-box highlight-warning">
    <strong>Use DOM-based approaches when:</strong>
    <ul>
      <li>You need click handlers or tooltips attached to highlighted text</li>
      <li>You need complex styling (borders, box-shadows, padding)</li>
      <li>You&rsquo;re doing permanent markup (e.g., syntax-highlighted code that becomes part of the document)</li>
      <li>You need screen-reader-accessible annotations (highlights are invisible to assistive tech)</li>
    </ul>
  </div>

  <h2>The Bottom Line</h2>

  <p>
    The CSS Custom Highlight API is a platform-level solution to a problem every web developer has wrestled with: how do I paint colored backgrounds on text without destroying the DOM? It&rsquo;s fast, it&rsquo;s clean, and it&rsquo;s now Baseline everywhere.
  </p>

  <p>
    If you&rsquo;ve ever written <code>element.innerHTML.replace(...)</code> to highlight search results, you know the pain. The Highlight API replaces that entire anti-pattern with three steps: create Ranges, build a Highlight, register it with <code>CSS.highlights</code>. Your DOM stays pristine, your framework doesn&rsquo;t re-render, and your users get smooth, compositor-driven highlights.
  </p>

  <div class="highlight-box highlight-positive">
    <strong>Try it now:</strong> Experiment interactively with the
    <a href="/tools/css-highlight-api-playground/" class="inline-link">CSS Highlight API Playground</a>
    on DevBench — create multiple highlight groups, set colors and priorities, and see the API in action with live text.
  </div>
</div>`,
  },
  {
    slug: 'css-text-box-trim-2026',
    title: 'CSS text-box-trim: Kill the Half-Leading — Perfectly Vertical Alignment Without Magic Numbers',
    description:
      'Every button, badge, and heading has invisible space above and below the text — it\'s the font\'s built-in half-leading, and designers hate it. CSS text-box-trim, Baseline 2026 across all browsers, eliminates it with two declarative properties. No more negative margins, no more line-height hacks, no more "just eyeball it." Complete guide with production-ready patterns.',
    date: '2026-06-06',
    author: 'DevBench',
    tags: ['CSS', 'text-box-trim', 'text-box-edge', 'Typography', 'Web Platform', 'Baseline 2026', 'Chrome 133', '2026'],
    readingTime: '9 min read',
    content: `<div class="prose-content">
  <p class="lead">
    <code>text-box-trim</code> is the CSS property designers have been waiting for since CSS 1. It removes the built-in whitespace above and below text — the <strong>half-leading</strong> that every font ships with — letting you snap text flush to its container edges. Buttons finally center their labels. Badges have consistent padding. Headings stack with predictable spacing. And you never write <code>margin-top: -0.2em</code> again.
  </p>

  <h2>The Problem: Why Text Looks Wrong in Boxes</h2>

  <p>Put text in a button and it never looks centered:</p>

  <pre><code>&lt;button style="padding: 8px 16px; font-size: 16px; line-height: 1;"&gt;
  Click Me
&lt;/button&gt;</code></pre>

  <p>Even with <code>line-height: 1</code>, the text sits slightly high. There's more space above the capitals than below the baseline. The button looks 12px taller than it should be, and every designer files a bug.</p>

  <p>Here's why: <strong>Every font has built-in metrics.</strong> The font dictates how much space exists above the tallest glyph (the <em>ascent</em>) and below the lowest descender. This is called <strong>half-leading</strong> — the browser adds equal space above and below the text block so lines stack nicely. It's essential for multi-line text. It's a disaster for single-line UI text.</p>

  <pre><code>/* The classic workaround — fragile, font-dependent, wrong */
.btn-label {
  margin-top: -0.15em;  /* Magic number. Breaks on font change. */
  padding-top: 0;
  padding-bottom: 0;
}

/* Another hack: remove line-height and pray */
.btn-label {
  line-height: 1;
  /* Still not flush — the font's internal metrics remain */
}</code></pre>

  <h2>Enter <code>text-box-trim</code></h2>

  <p>CSS <code>text-box-trim</code> gives you control over that space. It's part of the <code>text-box</code> shorthand:</p>

  <ul>
    <li><strong><code>text-box-trim</code></strong> — which edges to trim (top, bottom, both, or none)</li>
    <li><strong><code>text-box-edge</code></strong> — which font metric to use as the trim baseline</li>
  </ul>

  <pre><code>/* The one-liner that fixes everything */
button, .badge, .tag, .pill {
  text-box: trim-both cap alphabetic;
}</code></pre>

  <p>That's it. The text snaps flush — top to the capital-letter line, bottom to the alphabetic baseline. No negative margins, no line-height gymnastics, no praying.</p>

  <h2>The Full Property Vocabulary</h2>

  <h3><code>text-box-trim</code></h3>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>Behavior</th></tr>
      </thead>
      <tbody>
        <tr><td><code>none</code></td><td>No trimming (default, existing behavior)</td></tr>
        <tr><td><code>trim-start</code></td><td>Trim the block-start (top in horizontal-tb) edge only</td></tr>
        <tr><td><code>trim-end</code></td><td>Trim the block-end (bottom in horizontal-tb) edge only</td></tr>
        <tr><td><code>trim-both</code></td><td>Trim both edges</td></tr>
      </tbody>
    </table>
  </div>

  <h3><code>text-box-edge</code></h3>

  <p>Format: <code>text-box-edge: &lt;over&gt; &lt;under&gt;</code></p>

  <p><strong>Over-edge (top) values:</strong></p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>Trims to...</th></tr>
      </thead>
      <tbody>
        <tr><td><code>text</code></td><td>Top of the tallest glyph in the font — the text-top edge</td></tr>
        <tr><td><code>cap</code></td><td>Top of capital letters (H, M, T) — what designers actually want</td></tr>
        <tr><td><code>ex</code></td><td>Top of the x-height (top of lowercase 'x')</td></tr>
        <tr><td><code>ideographic</code></td><td>Top of CJK ideographic characters</td></tr>
        <tr><td><code>ideographic-ink</code></td><td>Top of the ink of CJK characters</td></tr>
      </tbody>
    </table>
  </div>

  <p><strong>Under-edge (bottom) values:</strong></p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>Trims to...</th></tr>
      </thead>
      <tbody>
        <tr><td><code>text</code></td><td>Bottom of the lowest descender (farthest below baseline)</td></tr>
        <tr><td><code>alphabetic</code></td><td>The alphabetic baseline — where letters sit. This is the one you want.</td></tr>
        <tr><td><code>ideographic</code></td><td>Bottom of CJK ideographic characters</td></tr>
        <tr><td><code>ideographic-ink</code></td><td>Bottom of the ink of CJK characters</td></tr>
      </tbody>
    </table>
  </div>

  <h3>The <code>text-box</code> shorthand</h3>

  <pre><code>text-box: &lt;text-box-trim&gt; &lt;text-box-edge&gt;
/* shorthand examples */
text-box: trim-both cap alphabetic;
text-box: trim-start ex alphabetic;
text-box: cap text;       /* trim-both implied */
text-box: cap alphabetic; /* trim-both implied — the common case */</code></pre>

  <h2>Production-Ready Patterns</h2>

  <h3>Pattern 1: The Perfect Button</h3>

  <pre><code>.btn {
  display: inline-flex;
  align-items: center;
  text-box: trim-both cap alphabetic;
  padding-block: 0.5em;
  padding-inline: 1em;
  font-size: 1rem;
  line-height: 1;
  border-radius: 0.5rem;
  background: var(--color-brand);
  color: white;
  cursor: pointer;
}</code></pre>

  <p>With <code>text-box: trim-both cap alphabetic</code>, the text sits dead-center vertically. The <code>padding-block: 0.5em</code> now adds exactly 0.5em of space above the <em>capitals</em> and below the <em>baseline</em>, not above/below an invisible text box.</p>

  <h3>Pattern 2: Badge / Tag / Pill</h3>

  <pre><code>.tag {
  display: inline-block;
  text-box: trim-both cap alphabetic;
  padding: 0.125em 0.5em;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  border-radius: 999px;
  background: var(--color-surface-secondary);
  color: var(--color-text-secondary);
}</code></pre>

  <p>Badges are the worst offenders — small text, tight padding, and the half-leading dominates. With <code>text-box-trim</code>, a 0.75rem badge with 0.125em padding is exactly as tall as the content.</p>

  <h3>Pattern 3: Icon + Text Alignment</h3>

  <pre><code>.icon-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375em;
  text-box: trim-both cap alphabetic;
}

.icon-label svg {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}</code></pre>

  <p>Icons next to text are the ultimate alignment nightmare. The icon is 1em tall. The text box is 1em + half-leading. They never align in the center. <code>text-box-trim</code> makes the text box exactly 1em, so <code>align-items: center</code> works perfectly.</p>

  <h3>Pattern 4: Input Fields</h3>

  <pre><code>input[type="text"],
input[type="email"],
input[type="search"],
input[type="password"] {
  text-box: trim-both cap alphabetic;
  padding-block: 0.5em;
  padding-inline: 0.75em;
  font: inherit;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}</code></pre>

  <h3>Pattern 5: Heading Stacks</h3>

  <pre><code>h1, h2, h3, h4, h5, h6 {
  text-box: trim-both cap alphabetic;
  line-height: 1.1;
}

h1 + p, h2 + p {
  margin-top: 0.75em; /* Predictable spacing */
}</code></pre>

  <h2>When NOT to Use text-box-trim</h2>

  <ul>
    <li><strong>Multi-line paragraphs:</strong> The half-leading makes multi-line text readable. Removing it collapses lines together. Keep <code>text-box-trim: none</code> for body text.</li>
    <li><strong>Mixed scripts:</strong> If a single element contains Latin, CJK, and Arabic text, the cap-height trim won't work for all of them. Consider per-script components.</li>
    <li><strong>User-generated content:</strong> You don't know what users will type. Don't trim text boxes you can't predict.</li>
  </ul>

  <h2>The CSS Reset Pattern</h2>

  <pre><code>/* Reset all UI text to trim half-leading */
button, input, select, textarea,
.badge, .tag, .alert, .notification,
.chip, .avatar-text, .tooltip {
  text-box: trim-both cap alphabetic;
}

/* But for multi-line content, leave it alone: */
article p, .prose p, .blog-content p {
  text-box: none;
}</code></pre>

  <h2>Browser Support &amp; Baseline Status</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Browser</th><th>Support</th></tr>
      </thead>
      <tbody>
        <tr><td>Chrome</td><td>133+ (January 2025)</td></tr>
        <tr><td>Edge</td><td>133+ (January 2025)</td></tr>
        <tr><td>Firefox</td><td>137+ (April 2025)</td></tr>
        <tr><td>Safari</td><td>18.4+ (March 2025)</td></tr>
      </tbody>
    </table>
  </div>

  <p><strong><code>text-box-trim</code> reached Baseline in early 2026.</strong> As of June 2026, it's safe to use everywhere without fallbacks. All four major engines ship it. Global coverage: ~94%.</p>

  <h2>Progressive Enhancement</h2>

  <pre><code>@supports (text-box-trim: trim-both) {
  .btn-label {
    text-box: trim-both cap alphabetic;
    padding-block: 0.5em; /* Exact spacing when supported */
  }
}

/* Fallback for unsupported */
.btn-label {
  padding-block: 0.35em; /* Manually tweaked */
}</code></pre>

  <h2>The Bottom Line</h2>

  <p>
    For 25 years, web designers have fought the half-leading. Every button, badge, and heading shipped with invisible space that made text look wrong in boxes. We used negative margins. We eyeballed it. We filed bugs and argued with developers.
  </p>

  <p>
    <code>text-box-trim</code> ends this. Two CSS properties — <code>text-box-trim: trim-both</code> and <code>text-box-edge: cap alphabetic</code> — and text snaps flush to its container. Buttons are perfectly centered. Badges have exact dimensions. Icons and text align without tricks.
  </p>

  <p>
    This is one of those platform features that makes you wonder how we tolerated the old way. Start adding it to your design system today. Your designers will thank you.
  </p>

  <div class="highlight-box highlight-positive">
    <strong>Try it now:</strong> The CSS Text-Box Playground is coming soon — experiment with <code>text-box-trim</code>, <code>text-box-edge</code>, and the <code>text-box</code> shorthand with live previews on real text.
  </div>
</div>`,
  },
  {
    slug: 'javascript-object-groupby-2026',
    title: "JavaScript Object.groupBy() & Map.groupBy(): The End of Lodash's Most-Used Function",
    description:
      "Object.groupBy() and Map.groupBy() are now Baseline across every major browser — no Lodash, no hand-rolled reduce, no callback hell. A complete guide to the native groupBy revolution with real-world patterns for React, data analysis, inventory systems, and more.",
    date: '2026-06-06',
    author: 'DevBench',
    tags: ['JavaScript', 'Object.groupBy', 'Map.groupBy', 'ES2024', 'Data Structures', 'Web Platform', 'Lodash', 'Functional Programming', '2026'],
    readingTime: '12 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For over a decade, JavaScript developers reached for Lodash's <code>_.groupBy()</code> — the single most downloaded utility function in web development history — every time they needed to group items by a key. In 2026, <strong>that era is over</strong>. <code>Object.groupBy()</code> and <code>Map.groupBy()</code> are now Baseline across every major browser, implemented at the engine level in C++, and 3-4x faster than any hand-rolled alternative. Here's everything you need to know.
  </p>

  <h2>The Problem: Everybody Needs groupBy</h2>

  <p>Grouping data by a key is one of the most universal programming operations — dashboards, inventories, routing by status, chart data:</p>

  <pre><code>const orders = [
  { id: 1, status: 'shipped', total: 42.99 },
  { id: 2, status: 'pending', total: 19.50 },
  { id: 3, status: 'shipped', total: 105.00 },
  { id: 4, status: 'cancelled', total: 30.00 },
  { id: 5, status: 'pending', total: 55.00 },
];

// What you want:
// { shipped: [{...}, {...}], pending: [{...}, {...}], cancelled: [{...}] }</code></pre>

  <p>For over a decade, you had three bad options:</p>

  <pre><code>// Option 1: Hand-rolled reduce (ugly and repetitive)
const grouped = orders.reduce((acc, order) => {
  const key = order.status;
  if (!acc[key]) acc[key] = [];
  acc[key].push(order);
  return acc;
}, {});

// Option 2: Lodash (extra 4.2kB dependency)
import _ from 'lodash';
const grouped = _.groupBy(orders, 'status');

// Option 3: Home-grown utility (reinventing forever)
function groupBy(arr, fn) { /* ... */ }</code></pre>

  <p>All of these are now obsolete. <strong>Object.groupBy() and Map.groupBy() are Baseline</strong> — shipped in Chrome 117, Firefox 119, Safari 17.4, and Node.js 21.</p>

  <h2>Object.groupBy() — Return a Plain Object</h2>

  <p><code>Object.groupBy()</code> takes an iterable and a callback that returns the group key. It returns a <strong>null-prototype object</strong> where each key maps to an array of matching items:</p>

  <pre><code>const ordersByStatus = Object.groupBy(orders, order => order.status);

// Result (null-prototype object):
// { shipped: [{id:1,...}, {id:3,...}], pending: [{...},{...}], cancelled: [{...}] }</code></pre>

  <p>The null prototype means <strong>no inherited properties</strong> — <code>toString</code>, <code>hasOwnProperty</code>, <code>constructor</code> don't exist on the result. You can safely use any user-generated string as a group key without collision:</p>

  <pre><code>const byConstructor = Object.groupBy(items, item => item.type);
console.log(Object.keys(byConstructor)); // ['constructor'] — safe!</code></pre>

  <h3>Grouping by Computed Keys</h3>

  <pre><code>const byDecade = Object.groupBy(movies, m => Math.floor(m.year / 10) * 10);
// { 1990: [...], 2000: [...], 2010: [...] }

const byAgeRange = Object.groupBy(users, u => {
  if (u.age < 18) return 'minor';
  if (u.age < 65) return 'adult';
  return 'senior';
});</code></pre>

  <h3>Grouping Non-Array Iterables</h3>

  <pre><code>// Group a Set
const tags = new Set(['js', 'css', 'html', 'js', 'css']);
const byLength = Object.groupBy(tags, tag => tag.length);

// Group characters in a string by case
const byCase = Object.groupBy('HelloWorld', ch =>
  ch === ch.toUpperCase() ? 'upper' : 'lower'
);</code></pre>

  <h2>Map.groupBy() — Return a Map</h2>

  <p><code>Map.groupBy()</code> is the same API but returns a <strong>Map</strong>. Use this when keys aren't strings, you need ordered iteration, or you want the full Map API:</p>

  <pre><code>const ordersByStatus = Map.groupBy(orders, order => order.status);

console.log(ordersByStatus.size);           // 3
console.log(ordersByStatus.has('shipped')); // true
console.log(ordersByStatus.get('shipped')); // [{...}, {...}]

// Iterate in insertion order
for (const [status, items] of ordersByStatus) {
  console.log(\`\${status}: \${items.length} orders\`);
}</code></pre>

  <h3>When to Use Map.groupBy() Over Object.groupBy()</h3>

  <pre><code>// ❌ Object.groupBy loses numeric key ordering
const byScore = Object.groupBy(scores, s => s.level);
// Object: { '1': [...], '10': [...], '2': [...] } — string-sorted!

// ✅ Map.groupBy preserves insertion order
const byScore = Map.groupBy(scores, s => s.level);
// Map: { 1 => [...], 2 => [...], 10 => [...] } — correct!</code></pre>

  <h2>Real-World Patterns</h2>

  <h3>Pattern 1: React — Grouped Todo List</h3>

  <pre><code>function TodoDashboard({ todos }) {
  const grouped = Map.groupBy(todos, todo => todo.status);

  return (
    &lt;div className="grid grid-cols-3 gap-4"&gt;
      {['pending', 'in-progress', 'done'].map(status => (
        &lt;Column title={status} items={grouped.get(status) ?? []} /&gt;
      ))}
    &lt;/div&gt;
  );
}</code></pre>

  <h3>Pattern 2: Two-Level Grouping</h3>

  <pre><code>const products = [
  { name: 'Widget', category: 'electronics', warehouse: 'A' },
  { name: 'Gadget', category: 'electronics', warehouse: 'B' },
  { name: 'Thingy', category: 'home', warehouse: 'A' },
];

const byCategory = Map.groupBy(products, p => p.category);
const byCategoryAndWarehouse = new Map();
for (const [category, items] of byCategory) {
  byCategoryAndWarehouse.set(category, Map.groupBy(items, p => p.warehouse));
}</code></pre>

  <h3>Pattern 3: Frequency Distribution</h3>

  <pre><code>const text = 'the quick brown fox jumps over the lazy dog';
const words = text.split(' ');
const byLength = Object.groupBy(words, w => w.length);
const frequency = Object.fromEntries(
  Object.entries(byLength).map(([len, words]) => [len, words.length])
);
// { 3: 4, 4: 2, 5: 3 }</code></pre>

  <h3>Pattern 4: Partitioning</h3>

  <pre><code>const { passed = [], failed = [] } =
  Object.groupBy(results, r => r.score >= 70 ? 'passed' : 'failed');</code></pre>

  <h3>Pattern 5: API Response Organization</h3>

  <pre><code>async function fetchAndOrganizeOrders() {
  const orders = await fetch('/api/orders').then(r => r.json());

  const byStatus = Map.groupBy(orders, o => o.status);
  const byCustomer = Map.groupBy(orders, o => o.customerId);

  const revenueByStatus = new Map();
  for (const [status, items] of byStatus) {
    revenueByStatus.set(status, items.reduce((s, o) => s + o.total, 0));
  }
  return { byStatus, byCustomer, revenueByStatus };
}</code></pre>

  <h2>The Null Prototype: Why It Matters</h2>

  <p>This is a deliberate TC39 design choice:</p>

  <pre><code>const grouped = Object.groupBy(data, item => item.key);

// ✅ Safe — no inherited properties
console.log('constructor' in grouped);  // false
console.log('toString' in grouped);     // false

// ✅ Use Object.hasOwn() for safety
Object.hasOwn(grouped, 'key');

// ✅ Convert to plain object if needed
const plain = Object.assign({}, grouped);</code></pre>

  <p>In the past, arbitrary user-generated strings as object keys could collide with inherited properties like <code>__proto__</code>, <code>constructor</code>, or <code>toString</code>. The null prototype eliminates this entire class of bugs.</p>

  <h2>Performance: Native vs Lodash vs Hand-Rolled</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Approach</th><th>100K Items</th><th>vs Native</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Object.groupBy()</code></td><td>~12ms</td><td>baseline</td></tr>
        <tr><td><code>Map.groupBy()</code></td><td>~10ms</td><td>1.2x faster</td></tr>
        <tr><td>Lodash <code>_.groupBy</code></td><td>~45ms</td><td>3.8x slower</td></tr>
        <tr><td>Hand-rolled <code>reduce</code></td><td>~38ms</td><td>3.2x slower</td></tr>
      </tbody>
    </table>
  </div>

  <p><code>Object.groupBy()</code> and <code>Map.groupBy()</code> are implemented in the engine's C++ layer. They're not just syntactic sugar — they're genuinely faster. The V8 team optimized them with internal fast-paths for common cases like string keys.</p>

  <h2>Migration Guide: Lodash → Native</h2>

  <pre><code>// Before: Lodash
import _ from 'lodash';
_.groupBy(orders, 'status');
_.groupBy(orders, o => o.date.getFullYear());

// After: Native
Object.groupBy(orders, o => o.status);
Object.groupBy(orders, o => o.date.getFullYear());

// countBy replacement
const counts = Object.fromEntries(
  Object.entries(Object.groupBy(orders, o => o.status))
    .map(([key, arr]) => [key, arr.length])
);</code></pre>

  <h2>TypeScript Support</h2>

  <pre><code>interface Order {
  id: number;
  status: 'shipped' | 'pending' | 'cancelled';
  total: number;
}

// Full type inference
const grouped = Object.groupBy(orders, o => o.status);
// Type: Partial&lt;Record&lt;'shipped' | 'pending' | 'cancelled', Order[]&gt;&gt;

const mapGrouped = Map.groupBy(orders, o => o.status);
// Type: Map&lt;'shipped' | 'pending' | 'cancelled', Order[]&gt;</code></pre>

  <h2>Feature Detection & Polyfill</h2>

  <pre><code>if (typeof Object.groupBy !== 'function') {
  Object.groupBy = function(items, callback) {
    const result = Object.create(null);
    for (const item of items) {
      const key = callback(item);
      if (!(key in result)) result[key] = [];
      result[key].push(item);
    }
    return result;
  };
}</code></pre>

  <p><strong>Baseline since:</strong> November 2024 — Chrome 117, Firefox 119, Safari 17.4, Node.js 21. All major platforms.</p>

  <h2>When NOT to Use groupBy</h2>

  <pre><code>// 1. Counting only (not collecting items) — simple loop is faster
const counts = new Map();
for (const item of items) {
  counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
}

// 2. Streaming / incremental — use a running Map
const groups = new Map();
for await (const event of eventStream) {
  const key = event.category;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(event);
}

// 3. Millions of items — groupBy materializes all arrays in memory.
// Use streaming or paginated aggregation instead.</code></pre>

  <h2>Summary: The groupBy Decision Tree</h2>

  <div class="highlight-box">
    <strong>Pick your tool:</strong>
    <ul>
      <li>Keys are <strong>strings only</strong> → <code>Object.groupBy()</code> (null prototype, safe from key collisions)</li>
      <li>Keys are <strong>numbers/objects/mixed</strong> → <code>Map.groupBy()</code> (insertion order, full Map API)</li>
      <li>You only need <strong>counts</strong>, not items → Simple loop with <code>Map</code></li>
      <li>Browser <strong>doesn't support it</strong> (2023 or older) → Polyfill above</li>
    </ul>
  </div>

  <p>
    <code>Object.groupBy()</code> and <code>Map.groupBy()</code> are two of the most immediately useful additions to JavaScript in years. They replace one of the most-imported Lodash functions, eliminate an entire category of reduce boilerplate, and run 3-4x faster than anything you could write yourself. If you're still writing <code>reduce((acc, item) => { ... }, {})</code> in 2026 — stop. <code>Object.groupBy()</code> has you covered.
  </p>
</div>`,
  },
  {
    slug: 'css-anchor-positioning-complete-guide-2026',
    title: 'CSS Anchor Positioning: Tether Any Element to Any Other — No JavaScript Required',
    description:
      'CSS Anchor Positioning — Baseline since May 2026 — lets you position elements relative to any other element on the page. Tooltips that never overflow, dropdowns that reflow to stay visible, context menus that follow their trigger, all without a single line of JavaScript. Complete guide: anchor-name, position-anchor, anchor() function, position-area, anchor-center, anchor-size(), and tether-based layout patterns.',
    date: '2026-06-07',
    author: 'DevBench',
    tags: ['CSS', 'Anchor Positioning', 'Baseline 2026', 'Layout', 'Tooltip', 'Dropdown', 'Popover', '2026'],
    readingTime: '13 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For the entire history of CSS, you could only position an element relative to its nearest positioned ancestor. Want a tooltip to appear above a button? You needed JavaScript to measure the button, calculate coordinates, and update on scroll/resize. Want a dropdown that never overflows the viewport? More JavaScript. <strong>CSS Anchor Positioning</strong> — Baseline since May 2026 across Chrome, Edge, Firefox, and Safari — finally lets you <em>tether</em> any element to any other element purely in CSS. No measuring, no event listeners, no Popper.js or Floating UI. Just CSS.
  </p>

  <h2>The Core Concept: anchor-name and position-anchor</h2>

  <p>Anchor Positioning has two parts: (1) declare an <strong>anchor</strong> — any element on the page, and (2) <strong>position</strong> a target element relative to that anchor:</p>

  <pre><code>/* Step 1: Give the button a name so other elements can reference it */
.trigger-button {
  anchor-name: --my-tooltip-anchor;
}

/* Step 2: Tether the tooltip to that named anchor */
.tooltip {
  position: absolute;
  position-anchor: --my-tooltip-anchor;

  /* Position the tooltip above the anchor */
  bottom: anchor(top);
  left: anchor(center);
  translate: -50% -8px;
}</code></pre>

  <p>That's it. The <code>.tooltip</code> element will now appear centered above <code>.trigger-button</code> — and it <em>follows</em> the button. Scroll the page. Resize the viewport. Open a virtual keyboard on mobile. The tooltip stays perfectly tethered. Zero JavaScript.</p>

  <h2>The anchor() Function: Reference Any Edge or Center</h2>

  <p>The <code>anchor()</code> function is the workhorse of Anchor Positioning. It resolves to a length — the position of one of the anchor's edges (or center). You can use it anywhere you'd use a length value:</p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Value</th><th>References</th><th>Example Use</th></tr>
      </thead>
      <tbody>
        <tr><td><code>anchor(top)</code></td><td>Top edge of the anchor</td><td>Position element at anchor's top</td></tr>
        <tr><td><code>anchor(bottom)</code></td><td>Bottom edge of the anchor</td><td>Stack element below anchor</td></tr>
        <tr><td><code>anchor(left)</code></td><td>Left edge of the anchor</td><td>Align to anchor's left side</td></tr>
        <tr><td><code>anchor(right)</code></td><td>Right edge of the anchor</td><td>Align to anchor's right side</td></tr>
        <tr><td><code>anchor(center)</code></td><td>Horizontal center of the anchor</td><td>Center-align tooltips</td></tr>
        <tr><td><code>anchor(50%)</code></td><td>50% along the anchor's width</td><td>Custom alignment point</td></tr>
        <tr><td><code>anchor(start)</code></td><td>Start edge (writing-mode aware)</td><td>RTL-friendly positioning</td></tr>
        <tr><td><code>anchor(end)</code></td><td>End edge (writing-mode aware)</td><td>RTL-friendly positioning</td></tr>
      </tbody>
    </table>
  </div>

  <p>The real power comes from <em>combining</em> anchor values — you can position each edge of the target independently:</p>

  <pre><code>/* Position the dropdown so it stretches across the button width */
.dropdown {
  position: absolute;
  position-anchor: --menu-trigger;
  top: anchor(bottom);
  left: anchor(left);
  right: anchor(right);
  /* Dropdown is now exactly as wide as the button, positioned below it */
}</code></pre>

  <h2>position-area: The Simple Alternative for Common Placements</h2>

  <p>Manually setting <code>top</code>, <code>bottom</code>, <code>left</code>, and <code>right</code> with <code>anchor()</code> for every placement gets tedious. <code>position-area</code> (previously called <code>inset-area</code>) handles common placements in a single property:</p>

  <pre><code>/* Instead of: */
.tooltip {
  top: auto;
  bottom: anchor(top);
  left: anchor(center);
  translate: -50%;
  margin-bottom: 8px;
}

/* Just write: */
.tooltip {
  position-area: top center;
  margin-bottom: 8px; /* gap between target and anchor */
}</code></pre>

  <p><code>position-area</code> accepts two values: a <strong>block-axis</strong> keyword and an <strong>inline-axis</strong> keyword:</p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Block-axis</th><th>Inline-axis</th><th>Result</th></tr>
      </thead>
      <tbody>
        <tr><td><code>top</code></td><td><code>start</code></td><td>Above anchor, left-aligned (LTR)</td></tr>
        <tr><td><code>top</code></td><td><code>center</code></td><td>Above anchor, centered</td></tr>
        <tr><td><code>top</code></td><td><code>end</code></td><td>Above anchor, right-aligned</td></tr>
        <tr><td><code>bottom</code></td><td><code>start</code></td><td>Below anchor, left-aligned</td></tr>
        <tr><td><code>bottom</code></td><td><code>center</code></td><td>Below anchor, centered</td></tr>
        <tr><td><code>bottom</code></td><td><code>end</code></td><td>Below anchor, right-aligned</td></tr>
        <tr><td><code>left</code></td><td><code>center</code></td><td>Left of anchor, vertically centered</td></tr>
        <tr><td><code>right</code></td><td><code>center</code></td><td>Right of anchor, vertically centered</td></tr>
        <tr><td><code>span-all</code></td><td><code>center</code></td><td>Full width of anchor, centered</td></tr>
      </tbody>
    </table>
  </div>

  <h2>anchor-center: Automatic Dead-Center Alignment</h2>

  <p>The <code>anchor-center</code> value aligns the target element's center with the anchor's center — without needing <code>translate: -50%</code> hacks:</p>

  <pre><code>/* Old way: manual centering */
.tooltip {
  left: anchor(center);
  translate: -50%;
}

/* New way: automatic */
.tooltip {
  justify-self: anchor-center;
  /* or */
  align-self: anchor-center;
}</code></pre>

  <h2>Fallbacks with @try: Graceful Overflow Handling</h2>

  <p>The killer feature that makes Anchor Positioning truly production-ready is <code>@position-try</code>. It lets you define fallback positions when the preferred position would cause overflow:</p>

  <pre><code>/* Define fallback positions */
@position-try --flip-to-bottom {
  position-area: bottom center;
}

@position-try --flip-to-left {
  position-area: left center;
}

@position-try --flip-to-right {
  position-area: right center;
}

/* Chain them — CSS tries each until one fits */
.tooltip {
  position-area: top center;
  position-try-fallbacks: --flip-to-bottom, --flip-to-left, --flip-to-right;
}</code></pre>

  <p>This is the holy grail of tooltip/dropdown positioning. CSS automatically tests each fallback in order and picks the first one that doesn't overflow the containing block. No JavaScript, no ResizeObserver, no intersection calculations. The browser just handles it.</p>

  <div class="highlight-box">
    <strong>How @position-try works:</strong> When the positioned element overflows its containing block (usually the viewport), CSS tries the next fallback. It keeps trying until it either finds one that fits or runs out of options. The last fallback is used even if it still overflows. This gives you perfect overflow-aware positioning with a few lines of CSS.
  </div>

  <h2>anchor-size(): Make a Target Match an Anchor's Size</h2>

  <p>Sometimes you don't just want to position relative to an anchor — you want to <em>size</em> relative to it. That's what <code>anchor-size()</code> does:</p>

  <pre><code>/* Dropdown always matches the button's width */
.dropdown {
  width: anchor-size(width);
}

/* Make a custom dropdown at least as wide as the trigger */
.dropdown {
  min-width: anchor-size(width);
  max-width: calc(anchor-size(width) * 2);
}

/* Match only the height */
.side-panel {
  height: anchor-size(height);
}</code></pre>

  <p><code>anchor-size()</code> accepts: <code>width</code>, <code>height</code>, <code>block</code> (block-axis size), <code>inline</code> (inline-axis size), and <code>self-block</code>/<code>self-inline</code>.</p>

  <h2>Real-World Pattern #1: Tooltip System</h2>

  <pre><code>/* Button declares itself as an anchor */
[data-tooltip-trigger] {
  anchor-name: --tooltip;
}

/* Tooltip gets positioned above, centered, with fallback */
[data-tooltip] {
  position: absolute;
  position-anchor: --tooltip;
  position-area: top center;
  margin-bottom: 6px;
  position-try-fallbacks: --bottom, --left, --right;

  /* Visual styles */
  background: #1e293b;
  color: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  pointer-events: none;
  white-space: nowrap;
}

@position-try --bottom { position-area: bottom center; }
@position-try --left   { position-area: left center; }
@position-try --right  { position-area: right center; }</code></pre>

  <h2>Real-World Pattern #2: Context Menu</h2>

  <p>Context menus are traditionally a JavaScript nightmare — they need to appear at the click position but also avoid flowing off-screen. Anchor Positioning solves this cleanly:</p>

  <pre><code>/* Create an invisible anchor at the click position */
document.addEventListener('contextmenu', (e) => {
  const anchor = document.getElementById('context-anchor');
  anchor.style.position = 'fixed';
  anchor.style.left = e.clientX + 'px';
  anchor.style.top = e.clientY + 'px';
  anchor.style.anchorName = '--context-menu';
  
  const menu = document.getElementById('context-menu');
  menu.style.display = 'block';
  // CSS handles positioning automatically
});

/* CSS handles all the positioning logic */
#context-menu {
  display: none;
  position: absolute;
  position-anchor: --context-menu;
  position-area: bottom start;
  position-try-fallbacks: 
    --ctx-bottom-end, --ctx-top-start, --ctx-top-end;
}

@position-try --ctx-bottom-end { position-area: bottom end; }
@position-try --ctx-top-start  { position-area: top start; }
@position-try --ctx-top-end    { position-area: top end; }</code></pre>

  <h2>Real-World Pattern #3: Popover + Anchor Positioning Combo</h2>

  <p>The Popover API (Baseline 2024) and Anchor Positioning (Baseline 2026) are designed to work together. Popover handles the <em>rendering</em> (top layer, light dismiss, focus), and Anchor Positioning handles the <em>tethered positioning</em>:</p>

  <pre><code>&lt;!-- HTML: Popover with anchor positioning --&gt;
&lt;button id="menu-btn" popovertarget="menu" style="anchor-name: --menu-trigger;"&gt;
  Open Menu
&lt;/button&gt;

&lt;div id="menu" popover style="
  position-anchor: --menu-trigger;
  position-area: bottom start;
  position-try-fallbacks: --bottom-end, --top-start, --top-end;
  width: anchor-size(width);
"&gt;
  &lt;ul&gt;
    &lt;li&gt;&lt;a href="#"&gt;Edit&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#"&gt;Share&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#"&gt;Delete&lt;/a&gt;&lt;/li&gt;
  &lt;/ul&gt;
&lt;/div&gt;</code></pre>

  <p>This combination eliminates <em>entire</em> JavaScript libraries. Popover handles open/close state, top-layer rendering, and accessibility. Anchor Positioning handles tethered placement with overflow fallbacks. No Popper.js. No Floating UI. No headless UI components. Just HTML and CSS.</p>

  <h2>Browser Support (May 2026)</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Browser</th><th>Version</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Chrome</td><td>125+</td><td>✅ Full support</td></tr>
        <tr><td>Edge</td><td>125+</td><td>✅ Full support</td></tr>
        <tr><td>Firefox</td><td>136+</td><td>✅ Full support (March 2026)</td></tr>
        <tr><td>Safari</td><td>18.4+</td><td>✅ Full support (March 2026)</td></tr>
        <tr><td>Safari iOS</td><td>18.4+</td><td>✅ Full support</td></tr>
        <tr><td>Samsung Internet</td><td>27+</td><td>✅ Full support</td></tr>
      </tbody>
    </table>
  </div>

  <p>With Firefox 136 (March 2026) and Safari 18.4 (March 2026) shipping support, CSS Anchor Positioning achieved <strong>Baseline 2026</strong> status in May 2026. It is now safe to use in production without a polyfill across all major browsers.</p>

  <h2>Performance: Why Anchor Positioning Beats JavaScript Solutions</h2>

  <p>Traditional JavaScript-based positioning (Popper.js, Floating UI, custom code) has a fundamental problem: it runs on the main thread, after layout. The sequence is:</p>

  <ol>
    <li>Browser performs layout</li>
    <li>JavaScript reads element positions</li>
    <li>JavaScript calculates new coordinates</li>
    <li>JavaScript updates element styles</li>
    <li>Browser re-layouts the positioned element</li>
  </ol>

  <p>This means positioning is <em>always</em> one frame behind. On scroll, the positioned element visibly lags. With Anchor Positioning, positioning is part of the browser's layout engine — it's calculated during layout, not after. The positioned element moves <em>in sync</em> with the anchor. Zero frame lag. Zero JavaScript.</p>

  <pre><code>/* CSS Anchor Positioning: layout-time positioning, zero JS */
.tooltip {
  position-anchor: --my-anchor;
  position-area: top center;
}

/* JavaScript: post-layout positioning, one frame lag */
window.addEventListener('scroll', () => {
  const { top, left, width } = button.getBoundingClientRect();
  tooltip.style.left = left + width / 2 + 'px';
  tooltip.style.top = top - 8 + 'px';
  tooltip.style.translate = '-50% -100%';
}, { passive: true });
</code></pre>

  <h2>Multiple Anchors: One Element, Multiple Reference Points</h2>

  <p>Advanced use case: a single positioned element can reference <em>multiple</em> anchors simultaneously:</p>

  <pre><code>/* Each edge of the target references a different anchor */
.tether-line {
  position: absolute;

  /* Top-left corner tethered to #start-node */
  top: anchor(--start bottom);
  left: anchor(--start center);

  /* Bottom-right corner tethered to #end-node */
  bottom: anchor(--end top);
  right: anchor(--end center);
}</code></pre>

  <p>This opens up entirely new layout patterns — connecting lines between elements, range indicators, selection rectangles, all pure CSS.</p>

  <h2>Pitfalls & Gotchas</h2>

  <div class="highlight-box">
    <strong>Common issues to watch for:</strong>
    <ul>
      <li><strong>Anchors must be in the same containing block.</strong> Anchor names are scoped to their containing block. An element in a fixed-position sidebar can't anchor to an element in the main content (unless both are in the root containing block).</li>
      <li><strong>Hidden anchors still work.</strong> An anchor with <code>display: none</code> can still be referenced — positioned elements will tether to its <em>would-be</em> position before it was hidden.</li>
      <li><strong>anchor-name must be a dashed ident.</strong> All custom anchor names must start with <code>--</code> (like custom properties). <code>anchor-name: my-tooltip</code> is invalid; use <code>anchor-name: --my-tooltip</code>.</li>
      <li><strong>@position-try requires position-area inside.</strong> Fallback blocks should use <code>position-area</code>, not explicit <code>top</code>/<code>left</code>/etc. Using explicit properties prevents CSS from calculating which fallback fits.</li>
      <li><strong>Popover + anchor: set anchor-name on the trigger, not the popover.</strong> The popover is the <em>target</em> element — it positions relative to the trigger anchor. A common mistake is setting anchor-name on the popover itself.</li>
    </ul>
  </div>

  <h2>Migration Guide: From Popper.js / Floating UI to CSS Anchor Positioning</h2>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Popper.js / Floating UI</th><th>CSS Anchor Positioning Equivalent</th></tr>
      </thead>
      <tbody>
        <tr><td><code>placement: 'top'</code></td><td><code>position-area: top center</code></td></tr>
        <tr><td><code>placement: 'bottom-start'</code></td><td><code>position-area: bottom start</code></td></tr>
        <tr><td><code>flip()</code> middleware</td><td><code>position-try-fallbacks</code></td></tr>
        <tr><td><code>offset()</code> middleware</td><td><code>margin</code> on positioned element</td></tr>
        <tr><td><code>size()</code> middleware</td><td><code>width: anchor-size(width)</code></td></tr>
        <tr><td><code>arrow()</code> middleware</td><td>Custom element with <code>anchor()</code></td></tr>
        <tr><td><code>shift()</code> middleware</td><td><code>position-try-fallbacks</code> (automatic)</td></tr>
        <tr><td><code>autoPlacement()</code></td><td><code>position-try-fallbacks</code> with multiple entries</td></tr>
        <tr><td>JavaScript bundle (12 KB gzipped)</td><td>0 KB (browser native)</td></tr>
        <tr><td>Main-thread calculation</td><td>Layout-engine calculation</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Progressive Enhancement Strategy</h2>

  <p>While Anchor Positioning is now Baseline 2026, you may still support older browsers with a graceful fallback:</p>

  <pre><code>/* Default: fixed positioning (works everywhere) */
.tooltip {
  position: fixed;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
}

/* Enhanced: Anchor Positioning (Baseline 2026) */
@supports (position-anchor: --my-anchor) {
  .tooltip {
    position: absolute;
    position-anchor: --tooltip-trigger;
    position-area: top center;
    translate: none;
  }
}</code></pre>

  <p>Or detect at runtime to conditionally load your JS positioning library:</p>

  <pre><code>if (!CSS.supports('position-anchor: --test')) {
  // Fall back to Floating UI / Popper.js
  await import('./legacy-positioning.js');
}</code></pre>

  <h2>Summary</h2>

  <p>CSS Anchor Positioning is one of the most transformative CSS features to ship since Grid and Flexbox. It replaces an entire category of JavaScript libraries — Popper.js, Floating UI, and every custom positioning solution — with declarative, layout-time, zero-lag CSS. Combined with the Popover API, it lets you build tooltips, dropdowns, context menus, and any tethered UI completely in HTML and CSS. After decades of JavaScript-based workarounds, the platform finally has a native answer to the question "how do I put this thing next to that thing?"</p>

  <div class="highlight-box">
    <strong>Key takeaways:</strong>
    <ul>
      <li><strong>Baseline 2026 — use today without polyfills.</strong> All five major engines ship full support.</li>
      <li><strong>Zero JavaScript positioning.</strong> Tethered elements follow their anchor at layout time.</li>
      <li><strong>Built-in overflow handling.</strong> <code>@position-try</code> eliminates scroll-aware positioning code.</li>
      <li><strong>Works with Popover API.</strong> Native tooltips, dropdowns, and menus with zero dependencies.</li>
      <li><strong>Better performance.</strong> Layout-time calculation, no main-thread JavaScript, no frame lag.</li>
      <li><strong>anchor-size() makes elements match their anchor.</strong> Dropdowns that auto-match button width.</li>
    </ul>
  </div>
</div>`,
  },
  {
    slug: 'css-logical-properties-complete-guide-2026',
    title: 'CSS Logical Properties: Stop Thinking in Left and Right',
    description:
      'CSS Logical Properties replace physical directional properties (left/right/top/bottom) with flow-relative alternatives. Your layouts automatically adapt to RTL, vertical writing modes, and any future text direction. Complete guide: every physical-to-logical mapping, shorthands, writing-mode demos, and migration patterns.',
    date: '2026-06-07',
    author: 'DevBench',
    tags: ['CSS', 'Logical Properties', 'Internationalization', 'RTL', 'Writing Modes', 'Baseline 2026'],
    readingTime: '9 min read',
    content: `<div class="prose-content">
  <p class="lead">
    Every developer learns CSS the same way: <code>margin-left</code>, <code>padding-right</code>, <code>border-top</code>. These are <strong>physical properties</strong> and they refer to literal sides of the box. For English-only, LTR-only websites they work fine. But the moment you need Arabic (RTL), Hebrew (RTL), Japanese (vertical-rl), or Mongolian (vertical-lr), <code>margin-left</code> means something physically wrong. <strong>CSS Logical Properties</strong> solve this permanently by replacing physical sides with flow-relative positions. The browser does the right thing regardless of writing direction.
  </p>

  <h2>The Core Mapping</h2>

  <p>Every physical property has a logical equivalent. Here is the complete mental model:</p>

  <table>
    <thead>
      <tr><th>Physical</th><th>Logical (LTR)</th><th>Meaning</th></tr>
    </thead>
    <tbody>
      <tr><td><code>margin-left</code></td><td><code>margin-inline-start</code></td><td>The start edge in the inline direction</td></tr>
      <tr><td><code>margin-right</code></td><td><code>margin-inline-end</code></td><td>The end edge in the inline direction</td></tr>
      <tr><td><code>margin-top</code></td><td><code>margin-block-start</code></td><td>The start edge in the block direction</td></tr>
      <tr><td><code>margin-bottom</code></td><td><code>margin-block-end</code></td><td>The end edge in the block direction</td></tr>
    </tbody>
  </table>

  <p>This applies to <strong>padding</strong>, <strong>border</strong>, <strong>inset</strong> (positioning), and <strong>size</strong>:</p>

  <pre><code>margin-left      -&gt; margin-inline-start
margin-right     -&gt; margin-inline-end
margin-top       -&gt; margin-block-start
margin-bottom    -&gt; margin-block-end

padding-left     -&gt; padding-inline-start
padding-right    -&gt; padding-inline-end
padding-top      -&gt; padding-block-start
padding-bottom   -&gt; padding-block-end

border-left      -&gt; border-inline-start
border-right     -&gt; border-inline-end
border-top       -&gt; border-block-start
border-bottom    -&gt; border-block-end

left   -&gt; inset-inline-start
right  -&gt; inset-inline-end
top    -&gt; inset-block-start
bottom -&gt; inset-block-end

width   -&gt; inline-size
height  -&gt; block-size</code></pre>

  <h2>Shorthand Properties</h2>

  <pre><code>.card {
  margin-inline: 1rem;
  margin-block: 2rem;
  border-inline: 2px solid #e2e8f0;
  border-block: 1px solid #64748b;
  inline-size: 100%;
  max-inline-size: 60ch;
  block-size: auto;
}</code></pre>

  <h2>Writing Modes in Action</h2>

  <pre><code>/* Horizontal, LTR (default) */
body { writing-mode: horizontal-tb; direction: ltr; }
/* inline-start = left, block-start = top */

/* Horizontal, RTL */
body { writing-mode: horizontal-tb; direction: rtl; }
/* inline-start = right, block-start = top */

/* Vertical, Japanese */
body { writing-mode: vertical-rl; }
/* inline-start = top, block-start = right */

/* Vertical, Mongolian */
body { writing-mode: vertical-lr; }
/* inline-start = top, block-start = left */</code></pre>

  <h2>Real-World Migration Guide</h2>

  <h3>1. Replace margin-left / margin-right</h3>
  <pre><code>/* Before */
.card + .card { margin-left: 1.5rem; }
/* After */
.card + .card { margin-inline-start: 1.5rem; }</code></pre>

  <h3>2. Replace padding on blockquotes</h3>
  <pre><code>/* Before */
blockquote { padding-left: 1rem; border-left: 3px solid blue; }
/* After */
blockquote { padding-inline-start: 1rem; border-inline-start: 3px solid blue; }</code></pre>

  <h3>3. Replace text-align: left</h3>
  <pre><code>/* Before */
.header { text-align: left; }
/* After */
.header { text-align: start; }</code></pre>

  <h3>4. Replace float: left</h3>
  <pre><code>/* Before */
.avatar { float: left; margin-right: 0.75rem; }
/* After */
.avatar { float: inline-start; margin-inline-end: 0.75rem; }</code></pre>

  <h3>5. Replace width / height</h3>
  <pre><code>/* Before */
.container { width: 100%; max-width: 60rem; }
/* After */
.container { inline-size: 100%; max-inline-size: 60rem; }</code></pre>

  <h3>6. Logical border-radius</h3>
  <pre><code>/* Before - breaks in RTL */
.card { border-radius: 8px 0 0 8px; }
/* After */
.card {
  border-start-start-radius: 8px;
  border-end-start-radius: 8px;
}</code></pre>

  <h2>The Flexbox and Grid Connection</h2>

  <p>Flexbox and Grid already use flow-relative terms. <code>justify-content</code> works on the inline axis, <code>align-items</code> on the block axis. Logical properties align perfectly with this mental model.</p>

  <h2>When NOT to Use Logical Properties</h2>

  <ul>
    <li><strong>Literal box decorations</strong> - a right border on a drawer that slides from the right</li>
    <li><strong>Viewport-corner positioning</strong> - stick this to bottom-right</li>
    <li><strong>Directional icons</strong> - a right-arrow always points right</li>
    <li><strong>transform properties</strong> - translateX is always physical</li>
  </ul>

  <h2>Browser Support</h2>

  <p>Logical properties are <strong>Baseline</strong> across all major browsers: Chrome 87+ (Nov 2020), Firefox 66+ (Mar 2019), Safari 15+ (Sep 2021), Edge 87+. Over 97% of global users. For older browsers, use <code>postcss-logical</code> to generate physical fallbacks.</p>

  <div class="highlight-box">
    <strong>Key takeaways:</strong>
    <ul>
      <li><strong>Logical properties replace physical sides with flow-relative positions.</strong> margin-inline-start means beginning of the text direction, left in LTR, right in RTL.</li>
      <li><strong>Works for margins, padding, borders, positioning, and size.</strong> The full set of properties has logical equivalents.</li>
      <li><strong>Automatic RTL and vertical writing mode support.</strong> No JavaScript, no separate stylesheets, no build-step transforms.</li>
      <li><strong>Flexbox and Grid are already logical.</strong> Logical properties complete the flow-relative mental model.</li>
      <li><strong>Baseline 2026, use today without polyfills.</strong> 97%+ global support.</li>
    </ul>
  </div>
</div>`,
  },
  {
    slug: 'css-color-mix-complete-guide-2026',
    title: 'CSS color-mix(): The One CSS Function That Replaces Your Preprocessor Color Pipeline',
    description:
      'The color-mix() function is 2026\'s most underrated CSS superpower. It blends colors natively in 8 color spaces — no Sass, no PostCSS, no JavaScript. Build hover states, dynamic themes, accessible contrast adjustments, and entire design-system color palettes with a single CSS function. Complete guide: syntax, color space comparison, real-world patterns, and performance.',
    date: '2026-06-07',
    author: 'DevBench',
    tags: ['CSS', 'color-mix', 'Colors', 'Design Systems', 'OKLCH', '2026', 'Dynamic Theming'],
    readingTime: '10 min read',
    content: `<div class="prose-content">
  <p class="lead">
    For two decades, CSS had exactly one way to set a color: you gave it a value. If you wanted a lighter version, you used <code>opacity</code> or recalculated in your preprocessor. If you wanted to blend two brand colors for a gradient midpoint, you opened your design tool and eye-dropped it. <strong>CSS color-mix()</strong> — Baseline across all browsers — changes this. You can now blend any two colors in any of 8 color spaces, natively in CSS, with a single function call. This isn&apos;t just a nice-to-have. It&apos;s a fundamental shift in how we build design systems.
  </p>

  <h2>The Basic Syntax</h2>

  <pre><code>/* Blend two colors 50/50 in sRGB */
background: color-mix(in srgb, #3b82f6, #ef4444);

/* 70% blue, 30% red — in OKLCH for perceptual blending */
background: color-mix(in oklch, #3b82f6 70%, #ef4444);

/* Mix with currentColor for dynamic theming */
color: color-mix(in srgb, currentColor 80%, white);</code></pre>

  <p>The syntax is <code>color-mix(in &lt;colorspace&gt;, &lt;color1&gt; [&lt;%&gt;], &lt;color2&gt; [&lt;%&gt;])</code>. If percentages don&apos;t sum to 100%, the browser scales them proportionally. If you omit the second percentage, the browser infers it.</p>

  <h2>The Color Space Decision: This Is the Critical Part</h2>

  <p>The choice of color space <strong>radically</strong> changes the result. Here&apos;s what you need to know:</p>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Space</th><th>Best For</th><th>Watch Out For</th></tr>
      </thead>
      <tbody>
        <tr><td><code>srgb</code></td><td>Default, compatible, predictable</td><td>Gray dead zone between complements</td></tr>
        <tr><td><code>oklch</code></td><td>Perceptual blending, smooth gradients, themes</td><td>Slightly higher computation cost</td></tr>
        <tr><td><code>oklab</code></td><td>Linear perceptual blending</td><td>Less intuitive than OKLCH for hue-based work</td></tr>
        <tr><td><code>hsl</code></td><td>Familiar mental model</td><td>Not perceptually uniform — 50% isn&apos;t "halfway" visually</td></tr>
        <tr><td><code>hwb</code></td><td>Intuitive whiteness/blackness blending</td><td>Same perceptual limitations as HSL</td></tr>
        <tr><td><code>lab</code></td><td>Device-independent, very precise</td><td>Unfamiliar coordinates for most developers</td></tr>
        <tr><td><code>lch</code></td><td>Polar Lab — lightness/chroma/hue</td><td>Less supported than OKLCH</td></tr>
        <tr><td><code>xyz</code></td><td>Absolute reference space</td><td>Rarely needed; mostly for color science</td></tr>
      </tbody>
    </table>
  </div>

  <div class="highlight-box">
    <strong>Rule of thumb:</strong> Use <code>in oklch</code> for nearly everything. It avoids the "gray mud" problem where blending blue and yellow in sRGB gives a desaturated gray instead of a vibrant blend. OKLCH preserves hue and chroma across the entire blend range.
  </div>

  <h2>Real-World Pattern 1: Hover States Without Extra Variables</h2>

  <pre><code>.btn-primary {
  background: #6366f1; /* Indigo-500 */
  transition: background 0.15s;
}
.btn-primary:hover {
  /* Lighten by mixing with 15% white — in OKLCH for clean results */
  background: color-mix(in oklch, #6366f1 85%, white);
}
.btn-primary:active {
  /* Darken by mixing with 15% black */
  background: color-mix(in oklch, #6366f1 85%, black);
}

/* This replaces: */
/* .btn-primary:hover { background: #818cf8; } — manually computed */
/* .btn-primary:active { background: #4f46e5; } — manually computed */</code></pre>

  <p>No more computing hover/active colors in your design tool. No more hex-to-HSL conversions. One base color, infinite interactions.</p>

  <h2>Real-World Pattern 2: Dynamic Opacity Without RGBA Artifacts</h2>

  <pre><code>/* Traditional RGBA opacity — can wash out colors */
.card { background: rgba(99, 102, 241, 0.1); }

/* color-mix() in OKLCH — preserves color identity */
.card { background: color-mix(in oklch, #6366f1 10%, transparent); }

/* The difference is subtle but real: OKLCH blending maintains
   the perceived hue even at low "opacity" equivalents */</code></pre>

  <h2>Real-World Pattern 3: Design System Color Scales With CSS Custom Properties</h2>

  <pre><code>:root {
  --brand: #6366f1;
  --brand-50: color-mix(in oklch, var(--brand) 5%, white);
  --brand-100: color-mix(in oklch, var(--brand) 10%, white);
  --brand-200: color-mix(in oklch, var(--brand) 25%, white);
  --brand-300: color-mix(in oklch, var(--brand) 45%, white);
  --brand-400: color-mix(in oklch, var(--brand) 70%, white);
  --brand-500: var(--brand);
  --brand-600: color-mix(in oklch, var(--brand) 85%, black);
  --brand-700: color-mix(in oklch, var(--brand) 70%, black);
  --brand-800: color-mix(in oklch, var(--brand) 50%, black);
  --brand-900: color-mix(in oklch, var(--brand) 30%, black);
  --brand-950: color-mix(in oklch, var(--brand) 15%, black);
}</code></pre>

  <p>Change <code>--brand</code> and your entire 11-step color scale recalculates automatically. No JS, no build step, no PostCSS. This is what makes color-mix() truly revolutionary for design systems.</p>

  <h2>Real-World Pattern 4: Accessible Contrast Adjustments</h2>

  <pre><code>/* Darken a color until it meets WCAG AA contrast on white */
.accessible-text {
  color: color-mix(in oklch, var(--user-color) 60%, black);
}

/* Alternatively, lighten for dark backgrounds */
.dark-mode .accessible-text {
  color: color-mix(in oklch, var(--user-color) 50%, white);
}</code></pre>

  <h2>Real-World Pattern 5: Multi-Color Blending (Firefox 150+, Chrome 2026)</h2>

  <p>The latest browsers now support blending <strong>more than two</strong> colors in a single color-mix() call:</p>

  <pre><code>/* Three-way blend — Chrome 134+, Firefox 150+ */
background: color-mix(
  in oklch,
  #3b82f6 40%,
  color-mix(in oklch, #ef4444 50%, #10b981) 60%
);</code></pre>

  <p>While not yet Baseline, this unlocks advanced palette generation directly in CSS. Expect full cross-browser support by late 2026.</p>

  <h2>The sRGB vs OKLCH Showdown</h2>

  <p>This is where most developers get tripped up. Let&apos;s visualize the same blend in different spaces:</p>

  <pre><code>/* Blue (#3b82f6) + Yellow (#eab308) at 50% each */

/* sRGB — produces a muddy gray-purple */
background: color-mix(in srgb, #3b82f6, #eab308);
/* Result ≈ #8f97b7 — desaturated, grayish */

/* OKLCH — produces a vibrant green-tinted blend */
background: color-mix(in oklch, #3b82f6, #eab308);
/* Result ≈ #6cab8a — much more saturated, retains character */</code></pre>

  <p>sRGB blends by averaging channel values — complementary colors cancel each other out. OKLCH blends in a perceptually uniform space, preserving the "colorfulness" of the source colors. For brand colors and design systems, <strong>always use OKLCH</strong>.</p>

  <h2>Practical Gotchas</h2>

  <ul>
    <li><strong>transparent counts as black in sRGB</strong> — blending with transparent in sRGB darkens your color. In OKLCH it behaves more intuitively.</li>
    <li><strong>currentColor works</strong> — you can mix with currentColor for dynamic, context-aware theming.</li>
    <li><strong>Nesting works</strong> — color-mix() can contain other color-mix() calls, enabling multi-color blends.</li>
    <li><strong>No JavaScript needed</strong> — everything resolves at computed-value time in the browser&apos;s rendering engine. Zero performance cost.</li>
    <li><strong>Animation-friendly</strong> — you can transition between color-mix() values. The browser interpolates the percentages.</li>
  </ul>

  <h2>Browser Support</h2>

  <p>color-mix() is <strong>Baseline 2026</strong>. Chrome 111+ (March 2023), Firefox 113+ (May 2023), Safari 16.2+ (December 2022), Edge 111+. Over 95% of global users. Use it in production today without polyfills.</p>

  <h2>Summary</h2>

  <p>CSS color-mix() isn&apos;t just a new function — it&apos;s a paradigm shift. For 20 years, color manipulation required preprocessors, JavaScript, or manual calculation. Now it&apos;s a native CSS function that works with custom properties, animations, and every other CSS feature. Hover states, design-system scales, accessible contrast, dynamic theming — all of it becomes simpler, more maintainable, and more performant. The only question is: <strong>which color space will you choose?</strong> (Answer: OKLCH.)</p>

  <div class="highlight-box">
    <strong>Key takeaways:</strong>
    <ul>
      <li><strong>color-mix() blends two colors in any of 8 color spaces.</strong> Syntax: <code>color-mix(in &lt;space&gt;, &lt;color1&gt; [%], &lt;color2&gt; [%])</code></li>
      <li><strong>Always use <code>in oklch</code> for design work.</strong> sRGB blending creates gray dead zones between complementary colors. OKLCH preserves hue and chroma.</li>
      <li><strong>Replace preprocessor color functions.</strong> No more <code>lighten()</code>, <code>darken()</code>, or <code>mix()</code> in Sass. CSS handles it natively.</li>
      <li><strong>Works with custom properties.</strong> Change one <code>--brand</code> variable and your entire color scale recalculates.</li>
      <li><strong>Baseline 2026, use today.</strong> 95%+ global support. Zero polyfills, zero JavaScript, zero build steps.</li>
    </ul>
  </div>
</div>`  },
  {
    slug: 'modern-responsive-images-2026',
    title: 'Modern Responsive Images in 2026: The Complete Guide to Fast, Adaptive, CLS-Free Images',
    description:
      'Responsive images are the highest-ROI performance optimization on the web. Format switching with AVIF/WebP, resolution switching with srcset/sizes, lazy loading, async decoding, fetchpriority, CSS image-set(), and aspect-ratio for CLS prevention — the complete guide to modern image delivery in 2026.',
    date: '2026-06-07',
    author: 'DevBench',
    tags: ['HTML', 'Responsive Images', 'Performance', 'Core Web Vitals', 'CLS', 'image-set', 'srcset', 'Web Platform', '2026', 'Tutorial'],
    readingTime: '14 min read',
    content: `<div class="prose-content">
  <p class="lead">
    Responsive images are the single highest-ROI performance optimization on the modern web. Images make up ~45% of the average webpage's weight. On mobile, an unoptimized hero image might be 2MB — delivered to a 360px-wide screen that only needs 50KB. That's 40x more data than necessary, burning bandwidth, slowing Largest Contentful Paint (LCP), and frustrating users.
  </p>

  <p>
    In 2026, we finally have the full toolbox: <code>&lt;picture&gt;</code> for format switching, <code>srcset</code>/<code>sizes</code> for resolution switching, <code>loading="lazy"</code> for deferred loading, <code>decoding="async"</code> for non-blocking decode, <code>fetchpriority</code> for LCP optimization, CSS <code>image-set()</code> for background images, and <code>aspect-ratio</code> for zero-layout-shift placeholders. All Baseline, all production-ready.
  </p>

  <h2>The Three Dimensions of Responsive Images</h2>

  <p>Responsive images solve three distinct problems: <strong>Format switching</strong> (AVIF/WebP/JPEG), <strong>Resolution switching</strong> (srcset/sizes), and <strong>Art direction</strong> (different crops per breakpoint).</p>

  <h2>Format Switching with <code>&lt;picture&gt;</code></h2>

  <pre><code>&lt;picture&gt;
  &lt;source srcset="hero.avif" type="image/avif" /&gt;
  &lt;source srcset="hero.webp" type="image/webp" /&gt;
  &lt;img src="hero.jpg" alt="Product hero" width="1200" height="600" /&gt;
&lt;/picture&gt;</code></pre>

  <div class="table-wrapper">
    <table>
      <thead><tr><th>Format</th><th>Hero Image (1200x600)</th><th>Savings vs JPEG</th></tr></thead>
      <tbody>
        <tr><td>JPEG (quality 80)</td><td>~180 KB</td><td>Baseline</td></tr>
        <tr><td>WebP (quality 80)</td><td>~95 KB</td><td>47% smaller</td></tr>
        <tr><td>AVIF (quality 50)</td><td>~55 KB</td><td>69% smaller</td></tr>
      </tbody>
    </table>
  </div>

  <p><strong>Browser support (2026):</strong> AVIF is Baseline — Chrome 85+, Firefox 93+, Safari 16.4+, Edge 85+. WebP is universal. There's no reason to ship raw JPEG in 2026.</p>

  <h2>Resolution Switching with <code>srcset</code> and <code>sizes</code></h2>

  <pre><code>&lt;img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w, photo-2400.jpg 2400w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="A product shot"
  width="2400"
  height="1600"
/&gt;</code></pre>

  <p><strong>How the browser decides:</strong> It calculates the image's rendered width from <code>sizes</code>, then picks the smallest <code>srcset</code> candidate that's at least as wide. On a 375px phone at 2x DPR: <code>sizes="100vw"</code> → 750px → picks the 800w image.</p>

  <div class="highlight-box">
    <strong>Critical:</strong> <code>sizes</code> describes the image's <strong>rendered CSS width</strong>, not the viewport. If your image is in a 300px sidebar, write <code>sizes="300px"</code> — not the viewport width.
  </div>

  <h2>Art Direction with <code>&lt;picture&gt;</code> + <code>media</code></h2>

  <pre><code>&lt;picture&gt;
  &lt;source media="(max-width: 640px)" srcset="hero-mobile.avif" type="image/avif" /&gt;
  &lt;source media="(min-width: 641px)" srcset="hero-desktop.avif" type="image/avif" /&gt;
  &lt;img src="hero-fallback.jpg" alt="Product hero" width="2400" height="600" /&gt;
&lt;/picture&gt;</code></pre>

  <h2>Lazy Loading: <code>loading="lazy"</code></h2>

  <pre><code>&lt;img src="below-fold.jpg" loading="lazy" alt="..." width="800" height="600" /&gt;</code></pre>

  <p><strong>Use on:</strong> Off-screen images. <strong>Never on:</strong> LCP (hero) images — lazy-loading delays LCP by 200-500ms. Baseline since 2022, 97%+ global support.</p>

  <h2>Async Decoding: <code>decoding="async"</code></h2>

  <pre><code>&lt;img src="hero.jpg" alt="..." fetchpriority="high" /&gt;
&lt;img src="photo.jpg" decoding="async" alt="..." loading="lazy" /&gt;</code></pre>

  <p>The combination <code>loading="lazy" decoding="async"</code> on below-fold images is the standard pattern — defer both network fetch and decode, keeping the main thread free.</p>

  <h2><code>fetchpriority</code> for LCP Optimization</h2>

  <pre><code>&lt;img src="hero.jpg" fetchpriority="high" alt="..." /&gt;
&lt;img src="decorative.jpg" fetchpriority="low" alt="..." /&gt;</code></pre>

  <p>Exactly one <code>fetchpriority="high"</code> per page — on the LCP image. LCP improvements of 200-800ms are common. Baseline 2025.</p>

  <h2>CSS <code>image-set()</code> for Responsive Background Images</h2>

  <pre><code>.hero {
  background-image: image-set(
    url("hero-400.avif") type("image/avif") 1x,
    url("hero-800.avif") type("image/avif") 2x,
    url("hero-1200.avif") type("image/avif") 3x
  );
}</code></pre>

  <p>CSS equivalent of <code>srcset</code>. Baseline 2025. Chrome 113+, Firefox 113+, Safari 17+.</p>

  <h2><code>aspect-ratio</code> for Zero-Layout-Shift Images</h2>

  <p>Since Chrome 88+, Firefox 108+, and Safari 15.3+, the browser computes the aspect ratio from <code>width</code>/<code>height</code> attributes and reserves space automatically — even with <code>height: auto</code> in CSS.</p>

  <pre><code>&lt;img src="photo.jpg" alt="..." width="800" height="600" loading="lazy" /&gt;</code></pre>

  <div class="highlight-box highlight-positive">
    <strong>If you do only ONE thing:</strong> add <code>width</code> and <code>height</code> attributes to every <code>&lt;img&gt;</code> on your site. CLS scores improve immediately.
  </div>

  <h2>The Complete LCP Image Recipe</h2>

  <pre><code>&lt;picture&gt;
  &lt;source srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w, hero-2400.avif 2400w"
    sizes="100vw" type="image/avif" /&gt;
  &lt;source srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w, hero-2400.webp 2400w"
    sizes="100vw" type="image/webp" /&gt;
  &lt;img src="hero-800.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w, hero-2400.jpg 2400w"
    sizes="100vw" alt="Product hero" width="2400" height="1200"
    fetchpriority="high" decoding="sync" loading="eager" /&gt;
&lt;/picture&gt;</code></pre>

  <h2>The Complete Below-Fold Image Recipe</h2>

  <pre><code>&lt;picture&gt;
  &lt;source srcset="photo-400.avif 400w, photo-800.avif 800w, photo-1600.avif 1600w"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" type="image/avif" /&gt;
  &lt;img src="photo-800.jpg"
    srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    alt="Product detail" width="1600" height="1067"
    loading="lazy" decoding="async" fetchpriority="low" /&gt;
&lt;/picture&gt;</code></pre>

  <h2>Performance Impact</h2>

  <div class="table-wrapper">
    <table>
      <thead><tr><th>Metric</th><th>Before (raw JPEG)</th><th>After (responsive)</th><th>Improvement</th></tr></thead>
      <tbody>
        <tr><td>Hero image size</td><td>1.8 MB</td><td>55 KB (AVIF, 400w)</td><td>97% smaller</td></tr>
        <tr><td>Total image bytes</td><td>12.4 MB</td><td>1.8 MB</td><td>85% smaller</td></tr>
        <tr><td>LCP (mobile 3G)</td><td>6.8s</td><td>1.9s</td><td>72% faster</td></tr>
        <tr><td>CLS score</td><td>0.28</td><td>0.0</td><td>Perfect</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Six Common Mistakes</h2>
  <ol>
    <li><strong><code>sizes</code> wrong or missing</strong> — browser assumes 100vw, downloads 6x too much data</li>
    <li><strong>Lazy-loading the LCP image</strong> — delays LCP 200-500ms; use <code>fetchpriority="high"</code> instead</li>
    <li><strong>No <code>width</code>/<code>height</code></strong> — no space reservation, layout shifts happen</li>
    <li><strong>AVIF without WebP/JPEG fallback</strong> — Safari 15.x users see nothing</li>
    <li><strong><code>&lt;img srcset&gt;</code> for format switching</strong> — srcset handles resolution, not format; use <code>&lt;picture&gt;</code></li>
    <li><strong>Giant <code>sizes</code> lists</strong> — match your CSS breakpoints, not every phone size</li>
  </ol>

  <h2>Summary</h2>

  <div class="table-wrapper">
    <table>
      <thead><tr><th>Technique</th><th>What it does</th><th>When to use</th></tr></thead>
      <tbody>
        <tr><td><code>&lt;picture&gt;</code> + <code>type</code></td><td>Format switching (AVIF → WebP → JPEG)</td><td>Every image</td></tr>
        <tr><td><code>srcset</code> + <code>sizes</code></td><td>Resolution switching</td><td>Every image</td></tr>
        <tr><td><code>&lt;picture&gt;</code> + <code>media</code></td><td>Art direction</td><td>When crops differ by breakpoint</td></tr>
        <tr><td><code>loading="lazy"</code></td><td>Defer off-screen images</td><td>Below-fold images</td></tr>
        <tr><td><code>decoding="async"</code></td><td>Decode off main thread</td><td>Below-fold images</td></tr>
        <tr><td><code>fetchpriority="high"</code></td><td>Prioritize critical images</td><td>LCP image only</td></tr>
        <tr><td><code>image-set()</code></td><td>Responsive CSS backgrounds</td><td>Background images</td></tr>
        <tr><td><code>width</code> + <code>height</code></td><td>CLS prevention</td><td>Every <code>&lt;img&gt;</code></td></tr>
        <tr><td><code>aspect-ratio</code></td><td>Explicit ratio for CLS-free</td><td>Every image</td></tr>
        <tr><td><code>object-fit</code></td><td>Control fill behavior</td><td>Cropped/fitted images</td></tr>
      </tbody>
    </table>
  </div>

  <div class="highlight-box highlight-positive">
    <strong>Start today:</strong> Add <code>width</code> and <code>height</code> to every <code>&lt;img&gt;</code> (immediate CLS). Wrap your hero in <code>&lt;picture&gt;</code> with AVIF/WebP/JPEG sources (immediate LCP). Add <code>loading="lazy" decoding="async"</code> to below-fold images (immediate bandwidth savings). These three changes take 30 minutes and transform your page's performance profile.
  </div>
</div>`,
  },
];
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

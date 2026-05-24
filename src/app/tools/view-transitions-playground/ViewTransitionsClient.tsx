'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Play, RefreshCw, Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  label: string;
  description: string;
  oldKeyframe: string;
  newKeyframe: string;
  duration: number;
  easing: string;
}

interface PageContent {
  title: string;
  subtitle: string;
  color: string;
  accent: string;
  items: string[];
  image: string;
}

// ── Keyframes (CSS strings) ────────────────────────────────────────────────

const KEYFRAMES: Record<string, string> = {
  'fade-out': `@keyframes fade-out {
  to { opacity: 0; }
}`,
  'fade-in': `@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  'slide-to-left': `@keyframes slide-to-left {
  to { transform: translateX(-100%); }
}`,
  'slide-from-right': `@keyframes slide-from-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}`,
  'slide-from-bottom': `@keyframes slide-from-bottom {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  'scale-in': `@keyframes scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
  'rotate-out': `@keyframes rotate-out {
  to { transform: rotateY(90deg) scale(0.8); opacity: 0; }
}`,
  'rotate-in': `@keyframes rotate-in {
  from { transform: rotateY(-90deg) scale(0.8); opacity: 0; }
  to { transform: rotateY(0) scale(1); opacity: 1; }
}`,
  'blur-out': `@keyframes blur-out {
  to { filter: blur(12px); opacity: 0; }
}`,
  'blur-in': `@keyframes blur-in {
  from { filter: blur(12px); opacity: 0; }
  to { filter: blur(0); opacity: 1; }
}`,
  'bounce-in': `@keyframes bounce-in {
  0% { transform: scale(0.7); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}`,
  'flip-out-x': `@keyframes flip-out-x {
  to { transform: perspective(600px) rotateX(90deg); opacity: 0; }
}`,
  'flip-in-x': `@keyframes flip-in-x {
  from { transform: perspective(600px) rotateX(-90deg); opacity: 0; }
  to { transform: perspective(600px) rotateX(0); opacity: 1; }
}`,
};

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'fade',
    label: 'Cross-fade',
    description: 'Smooth opacity cross-fade — the default view transition',
    oldKeyframe: 'fade-out',
    newKeyframe: 'fade-in',
    duration: 0.3,
    easing: 'ease',
  },
  {
    name: 'slide-left',
    label: 'Slide Left',
    description: 'Old page slides left, new page enters from the right',
    oldKeyframe: 'slide-to-left',
    newKeyframe: 'slide-from-right',
    duration: 0.4,
    easing: 'ease',
  },
  {
    name: 'slide-up',
    label: 'Slide Up',
    description: 'Old page fades, new page slides up from bottom — like a modal',
    oldKeyframe: 'fade-out',
    newKeyframe: 'slide-from-bottom',
    duration: 0.35,
    easing: 'ease',
  },
  {
    name: 'scale-up',
    label: 'Scale Up',
    description: 'New page scales up from 90% while old page fades out',
    oldKeyframe: 'fade-out',
    newKeyframe: 'scale-in',
    duration: 0.35,
    easing: 'ease',
  },
  {
    name: 'morph',
    label: 'Morph',
    description: 'Named elements morph between views — cards transition smoothly',
    oldKeyframe: 'fade-out',
    newKeyframe: 'fade-in',
    duration: 0.4,
    easing: 'ease',
  },
  {
    name: 'rotate',
    label: '3D Rotate',
    description: 'New page rotates in from the side with a 3D perspective effect',
    oldKeyframe: 'rotate-out',
    newKeyframe: 'rotate-in',
    duration: 0.45,
    easing: 'ease',
  },
  {
    name: 'blur',
    label: 'Blur',
    description: 'Old page blurs out, new page un-blurs in',
    oldKeyframe: 'blur-out',
    newKeyframe: 'blur-in',
    duration: 0.4,
    easing: 'ease',
  },
  {
    name: 'bounce',
    label: 'Bounce',
    description: 'New content bounces in with a spring-like easing',
    oldKeyframe: 'fade-out',
    newKeyframe: 'bounce-in',
    duration: 0.5,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  {
    name: 'flip-x',
    label: 'Flip X',
    description: 'Card-style 3D flip on the X-axis',
    oldKeyframe: 'flip-out-x',
    newKeyframe: 'flip-in-x',
    duration: 0.5,
    easing: 'ease',
  },
];

const EASINGS = [
  'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear',
  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'cubic-bezier(0.4, 0, 0.2, 1)',
  'cubic-bezier(0, 0, 0.2, 1)',
  'cubic-bezier(0.4, 0, 1, 1)',
];

const PAGE_CONTENTS: PageContent[] = [
  {
    title: 'Dashboard',
    subtitle: "Welcome back! Here's your overview.",
    color: '#3b82f6',
    accent: '#60a5fa',
    items: ['📊 12 new analytics events', '👥 3 team members online', '📝 5 tasks due today', '🔔 2 notifications'],
    image: '📈',
  },
  {
    title: 'Settings',
    subtitle: 'Manage your account and preferences.',
    color: '#8b5cf6',
    accent: '#a78bfa',
    items: ['👤 Profile settings', '🔐 Security & privacy', '🎨 Appearance', '🔗 Connected apps'],
    image: '⚙️',
  },
  {
    title: 'Projects',
    subtitle: 'Your active and archived projects.',
    color: '#10b981',
    accent: '#34d399',
    items: ['🚀 Launch sequence - In progress', '🎨 Design system v2 - Review', '📱 Mobile app - Planning', '🔧 API refactor - Complete'],
    image: '🗂️',
  },
  {
    title: 'Analytics',
    subtitle: 'Performance metrics and insights.',
    color: '#f59e0b',
    accent: '#fbbf24',
    items: ['📈 24% increase in traffic', '⏱️ Avg. session: 4m 32s', '🌍 Top country: United States', '💯 Uptime: 99.99%'],
    image: '📊',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ViewTransitionsClient() {
  const [selectedPreset, setSelectedPreset] = useState('fade');
  const [currentPage, setCurrentPage] = useState(0);
  const [duration, setDuration] = useState(0.3);
  const [easing, setEasing] = useState('ease');
  const [showEasingDropdown, setShowEasingDropdown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copiedCSS, setCopiedCSS] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const preset = PRESETS.find(p => p.name === selectedPreset)!;

  const applyPreset = useCallback((p: Preset) => {
    setSelectedPreset(p.name);
    setDuration(p.duration);
    setEasing(p.easing);
  }, []);

  // ── Navigation with real View Transitions API ────────────────────────────

  const navigateTo = useCallback((pageIndex: number) => {
    if (pageIndex === currentPage || isTransitioning) return;

    if ('startViewTransition' in document) {
      setIsTransitioning(true);
      const transition = (document as any).startViewTransition(() => {
        setCurrentPage(pageIndex);
      });
      transition.finished.then(() => {
        setIsTransitioning(false);
      });
    } else {
      setCurrentPage(pageIndex);
    }
  }, [currentPage, isTransitioning]);

  const nextPage = useCallback(() => {
    navigateTo((currentPage + 1) % PAGE_CONTENTS.length);
  }, [currentPage, navigateTo]);

  const reset = useCallback(() => {
    setCurrentPage(0);
    applyPreset(PRESETS[0]);
  }, [applyPreset]);

  // ── Generated CSS ────────────────────────────────────────────────────────

  const cssOutput = useMemo(() => {
    const oldKf = KEYFRAMES[preset.oldKeyframe] || '';
    const newKf = KEYFRAMES[preset.newKeyframe] || '';

    const lines: string[] = [];

    lines.push('/* ═══════════════════════════════════════════ */');
    lines.push('/*  CSS View Transitions — Baseline 2026        */');
    lines.push('/*  Now supported in all major browsers          */');
    lines.push('/* ═══════════════════════════════════════════ */');
    lines.push('');

    if (oldKf) lines.push(oldKf);
    if (newKf !== oldKf && newKf) lines.push(newKf);
    lines.push('');

    lines.push('/* Root-level ::view-transition pseudo-elements */');
    lines.push(`::view-transition-old(root) {`);
    lines.push(`  animation: ${preset.oldKeyframe} ${duration}s ${easing} both;`);
    lines.push(`}`);
    lines.push('');
    lines.push(`::view-transition-new(root) {`);
    lines.push(`  animation: ${preset.newKeyframe} ${duration}s ${easing} both;`);
    lines.push(`}`);
    lines.push('');

    if (preset.name === 'morph') {
      lines.push('/* Named elements for morphing transitions */');
      lines.push('.card-title { view-transition-name: card-title; }');
      lines.push('.card-body  { view-transition-name: card-body; }');
      lines.push('.card-image { view-transition-name: card-image; }');
      lines.push('');
    }

    lines.push('/* Cross-document (MPA) — one-liner */');
    lines.push('@view-transition {');
    lines.push('  navigation: auto;');
    lines.push('}');

    return lines.join('\n');
  }, [preset, duration, easing]);

  // ── Injected styles for live preview ─────────────────────────────────────

  const injectedStyles = useMemo(() => {
    const oldKf = KEYFRAMES[preset.oldKeyframe]?.replace(/^@keyframes [^{]+/, '').replace(/^\{/, '').replace(/\}$/, '').trim() || '';
    const newKf = KEYFRAMES[preset.newKeyframe]?.replace(/^@keyframes [^{]+/, '').replace(/^\{/, '').replace(/\}$/, '').trim() || '';

    const oldBody = oldKf ? `@keyframes ${preset.oldKeyframe} { ${oldKf} }` : '';
    const newBody = newKf ? `@keyframes ${preset.newKeyframe} { ${newKf} }` : '';

    return `
      ${oldBody}
      ${newBody}

      ::view-transition-old(root) {
        animation: ${preset.oldKeyframe} ${duration}s ${easing} both;
      }

      ::view-transition-new(root) {
        animation: ${preset.newKeyframe} ${duration}s ${easing} both;
      }
    `;
  }, [preset, duration, easing]);

  // ── Copy ─────────────────────────────────────────────────────────────────

  const copyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssOutput);
      setCopiedCSS(true);
      toast.success('CSS copied!');
      setTimeout(() => setCopiedCSS(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [cssOutput]);

  const copyAll = useCallback(async () => {
    const page = PAGE_CONTENTS[currentPage];
    const html = `<div style="view-transition-name: page-content">
  <h1 style="view-transition-name: card-title">${page.title}</h1>
  <p style="view-transition-name: card-body">${page.subtitle}</p>
  <ul>
${page.items.map(i => `    <li>${i}</li>`).join('\n')}
  </ul>
  <div style="view-transition-name: card-image">${page.image}</div>
</div>`;

    const fullOutput = `/* === CSS === */\n${cssOutput}\n\n/* === HTML (with view-transition-name) === */\n${html}`;
    try {
      await navigator.clipboard.writeText(fullOutput);
      setCopiedHTML(true);
      toast.success('CSS + HTML copied!');
      setTimeout(() => setCopiedHTML(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [cssOutput, currentPage]);

  const supportsViewTransitions = typeof window !== 'undefined' && 'startViewTransition' in document;

  const page = PAGE_CONTENTS[currentPage];

  return (
    <ToolLayout
      title="CSS View Transitions Playground"
      description="Visually build and test View Transitions API animations — now Baseline across all major browsers. Choose from 9 presets, customize duration and easing, and copy production-ready CSS."
    >
      {/* Support warning */}
      {!supportsViewTransitions && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-400 text-sm flex items-center gap-2">
            ⚠️ Your browser doesn&apos;t support the View Transitions API yet.
            {' '}
            <a
              href="https://caniuse.com/view-transitions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-300"
            >
              Check browser support →
            </a>
          </p>
        </div>
      )}

      {/* ── Presets ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Transition Preset
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              title={p.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPreset === p.name
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-700/50 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">{preset.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Controls ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Duration */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Duration</label>
              <span className="text-sm font-mono text-brand-400">{duration}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>0.1s</span>
              <span>0.5s</span>
              <span>1s</span>
            </div>
          </div>

          {/* Easing */}
          <div className="card">
            <label className="block text-sm font-medium text-slate-300 mb-2">Easing</label>
            <div className="relative">
              <button
                onClick={() => setShowEasingDropdown(!showEasingDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-dark border border-slate-700 rounded-lg text-sm font-mono text-slate-300 hover:border-slate-600 transition-colors"
              >
                <span className="truncate mr-2">{easing}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${showEasingDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showEasingDropdown && (
                <div className="absolute z-20 top-full mt-1 w-full bg-surface border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {EASINGS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setEasing(e);
                        setShowEasingDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-mono transition-colors hover:bg-surface-light ${
                        easing === e ? 'text-brand-400 bg-brand-500/10' : 'text-slate-400'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Generated CSS */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Generated CSS</h3>
              <button
                onClick={copyCSS}
                className={`p-1.5 rounded-lg transition-colors ${
                  copiedCSS
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-surface-light'
                }`}
                title="Copy CSS"
              >
                {copiedCSS ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="bg-surface-dark border border-slate-700/50 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              <code>{cssOutput}</code>
            </pre>
          </div>
        </div>

        {/* ── RIGHT: Live Preview ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Page tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {PAGE_CONTENTS.map((p, i) => (
              <button
                key={i}
                onClick={() => navigateTo(i)}
                disabled={isTransitioning}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  i === currentPage
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {p.title}
              </button>
            ))}
            <button
              onClick={nextPage}
              disabled={isTransitioning}
              className="ml-auto px-3 py-2 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTransitioning ? 'animate-spin' : ''}`} />
              {isTransitioning ? 'Animating...' : 'Next Page'}
            </button>
          </div>

          {/* Live preview area */}
          <div
            ref={containerRef}
            className="relative border border-slate-700/50 rounded-xl bg-surface-dark overflow-hidden"
            style={{ minHeight: '380px', perspective: '800px' }}
          >
            <style>{injectedStyles}</style>

            <div key={currentPage} className="p-8" style={{ viewTransitionName: 'page-content' }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1" style={{ viewTransitionName: 'card-title' }}>
                    {page.title}
                  </h1>
                  <p className="text-slate-400" style={{ viewTransitionName: 'card-body' }}>
                    {page.subtitle}
                  </p>
                </div>
                <div className="text-5xl" style={{ viewTransitionName: 'card-image' }}>
                  {page.image}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {page.items.map((item, i) => {
                  const [emoji, ...rest] = item.split(' ');
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-surface hover:border-slate-600/50 transition-colors"
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="text-sm text-slate-300">{rest.join(' ')}</span>
                    </div>
                  );
                })}
              </div>

              <div
                className="mt-6 h-1.5 rounded-full"
                style={{ background: `linear-gradient(90deg, ${page.color}, ${page.accent})` }}
              />
            </div>

            {/* Transition overlay */}
            {isTransitioning && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-dark/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-surface border border-brand-500/30">
                  <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
                  <span className="text-sm text-slate-300">Transitioning...</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo((currentPage + 1) % PAGE_CONTENTS.length)}
              disabled={isTransitioning}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Trigger Transition
            </button>
            <button
              onClick={copyAll}
              className={`btn-secondary flex items-center gap-2 ${
                copiedHTML ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''
              }`}
            >
              {copiedHTML ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy CSS + HTML
            </button>
          </div>

          {/* API reference */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-3">How to Use</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
              <div>
                <p className="text-slate-300 font-medium mb-1">SPA: Same-Document</p>
                <code className="block bg-surface-dark rounded px-2 py-1 font-mono text-green-400 text-[11px] leading-relaxed">
                  document.startViewTransition(() =&gt; &#123;<br />
                  &nbsp;&nbsp;updateTheDOM();<br />
                  &#125;);
                </code>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-1">MPA: Cross-Document</p>
                <code className="block bg-surface-dark rounded px-2 py-1 font-mono text-green-400 text-[11px] leading-relaxed">
                  @view-transition &#123;<br />
                  &nbsp;&nbsp;navigation: auto;<br />
                  &#125;
                </code>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-1">Morph Elements</p>
                <code className="block bg-surface-dark rounded px-2 py-1 font-mono text-green-400 text-[11px] leading-relaxed">
                  .card-title &#123;<br />
                  &nbsp;&nbsp;view-transition-name: title;<br />
                  &#125;
                </code>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-1">Customize Timing</p>
                <code className="block bg-surface-dark rounded px-2 py-1 font-mono text-green-400 text-[11px] leading-relaxed">
                  ::view-transition-old(root) &#123;<br />
                  &nbsp;&nbsp;animation: fade-out 0.3s ease<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;both;<br />
                  &#125;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

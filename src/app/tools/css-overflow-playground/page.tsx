'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Check, Play, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface OverflowState {
  overflow: string;
  overflowX: string;
  overflowY: string;
  textOverflow: string;
  wordBreak: string;
  overflowWrap: string;
  whiteSpace: string;
  overscrollBehavior: string;
  overscrollBehaviorX: string;
  overscrollBehaviorY: string;
  maxHeight: string;
  maxWidth: string;
  scrollBehavior: string;
}

interface Preset {
  name: string;
  description: string;
  state: OverflowState;
  content: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Scrollable Container',
    description: 'Classic scrollable box with vertical overflow',
    state: {
      overflow: 'auto', overflowX: 'auto', overflowY: 'auto',
      textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'normal', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '200px', maxWidth: '100%', scrollBehavior: 'auto',
    },
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\\n\\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\\n\\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
  {
    name: 'Hidden Overflow',
    description: 'Content clipped at container bounds',
    state: {
      overflow: 'hidden', overflowX: 'hidden', overflowY: 'hidden',
      textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'normal', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '200px', maxWidth: '100%', scrollBehavior: 'auto',
    },
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\\n\\nThis content is clipped and cannot be scrolled to. It is simply cut off at the container boundary.\\n\\nMore text here that you will never see...',
  },
  {
    name: 'Text Ellipsis',
    description: 'Single-line text with ... truncation',
    state: {
      overflow: 'hidden', overflowX: 'hidden', overflowY: 'hidden',
      textOverflow: 'ellipsis', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'nowrap', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '40px', maxWidth: '300px', scrollBehavior: 'auto',
    },
    content: 'This is a very long single line of text that should be truncated with an ellipsis when it overflows its container. A classic CSS pattern for titles and descriptions.',
  },
  {
    name: 'Horizontal Scroll',
    description: 'Horizontally scrollable with nowrap',
    state: {
      overflow: 'scroll', overflowX: 'scroll', overflowY: 'hidden',
      textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'nowrap', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '120px', maxWidth: '100%', scrollBehavior: 'smooth',
    },
    content: 'Card 1 - Design Tokens | Card 2 - Analytics Dashboard | Card 3 - Deployment Pipeline | Card 4 - Component Library | Card 5 - Search Index | Card 6 - Database Metrics | Card 7 - Mobile Layout | Card 8 - Auth Service | Card 9 - WebSocket Hub | Card 10 - Test Runner',
  },
  {
    name: 'Break Word',
    description: 'Force break long words to prevent overflow',
    state: {
      overflow: 'auto', overflowX: 'auto', overflowY: 'auto',
      textOverflow: 'clip', wordBreak: 'break-all', overflowWrap: 'break-word',
      whiteSpace: 'normal', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '200px', maxWidth: '280px', scrollBehavior: 'auto',
    },
    content: 'This text contains a supercalifragilisticexpialidocious long word and a reallylongemailaddress@superduperlongdomainname.co.uk that would normally overflow the container, but word-break and overflow-wrap force it to wrap within bounds.',
  },
  {
    name: 'Custom Scrollbar',
    description: 'Styled scrollbar with overflow: auto',
    state: {
      overflow: 'auto', overflowX: 'auto', overflowY: 'auto',
      textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'normal', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '200px', maxWidth: '100%', scrollBehavior: 'smooth',
    },
    content: 'Task Board\\n\\n[OK] Complete - Design system audit\\n[OK] Complete - API documentation update\\n[>>] In Progress - User onboarding flow\\n[>>] In Progress - Performance optimization\\n[..] Pending - Dark mode toggle\\n[..] Pending - Accessibility review\\n[..] Pending - E2E test coverage\\n[..] Pending - Bundle size analysis\\n\\nWeekly Goals\\n\\n1. Ship the new dashboard\\n2. Fix 3 critical bugs\\n3. Write 2 blog posts\\n4. Review 5 PRs\\n5. Update dependencies',
  },
  {
    name: 'Overscroll Contain',
    description: 'Prevent scroll-chaining on this element',
    state: {
      overflow: 'auto', overflowX: 'auto', overflowY: 'auto',
      textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'normal', overscrollBehavior: 'contain',
      overscrollBehaviorX: 'contain', overscrollBehaviorY: 'contain',
      maxHeight: '200px', maxWidth: '100%', scrollBehavior: 'auto',
    },
    content: 'This container uses overscroll-behavior: contain. When you reach the scroll boundary, the scroll event does not propagate to the parent. No bounce, no pull-to-refresh, no scroll chaining.\\n\\nThis is essential for chat windows, embedded widgets, and custom scroll experiences.\\n\\nScroll to the bottom and try to keep scrolling. The page behind does not move.\\n\\n.\\n.\\n.\\n.\\n.\\n.\\nBottom of container',
  },
  {
    name: 'Multi-line Ellipsis',
    description: 'Clamp text to 3 lines with ...',
    state: {
      overflow: 'hidden', overflowX: 'hidden', overflowY: 'hidden',
      textOverflow: 'ellipsis', wordBreak: 'normal', overflowWrap: 'normal',
      whiteSpace: 'normal', overscrollBehavior: 'auto',
      overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
      maxHeight: '120px', maxWidth: '100%', scrollBehavior: 'auto',
    },
    content: 'This text uses multi-line ellipsis via the line-clamp technique. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Duis faucibus, nunc nec consequat tincidunt, purus ex convallis mi, a gravida nibh metus vitae lectus. Sed vehicula, felis non interdum laoreet.',
  },
];

const DEFAULT_STATE: OverflowState = {
  overflow: 'auto', overflowX: 'auto', overflowY: 'auto',
  textOverflow: 'clip', wordBreak: 'normal', overflowWrap: 'normal',
  whiteSpace: 'normal', overscrollBehavior: 'auto',
  overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto',
  maxHeight: '200px', maxWidth: '100%', scrollBehavior: 'auto',
};

const DEFAULT_CONTENT = 'Edit this content to test overflow behavior. Add long words, remove line breaks, or paste your own text.\\n\\nThe preview box below reflects all the overflow, word-break, and scroll settings you choose on the right.\\n\\nTry scrolling, resizing, or changing properties to see how browsers handle content that exceeds its container.';

const OVERFLOW_OPTIONS = ['visible', 'hidden', 'scroll', 'auto', 'clip'];
const TEXT_OVERFLOW_OPTIONS = ['clip', 'ellipsis'];
const WORD_BREAK_OPTIONS = ['normal', 'break-all', 'keep-all', 'break-word'];
const OVERFLOW_WRAP_OPTIONS = ['normal', 'break-word', 'anywhere'];
const WHITE_SPACE_OPTIONS = ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'];
const OVERSCROLL_OPTIONS = ['auto', 'contain', 'none'];
const SCROLL_BEHAVIOR_OPTIONS = ['auto', 'smooth'];

function buildCSS(state: OverflowState): string {
  const lines: string[] = [];
  if (state.overflowX === state.overflowY) {
    if (state.overflow !== 'auto') lines.push('overflow: ' + state.overflow + ';');
  } else {
    if (state.overflowX !== 'auto') lines.push('overflow-x: ' + state.overflowX + ';');
    if (state.overflowY !== 'auto') lines.push('overflow-y: ' + state.overflowY + ';');
  }
  if (state.textOverflow !== 'clip') lines.push('text-overflow: ' + state.textOverflow + ';');
  if (state.wordBreak !== 'normal') lines.push('word-break: ' + state.wordBreak + ';');
  if (state.overflowWrap !== 'normal') lines.push('overflow-wrap: ' + state.overflowWrap + ';');
  if (state.whiteSpace !== 'normal') lines.push('white-space: ' + state.whiteSpace + ';');
  if (state.overscrollBehavior !== 'auto' && state.overscrollBehaviorX === state.overscrollBehaviorY) {
    lines.push('overscroll-behavior: ' + state.overscrollBehavior + ';');
  }
  if (state.maxHeight !== '200px') lines.push('max-height: ' + state.maxHeight + ';');
  if (state.maxWidth !== '100%') lines.push('max-width: ' + state.maxWidth + ';');
  if (state.scrollBehavior !== 'auto') lines.push('scroll-behavior: ' + state.scrollBehavior + ';');
  return lines.join('\\n');
}

function SelectControl({ label, value, options, onChange, hint }: { label: string; value: string; options: string[]; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:border-brand-500 focus:outline-none transition-colors">
        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
      </select>
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function CssOverflowPlaygroundPage() {
  const [state, setState] = useState<OverflowState>(DEFAULT_STATE);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [cssCopied, setCssCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const update = useCallback(<K extends keyof OverflowState>(key: K, value: OverflowState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setState(preset.state);
    setContent(preset.content);
    setActivePreset(preset.name);
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    setContent(DEFAULT_CONTENT);
    setActivePreset(null);
  }, []);

  const handleCopyCSS = () => {
    const css = buildCSS(state);
    navigator.clipboard.writeText(css || '/* Default browser behavior */').then(() => {
      setCssCopied(true); toast.success('CSS copied!');
      setTimeout(() => setCssCopied(false), 2000);
    }, () => toast.error('Failed to copy'));
  };

  const previewStyle: React.CSSProperties = {
    overflow: state.overflow as React.CSSProperties['overflow'],
    overflowX: state.overflowX as React.CSSProperties['overflowX'],
    overflowY: state.overflowY as React.CSSProperties['overflowY'],
    textOverflow: state.textOverflow as React.CSSProperties['textOverflow'],
    wordBreak: state.wordBreak as React.CSSProperties['wordBreak'],
    overflowWrap: state.overflowWrap as React.CSSProperties['overflowWrap'],
    whiteSpace: state.whiteSpace as React.CSSProperties['whiteSpace'],
    overscrollBehavior: state.overscrollBehavior as React.CSSProperties['overscrollBehavior'],
    overscrollBehaviorX: state.overscrollBehaviorX as React.CSSProperties['overscrollBehaviorX'],
    overscrollBehaviorY: state.overscrollBehaviorY as React.CSSProperties['overscrollBehaviorY'],
    maxHeight: state.maxHeight, maxWidth: state.maxWidth,
    scrollBehavior: state.scrollBehavior as React.CSSProperties['scrollBehavior'],
  };

  if (state.textOverflow === 'ellipsis' && state.whiteSpace === 'normal' && (state.overflow === 'hidden' || state.overflowY === 'hidden')) {
    previewStyle.display = '-webkit-box';
    (previewStyle as Record<string, unknown>).WebkitLineClamp = '3';
    (previewStyle as Record<string, unknown>).WebkitBoxOrient = 'vertical';
  }

  const css = buildCSS(state);

  return (
    <ToolLayout
      title="CSS Overflow Playground"
      description="Experiment with CSS overflow, text-overflow, word-break, overflow-wrap, overscroll-behavior, and scroll behavior. Live preview with 8 interactive presets."
    >
      <div className="space-y-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-slate-200">Presets</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset.name} onClick={() => applyPreset(preset)}
                className={'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' + (activePreset === preset.name ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700')}
                title={preset.description}>{preset.name}</button>
            ))}
            <button onClick={reset} className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700 transition-colors inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Live Preview</h3>
                <span className="text-[10px] text-slate-500 ml-auto">Scroll inside</span>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 font-mono text-sm text-slate-300 leading-relaxed" style={previewStyle}>
                {content.split('\\n').map((line, i) => (<span key={i}>{line}{i < content.split('\\n').length - 1 ? <br /> : null}</span>))}
              </div>
            </div>
            <div className="card p-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">Preview Content</label>
              <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono focus:border-brand-500 focus:outline-none transition-colors resize-y"
                placeholder="Type or paste content to test..." />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Overflow</h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectControl label="overflow" value={state.overflow} options={OVERFLOW_OPTIONS} onChange={(v) => { update('overflow', v); if (v !== 'auto') { update('overflowX', v); update('overflowY', v); } }} />
                <SelectControl label="overflow-x" value={state.overflowX} options={OVERFLOW_OPTIONS} onChange={(v) => update('overflowX', v)} />
                <SelectControl label="overflow-y" value={state.overflowY} options={OVERFLOW_OPTIONS} onChange={(v) => update('overflowY', v)} />
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Text Behavior</h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectControl label="text-overflow" value={state.textOverflow} options={TEXT_OVERFLOW_OPTIONS} onChange={(v) => update('textOverflow', v)} hint="Requires overflow:hidden" />
                <SelectControl label="white-space" value={state.whiteSpace} options={WHITE_SPACE_OPTIONS} onChange={(v) => update('whiteSpace', v)} />
                <SelectControl label="word-break" value={state.wordBreak} options={WORD_BREAK_OPTIONS} onChange={(v) => update('wordBreak', v)} />
                <SelectControl label="overflow-wrap" value={state.overflowWrap} options={OVERFLOW_WRAP_OPTIONS} onChange={(v) => update('overflowWrap', v)} />
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Scroll and Overscroll</h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectControl label="scroll-behavior" value={state.scrollBehavior} options={SCROLL_BEHAVIOR_OPTIONS} onChange={(v) => update('scrollBehavior', v)} />
                <SelectControl label="overscroll-behavior" value={state.overscrollBehavior} options={OVERSCROLL_OPTIONS} onChange={(v) => { update('overscrollBehavior', v); update('overscrollBehaviorX', v); update('overscrollBehaviorY', v); }} />
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Dimensions</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">max-height</label>
                  <input type="text" value={state.maxHeight} onChange={(e) => update('maxHeight', e.target.value)} className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:border-brand-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">max-width</label>
                  <input type="text" value={state.maxWidth} onChange={(e) => update('maxWidth', e.target.value)} className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono focus:border-brand-500 focus:outline-none transition-colors" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Generated CSS</h3>
                <button onClick={handleCopyCSS} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-brand-600 hover:bg-brand-500 text-white transition-colors">
                  {cssCopied ? (<><Check className="w-3 h-3" />Copied</>) : (<><Copy className="w-3 h-3" />Copy CSS</>)}
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-slate-900 rounded-md p-3 overflow-x-auto border border-slate-700 max-h-40">
                {css || '/* Default browser behavior. No custom properties. */'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

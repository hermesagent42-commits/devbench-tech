'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Play, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

type TimelineType = 'scroll' | 'view';
type ScrollAxis = 'block' | 'inline' | 'x' | 'y';
type ViewInset = 'cover' | 'contain' | 'entry' | 'exit' | 'custom';

interface Preset {
  name: string;
  description: string;
  timelineType: TimelineType;
  axis: ScrollAxis;
  viewInsetStart: string;
  viewInsetEnd: string;
  keyframes: string;
  targetCss: string;
  animationRange: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Fade In on Scroll',
    description: 'Element fades in as you scroll down',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '40%',
    keyframes: `@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(30px); }\n  to   { opacity: 1; transform: translateY(0); }\n}`,
    targetCss: 'animation: fadeIn linear both;\nanimation-timeline: view();\nanimation-range: entry 0% entry 40%;',
    animationRange: 'entry 0% entry 40%',
  },
  {
    name: 'Parallax Hero',
    description: 'Parallax effect tied to scroll position',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '100%',
    keyframes: `@keyframes parallax {\n  from { transform: translateY(0) scale(1.1); }\n  to   { transform: translateY(-20%) scale(1); }\n}`,
    targetCss: 'animation: parallax linear both;\nanimation-timeline: view();\nanimation-range: cover 0% cover 100%;',
    animationRange: 'cover 0% cover 100%',
  },
  {
    name: 'Scale Up Card',
    description: 'Cards scale up as they enter the viewport',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '30%',
    keyframes: `@keyframes scaleIn {\n  from { opacity: 0; transform: scale(0.85); }\n  to   { opacity: 1; transform: scale(1); }\n}`,
    targetCss: 'animation: scaleIn linear both;\nanimation-timeline: view();\nanimation-range: entry 0% entry 30%;',
    animationRange: 'entry 0% entry 30%',
  },
  {
    name: 'Horizontal Slide',
    description: 'Slides in horizontally from the right',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '35%',
    keyframes: `@keyframes slideInRight {\n  from { opacity: 0; transform: translateX(60px); }\n  to   { opacity: 1; transform: translateX(0); }\n}`,
    targetCss: 'animation: slideInRight linear both;\nanimation-timeline: view();\nanimation-range: entry 0% entry 35%;',
    animationRange: 'entry 0% entry 35%',
  },
  {
    name: 'Sticky Shrink Header',
    description: 'Header shrinks as you scroll (via scroll())',
    timelineType: 'scroll',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '100%',
    keyframes: `@keyframes shrinkHeader {\n  from { padding: 2rem 1rem; font-size: 2rem; background: rgba(15,23,42,0); }\n  to   { padding: 0.75rem 1rem; font-size: 1.25rem; background: rgba(15,23,42,0.95); }\n}`,
    targetCss: 'animation: shrinkHeader linear both;\nanimation-timeline: scroll();\nanimation-range: 0% 40%;',
    animationRange: '0% 40%',
  },
  {
    name: 'Progress Bar',
    description: 'Horizontal progress bar fills as you scroll',
    timelineType: 'scroll',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '100%',
    keyframes: `@keyframes progress {\n  from { transform: scaleX(0); }\n  to   { transform: scaleX(1); }\n}`,
    targetCss: 'animation: progress linear both;\nanimation-timeline: scroll();\nanimation-range: 0% 100%;\ntransform-origin: left;',
    animationRange: '0% 100%',
  },
  {
    name: 'Rotate on Reveal',
    description: '3D rotation as element enters viewport',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '40%',
    keyframes: `@keyframes rotateIn {\n  from { opacity: 0; transform: perspective(800px) rotateY(30deg); }\n  to   { opacity: 1; transform: perspective(800px) rotateY(0deg); }\n}`,
    targetCss: 'animation: rotateIn linear both;\nanimation-timeline: view();\nanimation-range: entry 0% entry 40%;',
    animationRange: 'entry 0% entry 40%',
  },
  {
    name: 'Blur to Sharp',
    description: 'Blur sharpens as element scrolls into view',
    timelineType: 'view',
    axis: 'block',
    viewInsetStart: '0%',
    viewInsetEnd: '35%',
    keyframes: `@keyframes unblur {\n  from { opacity: 0; filter: blur(12px); }\n  to   { opacity: 1; filter: blur(0px); }\n}`,
    targetCss: 'animation: unblur linear both;\nanimation-timeline: view();\nanimation-range: entry 0% entry 35%;',
    animationRange: 'entry 0% entry 35%',
  },
];

const AXIS_LABELS: Record<ScrollAxis, string> = {
  block: 'block (vertical)',
  inline: 'inline (horizontal)',
  x: 'x',
  y: 'y',
};

const VIEW_INSETS: Record<ViewInset, string> = {
  cover: 'cover 0% cover 100%',
  contain: 'contain 0% contain 100%',
  entry: 'entry 0% entry 100%',
  exit: 'exit 0% exit 100%',
  custom: 'custom',
};

function buildCss(
  timelineType: TimelineType,
  axis: ScrollAxis,
  range: string,
  keyframes: string,
): string {
  const timeline = timelineType === 'scroll'
    ? `animation-timeline: scroll(${axis});`
    : `animation-timeline: view(${axis});`;

  return `${keyframes}\n\n.target {\n  animation: anim linear both;\n  ${timeline}\n  animation-range: ${range};\n}`;
}

export default function ScrollDrivenAnimationsPage() {
  const [timelineType, setTimelineType] = useState<TimelineType>('view');
  const [axis, setAxis] = useState<ScrollAxis>('block');
  const [viewInset, setViewInset] = useState<ViewInset>('entry');
  const [customInsetStart, setCustomInsetStart] = useState('0%');
  const [customInsetEnd, setCustomInsetEnd] = useState('30%');
  const [activePreset, setActivePreset] = useState(0);
  const [keyframesText, setKeyframesText] = useState(PRESETS[0].keyframes);

  const scrollRef = useRef<HTMLDivElement>(null);

  const animationRange = useMemo(() => {
    if (timelineType === 'view' && viewInset !== 'custom') {
      return VIEW_INSETS[viewInset];
    }
    if (timelineType === 'view' && viewInset === 'custom') {
      return `entry ${customInsetStart} entry ${customInsetEnd}`;
    }
    // scroll() uses simple percentage range
    return `${customInsetStart} ${customInsetEnd}`;
  }, [timelineType, viewInset, customInsetStart, customInsetEnd]);

  const generatedCss = useMemo(() => {
    return buildCss(timelineType, axis, animationRange, keyframesText);
  }, [timelineType, axis, animationRange, keyframesText]);

  const applyPreset = useCallback((i: number) => {
    const p = PRESETS[i];
    setTimelineType(p.timelineType);
    setAxis(p.axis);
    setKeyframesText(p.keyframes);
    if (p.timelineType === 'view') {
      // Map range to a view inset
      if (p.animationRange.startsWith('cover')) setViewInset('cover');
      else if (p.animationRange.startsWith('contain')) setViewInset('contain');
      else if (p.animationRange.startsWith('entry')) setViewInset('entry');
      else if (p.animationRange.startsWith('exit')) setViewInset('exit');
      else {
        setViewInset('custom');
        const parts = p.animationRange.split(' ');
        setCustomInsetStart(parts[1] || '0%');
        setCustomInsetEnd(parts[3] || '100%');
      }
    } else {
      const parts = p.animationRange.split(' ');
      setCustomInsetStart(parts[0] || '0%');
      setCustomInsetEnd(parts[1] || '100%');
    }
    setActivePreset(i);
  }, []);

  const copyGeneratedCss = useCallback(() => {
    navigator.clipboard.writeText(generatedCss).then(() => {
      toast.success('CSS copied to clipboard!');
    });
  }, [generatedCss]);

  const resetKeyframes = useCallback(() => {
    setKeyframesText(PRESETS[activePreset].keyframes);
  }, [activePreset]);

  // Dynamic style injection for the live preview
  useEffect(() => {
    const styleId = 'scroll-driven-anim-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const timeline =
      timelineType === 'scroll'
        ? `animation-timeline: scroll(${axis});`
        : `animation-timeline: view(${axis});`;

    // Wrap keyframes animation name to 'anim' for the preview
    const kf = keyframesText.replace(/@keyframes\s+\w+/, '@keyframes anim');

    styleEl.textContent = `${kf}\n.preview-target {\n  animation: anim linear both;\n  ${timeline}\n  animation-range: ${animationRange};\n}`;

    return () => {
      // Clean up on unmount
      const el = document.getElementById(styleId);
      if (el) {
        el.textContent = '';
      }
    };
  }, [timelineType, axis, animationRange, keyframesText]);

  return (
    <ToolLayout
      title="CSS Scroll-Driven Animations Playground"
      description="Visually build scroll-driven animations — the new 2026 Baseline API. Scroll the preview to see effects in action."
      controls={
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-slate-400">
            Scroll the preview area below to see the animation →
          </span>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Presets */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Presets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => applyPreset(i)}
                className={`text-left p-3 rounded-lg border text-sm transition-all duration-200 ${
                  activePreset === i
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                    : 'border-slate-700/50 bg-surface-light text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <div className="font-medium text-xs mb-1">{p.name}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{p.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Configuration */}
        <section className="card">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Configuration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Timeline Type */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Timeline Type</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-600/50">
                <button
                  onClick={() => setTimelineType('view')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    timelineType === 'view'
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'bg-surface text-slate-400 hover:bg-surface-lighter'
                  }`}
                >
                  view()
                </button>
                <button
                  onClick={() => setTimelineType('scroll')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    timelineType === 'scroll'
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'bg-surface text-slate-400 hover:bg-surface-lighter'
                  }`}
                >
                  scroll()
                </button>
              </div>
            </div>

            {/* Axis */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Axis</label>
              <select
                value={axis}
                onChange={(e) => setAxis(e.target.value as ScrollAxis)}
                className="w-full input-field py-2 text-xs"
              >
                {Object.entries(AXIS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* View Inset (view() only) */}
            {timelineType === 'view' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Animation Range</label>
                <select
                  value={viewInset}
                  onChange={(e) => setViewInset(e.target.value as ViewInset)}
                  className="w-full input-field py-2 text-xs"
                >
                  {Object.entries(VIEW_INSETS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {k === 'custom' ? 'Custom' : v}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Range Controls */}
            {timelineType === 'scroll' ? (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Start %</label>
                  <input
                    type="text"
                    value={customInsetStart}
                    onChange={(e) => setCustomInsetStart(e.target.value)}
                    className="w-full input-field py-2 text-xs"
                    placeholder="0%"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">End %</label>
                  <input
                    type="text"
                    value={customInsetEnd}
                    onChange={(e) => setCustomInsetEnd(e.target.value)}
                    className="w-full input-field py-2 text-xs"
                    placeholder="100%"
                  />
                </div>
              </>
            ) : viewInset === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Entry Start</label>
                  <input
                    type="text"
                    value={customInsetStart}
                    onChange={(e) => setCustomInsetStart(e.target.value)}
                    className="w-full input-field py-2 text-xs"
                    placeholder="0%"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Entry End</label>
                  <input
                    type="text"
                    value={customInsetEnd}
                    onChange={(e) => setCustomInsetEnd(e.target.value)}
                    className="w-full input-field py-2 text-xs"
                    placeholder="30%"
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* Keyframes Editor */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              @keyframes
            </h3>
            <button
              onClick={resetKeyframes}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
          <textarea
            value={keyframesText}
            onChange={(e) => setKeyframesText(e.target.value)}
            rows={6}
            className="w-full input-field text-xs font-mono resize-y min-h-[120px]"
            spellCheck={false}
          />
        </section>

        {/* Live Preview */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Live Preview
          </h3>
          <div
            ref={scrollRef}
            className="rounded-xl border border-slate-700/50 overflow-y-auto bg-surface"
            style={{ height: '320px', scrollBehavior: 'auto' }}
          >
            {/* Simulated page content */}
            <div className="min-h-[900px] relative">
              {/* Scroll down indicator */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Scroll down to see the animation →
                </span>
                <span className="text-xs text-brand-400 font-mono">
                  {
                    timelineType === 'scroll'
                      ? `scroll(${axis})`
                      : `view(${axis})`
                  }
                </span>
              </div>

              {/* Spacer before target */}
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-slate-600 text-sm flex items-center gap-1.5">
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                  Scroll down
                </p>
              </div>

              {/* Animated target */}
              <div className="px-8 py-16 flex justify-center">
                <div
                  className="preview-target w-[280px] h-[200px] rounded-xl flex flex-col items-center justify-center text-center p-6"
                  style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '2px solid #334155',
                    boxShadow: '0 0 40px rgba(14, 165, 233, 0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mb-3">
                    <Play className="w-5 h-5 text-brand-400" />
                  </div>
                  <p className="text-white font-semibold text-lg">Scroll-Driven Animation</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {PRESETS[activePreset].description}
                  </p>
                </div>
              </div>

              {/* Spacer after target */}
              <div className="h-[300px] flex items-end justify-center pb-8">
                <p className="text-slate-600 text-sm">
                  End of preview
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 ml-1">
            Tip: If your browser supports it, you can also scroll the main page for a more realistic experience.
          </p>
        </section>

        {/* Generated CSS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Generated CSS
            </h3>
            <button
              onClick={copyGeneratedCss}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
          </div>
          <pre className="bg-surface border border-slate-700/50 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
            <code>{generatedCss}</code>
          </pre>
        </section>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <div className="text-brand-400 text-sm mt-0.5">💡</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Scroll-Driven Animations</strong> are now{' '}
            <strong className="text-brand-300">Baseline across all major browsers</strong> (Chrome 115+, Edge 115+, Firefox 128+, Safari 18+).{' '}
            <code className="bg-surface-lighter text-brand-300 px-1 rounded">scroll()</code>{' '}
            links animation progress to a scroll container, while{' '}
            <code className="bg-surface-lighter text-brand-300 px-1 rounded">view()</code>{' '}
            links it to an element&apos;s visibility within the viewport. No JavaScript required.
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

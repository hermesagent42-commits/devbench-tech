'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Play, Pause, RotateCcw, Sparkles, Eye, EyeOff,
  ChevronDown, Zap, Layers, Timer, ArrowUp, ArrowDown,
  Maximize2, Minimize2, MoveHorizontal, MoveVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface StartingStyleConfig {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
  blur: number;
}

interface Preset {
  label: string;
  description: string;
  icon: string;
  config: StartingStyleConfig;
  easing: string;
  duration: number;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'Fade In',
    description: 'Classic opacity fade from transparent to visible',
    icon: '🌅',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, blur: 0 },
    easing: 'ease-out',
    duration: 0.4,
  },
  {
    label: 'Slide Up',
    description: 'Element slides up from below while fading in',
    icon: '⬆️',
    config: { opacity: 0, translateX: 0, translateY: 30, scale: 1, rotate: 0, blur: 0 },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration: 0.5,
  },
  {
    label: 'Slide Down',
    description: 'Element drops in from above',
    icon: '⬇️',
    config: { opacity: 0, translateX: 0, translateY: -30, scale: 1, rotate: 0, blur: 0 },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration: 0.5,
  },
  {
    label: 'Slide Left',
    description: 'Element slides in from the right',
    icon: '⬅️',
    config: { opacity: 0, translateX: 40, translateY: 0, scale: 1, rotate: 0, blur: 0 },
    easing: 'ease-out',
    duration: 0.45,
  },
  {
    label: 'Slide Right',
    description: 'Element slides in from the left',
    icon: '➡️',
    config: { opacity: 0, translateX: -40, translateY: 0, scale: 1, rotate: 0, blur: 0 },
    easing: 'ease-out',
    duration: 0.45,
  },
  {
    label: 'Scale Up',
    description: 'Element grows from 0 to full size with a bounce',
    icon: '🔍',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 0.3, rotate: 0, blur: 0 },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration: 0.5,
  },
  {
    label: 'Pop In',
    description: 'Bouncy entrance — scale + fade combo',
    icon: '💥',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 0.5, rotate: 0, blur: 0 },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration: 0.55,
  },
  {
    label: 'Blur Reveal',
    description: 'Element sharpens from a blur while fading in',
    icon: '🔮',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, blur: 12 },
    easing: 'ease-out',
    duration: 0.6,
  },
  {
    label: 'Rotate In',
    description: 'Element spins into view from -90°',
    icon: '🔄',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 1, rotate: -90, blur: 0 },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration: 0.6,
  },
  {
    label: '3D Flip',
    description: 'Element flips in from a 90° X rotation',
    icon: '🎴',
    config: { opacity: 0, translateX: 0, translateY: 0, scale: 1, rotate: 90, blur: 0 },
    easing: 'ease-out',
    duration: 0.55,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCSS(config: StartingStyleConfig, easing: string, duration: number): string {
  const props: string[] = [];
  if (config.opacity !== 1) props.push('opacity');
  if (config.translateX !== 0 || config.translateY !== 0) props.push('translate');
  if (config.scale !== 1) props.push('scale');
  if (config.rotate !== 0) props.push('rotate');
  if (config.blur !== 0) props.push('filter');

  const transitionProps = props.length > 0 ? props.join(', ') : 'opacity';

  const lines = [
    '/* The element — final (visible) state */',
    '.card {',
    `  transition: ${transitionProps} ${duration}s ${easing};`,
  ];

  if (config.blur > 0) {
    lines.push('  filter: blur(0);');
  }

  lines.push('  opacity: 1;');
  lines.push('  translate: 0 0;');
  lines.push('  scale: 1;');
  lines.push('  rotate: 0deg;');
  lines.push('}');
  lines.push('');
  lines.push('/* @starting-style — initial state before render */');
  lines.push('@starting-style {');
  lines.push('  .card {');

  if (config.opacity !== 1) lines.push(`    opacity: ${config.opacity};`);
  if (config.translateX !== 0 || config.translateY !== 0) {
    lines.push(`    translate: ${config.translateX}px ${config.translateY}px;`);
  }
  if (config.scale !== 1) lines.push(`    scale: ${config.scale};`);
  if (config.rotate !== 0) lines.push(`    rotate: ${config.rotate}deg;`);
  if (config.blur !== 0) lines.push(`    filter: blur(${config.blur}px);`);

  lines.push('  }');
  lines.push('}');

  // If using with display:none → display:block
  lines.push('');
  lines.push('/* For display:none → display:block transitions */');
  lines.push('/* Add transition-behavior: allow-discrete; to .card */');

  return lines.join('\n');
}

function buildHTML(): string {
  return `<div class="card">
  <h2>Hello, @starting-style!</h2>
  <p>This element animates in without JavaScript.</p>
</div>

<button onclick="document.querySelector('.card').classList.toggle('hidden')">
  Toggle Card
</button>`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CSSStartingStylePlaygroundPage() {
  const [config, setConfig] = useState<StartingStyleConfig>({
    opacity: 0,
    translateX: 0,
    translateY: 30,
    scale: 1,
    rotate: 0,
    blur: 0,
  });
  const [easing, setEasing] = useState('cubic-bezier(0.34, 1.56, 0.64, 1)');
  const [duration, setDuration] = useState(0.5);
  const [visible, setVisible] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [showHTML, setShowHTML] = useState(false);
  const [useDiscrete, setUseDiscrete] = useState(false);
  const cardKey = useRef(0);

  const toggleVisibility = useCallback(() => {
    setVisible((v) => !v);
    cardKey.current += 1;
  }, []);

  const reset = useCallback(() => {
    setVisible(true);
    cardKey.current += 1;
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig(preset.config);
    setEasing(preset.easing);
    setDuration(preset.duration);
    setVisible(true);
    cardKey.current += 1;
  }, []);

  const cssCode = useMemo(() => buildCSS(config, easing, duration), [config, easing, duration]);
  const htmlCode = useMemo(() => buildHTML(), []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(htmlCode);
    toast.success('HTML copied!');
  }, [htmlCode]);

  // Build the starting style object for the live preview
  const startingStyle = useMemo(() => {
    const s: Record<string, string> = {};
    if (config.opacity !== 1) s.opacity = String(config.opacity);
    if (config.translateX !== 0 || config.translateY !== 0) {
      s.translate = `${config.translateX}px ${config.translateY}px`;
    }
    if (config.scale !== 1) s.scale = String(config.scale);
    if (config.rotate !== 0) s.rotate = `${config.rotate}deg`;
    if (config.blur !== 0) s.filter = `blur(${config.blur}px)`;
    return s;
  }, [config]);

  const finalStyle = useMemo(() => {
    const s: Record<string, string> = {
      opacity: '1',
      translate: '0 0',
      scale: '1',
      rotate: '0deg',
    };
    if (config.blur > 0) s.filter = 'blur(0)';
    return s;
  }, [config]);

  const transitionStyle = useMemo(() => {
    const props: string[] = [];
    if (config.opacity !== 1) props.push('opacity');
    if (config.translateX !== 0 || config.translateY !== 0) props.push('translate');
    if (config.scale !== 1) props.push('scale');
    if (config.rotate !== 0) props.push('rotate');
    if (config.blur !== 0) props.push('filter');
    if (props.length === 0) props.push('opacity');

    const s: Record<string, string> = {
      transition: `${props.join(', ')} ${duration}s ${easing}`,
    };
    if (useDiscrete) {
      s.transitionBehavior = 'allow-discrete';
    }
    return s;
  }, [config, easing, duration, useDiscrete]);

  const EASING_PRESETS = [
    { label: 'ease', value: 'ease' },
    { label: 'ease-in', value: 'ease-in' },
    { label: 'ease-out', value: 'ease-out' },
    { label: 'ease-in-out', value: 'ease-in-out' },
    { label: 'linear', value: 'linear' },
    { label: 'Bounce', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { label: 'Elastic', value: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' },
    { label: 'Smooth', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  ];

  return (
    <ToolLayout
      title="CSS @starting-style Playground"
      description="Build declarative entry animations with the new @starting-style at-rule — no JavaScript required. Define the initial state of any element and let CSS transitions handle the rest. Baseline 2026."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Live Preview ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview Area */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" /> Live Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCode((v) => !v)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    showCode ? 'bg-slate-700 text-slate-300' : 'text-slate-500'
                  }`}
                >
                  CSS
                </button>
                <button
                  onClick={() => setShowHTML((v) => !v)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    showHTML ? 'bg-slate-700 text-slate-300' : 'text-slate-500'
                  }`}
                >
                  HTML
                </button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div className="relative min-h-[320px] bg-slate-950 border border-slate-700 rounded-lg flex flex-col items-center justify-center gap-4 p-6">
              {/* Toggle Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVisibility}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {visible ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide Card
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show Card
                    </>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {/* The Animated Card */}
              {visible && (
                <div
                  key={cardKey.current}
                  className="w-64 bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-brand-400/30 rounded-xl p-5 shadow-xl"
                  style={{
                    ...startingStyle,
                    animation: 'none',
                  }}
                  ref={(el) => {
                    if (el) {
                      // Apply final state after a frame to trigger transition
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          Object.assign(el.style, finalStyle, transitionStyle);
                        });
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-brand-400" />
                    <h3 className="text-sm font-semibold text-white">@starting-style</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This card animates in using only CSS. No JavaScript animation libraries needed — just
                    define the starting state and let transitions do the work.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    Baseline 2026
                  </div>
                </div>
              )}

              {!visible && (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Card hidden — click &quot;Show Card&quot; to see the animation
                </div>
              )}

              {/* Starting state indicator */}
              {!visible && (
                <div className="mt-2 text-[10px] text-slate-600 text-center max-w-xs">
                  When the card appears, it transitions from its @starting-style (initial state) to its
                  final computed style. The transition properties you configure control the animation.
                </div>
              )}
            </div>

            <div className="mt-2 text-center text-xs text-slate-500">
              This preview simulates @starting-style by applying the initial state inline and then
              transitioning to the final state. In a browser with native @starting-style support, the
              at-rule handles this automatically.
            </div>
          </div>

          {/* CSS Code Output */}
          {showCode && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" /> Generated CSS
                </h3>
                <button
                  onClick={copyCSS}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy CSS
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
                {cssCode}
              </pre>
            </div>
          )}

          {/* HTML Code Output */}
          {showHTML && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" /> Example HTML
                </h3>
                <button
                  onClick={copyHTML}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy HTML
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
                {htmlCode}
              </pre>
            </div>
          )}
        </div>

        {/* ── Right: Controls ── */}
        <div className="space-y-4">
          {/* Presets */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> Presets
            </h3>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{preset.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-slate-500">{preset.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Starting Style Properties */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Starting State
            </h3>
            <div className="space-y-3">
              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Opacity</label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.opacity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) => setConfig((c) => ({ ...c, opacity: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Translate X */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3" /> Translate X
                  </label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.translateX}px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={config.translateX}
                  onChange={(e) => setConfig((c) => ({ ...c, translateX: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Translate Y */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MoveVertical className="w-3 h-3" /> Translate Y
                  </label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.translateY}px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={config.translateY}
                  onChange={(e) => setConfig((c) => ({ ...c, translateY: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Scale */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> Scale
                  </label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.scale}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.scale}
                  onChange={(e) => setConfig((c) => ({ ...c, scale: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Rotate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Rotate</label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.rotate}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={config.rotate}
                  onChange={(e) => setConfig((c) => ({ ...c, rotate: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Blur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Blur</label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{config.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={config.blur}
                  onChange={(e) => setConfig((c) => ({ ...c, blur: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Transition Settings */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Timer className="w-4 h-4 text-brand-400" /> Transition
            </h3>
            <div className="space-y-3">
              {/* Duration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Duration</label>
                  <span className="text-[11px] text-brand-400 tabular-nums">{duration}s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Easing */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Easing</label>
                <select
                  value={easing}
                  onChange={(e) => setEasing(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500 appearance-none cursor-pointer"
                >
                  {EASING_PRESETS.map((ep) => (
                    <option key={ep.value} value={ep.value}>
                      {ep.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discrete toggle */}
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  transition-behavior: allow-discrete
                </label>
                <button
                  onClick={() => setUseDiscrete((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    useDiscrete ? 'bg-brand-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      useDiscrete ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {useDiscrete && (
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Required when transitioning from <code className="text-brand-400">display: none</code> to{' '}
                  <code className="text-brand-400">display: block</code> (or other discrete properties).
                </p>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> How @starting-style Works
            </h3>
            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <p>
                <code className="text-brand-400">@starting-style</code> is a CSS at-rule that defines the
                initial state of an element <em>before</em> it first renders in the DOM.
              </p>
              <p>
                When the element appears (e.g., a popover opens, a dialog shows, or an element is inserted
                via JavaScript), the browser applies the @starting-style values first, then immediately
                transitions to the element&apos;s computed final state.
              </p>
              <p>
                This means you can create entry animations with <strong>zero JavaScript</strong> — just
                define the starting state and let CSS transitions handle the rest.
              </p>
              <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-700">
                <p className="text-[10px] text-slate-500">
                  <strong className="text-yellow-400">Baseline 2026:</strong> @starting-style is newly
                  available across all major browsers. It works with popovers, dialogs, and any element
                  that transitions from not-rendered to rendered.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

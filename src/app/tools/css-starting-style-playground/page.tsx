'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Code2, Sparkles, Palette, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

type AnimProperty = 'opacity' | 'scale' | 'translateY' | 'translateX' | 'rotate';
type PresetKey = 'dialog' | 'tooltip' | 'drawer' | 'card' | 'notification' | 'slide-in';

interface Preset {
  name: string;
  description: string;
  properties: Record<AnimProperty, { from: number; to: number }>;
  duration: number;
  easing: string;
  elementLabel: string;
  elementStyles: string;
}

const PRESETS: Record<PresetKey, Preset> = {
  dialog: {
    name: 'Dialog / Modal',
    description: 'Scale + fade in from center with backdrop',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.95, to: 1 },
      translateY: { from: 10, to: 0 },
      translateX: { from: 0, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.25,
    easing: 'ease-out',
    elementLabel: 'Dialog Content',
    elementStyles: 'background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid #475569; border-radius: 16px; padding: 32px 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: 300px;',
  },
  tooltip: {
    name: 'Tooltip',
    description: 'Subtle fade + slide up on hover',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.98, to: 1 },
      translateY: { from: 4, to: 0 },
      translateX: { from: 0, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.15,
    easing: 'ease-out',
    elementLabel: '💡 Useful Tooltip',
    elementStyles: 'background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 8px 14px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);',
  },
  drawer: {
    name: 'Drawer / Side Panel',
    description: 'Slide in from the right edge',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 1, to: 1 },
      translateY: { from: 0, to: 0 },
      translateX: { from: 40, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.3,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    elementLabel: '☰ Drawer Menu',
    elementStyles: 'background: #0f172a; border-left: 2px solid #334155; border-radius: 12px 0 0 12px; padding: 24px; box-shadow: -10px 0 30px rgba(0,0,0,0.3); width: 260px;',
  },
  card: {
    name: 'Card Entrance',
    description: 'Pop in with slight bounce effect',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1 },
      translateY: { from: 20, to: 0 },
      translateX: { from: 0, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.35,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    elementLabel: '🎴 Animated Card',
    elementStyles: 'background: linear-gradient(145deg, #1e293b, #0f172a); border: 2px solid #3b82f6; border-radius: 16px; padding: 28px; box-shadow: 0 10px 40px rgba(59,130,246,0.15); width: 260px;',
  },
  notification: {
    name: 'Toast Notification',
    description: 'Slide down from top with fade',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.98, to: 1 },
      translateY: { from: -20, to: 0 },
      translateX: { from: 0, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.2,
    easing: 'ease-out',
    elementLabel: '🔔 New Notification!',
    elementStyles: 'background: #065f46; border: 2px solid #10b981; border-radius: 12px; padding: 14px 20px; box-shadow: 0 8px 24px rgba(16,185,129,0.2); width: 280px;',
  },
  'slide-in': {
    name: 'Slide In (Bottom)',
    description: 'Slide up from below with fade',
    properties: {
      opacity: { from: 0, to: 1 },
      scale: { from: 1, to: 1 },
      translateY: { from: 30, to: 0 },
      translateX: { from: 0, to: 0 },
      rotate: { from: 0, to: 0 },
    },
    duration: 0.3,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    elementLabel: '📋 Slide-in Panel',
    elementStyles: 'background: linear-gradient(135deg, #1e293b, #172554); border: 2px solid #6366f1; border-radius: 14px; padding: 20px 28px; box-shadow: 0 12px 40px rgba(99,102,241,0.2); width: 270px;',
  },
};

const EASING_OPTIONS = [
  'ease', 'ease-in', 'ease-out', 'ease-in-out',
  'cubic-bezier(0.16, 1, 0.3, 1)', 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'cubic-bezier(0.65, 0, 0.35, 1)', 'cubic-bezier(0.25, 0.1, 0.25, 1)',
];

function generateCSS(
  preset: Preset,
  duration: number,
  easing: string
): { normal: string; startingStyle: string; full: string } {
  const props = preset.properties;
  const className = '.animated-element';

  const normalProps: string[] = [];
  const startingProps: string[] = [];
  const transitionParts: string[] = [];

  for (const [key, val] of Object.entries(props)) {
    if (val.from === val.to) continue;
    const cssKey = key === 'scale' ? 'transform: scale' : key === 'translateY' ? 'transform: translateY' : key === 'translateX' ? 'transform: translateX' : key === 'rotate' ? 'transform: rotate' : key;
    const unit = key === 'opacity' ? '' : key === 'rotate' ? 'deg' : 'px';
    normalProps.push(`${cssKey}(${val.to}${unit})`);
    startingProps.push(`${cssKey}(${val.from}${unit})`);
    transitionParts.push(`${key === 'scale' ? 'transform' : key === 'translateY' || key === 'translateX' || key === 'rotate' ? 'transform' : key} ${duration}s ${easing}`);
  }

  if (props.opacity.from !== props.opacity.to) {
    normalProps.unshift(`opacity: ${props.opacity.to}`);
    startingProps.unshift(`opacity: ${props.opacity.from}`);
  }
  if (props.scale.from !== props.scale.to) {
    normalProps.push(`transform: scale(${props.scale.to})`);
    startingProps.push(`transform: scale(${props.scale.from})`);
  }
  if (props.translateY.from !== props.translateY.to) {
    normalProps.push(`transform: translateY(${props.translateY.to}px)`);
    startingProps.push(`transform: translateY(${props.translateY.from}px)`);
  }
  if (props.translateX.from !== props.translateX.to) {
    normalProps.push(`transform: translateX(${props.translateX.to}px)`);
    startingProps.push(`transform: translateX(${props.translateX.from}px)`);
  }
  if (props.rotate.from !== props.rotate.to) {
    normalProps.push(`transform: rotate(${props.rotate.to}deg)`);
    startingProps.push(`transform: rotate(${props.rotate.from}deg)`);
  }

  // Build a proper combined transform
  const buildTransform = (scale: number, ty: number, tx: number, rot: number): string => {
    const parts: string[] = [];
    if (scale !== 1) parts.push(`scale(${scale})`);
    if (ty !== 0) parts.push(`translateY(${ty}px)`);
    if (tx !== 0) parts.push(`translateX(${tx}px)`);
    if (rot !== 0) parts.push(`rotate(${rot}deg)`);
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  const toTransform = buildTransform(props.scale.to, props.translateY.to, props.translateX.to, props.rotate.to);
  const fromTransform = buildTransform(props.scale.from, props.translateY.from, props.translateX.from, props.rotate.from);

  const normalCSS = `${className} {
  opacity: ${props.opacity.to};
  transform: ${toTransform};
  transition: opacity ${duration}s ${easing}, transform ${duration}s ${easing}, display ${duration}s ${easing} allow-discrete;
}`;

  const startingCSS = `@starting-style {
  ${className} {
    opacity: ${props.opacity.from};
    transform: ${fromTransform};
  }
}`;

  const fullCSS = `${normalCSS}\n\n${startingCSS}`;

  return { normal: normalCSS, startingStyle: startingCSS, full: fullCSS };
}

export default function CssStartingStylePage() {
  const [preset, setPreset] = useState<PresetKey>('dialog');
  const [duration, setDuration] = useState(0.25);
  const [easing, setEasing] = useState('ease-out');
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customStyles, setCustomStyles] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPreset = PRESETS[preset];

  const css = generateCSS(currentPreset, duration, easing);

  const toggleVisibility = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    if (visible) {
      setVisible(false);
      timerRef.current = setTimeout(() => setAnimating(false), (duration * 1000) + 50);
    } else {
      setVisible(true);
      timerRef.current = setTimeout(() => setAnimating(false), (duration * 1000) + 50);
    }
  }, [visible, animating, duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css.full).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed')
    );
  }, [css.full]);

  const resetAll = useCallback(() => {
    setPreset('dialog');
    setDuration(0.25);
    setEasing('ease-out');
    setVisible(false);
    setAnimating(false);
    setCustomLabel('');
    setCustomStyles('');
  }, []);

  const label = customLabel || currentPreset.elementLabel;
  const elementInlineStyles = customStyles || currentPreset.elementStyles;

  const fromTransform = (() => {
    const p = currentPreset.properties;
    const parts: string[] = [];
    if (p.scale.from !== 1) parts.push(`scale(${p.scale.from})`);
    if (p.translateY.from !== 0) parts.push(`translateY(${p.translateY.from}px)`);
    if (p.translateX.from !== 0) parts.push(`translateX(${p.translateX.from}px)`);
    if (p.rotate.from !== 0) parts.push(`rotate(${p.rotate.from}deg)`);
    return parts.join(' ');
  })();

  const toTransform = (() => {
    const p = currentPreset.properties;
    const parts: string[] = [];
    if (p.scale.to !== 1) parts.push(`scale(${p.scale.to})`);
    if (p.translateY.to !== 0) parts.push(`translateY(${p.translateY.to}px)`);
    if (p.translateX.to !== 0) parts.push(`translateX(${p.translateX.to}px)`);
    if (p.rotate.to !== 0) parts.push(`rotate(${p.rotate.to}deg)`);
    return parts.join(' ');
  })();

  return (
    <ToolLayout
      title="CSS @starting-style Playground"
      description="Design entry and exit animations with the new @starting-style at-rule — now cross-browser Baseline 2026. Animate from display:none without JavaScript."
    >
      {/* Preset Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Preset Animation</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.entries(PRESETS) as [PresetKey, Preset][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => { setPreset(key); setVisible(false); setAnimating(false); }}
              className={`text-left p-3 rounded-xl border transition-all ${
                preset === key
                  ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                  : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <div className="text-xs font-semibold mb-0.5">{p.name}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Duration: <span className="text-brand-400">{duration}s</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>0.05s</span>
            <span>1.5s</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Easing Function</label>
          <select
            value={easing}
            onChange={(e) => setEasing(e.target.value)}
            className="w-full bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60"
          >
            {EASING_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom label / styles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder={`Custom label (default: "${currentPreset.elementLabel}")`}
          className="bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 placeholder-slate-500 font-mono"
        />
        <input
          type="text"
          value={customStyles}
          onChange={(e) => setCustomStyles(e.target.value)}
          placeholder="Custom inline styles (CSS properties)"
          className="bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 placeholder-slate-500 font-mono"
        />
      </div>

      {/* Live Preview */}
      <div className="mb-8 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-400" />
            Live Preview
          </h3>
          <div className="flex gap-2">
            <button
              onClick={toggleVisibility}
              disabled={animating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 disabled:opacity-50 transition-all text-sm font-medium"
            >
              {visible ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {visible ? 'Hide' : 'Animate In'}
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[180px] bg-slate-900/60 rounded-xl border border-slate-700/30 p-6">
          {visible ? (
            <div
              key="animated"
              style={{
                opacity: currentPreset.properties.opacity.to,
                transform: toTransform,
                transition: `opacity ${duration}s ${easing}, transform ${duration}s ${easing}`,
                ...(elementInlineStyles ? {} : {}),
              } as React.CSSProperties}
              className="inline-flex items-center justify-center"
            >
              <div style={elementInlineStyles ? {} : {}} dangerouslySetInnerHTML={!elementInlineStyles ? undefined : { __html: '' }} />
              <span className="text-slate-200 text-sm font-medium">{label}</span>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Click &quot;Animate In&quot; to see the @starting-style effect</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span>From: opacity({currentPreset.properties.opacity.from}) + transform({fromTransform || 'none'})</span>
          <span className="text-slate-600">→</span>
          <span>To: opacity({currentPreset.properties.opacity.to}) + transform({toTransform || 'none'})</span>
        </div>
      </div>

      {/* Property Details */}
      <div className="mb-8 p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          Animation Properties
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.entries(currentPreset.properties) as [AnimProperty, { from: number; to: number }][]).map(([key, val]) => (
            <div key={key} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{key}</div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-red-400 font-mono">{val.from}</span>
                <span className="text-slate-600">→</span>
                <span className="text-emerald-400 font-mono">{val.to}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated CSS */}
      <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Generated CSS
          </h3>
          <button
            onClick={copyCSS}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
        <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-4 border border-slate-700/30 overflow-x-auto font-mono leading-relaxed">
          <code>{css.full}</code>
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          Requires <code className="text-brand-400 bg-brand-500/10 px-1 rounded">transition-behavior: allow-discrete</code> on <code className="text-brand-400 bg-brand-500/10 px-1 rounded">display</code> for the full entry effect. Baseline 2026 across Chrome, Firefox, Safari.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-8 p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          How @starting-style Works
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          CSS transitions need a &quot;before&quot; state and an &quot;after&quot; state. When an element appears from{' '}
          <code className="text-brand-400 bg-brand-500/10 px-1 rounded">display: none</code>, there is no &quot;before&quot; state.{' '}
          <code className="text-brand-400 bg-brand-500/10 px-1 rounded">@starting-style</code> defines that missing starting point.{' '}
          The browser uses it only during the first frame the element exists, then transitions to the normal state.
          Pair with <code className="text-brand-400 bg-brand-500/10 px-1 rounded">transition-behavior: allow-discrete</code> to animate{' '}
          <code className="text-brand-400 bg-brand-500/10 px-1 rounded">display</code> itself. Read the full guide on{' '}
          <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">MDN</a>.
        </p>
      </div>
    </ToolLayout>
  );
}

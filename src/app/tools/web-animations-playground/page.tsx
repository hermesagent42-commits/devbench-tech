'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, RotateCcw, Plus, Trash2, Pause, Zap, Code2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

/* Web Animations API Playground — interactive element.animate() builder */

interface Keyframe {
  id: string;
  offset: number | '';
  transform: string;
  opacity: number;
  backgroundColor: string;
  scale: number;
}

interface AnimationConfig {
  duration: number;
  easing: string;
  iterations: number | typeof Infinity;
  direction: PlaybackDirection;
  fill: FillMode;
  delay: number;
  endDelay: number;
}

type PlaybackDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
type FillMode = 'none' | 'forwards' | 'backwards' | 'both';

interface Preset {
  name: string;
  description: string;
  keyframes: Omit<Keyframe, 'id'>[];
  config: Partial<AnimationConfig>;
}

const PRESETS: Preset[] = [
  {
    name: 'Fade In', description: 'Simple opacity fade-in',
    keyframes: [
      { offset: 0, transform: '', opacity: 0, backgroundColor: '#3b82f6', scale: 1 },
      { offset: 1, transform: '', opacity: 1, backgroundColor: '#3b82f6', scale: 1 },
    ],
    config: { duration: 600, easing: 'ease-out' },
  },
  {
    name: 'Slide Right', description: 'Slide in from the right',
    keyframes: [
      { offset: 0, transform: 'translateX(80px)', opacity: 0, backgroundColor: '#22c55e', scale: 1 },
      { offset: 1, transform: 'translateX(0px)', opacity: 1, backgroundColor: '#22c55e', scale: 1 },
    ],
    config: { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  {
    name: 'Bounce', description: 'Bouncy entrance with overshoot',
    keyframes: [
      { offset: 0, transform: 'translateY(50px)', opacity: 0, backgroundColor: '#f59e0b', scale: 0.8 },
      { offset: 0.5, transform: 'translateY(-10px)', opacity: 1, backgroundColor: '#f59e0b', scale: 1.05 },
      { offset: 0.75, transform: 'translateY(4px)', opacity: 1, backgroundColor: '#f59e0b', scale: 0.98 },
      { offset: 1, transform: 'translateY(0px)', opacity: 1, backgroundColor: '#f59e0b', scale: 1 },
    ],
    config: { duration: 800, easing: 'ease-out' },
  },
  {
    name: 'Pulse', description: 'Repeating scale pulse',
    keyframes: [
      { offset: 0, transform: '', opacity: 1, backgroundColor: '#a855f7', scale: 1 },
      { offset: 0.5, transform: '', opacity: 1, backgroundColor: '#a855f7', scale: 1.25 },
      { offset: 1, transform: '', opacity: 1, backgroundColor: '#a855f7', scale: 1 },
    ],
    config: { duration: 1000, easing: 'ease-in-out', iterations: Infinity },
  },
  {
    name: 'Shake', description: 'Horizontal shake for errors',
    keyframes: [
      { offset: 0, transform: 'translateX(0px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.1, transform: 'translateX(-10px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.2, transform: 'translateX(10px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.3, transform: 'translateX(-10px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.4, transform: 'translateX(10px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.5, transform: 'translateX(-6px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.6, transform: 'translateX(6px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.7, transform: 'translateX(-3px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.8, transform: 'translateX(3px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 0.9, transform: 'translateX(-1px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
      { offset: 1, transform: 'translateX(0px)', opacity: 1, backgroundColor: '#ef4444', scale: 1 },
    ],
    config: { duration: 500, easing: 'ease-in-out' },
  },
  {
    name: 'Spin 3D', description: '3D Y-axis rotation entrance',
    keyframes: [
      { offset: 0, transform: 'rotateY(-180deg)', opacity: 0, backgroundColor: '#06b6d4', scale: 1 },
      { offset: 1, transform: 'rotateY(0deg)', opacity: 1, backgroundColor: '#06b6d4', scale: 1 },
    ],
    config: { duration: 800, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  {
    name: 'Flip Card', description: 'Card flip with color change',
    keyframes: [
      { offset: 0, transform: 'rotateY(0deg)', opacity: 1, backgroundColor: '#ec4899', scale: 1 },
      { offset: 0.49, transform: 'rotateY(90deg)', opacity: 1, backgroundColor: '#ec4899', scale: 1 },
      { offset: 0.5, transform: 'rotateY(-90deg)', opacity: 1, backgroundColor: '#8b5cf6', scale: 1 },
      { offset: 1, transform: 'rotateY(0deg)', opacity: 1, backgroundColor: '#8b5cf6', scale: 1 },
    ],
    config: { duration: 1200, easing: 'ease-in-out' },
  },
  {
    name: 'Glow Pulse', description: 'Opacity + scale glow',
    keyframes: [
      { offset: 0, transform: '', opacity: 1, backgroundColor: '#3b82f6', scale: 1 },
      { offset: 0.5, transform: '', opacity: 0.7, backgroundColor: '#60a5fa', scale: 1.05 },
      { offset: 1, transform: '', opacity: 1, backgroundColor: '#3b82f6', scale: 1 },
    ],
    config: { duration: 1500, easing: 'ease-in-out', iterations: Infinity },
  },
];

const EASING_PRESETS = [
  { label: 'ease (default)', value: 'ease' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'linear', value: 'linear' },
  { label: 'springy', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { label: 'emphasized', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  { label: 'decelerated', value: 'cubic-bezier(0, 0, 0.2, 1)' },
  { label: 'accelerated', value: 'cubic-bezier(0.4, 0, 1, 1)' },
];

const DIRECTION_OPTIONS = [
  { label: 'normal', value: 'normal' as PlaybackDirection },
  { label: 'reverse', value: 'reverse' as PlaybackDirection },
  { label: 'alternate', value: 'alternate' as PlaybackDirection },
  { label: 'alternate-reverse', value: 'alternate-reverse' as PlaybackDirection },
];

const FILL_OPTIONS = [
  { label: 'none', value: 'none' as FillMode },
  { label: 'forwards', value: 'forwards' as FillMode },
  { label: 'backwards', value: 'backwards' as FillMode },
  { label: 'both', value: 'both' as FillMode },
];

let kfId = 0;
const nextId = () => `kf-${++kfId}`;

function buildKeyframeEffect(kfs: Keyframe[]): Keyframe[] {
  return kfs.map((kf) => {
    const parts: string[] = [];
    if (kf.transform) parts.push(kf.transform);
    if (kf.scale !== 1) parts.push(`scale(${kf.scale})`);
    return { ...kf, transform: parts.join(' ') || 'none' };
  });
}

export default function WebAnimationsPlayground() {
  const targetRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);

  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: nextId(), offset: 0, transform: '', opacity: 0, backgroundColor: '#3b82f6', scale: 1 },
    { id: nextId(), offset: 1, transform: '', opacity: 1, backgroundColor: '#3b82f6', scale: 1 },
  ]);
  const [config, setConfig] = useState<AnimationConfig>({
    duration: 600, easing: 'ease-out', iterations: 1, direction: 'normal', fill: 'forwards', delay: 0, endDelay: 0,
  });
  const [customEasing, setCustomEasing] = useState('');
  const [playing, setPlaying] = useState(false);

  const easingValue = customEasing || config.easing;

  const stopAnimation = useCallback(() => {
    animRef.current?.cancel();
    animRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => () => animRef.current?.cancel(), []);

  const play = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    stopAnimation();

    const kfs = buildKeyframeEffect(keyframes);
    const effect = kfs.map((kf) => {
      const frame: Record<string, string | number> = {};
      if (kf.offset !== '') frame.offset = Number(kf.offset);
      if (kf.transform && kf.transform !== 'none') frame.transform = kf.transform;
      frame.opacity = kf.opacity;
      frame.backgroundColor = kf.backgroundColor;
      return frame;
    });

    try {
      const anim = el.animate(effect, {
        duration: config.duration, easing: easingValue, iterations: config.iterations,
        direction: config.direction, fill: config.fill, delay: config.delay, endDelay: config.endDelay,
      });
      animRef.current = anim;
      setPlaying(true);
      anim.onfinish = () => setPlaying(false);
      anim.oncancel = () => setPlaying(false);
    } catch (e) {
      toast.error('Invalid animation: ' + (e instanceof Error ? e.message : 'Check keyframes'));
    }
  }, [keyframes, config, easingValue, stopAnimation]);

  const loadPreset = useCallback((p: Preset) => {
    stopAnimation();
    setKeyframes(p.keyframes.map((k) => ({ ...k, id: nextId() })));
    setConfig((prev) => ({ ...prev, ...p.config }));
    setCustomEasing('');
  }, [stopAnimation]);

  const addKeyframe = useCallback(() => {
    setKeyframes((prev) => {
      const last = prev[prev.length - 1];
      const n = (typeof last?.offset === 'number' ? last.offset : 1) + 0.15;
      const mid = {
        id: nextId(), offset: Math.min(n, 0.95), transform: '', opacity: 1,
        backgroundColor: prev[0]?.backgroundColor || '#3b82f6', scale: 1,
      };
      const sorted = [...prev.slice(0, -1), mid, prev[prev.length - 1]];
      sorted.sort((a, b) => {
        const ao = typeof a.offset === 'number' ? a.offset : 1;
        const bo = typeof b.offset === 'number' ? b.offset : 1;
        return ao - bo;
      });
      return sorted;
    });
  }, []);

  const removeKeyframe = useCallback((id: string) => {
    setKeyframes((prev) => (prev.length <= 2 ? prev : prev.filter((k) => k.id !== id)));
  }, []);

  const updateKeyframe = useCallback((id: string, field: keyof Keyframe, value: string | number) => {
    setKeyframes((prev) => prev.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  }, []);

  const generatedCode = useMemo(() => {
    const kfs = buildKeyframeEffect(keyframes);
    const kfJson = kfs.map((kf) => {
      const o: Record<string, unknown> = {};
      if (kf.offset !== '') o.offset = Number(kf.offset);
      o.opacity = kf.opacity;
      if (kf.transform && kf.transform !== 'none') o.transform = kf.transform;
      o.backgroundColor = kf.backgroundColor;
      return o;
    });

    const kfStr = JSON.stringify(kfJson, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/: "([^"]*)"/g, ": '$1'");

    const opts: string[] = [];
    opts.push(`  duration: ${config.duration}`);
    opts.push(`  easing: '${easingValue}'`);
    if (config.iterations === Infinity) opts.push('  iterations: Infinity');
    else if (config.iterations !== 1) opts.push(`  iterations: ${config.iterations}`);
    if (config.direction !== 'normal') opts.push(`  direction: '${config.direction}'`);
    if (config.fill !== 'none') opts.push(`  fill: '${config.fill}'`);
    if (config.delay) opts.push(`  delay: ${config.delay}`);
    if (config.endDelay) opts.push(`  endDelay: ${config.endDelay}`);

    return `// Web Animations API\nconst element = document.querySelector('.target');\n\nconst keyframes = ${kfStr};\n\nconst options = {\n${opts.join(',\n')}\n};\n\nconst animation = element.animate(keyframes, options);`;
  }, [keyframes, config, easingValue]);

  return (
    <ToolLayout title="Web Animations API Playground" description="Build & preview element.animate() keyframe animations with live code generation.">
      <div className="space-y-6">
        {/* Presets */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <Zap className="w-4 h-4" /> Presets
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => loadPreset(p)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 hover:border-blue-500 transition-colors text-slate-200"
                title={p.description}>{p.name}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keyframes + Config */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Keyframes</h3>
                <div className="flex gap-2">
                  <button onClick={addKeyframe} className="px-2 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-300 flex items-center gap-1"><Plus className="w-3 h-3"/> Add</button>
                  <button onClick={() => { stopAnimation(); setKeyframes([{ id: nextId(), offset: 0, transform: '', opacity: 0, backgroundColor: '#3b82f6', scale: 1 }, { id: nextId(), offset: 1, transform: '', opacity: 1, backgroundColor: '#3b82f6', scale: 1 }]); setConfig({ duration: 600, easing: 'ease-out', iterations: 1, direction: 'normal', fill: 'forwards', delay: 0, endDelay: 0 }); setCustomEasing(''); }} className="px-2 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-300 flex items-center gap-1"><RotateCcw className="w-3 h-3"/> Reset</button>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {keyframes.map((kf, i) => (
                  <div key={kf.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <span className="text-xs text-slate-500 w-5 text-center font-mono">{i}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">off</span>
                      <input type="number" min={0} max={1} step={0.05} value={kf.offset} onChange={(e) => updateKeyframe(kf.id, 'offset', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-14 px-1 py-0.5 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono" />
                    </div>
                    <input type="text" value={kf.transform} onChange={(e) => updateKeyframe(kf.id, 'transform', e.target.value)} className="flex-1 px-2 py-0.5 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono placeholder:text-slate-600" placeholder="transform..." />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">op</span>
                      <input type="number" min={0} max={1} step={0.1} value={kf.opacity} onChange={(e) => updateKeyframe(kf.id, 'opacity', parseFloat(e.target.value))} className="w-14 px-1 py-0.5 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono" />
                    </div>
                    <input type="color" value={kf.backgroundColor} onChange={(e) => updateKeyframe(kf.id, 'backgroundColor', e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent" />
                    <button onClick={() => removeKeyframe(kf.id)} disabled={keyframes.length <= 2} className="p-1 rounded text-slate-500 hover:text-red-400 disabled:opacity-30"><Trash2 className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-400 uppercase">Options</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duration (ms)</label>
                  <input type="number" min={50} max={10000} step={50} value={config.duration} onChange={(e) => setConfig((c) => ({ ...c, duration: parseInt(e.target.value) || 600 }))} className="w-full px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Delay (ms)</label>
                  <input type="number" min={0} max={5000} step={50} value={config.delay} onChange={(e) => setConfig((c) => ({ ...c, delay: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Easing</label>
                  <div className="flex gap-2">
                    <select value={customEasing ? '__custom' : config.easing} onChange={(e) => { if (e.target.value === '__custom') setCustomEasing('cubic-bezier(0.4, 0, 0.2, 1)'); else { setCustomEasing(''); setConfig((c) => ({ ...c, easing: e.target.value })); } }} className="flex-1 px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200">
                      {EASING_PRESETS.map((e) => (<option key={e.value} value={e.value}>{e.label}</option>))}
                      <option value="__custom">custom cubic-bezier...</option>
                    </select>
                  </div>
                  {customEasing && (
                    <input type="text" value={customEasing} onChange={(e) => setCustomEasing(e.target.value)} className="mt-1 w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-600 text-slate-200 font-mono" />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Iterations</label>
                  <div className="flex gap-1">
                    <input type="number" min={1} value={config.iterations === Infinity ? '' : config.iterations as number} onChange={(e) => { const v = e.target.value; setConfig((c) => ({ ...c, iterations: v === '' ? Infinity : Math.max(1, parseInt(v) || 1) })); }} placeholder="∞" className="flex-1 px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono" />
                    <button onClick={() => setConfig((c) => ({ ...c, iterations: c.iterations === Infinity ? 1 : Infinity }))} className={`px-3 py-1.5 text-xs rounded-lg border font-mono ${config.iterations === Infinity ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-600 bg-slate-700/50 text-slate-300'}`}>∞</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Delay (ms)</label>
                  <input type="number" min={0} max={5000} step={50} value={config.endDelay} onChange={(e) => setConfig((c) => ({ ...c, endDelay: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Direction</label>
                  <select value={config.direction} onChange={(e) => setConfig((c) => ({ ...c, direction: e.target.value as PlaybackDirection }))} className="w-full px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200">
                    {DIRECTION_OPTIONS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fill Mode</label>
                  <select value={config.fill} onChange={(e) => setConfig((c) => ({ ...c, fill: e.target.value as FillMode }))} className="w-full px-2 py-1.5 text-sm rounded-lg bg-slate-900 border border-slate-600 text-slate-200">
                    {FILL_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Preview + Code */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Preview</h3>
                <div className="flex gap-2">
                  {playing ? (
                    <button onClick={stopAnimation} className="px-3 py-1 text-xs rounded-lg border border-yellow-600 bg-yellow-600/20 text-yellow-300 flex items-center gap-1 hover:bg-yellow-600/30"><Pause className="w-3 h-3"/> Stop</button>
                  ) : (
                    <button onClick={play} className="px-3 py-1 text-xs rounded-lg border border-green-600 bg-green-600/20 text-green-300 flex items-center gap-1 hover:bg-green-600/30"><Play className="w-3 h-3"/> Play</button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center min-h-[220px] bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                <div ref={targetRef} className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
                  style={{ backgroundColor: keyframes[0]?.backgroundColor || '#3b82f6', opacity: keyframes[0]?.opacity ?? 1 }}>
                  Target
                </div>
              </div>
              {playing && <div className="mt-2 flex items-center gap-2 text-xs text-blue-400"><span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>Running...</div>}
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase flex items-center gap-2"><Code2 className="w-4 h-4"/> Generated Code</h3>
                <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copied!'); }} className="px-2 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-300 flex items-center gap-1"><Copy className="w-3 h-3"/> Copy</button>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-slate-900/70 rounded-lg p-3 overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed">{generatedCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

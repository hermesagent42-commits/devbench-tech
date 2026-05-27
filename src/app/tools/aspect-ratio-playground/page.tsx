'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Maximize2, Ruler, Monitor, Smartphone, Tablet } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Ratio {
  width: number;
  height: number;
}

interface Preset {
  name: string;
  ratio: Ratio;
  description: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { name: 'Square 1:1', ratio: { width: 1, height: 1 }, description: 'Instagram posts, profile pictures' },
  { name: 'Classic 4:3', ratio: { width: 4, height: 3 }, description: 'iPad, older monitors, photos' },
  { name: 'Photo 3:2', ratio: { width: 3, height: 2 }, description: 'DSLR cameras, 35mm film' },
  { name: 'Widescreen 16:9', ratio: { width: 16, height: 9 }, description: 'HD video, most laptops' },
  { name: 'Ultrawide 21:9', ratio: { width: 21, height: 9 }, description: 'Cinematic, ultrawide monitors' },
  { name: 'Anamorphic 2.39:1', ratio: { width: 239, height: 100 }, description: 'Cinema widescreen films' },
  { name: 'Tall 9:16', ratio: { width: 9, height: 16 }, description: 'Stories, Reels, Shorts' },
  { name: 'Portrait 2:3', ratio: { width: 2, height: 3 }, description: 'Portrait photography' },
  { name: 'Portrait 3:4', ratio: { width: 3, height: 4 }, description: 'iPad portrait, older displays' },
  { name: 'Golden Ratio φ', ratio: { width: 1618, height: 1000 }, description: '1.618:1 — nature & design' },
  { name: 'Silver Ratio √2', ratio: { width: 1414, height: 1000 }, description: 'A4 paper, ISO 216' },
  { name: 'Classic 5:4', ratio: { width: 5, height: 4 }, description: '1280×1024 monitors' },
  { name: 'IMAX 1.43:1', ratio: { width: 143, height: 100 }, description: 'IMAX film format' },
  { name: 'Academy 1.375:1', ratio: { width: 1375, height: 1000 }, description: 'Academy film ratio' },
  { name: 'A4 Paper √2:1', ratio: { width: 1414, height: 1000 }, description: 'A3/A4/A5 page ratio' },
];

// ── Device frames ──────────────────────────────────────────────────────────

const DEVICE_FRAMES = [
  { name: 'Desktop', width: 640, icon: Monitor },
  { name: 'Tablet', width: 400, icon: Tablet },
  { name: 'Mobile', width: 260, icon: Smartphone },
] as const;

const DEFAULT_RATIO: Ratio = { width: 16, height: 9 };

// ── Helpers ────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function simplifyRatio({ width, height }: Ratio): Ratio {
  const d = gcd(width, height);
  return { width: width / d, height: height / d };
}

function ratioToDecimal({ width, height }: Ratio): number {
  return height === 0 ? 0 : width / height;
}

function buildCSS(ratio: Ratio): string {
  const simplified = simplifyRatio(ratio);
  const decimal = ratioToDecimal(ratio).toFixed(4);
  return `aspect-ratio: ${simplified.width} / ${simplified.height};\n/* = ${decimal} */`;
}

function buildTailwind(ratio: Ratio): string {
  const simplified = simplifyRatio(ratio);
  return `aspect-[${simplified.width}/${simplified.height}]`;
}

function getClassName(ratio: Ratio): string {
  const simplified = simplifyRatio(ratio);
  // Check if it matches a common Tailwind utility
  if (simplified.width === 1 && simplified.height === 1) return 'aspect-square';
  if (simplified.width === 16 && simplified.height === 9) return 'aspect-video';
  if (simplified.width === 4 && simplified.height === 3) return 'aspect-[4/3]';
  if (simplified.width === 3 && simplified.height === 2) return 'aspect-[3/2]';
  return `aspect-[${simplified.width}/${simplified.height}]`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AspectRatioPlayground() {
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(9);
  const [deviceWidth, setDeviceWidth] = useState(640);

  const ratio: Ratio = useMemo(() => ({ width, height }), [width, height]);
  const simplified = useMemo(() => simplifyRatio(ratio), [ratio]);
  const decimal = useMemo(() => ratioToDecimal(ratio), [ratio]);
  const cssValue = useMemo(() => buildCSS(ratio), [ratio]);
  const tailwindClass = useMemo(() => buildTailwind(ratio), [ratio]);
  const tailwindUtility = useMemo(() => getClassName(ratio), [ratio]);

  // Preview height based on device width and ratio
  const previewHeight = useMemo(() => {
    if (height === 0) return 0;
    return Math.round((deviceWidth * height) / width);
  }, [deviceWidth, width, height]);

  const applyPreset = useCallback((preset: Preset) => {
    setWidth(preset.ratio.width);
    setHeight(preset.ratio.height);
  }, []);

  const reset = useCallback(() => {
    setWidth(16);
    setHeight(9);
    setDeviceWidth(640);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssValue);
    toast.success('CSS copied!');
  }, [cssValue]);

  const copyTailwind = useCallback(() => {
    navigator.clipboard.writeText(tailwindClass);
    toast.success('Tailwind class copied!');
  }, [tailwindClass]);

  // Width presets for quick switching
  const setCommonWidth = useCallback(
    (w: number) => () => setWidth(Math.max(1, w)),
    []
  );

  const sliderChange = useCallback(
    (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(Math.max(1, Math.min(2000, parseInt(e.target.value) || 1)));
    },
    []
  );

  return (
    <ToolLayout
      title="CSS Aspect Ratio Playground"
      description="Visually build and test CSS aspect-ratio values — pick from 15 presets or dial in custom ratios. Live preview at desktop, tablet, and mobile widths."
      controls={
        <button onClick={reset} className="btn-ghost text-sm">
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      }
    >
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-brand-400" />
              Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => {
                const isActive =
                  simplifyRatio(preset.ratio).width === simplified.width &&
                  simplifyRatio(preset.ratio).height === simplified.height;
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isActive
                        ? 'border-brand-400/60 bg-brand-500/10 ring-1 ring-brand-400/40'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    }`}
                    title={preset.description}
                  >
                    <div className="font-medium text-slate-200">{preset.name}</div>
                    <div className="text-slate-500 mt-0.5">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Ratio */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Custom Ratio</h3>

            {/* Width */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Width</label>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 4, 9, 16, 21].map((w) => (
                    <button
                      key={w}
                      onClick={setCommonWidth(w)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                        width === w
                          ? 'bg-brand-500/20 text-brand-300'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={2000}
                  value={width}
                  onChange={sliderChange(setWidth)}
                  className="flex-1 h-1.5 rounded-full bg-slate-700 accent-brand-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={width}
                  onChange={sliderChange(setWidth)}
                  className="w-20 px-2 py-1 text-sm font-mono rounded border border-slate-600 bg-slate-800 text-slate-200 text-center"
                />
              </div>
            </div>

            {/* Height */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Height</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 9, 16].map((h) => (
                    <button
                      key={h}
                      onClick={() => setHeight(Math.max(1, h))}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                        height === h
                          ? 'bg-brand-500/20 text-brand-300'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={2000}
                  value={height}
                  onChange={sliderChange(setHeight)}
                  className="flex-1 h-1.5 rounded-full bg-slate-700 accent-brand-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={height}
                  onChange={sliderChange(setHeight)}
                  className="w-20 px-2 py-1 text-sm font-mono rounded border border-slate-600 bg-slate-800 text-slate-200 text-center"
                />
              </div>
            </div>

            {/* Ratio display */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
              <span className="text-sm text-slate-400">Ratio:</span>
              <span className="text-lg font-mono font-bold text-brand-300">
                {simplified.width}:{simplified.height}
              </span>
              <span className="text-sm text-slate-500">({decimal.toFixed(4)})</span>
            </div>
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div className="space-y-6">
          {/* Device Width Selector */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-brand-400" />
              Preview Width
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {DEVICE_FRAMES.map(({ name, width: w, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => setDeviceWidth(w)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    deviceWidth === w
                      ? 'border-brand-400/60 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={100}
                max={800}
                value={deviceWidth}
                onChange={(e) => setDeviceWidth(Math.max(100, parseInt(e.target.value) || 100))}
                className="flex-1 h-1.5 rounded-full bg-slate-700 accent-brand-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 w-12 text-right">{deviceWidth}px</span>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Live Preview</h3>
            <div
              className="mx-auto rounded-xl overflow-hidden border-2 border-dashed border-slate-600/60 bg-slate-900/60 flex items-center justify-center relative transition-all duration-150"
              style={{ width: deviceWidth, height: previewHeight, maxWidth: '100%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-purple-500/15 to-emerald-500/10 rounded-xl" />
              <div className="relative z-10 text-center">
                <div className="text-xl font-bold text-white mb-1">
                  {simplified.width}:{simplified.height}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {deviceWidth} × {previewHeight}px
                </div>
              </div>
              {/* Size labels */}
              <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500 bg-slate-900/70 px-1.5 py-0.5 rounded">
                {deviceWidth}px
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-900/70 px-1.5 py-0.5 rounded" style={{ writingMode: 'vertical-rl' }}>
                {previewHeight}px
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">CSS Output</h3>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm relative">
              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap pr-20">
                <code>{cssValue}</code>
              </pre>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={copyCSS} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Copy CSS">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tailwind Output */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Tailwind CSS</h3>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm relative">
              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap pr-20">
                <code>{tailwindClass}</code>
              </pre>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={copyTailwind} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Copy Tailwind">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Tailwind utility: <code className="px-1 py-0.5 rounded bg-slate-800 text-brand-300 font-mono">{tailwindUtility}</code>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Usage Examples</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 text-slate-400">
                <span className="text-slate-500">{'/* '}CSS{' */'}</span>
                <br />
                <span className="text-pink-400">.video-container</span>{' {'}
                <br />
                &nbsp;&nbsp;<span className="text-brand-300">aspect-ratio</span>: <span className="text-emerald-400">{simplified.width} / {simplified.height}</span>;
                <br />
                &nbsp;&nbsp;<span className="text-brand-300">width</span>: <span className="text-emerald-400">100%</span>;
                <br />
                {'}'}
              </div>
              <div className="p-2 rounded bg-slate-900 text-slate-400">
                <span className="text-slate-500">{'<!-- '}HTML{' -->'}</span>
                <br />
                <span className="text-yellow-400">&lt;div</span>{' '}
                <span className="text-brand-300">class</span>=<span className="text-emerald-400">&quot;{tailwindUtility}&quot;</span><span className="text-yellow-400">&gt;</span>
                <br />
                &nbsp;&nbsp;<span className="text-slate-500">{'<!-- content -->'}</span>
                <br />
                <span className="text-yellow-400">&lt;/div&gt;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Type, SlidersHorizontal, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type scale definitions ──────────────────────────────────────────────────

interface TypeScale {
  name: string;
  description: string;
  ratio: number;
}

const TYPE_SCALES: TypeScale[] = [
  { name: 'Minor Second', description: 'Subtle, harmonious — good for long-form content', ratio: 1.067 },
  { name: 'Major Second', description: 'Classic, versatile — a safe default', ratio: 1.125 },
  { name: 'Minor Third', description: 'Clear hierarchy without too much contrast', ratio: 1.2 },
  { name: 'Major Third', description: 'Strong contrast — popular for headings', ratio: 1.25 },
  { name: 'Perfect Fourth', description: 'Dramatic — excellent for hero sections', ratio: 1.333 },
  { name: 'Augmented Fourth', description: 'Bold — for attention-grabbing headers', ratio: 1.414 },
  { name: 'Perfect Fifth', description: 'Very dramatic — use sparingly', ratio: 1.5 },
  { name: 'Golden Ratio', description: 'The classical φ proportion (~1.618)', ratio: 1.618 },
];

const SCALE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
const SCALE_LABELS: Record<string, string> = {
  xs: 'XS',
  sm: 'SM',
  base: 'Base',
  lg: 'LG',
  xl: 'XL',
  '2xl': '2XL',
  '3xl': '3XL',
  '4xl': '4XL',
  '5xl': '5XL',
  '6xl': '6XL',
};

const GOOGLE_FONTS: { name: string; fallback: string }[] = [
  { name: 'Inter', fallback: 'system-ui, sans-serif' },
  { name: 'Geist', fallback: 'system-ui, sans-serif' },
  { name: 'DM Sans', fallback: 'system-ui, sans-serif' },
  { name: 'JetBrains Mono', fallback: 'Fira Code, monospace' },
  { name: 'Playfair Display', fallback: 'Georgia, serif' },
  { name: 'Source Serif 4', fallback: 'Georgia, serif' },
  { name: 'Merriweather', fallback: 'Georgia, serif' },
  { name: 'Lora', fallback: 'Georgia, serif' },
  { name: 'Space Grotesk', fallback: 'system-ui, sans-serif' },
  { name: 'Space Mono', fallback: 'Courier New, monospace' },
];

const SYSTEM_FONTS: { name: string; fallback: string }[] = [
  { name: 'System UI (Sans)', fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: 'System UI (Serif)', fallback: 'Georgia, "Times New Roman", serif' },
  { name: 'System UI (Mono)', fallback: '"JetBrains Mono", "Fira Code", "Courier New", monospace' },
  { name: 'Arial', fallback: 'Helvetica, sans-serif' },
  { name: 'Georgia', fallback: '"Times New Roman", serif' },
  { name: 'Verdana', fallback: 'Geneva, sans-serif' },
  { name: 'Trebuchet MS', fallback: '"Lucida Grande", sans-serif' },
  { name: 'Courier New', fallback: 'Courier, monospace' },
];

interface TypographyConfig {
  scaleIndex: number;
  baseSize: number;
  baseLineHeight: number;
  fontWeight: number;
  fontFamily: string;
  textColor: string;
  bgColor: string;
  letterSpacing: number;
  wordSpacing: number;
  maxWidth: number;
}

function generateScale(baseSize: number, ratio: number, steps: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const baseIndex = steps.indexOf('base');

  steps.forEach((step, i) => {
    const offset = i - baseIndex;
    result[step] = Math.round(baseSize * Math.pow(ratio, offset) * 100) / 100;
  });

  return result;
}

function computeLineHeights(scale: Record<string, number>, baseLH: number): Record<string, string> {
  const result: Record<string, string> = {};
  const entries = Object.entries(scale);

  entries.forEach(([step, size]) => {
    if (step === 'xs' || step === 'sm') {
      result[step] = (Math.round((baseLH * 0.95) * 100) / 100).toFixed(2);
    } else if (step === 'base') {
      result[step] = baseLH.toFixed(2);
    } else if (step === 'lg' || step === 'xl') {
      result[step] = (Math.round((baseLH * 0.85) * 100) / 100).toFixed(2);
    } else {
      result[step] = (Math.round((baseLH * 0.75) * 100) / 100).toFixed(2);
    }
  });

  return result;
}

function generateCSS(
  scale: Record<string, number>,
  lineHeights: Record<string, string>,
  config: TypographyConfig,
): string {
  const lines: string[] = [':root {'];

  // Font family
  lines.push(`  --font-family: "${config.fontFamily}";`);
  lines.push(`  --font-weight: ${config.fontWeight};`);
  lines.push(`  --line-height-base: ${config.baseLineHeight};`);
  lines.push(`  --letter-spacing: ${config.letterSpacing}em;`);
  lines.push('');

  // Type scale sizes
  SCALE_STEPS.forEach((step) => {
    const label = SCALE_LABELS[step].toLowerCase().replace(/\d+xl/, (m) => m);
    const sizeKey = `--text-${step}`;
    const lhKey = `--leading-${step}`;
    lines.push(`  ${sizeKey}: ${scale[step] / 16}rem;  /* ${scale[step]}px */`);
    lines.push(`  ${lhKey}: ${lineHeights[step]};`);
  });

  lines.push('}');
  lines.push('');
  lines.push('/* Usage example: */');
  lines.push('h1 {');
  lines.push('  font-family: var(--font-family);');
  lines.push('  font-size: var(--text-4xl);');
  lines.push('  line-height: var(--leading-4xl);');
  lines.push('  font-weight: var(--font-weight);');
  lines.push('}');
  lines.push('');
  lines.push('p {');
  lines.push('  font-size: var(--text-base);');
  lines.push('  line-height: var(--leading-base);');
  lines.push('}');

  return lines.join('\n');
}

const SAMPLE_TEXT =
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! Sphinx of black quartz, judge my vow. Waltz, bad nymph, for quick jigs vex.';

export default function CssTypographyPlayground() {
  const [config, setConfig] = useState<TypographyConfig>({
    scaleIndex: 2, // Minor Third
    baseSize: 16,
    baseLineHeight: 1.5,
    fontWeight: 400,
    fontFamily: 'Inter, system-ui, sans-serif',
    textColor: '#f1f5f9',
    bgColor: '#0f172a',
    letterSpacing: 0,
    wordSpacing: 0,
    maxWidth: 65,
  });

  const [showCss, setShowCss] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const scale = useMemo(
    () => generateScale(config.baseSize, TYPE_SCALES[config.scaleIndex].ratio, SCALE_STEPS),
    [config.baseSize, config.scaleIndex],
  );

  const lineHeights = useMemo(() => computeLineHeights(scale, config.baseLineHeight), [scale, config.baseLineHeight]);

  const cssOutput = useMemo(() => generateCSS(scale, lineHeights, config), [scale, lineHeights, config]);

  const update = useCallback(
    <K extends keyof TypographyConfig>(key: K, value: TypographyConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleCopyCss = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cssOutput]);

  const handleCopyValue = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const controls = (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2 text-sm">
        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
        <span className="text-slate-300 font-medium">Controls</span>
      </div>
    </div>
  );

  // Generate preview items for each scale step
  const previewItems = SCALE_STEPS.map((step) => ({
    step,
    label: SCALE_LABELS[step],
    fontSize: scale[step],
    lineHeight: lineHeights[step],
  }));

  return (
    <ToolLayout
      title="CSS Typography Playground"
      description="Design type scales with mathematical harmony — choose from 8 scales, customize fonts, weights, and spacing, then copy production-ready CSS."
      controls={controls}
    >
      {/* ── Main Grid: Controls + Preview ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Controls ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Type Scale Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type Scale</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_SCALES.map((ts, i) => (
                <button
                  key={ts.name}
                  onClick={() => update('scaleIndex', i)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    config.scaleIndex === i
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className="font-medium">{ts.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">ratio: {ts.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Base Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Base Font Size: <span className="text-brand-400">{config.baseSize}px</span>
            </label>
            <input
              type="range"
              min={12}
              max={24}
              step={0.5}
              value={config.baseSize}
              onChange={(e) => update('baseSize', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Base Line Height: <span className="text-brand-400">{config.baseLineHeight}</span>
            </label>
            <input
              type="range"
              min={1}
              max={2.2}
              step={0.05}
              value={config.baseLineHeight}
              onChange={(e) => update('baseLineHeight', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>1.0 (tight)</span>
              <span>2.2 (loose)</span>
            </div>
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Font Weight: <span className="text-brand-400">{config.fontWeight}</span>
            </label>
            <input
              type="range"
              min={100}
              max={900}
              step={100}
              value={config.fontWeight}
              onChange={(e) => update('fontWeight', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>100 (Thin)</span>
              <span>900 (Black)</span>
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Letter Spacing: <span className="text-brand-400">{config.letterSpacing.toFixed(2)}em</span>
            </label>
            <input
              type="range"
              min={-0.05}
              max={0.2}
              step={0.005}
              value={config.letterSpacing}
              onChange={(e) => update('letterSpacing', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>-0.05em (tight)</span>
              <span>0.2em (wide)</span>
            </div>
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Max Width: <span className="text-brand-400">{config.maxWidth}ch</span>
            </label>
            <input
              type="range"
              min={30}
              max={90}
              step={1}
              value={config.maxWidth}
              onChange={(e) => update('maxWidth', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>30ch (narrow)</span>
              <span>90ch (full)</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Font Family</label>

            {/* Google Fonts */}
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Google Fonts</div>
              <div className="flex flex-wrap gap-1.5">
                {GOOGLE_FONTS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => update('fontFamily', `${f.name}, ${f.fallback}`)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      config.fontFamily.startsWith(f.name)
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* System Fonts */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">System Fonts</div>
              <div className="flex flex-wrap gap-1.5">
                {SYSTEM_FONTS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => update('fontFamily', f.fallback)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      config.fontFamily === f.fallback
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Live Preview + Scale Table ────────────────────────── */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Type className="w-4 h-4 inline mr-1" />
              Live Preview
            </label>
            <div
              ref={previewRef}
              className="rounded-xl border border-slate-700/50 p-6 overflow-auto"
              style={{
                backgroundColor: config.bgColor,
                color: config.textColor,
                fontFamily: config.fontFamily,
              }}
            >
              {previewItems.map((item) => (
                <div
                  key={item.step}
                  className="mb-4 last:mb-0"
                  style={{
                    fontSize: `${item.fontSize}px`,
                    lineHeight: item.lineHeight,
                    fontWeight: config.fontWeight,
                    letterSpacing: `${config.letterSpacing}em`,
                    maxWidth: `${config.maxWidth}ch`,
                  }}
                >
                  <div className="text-[10px] opacity-40 mb-0.5" style={{ fontSize: '10px' }}>
                    {item.label} — {item.fontSize}px / {item.lineHeight}
                  </div>
                  <div>{item.step === 'base' ? SAMPLE_TEXT : `${item.label}: ${SAMPLE_TEXT.slice(0, 80)}`}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scale Table */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Scale Sizes</label>
            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80">
                    <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Step</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">px</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">rem</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Line Height</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {previewItems.map((item) => (
                    <tr key={item.step} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-200">{item.label}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.fontSize}px</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                        {(item.fontSize / 16).toFixed(3)}rem
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.lineHeight}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleCopyValue(`${item.fontSize}px / ${item.lineHeight}`)}
                          className="text-slate-500 hover:text-brand-400 transition-colors"
                          title="Copy value"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Download className="w-4 h-4 inline mr-1" />
                Generated CSS
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCss(!showCss)}
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showCss ? 'Hide' : 'Show'} CSS
                </button>
                <button
                  onClick={handleCopyCss}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs hover:bg-brand-500/20 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy CSS
                </button>
              </div>
            </div>
            {showCss && (
              <pre className="rounded-xl border border-slate-700/50 bg-slate-950 p-4 text-xs overflow-x-auto">
                <code className="text-slate-300 font-mono">{cssOutput}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

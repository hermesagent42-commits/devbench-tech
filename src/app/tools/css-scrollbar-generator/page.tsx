'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, ChevronUp, ChevronDown, Palette, Ruler, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ScrollbarConfig {
  width: number;
  thumbColor: string;
  thumbHoverColor: string;
  thumbRadius: number;
  thumbBorder: number;
  thumbBorderColor: string;
  trackColor: string;
  trackRadius: number;
  trackBorder: number;
  trackBorderColor: string;
  cornerBg: string;
  firefoxWidth: 'auto' | 'thin' | 'none';
  firefoxThumbColor: string;
  firefoxTrackColor: string;
}

interface Preset {
  name: string;
  config: ScrollbarConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Minimal',
    config: {
      width: 6,
      thumbColor: '#cbd5e1',
      thumbHoverColor: '#94a3b8',
      thumbRadius: 3,
      thumbBorder: 0,
      thumbBorderColor: 'transparent',
      trackColor: 'transparent',
      trackRadius: 3,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: 'transparent',
      firefoxWidth: 'thin',
      firefoxThumbColor: '#cbd5e1',
      firefoxTrackColor: 'transparent',
    },
  },
  {
    name: 'macOS',
    config: {
      width: 8,
      thumbColor: '#c1c1c1',
      thumbHoverColor: '#a8a8a8',
      thumbRadius: 4,
      thumbBorder: 2,
      thumbBorderColor: 'transparent',
      trackColor: 'transparent',
      trackRadius: 4,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: 'transparent',
      firefoxWidth: 'thin',
      firefoxThumbColor: '#c1c1c1',
      firefoxTrackColor: 'transparent',
    },
  },
  {
    name: 'Glass',
    config: {
      width: 12,
      thumbColor: 'rgba(255, 255, 255, 0.35)',
      thumbHoverColor: 'rgba(255, 255, 255, 0.55)',
      thumbRadius: 6,
      thumbBorder: 2,
      thumbBorderColor: 'rgba(255, 255, 255, 0.15)',
      trackColor: 'rgba(255, 255, 255, 0.08)',
      trackRadius: 6,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: 'transparent',
      firefoxWidth: 'thin',
      firefoxThumbColor: 'rgba(255, 255, 255, 0.35)',
      firefoxTrackColor: 'rgba(255, 255, 255, 0.08)',
    },
  },
  {
    name: 'Neon Purple',
    config: {
      width: 10,
      thumbColor: '#a78bfa',
      thumbHoverColor: '#c4b5fd',
      thumbRadius: 5,
      thumbBorder: 0,
      thumbBorderColor: 'transparent',
      trackColor: '#1e1b4b',
      trackRadius: 5,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: '#1e1b4b',
      firefoxWidth: 'auto',
      firefoxThumbColor: '#a78bfa',
      firefoxTrackColor: '#1e1b4b',
    },
  },
  {
    name: 'Dark Elegant',
    config: {
      width: 14,
      thumbColor: '#4b5563',
      thumbHoverColor: '#6b7280',
      thumbRadius: 7,
      thumbBorder: 2,
      thumbBorderColor: '#374151',
      trackColor: '#1f2937',
      trackRadius: 7,
      trackBorder: 1,
      trackBorderColor: '#374151',
      cornerBg: '#1f2937',
      firefoxWidth: 'auto',
      firefoxThumbColor: '#4b5563',
      firefoxTrackColor: '#1f2937',
    },
  },
  {
    name: 'Retro Terminal',
    config: {
      width: 16,
      thumbColor: '#22c55e',
      thumbHoverColor: '#4ade80',
      thumbRadius: 0,
      thumbBorder: 2,
      thumbBorderColor: '#166534',
      trackColor: '#052e16',
      trackRadius: 0,
      trackBorder: 1,
      trackBorderColor: '#166534',
      cornerBg: '#052e16',
      firefoxWidth: 'auto',
      firefoxThumbColor: '#22c55e',
      firefoxTrackColor: '#052e16',
    },
  },
  {
    name: 'Invisible',
    config: {
      width: 8,
      thumbColor: 'transparent',
      thumbHoverColor: 'rgba(0, 0, 0, 0.2)',
      thumbRadius: 4,
      thumbBorder: 0,
      thumbBorderColor: 'transparent',
      trackColor: 'transparent',
      trackRadius: 4,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: 'transparent',
      firefoxWidth: 'thin',
      firefoxThumbColor: 'transparent',
      firefoxTrackColor: 'transparent',
    },
  },
  {
    name: 'Vibrant Gradient',
    config: {
      width: 12,
      thumbColor: 'linear-gradient(180deg, #f43f5e, #8b5cf6)',
      thumbHoverColor: 'linear-gradient(180deg, #fb7185, #a78bfa)',
      thumbRadius: 6,
      thumbBorder: 0,
      thumbBorderColor: 'transparent',
      trackColor: '#18181b',
      trackRadius: 6,
      trackBorder: 0,
      trackBorderColor: 'transparent',
      cornerBg: '#18181b',
      firefoxWidth: 'auto',
      firefoxThumbColor: '#8b5cf6',
      firefoxTrackColor: '#18181b',
    },
  },
];

const PREVIEW_CONTENT = [
  '// CSS Scrollbar Generator — DevBench',
  '// Customize every aspect of the scrollbar.',
  '',
  'const hello = (name: string) => {',
  '  console.log(`👋 Hello, ${name}!`);',
  '};',
  '',
  'interface Config {',
  '  theme: "light" | "dark";',
  '  scrollbar: "custom" | "default";',
  '  animations: boolean;',
  '}',
  '',
  'const app: Config = {',
  '  theme: "dark",',
  '  scrollbar: "custom",',
  '  animations: true,',
  '};',
  '',
  'function generateCSS(config: ScrollbarConfig) {',
  '  return `',
  '    ::-webkit-scrollbar {',
  '      width: ${config.width}px;',
  '    }',
  '    ::-webkit-scrollbar-thumb {',
  '      background: ${config.thumbColor};',
  '      border-radius: ${config.thumbRadius}px;',
  '    }',
  '  `;',
  '}',
  '',
  'export { hello, app, generateCSS };',
  '// Scroll down to see the scrollbar in action ↓',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  'Lorem ipsum dolor sit amet, consectetur',
  'adipiscing elit. Sed do eiusmod tempor',
  'incididunt ut labore et dolore magna aliqua.',
  '',
  'Ut enim ad minim veniam, quis nostrud',
  'exercitation ullamco laboris nisi ut',
  'aliquip ex ea commodo consequat.',
  '',
  'Duis aute irure dolor in reprehenderit',
  'in voluptate velit esse cillum dolore eu',
  'fugiat nulla pariatur. Excepteur sint',
  'occaecat cupidatat non proident.',
  '',
  'Sed ut perspiciatis unde omnis iste natus',
  'error sit voluptatem accusantium doloremque',
  'laudantium, totam rem aperiam.',
  '',
  'Nemo enim ipsam voluptatem quia voluptas',
  'sit aspernatur aut odit aut fugit, sed quia',
  'consequuntur magni dolores eos.',
  '',
  'At vero eos et accusamus et iusto odio',
  'dignissimos ducimus qui blanditiis',
  'praesentium voluptatum deleniti.',
  '',
  'Et harum quidem rerum facilis est et',
  'expedita distinctio. Nam libero tempore,',
  'cum soluta nobis est eligendi optio.',
  '',
  'Temporibus autem quibusdam et aut officiis',
  'debitis aut rerum necessitatibus saepe',
  'eveniet ut et voluptates repudiandae.',
  '',
  'Itaque earum rerum hic tenetur a sapiente',
  'delectus, ut aut reiciendis voluptatibus',
  'maiores alias consequatur aut perferendis.',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '✨ That is all! Your custom scrollbar',
  'should be visible on the right side.',
  'Copy the CSS to use it in your project.',
];

// ── CSS Generator ──────────────────────────────────────────────────────────

function generateCSS(config: ScrollbarConfig): { webkit: string; firefox: string; full: string } {
  const lines: string[] = [];

  // WebKit
  lines.push('/* WebKit (Chrome, Edge, Safari, Opera) */');

  lines.push('::-webkit-scrollbar {');
  lines.push(`  width: ${config.width}px;`);
  lines.push(`  height: ${config.width}px;`);
  lines.push('}');

  lines.push('');
  lines.push('::-webkit-scrollbar-track {');
  if (config.trackColor.includes('gradient')) {
    lines.push(`  background: ${config.trackColor};`);
  } else {
    lines.push(`  background-color: ${config.trackColor};`);
  }
  lines.push(`  border-radius: ${config.trackRadius}px;`);
  if (config.trackBorder > 0) {
    lines.push(`  border: ${config.trackBorder}px solid ${config.trackBorderColor};`);
  }
  lines.push('}');

  lines.push('');
  lines.push('::-webkit-scrollbar-thumb {');
  if (config.thumbColor.includes('gradient')) {
    lines.push(`  background: ${config.thumbColor};`);
  } else {
    lines.push(`  background-color: ${config.thumbColor};`);
  }
  lines.push(`  border-radius: ${config.thumbRadius}px;`);
  if (config.thumbBorder > 0) {
    lines.push(`  border: ${config.thumbBorder}px solid ${config.thumbBorderColor};`);
  }
  lines.push('}');

  lines.push('');
  lines.push('::-webkit-scrollbar-thumb:hover {');
  if (config.thumbHoverColor.includes('gradient')) {
    lines.push(`  background: ${config.thumbHoverColor};`);
  } else {
    lines.push(`  background-color: ${config.thumbHoverColor};`);
  }
  lines.push('}');

  lines.push('');
  lines.push('::-webkit-scrollbar-corner {');
  lines.push(`  background-color: ${config.cornerBg};`);
  lines.push('}');

  const webkit = lines.join('\n');

  // Firefox
  const firefoxLines: string[] = [];
  firefoxLines.push('/* Firefox */');
  firefoxLines.push('* {');
  firefoxLines.push(`  scrollbar-width: ${config.firefoxWidth};`);
  firefoxLines.push(`  scrollbar-color: ${config.firefoxThumbColor} ${config.firefoxTrackColor};`);
  firefoxLines.push('}');
  const firefox = firefoxLines.join('\n');

  const full = [webkit, '', firefox].join('\n');

  return { webkit, firefox, full };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssScrollbarGeneratorPage() {
  const [config, setConfig] = useState<ScrollbarConfig>(PRESETS[0].config);
  const [activeSection, setActiveSection] = useState<'webkit' | 'firefox' | 'full'>('full');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');
  const previewRef = useRef<HTMLDivElement>(null);

  const css = useMemo(() => generateCSS(config), [config]);

  const set = useCallback(
    <K extends keyof ScrollbarConfig>(key: K, value: ScrollbarConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const applyPreset = useCallback((preset: Preset) => {
    setConfig({ ...preset.config });
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const reset = useCallback(() => {
    setConfig({ ...PRESETS[0].config });
    toast.success('Reset to default');
  }, []);

  const copyCSS = useCallback(
    (section: 'webkit' | 'firefox' | 'full') => {
      const content = section === 'webkit' ? css.webkit : section === 'firefox' ? css.firefox : css.full;
      navigator.clipboard.writeText(content).then(
        () => toast.success('CSS copied to clipboard!'),
        () => toast.error('Failed to copy'),
      );
    },
    [css],
  );

  // Build the preview scrollbar style
  const previewStyle = useMemo(() => {
    const { width, thumbColor, thumbHoverColor, thumbRadius, thumbBorder, thumbBorderColor, trackColor, trackRadius, trackBorder, trackBorderColor, cornerBg } = config;

    const getBg = (c: string) => (c.includes('gradient') ? c : c);

    return `
      .scrollbar-preview::-webkit-scrollbar { width: ${width}px; height: ${width}px; }
      .scrollbar-preview::-webkit-scrollbar-track { background: ${getBg(trackColor)}; border-radius: ${trackRadius}px; ${trackBorder > 0 ? `border: ${trackBorder}px solid ${trackBorderColor};` : ''} }
      .scrollbar-preview::-webkit-scrollbar-thumb { background: ${getBg(thumbColor)}; border-radius: ${thumbRadius}px; ${thumbBorder > 0 ? `border: ${thumbBorder}px solid ${thumbBorderColor};` : ''} }
      .scrollbar-preview::-webkit-scrollbar-thumb:hover { background: ${getBg(thumbHoverColor)}; }
      .scrollbar-preview::-webkit-scrollbar-corner { background-color: ${cornerBg}; }
    `;
  }, [config]);

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition';
  const labelClass = 'block text-xs font-medium text-gray-400 mb-1.5';
  const sliderClass = 'w-full accent-violet-500 h-2 cursor-pointer';
  const buttonClass = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors';
  const activeButtonClass = 'bg-violet-600 text-white border-violet-500';
  const inactiveButtonClass = 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-gray-750';
  const presetButtonClass = 'px-3 py-2 text-xs font-medium rounded-lg bg-gray-800/80 border border-gray-700 text-gray-300 hover:border-violet-500 hover:text-violet-300 transition-all';

  return (
    <ToolLayout
      title="CSS Scrollbar Generator"
      description="Design custom scrollbars visually — every ::-webkit-scrollbar property, Firefox support, and live preview."
    >
      <style>{previewStyle}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Controls ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-gray-200">Presets</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={presetButtonClass}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollbar Width */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-200">Scrollbar Width</h3>
              </div>
              <span className="text-sm font-mono text-violet-400">{config.width}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={30}
              step={1}
              value={config.width}
              onChange={(e) => set('width', Number(e.target.value))}
              className={sliderClass}
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>4px</span>
              <span>30px</span>
            </div>
          </div>

          {/* Thumb Color */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-200">Thumb</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.thumbColor.startsWith('#') || config.thumbColor.startsWith('rgb') ? config.thumbColor : '#a78bfa'}
                    onChange={(e) => set('thumbColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.thumbColor}
                    onChange={(e) => set('thumbColor', e.target.value)}
                    placeholder="#cbd5e1 or rgba(...)"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Hover Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.thumbHoverColor.startsWith('#') || config.thumbHoverColor.startsWith('rgb') ? config.thumbHoverColor : '#94a3b8'}
                    onChange={(e) => set('thumbHoverColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.thumbHoverColor}
                    onChange={(e) => set('thumbHoverColor', e.target.value)}
                    placeholder="#94a3b8"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Thumb Radius & Border */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Border Radius</span>
                <span className="text-xs font-mono text-violet-400">{config.thumbRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={config.thumbRadius}
                onChange={(e) => set('thumbRadius', Number(e.target.value))}
                className={sliderClass}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Border Width</span>
                <span className="text-xs font-mono text-violet-400">{config.thumbBorder}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={config.thumbBorder}
                onChange={(e) => set('thumbBorder', Number(e.target.value))}
                className={sliderClass}
              />
            </div>
          </div>

          {config.thumbBorder > 0 && (
            <div>
              <label className={labelClass}>Thumb Border Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.thumbBorderColor.startsWith('#') ? config.thumbBorderColor : '#000000'}
                  onChange={(e) => set('thumbBorderColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={config.thumbBorderColor}
                  onChange={(e) => set('thumbBorderColor', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Track */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-200">Track</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Track Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.trackColor.startsWith('#') || config.trackColor.startsWith('rgb') ? config.trackColor : '#1f2937'}
                    onChange={(e) => set('trackColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.trackColor}
                    onChange={(e) => set('trackColor', e.target.value)}
                    placeholder="transparent or #1f2937"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Track Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={config.trackRadius}
                    onChange={(e) => set('trackRadius', Number(e.target.value))}
                    className={`${sliderClass} flex-1`}
                  />
                  <span className="text-xs font-mono text-violet-400 w-8">{config.trackRadius}px</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Track Border</label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={config.trackBorder}
                  onChange={(e) => set('trackBorder', Number(e.target.value))}
                  className={sliderClass}
                />
              </div>
              {config.trackBorder > 0 && (
                <div>
                  <label className={labelClass}>Border Color</label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={config.trackBorderColor.startsWith('#') ? config.trackBorderColor : '#374151'}
                      onChange={(e) => set('trackBorderColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.trackBorderColor}
                      onChange={(e) => set('trackBorderColor', e.target.value)}
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Corner BG</label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={config.cornerBg.startsWith('#') || config.cornerBg.startsWith('rgb') ? config.cornerBg : '#1f2937'}
                    onChange={(e) => set('cornerBg', e.target.value)}
                    className="w-8 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.cornerBg}
                    onChange={(e) => set('cornerBg', e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Firefox */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-200">Firefox</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Scrollbar Width</label>
                <div className="flex gap-2">
                  {(['auto', 'thin', 'none'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => set('firefoxWidth', w)}
                      className={`${buttonClass} ${config.firefoxWidth === w ? activeButtonClass : inactiveButtonClass} capitalize`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Thumb Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.firefoxThumbColor.startsWith('#') || config.firefoxThumbColor.startsWith('rgb') ? config.firefoxThumbColor : '#cbd5e1'}
                    onChange={(e) => set('firefoxThumbColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.firefoxThumbColor}
                    onChange={(e) => set('firefoxThumbColor', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2">
              <label className={labelClass}>Track Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.firefoxTrackColor.startsWith('#') || config.firefoxTrackColor.startsWith('rgb') ? config.firefoxTrackColor : 'transparent'}
                  onChange={(e) => set('firefoxTrackColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={config.firefoxTrackColor}
                  onChange={(e) => set('firefoxTrackColor', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 hover:text-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>

        {/* ── Right: Preview + CSS ────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Live Preview
            </h3>
            <div
              ref={previewRef}
              className={`scrollbar-preview rounded-xl border border-gray-700 overflow-auto transition-all ${previewTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}
              style={{ height: 400 }}
            >
              <div className="p-5 space-y-1">
                {PREVIEW_CONTENT.map((line, i) => (
                  <div
                    key={i}
                    className={`font-mono text-sm leading-relaxed whitespace-pre ${
                      line.startsWith('//') || line.startsWith('/*')
                        ? previewTheme === 'dark'
                          ? 'text-gray-500 italic'
                          : 'text-gray-400 italic'
                        : line.startsWith('const') || line.startsWith('function') || line.startsWith('interface') || line.startsWith('export')
                        ? previewTheme === 'dark'
                          ? 'text-violet-400'
                          : 'text-violet-600'
                        : line.startsWith('  ') && line.includes(':')
                        ? previewTheme === 'dark'
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : line.startsWith('━')
                        ? previewTheme === 'dark'
                          ? 'text-gray-600'
                          : 'text-gray-300'
                        : line.startsWith('✨')
                        ? 'text-amber-400 font-medium'
                        : line === ''
                        ? ''
                        : previewTheme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTheme('dark')}
                  className={`${buttonClass} ${previewTheme === 'dark' ? activeButtonClass : inactiveButtonClass}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setPreviewTheme('light')}
                  className={`${buttonClass} ${previewTheme === 'light' ? activeButtonClass : inactiveButtonClass}`}
                >
                  Light
                </button>
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ChevronDown className="w-3 h-3" /> Scroll to test
              </span>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Generated CSS</h3>
              <div className="flex gap-1">
                {(['webkit', 'firefox', 'full'] as const).map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`${buttonClass} ${activeSection === section ? activeButtonClass : inactiveButtonClass}`}
                  >
                    {section === 'webkit' ? 'WebKit' : section === 'firefox' ? 'Firefox' : 'Both'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <pre className="bg-gray-950 rounded-xl p-5 text-sm font-mono text-gray-300 overflow-x-auto border border-gray-800 leading-relaxed whitespace-pre">
{activeSection === 'webkit' ? css.webkit : activeSection === 'firefox' ? css.firefox : css.full}
              </pre>
              <button
                onClick={() => copyCSS(activeSection)}
                className="absolute top-3 right-3 p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy CSS"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Download, Palette, Layers, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ScrollbarConfig {
  width: number;
  trackColor: string;
  trackBorderRadius: number;
  trackBorder: string;
  thumbColor: string;
  thumbColorHover: string;
  thumbBorderRadius: number;
  thumbBorder: string;
  cornerColor: string;
  firefoxWidth: 'auto' | 'thin' | 'none';
  firefoxTrackColor: string;
  firefoxThumbColor: string;
}

interface Preset {
  name: string;
  description: string;
  config: ScrollbarConfig;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Minimal',
    description: 'Clean, invisible scrollbar',
    config: {
      width: 6,
      trackColor: 'transparent',
      trackBorderRadius: 0,
      trackBorder: 'none',
      thumbColor: 'rgba(0,0,0,0.2)',
      thumbColorHover: 'rgba(0,0,0,0.4)',
      thumbBorderRadius: 3,
      thumbBorder: 'none',
      cornerColor: 'transparent',
      firefoxWidth: 'thin',
      firefoxTrackColor: 'transparent',
      firefoxThumbColor: 'rgba(0,0,0,0.2)',
    },
  },
  {
    name: 'macOS',
    description: 'macOS-style rounded light scrollbar',
    config: {
      width: 8,
      trackColor: 'transparent',
      trackBorderRadius: 4,
      trackBorder: 'none',
      thumbColor: 'rgba(128,128,128,0.35)',
      thumbColorHover: 'rgba(128,128,128,0.55)',
      thumbBorderRadius: 4,
      thumbBorder: 'none',
      cornerColor: 'transparent',
      firefoxWidth: 'thin',
      firefoxTrackColor: 'transparent',
      firefoxThumbColor: 'rgba(128,128,128,0.35)',
    },
  },
  {
    name: 'Dark Neon',
    description: 'Cyberpunk-inspired neon purple',
    config: {
      width: 10,
      trackColor: '#1a1030',
      trackBorderRadius: 5,
      trackBorder: 'none',
      thumbColor: '#a855f7',
      thumbColorHover: '#c084fc',
      thumbBorderRadius: 5,
      thumbBorder: 'none',
      cornerColor: '#1a1030',
      firefoxWidth: 'thin',
      firefoxTrackColor: '#1a1030',
      firefoxThumbColor: '#a855f7',
    },
  },
  {
    name: 'GitHub Dark',
    description: "Matches GitHub's dark mode scrollbars",
    config: {
      width: 10,
      trackColor: '#0d1117',
      trackBorderRadius: 0,
      trackBorder: '1px solid #30363d',
      thumbColor: '#484f58',
      thumbColorHover: '#6e7681',
      thumbBorderRadius: 5,
      thumbBorder: 'none',
      cornerColor: '#0d1117',
      firefoxWidth: 'thin',
      firefoxTrackColor: '#0d1117',
      firefoxThumbColor: '#484f58',
    },
  },
  {
    name: 'Glassmorphism',
    description: 'Semi-transparent glass effect',
    config: {
      width: 12,
      trackColor: 'rgba(255,255,255,0.05)',
      trackBorderRadius: 6,
      trackBorder: '1px solid rgba(255,255,255,0.1)',
      thumbColor: 'rgba(255,255,255,0.2)',
      thumbColorHover: 'rgba(255,255,255,0.35)',
      thumbBorderRadius: 6,
      thumbBorder: '1px solid rgba(255,255,255,0.25)',
      cornerColor: 'transparent',
      firefoxWidth: 'thin',
      firefoxTrackColor: 'rgba(255,255,255,0.05)',
      firefoxThumbColor: 'rgba(255,255,255,0.2)',
    },
  },
  {
    name: 'Retro Scroll',
    description: 'Classic 3D beveled scrollbar (IE vibes)',
    config: {
      width: 16,
      trackColor: '#c0c0c0',
      trackBorderRadius: 0,
      trackBorder: '2px solid',
      thumbColor: '#e0e0e0',
      thumbColorHover: '#ffffff',
      thumbBorderRadius: 0,
      thumbBorder: '2px outset #ffffff',
      cornerColor: '#c0c0c0',
      firefoxWidth: 'auto',
      firefoxTrackColor: '#c0c0c0',
      firefoxThumbColor: '#e0e0e0',
    },
  },
  {
    name: 'Gradient Accent',
    description: 'Animated gradient thumb with dark track',
    config: {
      width: 10,
      trackColor: '#111827',
      trackBorderRadius: 5,
      trackBorder: 'none',
      thumbColor: 'linear-gradient(180deg, #f43f5e, #a855f7)',
      thumbColorHover: 'linear-gradient(180deg, #fb7185, #c084fc)',
      thumbBorderRadius: 5,
      thumbBorder: 'none',
      cornerColor: '#111827',
      firefoxWidth: 'thin',
      firefoxTrackColor: '#111827',
      firefoxThumbColor: '#a855f7',
    },
  },
  {
    name: 'Outline Thumb',
    description: 'Track-colored thumb with a contrasting border',
    config: {
      width: 14,
      trackColor: '#1e293b',
      trackBorderRadius: 7,
      trackBorder: 'none',
      thumbColor: 'transparent',
      thumbColorHover: 'rgba(255,255,255,0.1)',
      thumbBorderRadius: 7,
      thumbBorder: '2px solid rgba(255,255,255,0.4)',
      cornerColor: '#1e293b',
      firefoxWidth: 'thin',
      firefoxTrackColor: '#1e293b',
      firefoxThumbColor: 'rgba(255,255,255,0.4)',
    },
  },
];

const DEFAULT_CONFIG: ScrollbarConfig = {
  width: 10,
  trackColor: '#1e293b',
  trackBorderRadius: 5,
  trackBorder: 'none',
  thumbColor: '#475569',
  thumbColorHover: '#64748b',
  thumbBorderRadius: 5,
  thumbBorder: 'none',
  cornerColor: '#1e293b',
  firefoxWidth: 'thin',
  firefoxTrackColor: '#1e293b',
  firefoxThumbColor: '#475569',
};

// ── CSS generation ─────────────────────────────────────────────────────────

function generateCSS(config: ScrollbarConfig): string {
  const lines: string[] = [];

  // WebKit scrollbar
  lines.push('/* ===== WebKit (Chrome, Edge, Safari, Opera) ===== */');
  lines.push('');
  lines.push('::-webkit-scrollbar {');
  lines.push('  width: ' + config.width + 'px;');
  lines.push('}');
  lines.push('');
  lines.push('::-webkit-scrollbar-track {');
  if (config.trackColor !== 'transparent') {
    lines.push('  background: ' + config.trackColor + ';');
  }
  lines.push('  border-radius: ' + config.trackBorderRadius + 'px;');
  if (config.trackBorder !== 'none') {
    lines.push('  border: ' + config.trackBorder + ';');
  }
  lines.push('}');
  lines.push('');
  lines.push('::-webkit-scrollbar-thumb {');
  lines.push('  background: ' + config.thumbColor + ';');
  lines.push('  border-radius: ' + config.thumbBorderRadius + 'px;');
  if (config.thumbBorder !== 'none') {
    lines.push('  border: ' + config.thumbBorder + ';');
  }
  lines.push('}');
  lines.push('');
  lines.push('::-webkit-scrollbar-thumb:hover {');
  lines.push('  background: ' + config.thumbColorHover + ';');
  lines.push('}');
  lines.push('');
  if (config.cornerColor !== 'transparent') {
    lines.push('::-webkit-scrollbar-corner {');
    lines.push('  background: ' + config.cornerColor + ';');
    lines.push('}');
    lines.push('');
  }

  // Firefox
  lines.push('/* ===== Firefox ===== */');
  lines.push('');
  lines.push('html {');
  if (config.firefoxWidth === 'none') {
    lines.push('  scrollbar-width: none;');
  } else {
    lines.push('  scrollbar-width: ' + config.firefoxWidth + ';');
    lines.push('  scrollbar-color: ' + config.firefoxThumbColor + ' ' + config.firefoxTrackColor + ';');
  }
  lines.push('}');

  return lines.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssScrollbarGeneratorPage() {
  const [config, setConfig] = useState<ScrollbarConfig>(DEFAULT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const cssOutput = useMemo(() => generateCSS(config), [config]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig(preset.config);
    toast.success('Applied "' + preset.name + '" preset');
  }, []);

  const updateConfig = useCallback(<K extends keyof ScrollbarConfig>(
    key: K,
    value: ScrollbarConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Sample text for the scrollable preview
  const sampleText = useMemo(() => {
    const items: string[] = [];
    for (let i = 1; i <= 25; i++) {
      items.push('Line ' + i + ' — This is sample content to demonstrate the custom scrollbar. Adjust the controls on the left and see the results here in real time.');
    }
    return items.join('\n');
  }, []);

  // Build inline style for the preview scrollable container
  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {};
    if (config.firefoxWidth === 'none') {
      style.scrollbarWidth = 'none';
    } else {
      style.scrollbarWidth = config.firefoxWidth;
      style.scrollbarColor = config.firefoxThumbColor + ' ' + config.firefoxTrackColor;
    }
    return style;
  }, [config.firefoxWidth, config.firefoxThumbColor, config.firefoxTrackColor]);

  return (
    <ToolLayout
      title="CSS Scrollbar Generator"
      description="Design custom scrollbars visually — tweak tracks, thumbs, colors, and borders. Supports WebKit (Chrome, Edge, Safari) and Firefox. Copy production-ready CSS instantly."
    >
      {/* Presets */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Preset Themes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="card-interactive text-left p-3 rounded-lg"
              title={preset.description}
            >
              <div className="text-white text-sm font-medium">{preset.name}</div>
              <div className="text-slate-500 text-xs mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          {/* Width */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Scrollbar Width
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={4}
                max={24}
                value={config.width}
                onChange={e => updateConfig('width', Number(e.target.value))}
                className="flex-1 accent-brand-400"
              />
              <span className="font-mono text-sm text-white w-10 text-right">{config.width}px</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[4, 6, 8, 10, 12, 16, 20, 24].map(w => (
                <button
                  key={w}
                  onClick={() => updateConfig('width', w)}
                  className={(config.width === w
                    ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                  ) + ' px-2 py-0.5 rounded text-xs font-mono transition-colors'}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Track */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  background: config.trackColor.startsWith('#') || config.trackColor.startsWith('rgba')
                    ? config.trackColor : '#1e293b',
                  border: '1px solid #334155'
                }}
              />
              Track
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.trackColor.startsWith('#') ? config.trackColor : '#1e293b'}
                    onChange={e => updateConfig('trackColor', e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.trackColor}
                    onChange={e => updateConfig('trackColor', e.target.value)}
                    className="input-field flex-1 font-mono text-sm"
                    placeholder="e.g. #1e293b, transparent"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {['transparent', '#0f172a', '#1e293b', '#334155', 'rgba(0,0,0,0.1)'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateConfig('trackColor', c)}
                      className={(config.trackColor === c
                        ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                      ) + ' px-2 py-0.5 rounded text-xs font-mono transition-colors'}
                    >
                      {c.length > 16 ? c.slice(0, 14) + '…' : c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Border Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={config.trackBorderRadius}
                    onChange={e => updateConfig('trackBorderRadius', Number(e.target.value))}
                    className="flex-1 accent-brand-400"
                  />
                  <span className="font-mono text-sm text-white w-8 text-right">{config.trackBorderRadius}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Thumb */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  background: (config.thumbColor.startsWith('#') || config.thumbColor.startsWith('rgba'))
                    ? config.thumbColor : '#475569',
                  border: '1px solid #94a3b8'
                }}
              />
              Thumb (Handle)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.thumbColor.startsWith('#') ? config.thumbColor : '#475569'}
                    onChange={e => updateConfig('thumbColor', e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.thumbColor}
                    onChange={e => updateConfig('thumbColor', e.target.value)}
                    className="input-field flex-1 font-mono text-sm"
                    placeholder="e.g. #475569"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {['transparent', '#475569', '#94a3b8', '#38bdf8', '#a855f7'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateConfig('thumbColor', c)}
                      className={(config.thumbColor === c
                        ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                      ) + ' px-2 py-0.5 rounded text-xs font-mono transition-colors'}
                    >
                      {c.length > 16 ? c.slice(0, 14) + '…' : c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Hover Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.thumbColorHover.startsWith('#') ? config.thumbColorHover : '#64748b'}
                    onChange={e => updateConfig('thumbColorHover', e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.thumbColorHover}
                    onChange={e => updateConfig('thumbColorHover', e.target.value)}
                    className="input-field flex-1 font-mono text-sm"
                    placeholder="e.g. #64748b"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Border Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={config.thumbBorderRadius}
                    onChange={e => updateConfig('thumbBorderRadius', Number(e.target.value))}
                    className="flex-1 accent-brand-400"
                  />
                  <span className="font-mono text-sm text-white w-8 text-right">{config.thumbBorderRadius}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced: Corner, Firefox, Borders */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={(showAdvanced
                ? 'bg-brand-400/10 border border-brand-400/20 text-brand-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200'
              ) + ' w-full text-left text-sm font-semibold flex items-center gap-2 px-4 py-3 rounded-lg transition-colors'}
            >
              <Settings className="w-4 h-4" />
              Advanced Options
              <span className="ml-auto text-xs text-slate-500">{showAdvanced ? '\u25B2' : '\u25BC'}</span>
            </button>

            {showAdvanced && (
              <div className="card mt-3 space-y-4">
                {/* Corner */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Corner Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={config.cornerColor}
                      onChange={e => updateConfig('cornerColor', e.target.value)}
                      className="input-field flex-1 font-mono text-sm"
                      placeholder="e.g. #1e293b"
                    />
                  </div>
                </div>

                {/* Track Border */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Track Border</label>
                  <input
                    type="text"
                    value={config.trackBorder}
                    onChange={e => updateConfig('trackBorder', e.target.value)}
                    className="input-field w-full font-mono text-sm"
                    placeholder="e.g. 1px solid #30363d, or none"
                  />
                </div>

                {/* Thumb Border */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Thumb Border</label>
                  <input
                    type="text"
                    value={config.thumbBorder}
                    onChange={e => updateConfig('thumbBorder', e.target.value)}
                    className="input-field w-full font-mono text-sm"
                    placeholder="e.g. 2px solid #fff, or none"
                  />
                </div>

                {/* Firefox */}
                <div className="pt-2 border-t border-slate-700/50">
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Firefox (scrollbar-width / scrollbar-color)</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Width</label>
                      <div className="flex gap-2">
                        {(['auto', 'thin', 'none'] as const).map(w => (
                          <button
                            key={w}
                            onClick={() => updateConfig('firefoxWidth', w)}
                            className={(config.firefoxWidth === w
                              ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                            ) + ' px-3 py-1 rounded text-xs transition-colors'}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Track Color</label>
                      <input
                        type="text"
                        value={config.firefoxTrackColor}
                        onChange={e => updateConfig('firefoxTrackColor', e.target.value)}
                        className="input-field w-full font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Thumb Color</label>
                      <input
                        type="text"
                        value={config.firefoxThumbColor}
                        onChange={e => updateConfig('firefoxThumbColor', e.target.value)}
                        className="input-field w-full font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={resetToDefault}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>

        {/* Preview + CSS Output */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Live Preview</h3>
            <p className="text-xs text-slate-500 mb-3">
              Scroll the box below to see your custom scrollbar. Hover the thumb for the hover state.
            </p>
            <div
              style={{
                height: '280px',
                overflowY: 'auto',
                background: config.trackColor,
                borderRadius: config.trackBorderRadius + 'px',
                border: config.trackBorder !== 'none' ? config.trackBorder : undefined,
                padding: '16px',
                ...previewStyle,
              }}
            >
              {/* WebKit scrollbar styles via dynamic style tag */}
              <style>{`
                .preview-scrollbar::-webkit-scrollbar {
                  width: ${config.width}px;
                }
                .preview-scrollbar::-webkit-scrollbar-track {
                  background: ${config.trackColor};
                  border-radius: ${config.trackBorderRadius}px;
                  ${config.trackBorder !== 'none' ? 'border: ' + config.trackBorder + ';' : ''}
                }
                .preview-scrollbar::-webkit-scrollbar-thumb {
                  background: ${config.thumbColor};
                  border-radius: ${config.thumbBorderRadius}px;
                  ${config.thumbBorder !== 'none' ? 'border: ' + config.thumbBorder + ';' : ''}
                }
                .preview-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: ${config.thumbColorHover};
                }
                .preview-scrollbar::-webkit-scrollbar-corner {
                  background: ${config.cornerColor};
                }
              `}</style>
              <div
                className="preview-scrollbar"
                style={{
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  height: '100%',
                  overflowY: 'auto',
                  scrollbarWidth: config.firefoxWidth === 'none' ? 'none' : config.firefoxWidth,
                  scrollbarColor: config.firefoxWidth !== 'none' ? config.firefoxThumbColor + ' ' + config.firefoxTrackColor : undefined,
                }}
              >
                {sampleText}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <strong>Note:</strong> The preview renders with direct CSS injection. Hover the scrollbar thumb to see the hover state take effect.
            </p>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-brand-400" />
                Generated CSS
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCSS}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy CSS
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([cssOutput], { type: 'text/css' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'custom-scrollbar.css';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Downloaded custom-scrollbar.css');
                  }}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed border border-slate-700/50 max-h-96 overflow-y-auto">
              <code>{cssOutput}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-10 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Browser Support</h3>
        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>WebKit (Chrome, Edge, Safari, Opera)</strong> — Full support via <code className="text-brand-400 bg-brand-400/10 px-1 rounded">::-webkit-scrollbar</code> pseudo-elements. Works in all modern browsers.</p>
          <p><strong>Firefox</strong> — Limited support via <code className="text-brand-400 bg-brand-400/10 px-1 rounded">scrollbar-width</code> and <code className="text-brand-400 bg-brand-400/10 px-1 rounded">scrollbar-color</code> properties. Cannot set individual border-radius or hover states in Firefox.</p>
          <p><strong>Future</strong> — The CSS Working Group is developing the <code className="text-brand-400 bg-brand-400/10 px-1 rounded">scrollbar-color</code> and <code className="text-brand-400 bg-brand-400/10 px-1 rounded">scrollbar-width</code> standards for cross-browser support. Check <a href="https://caniuse.com" className="text-brand-400 underline" target="_blank" rel="noopener">caniuse.com</a> for latest support.</p>
        </div>
      </div>
    </ToolLayout>
  );
}

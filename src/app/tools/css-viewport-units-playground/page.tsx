'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, MonitorSmartphone, Ruler, Info } from 'lucide-react';
import toast from 'react-hot-toast';

type ViewportUnit =
  | 'vh' | 'dvh' | 'svh' | 'lvh'
  | 'vw' | 'dvw' | 'svw' | 'lvw'
  | 'vmin' | 'dvmin' | 'svmin' | 'lvmin'
  | 'vmax' | 'dvmax' | 'svmax' | 'lvmax'
  | 'vi' | 'vb';

interface UnitInfo {
  unit: ViewportUnit;
  label: string;
  description: string;
  since: string;
  category: 'height' | 'width' | 'min' | 'max' | 'inline' | 'block';
}

interface Preset {
  name: string;
  description: string;
  value: number;
  unit: ViewportUnit;
  color: string;
}

const UNITS: UnitInfo[] = [
  { unit: 'vh', label: 'vh', description: '1% of viewport height (static, may include scrollbar)', since: 'CSS3', category: 'height' },
  { unit: 'dvh', label: 'dvh', description: '1% of dynamic viewport height — changes as browser UI shows/hides', since: '2022+ (Interop 2022)', category: 'height' },
  { unit: 'svh', label: 'svh', description: '1% of small viewport height — smallest possible (URL bar shown)', since: '2022+ (Interop 2022)', category: 'height' },
  { unit: 'lvh', label: 'lvh', description: '1% of large viewport height — largest possible (URL bar hidden)', since: '2022+ (Interop 2022)', category: 'height' },
  { unit: 'vw', label: 'vw', description: '1% of viewport width (static)', since: 'CSS3', category: 'width' },
  { unit: 'dvw', label: 'dvw', description: '1% of dynamic viewport width — adjusts with scrollbar visibility', since: '2022+ (Interop 2022)', category: 'width' },
  { unit: 'svw', label: 'svw', description: '1% of small viewport width', since: '2022+ (Interop 2022)', category: 'width' },
  { unit: 'lvw', label: 'lvw', description: '1% of large viewport width', since: '2022+ (Interop 2022)', category: 'width' },
  { unit: 'vmin', label: 'vmin', description: '1% of the smaller viewport dimension (static)', since: 'CSS3', category: 'min' },
  { unit: 'dvmin', label: 'dvmin', description: '1% of the smaller dimension — dynamic', since: '2022+ (Interop 2022)', category: 'min' },
  { unit: 'svmin', label: 'svmin', description: '1% of the smaller dimension — small viewport', since: '2022+ (Interop 2022)', category: 'min' },
  { unit: 'lvmin', label: 'lvmin', description: '1% of the smaller dimension — large viewport', since: '2022+ (Interop 2022)', category: 'min' },
  { unit: 'vmax', label: 'vmax', description: '1% of the larger viewport dimension (static)', since: 'CSS3', category: 'max' },
  { unit: 'dvmax', label: 'dvmax', description: '1% of the larger dimension — dynamic', since: '2022+ (Interop 2022)', category: 'max' },
  { unit: 'svmax', label: 'svmax', description: '1% of the larger dimension — small viewport', since: '2022+ (Interop 2022)', category: 'max' },
  { unit: 'lvmax', label: 'lvmax', description: '1% of the larger dimension — large viewport', since: '2022+ (Interop 2022)', category: 'max' },
  { unit: 'vi', label: 'vi', description: '1% of viewport inline size (respects writing-mode)', since: '2023+', category: 'inline' },
  { unit: 'vb', label: 'vb', description: '1% of viewport block size (respects writing-mode)', since: '2023+', category: 'block' },
];

const PRESETS: Preset[] = [
  { name: 'Landing Hero', description: 'Full dynamic height hero with scroll', value: 100, unit: 'dvh', color: '#6366f1' },
  { name: 'Stable Header', description: 'Small viewport height — never changes', value: 8, unit: 'svh', color: '#0ea5e9' },
  { name: 'Full Bleed Width', description: 'Dynamic width that adapts to scrollbar', value: 100, unit: 'dvw', color: '#f59e0b' },
  { name: 'Responsive Square', description: 'Equal to smallest dimension', value: 50, unit: 'vmin', color: '#10b981' },
  { name: 'Modal Height', description: 'Large viewport — fills available space', value: 70, unit: 'lvh', color: '#ef4444' },
  { name: 'Sidebar Width', description: 'Viewport-relative sidebar', value: 18, unit: 'vw', color: '#8b5cf6' },
  { name: 'Inline-Aware', description: 'Viewport inline size (writing-mode aware)', value: 80, unit: 'vi', color: '#ec4899' },
  { name: 'Max Dimension', description: 'Large vmax for wide screens', value: 40, unit: 'vmax', color: '#14b8a6' },
];

const CATEGORY_COLORS: Record<string, string> = {
  height: '#6366f1',
  width: '#f59e0b',
  min: '#10b981',
  max: '#ec4899',
  inline: '#0ea5e9',
  block: '#8b5cf6',
};

export default function CssViewportUnitsPlayground() {
  const [value, setValue] = useState(100);
  const [selectedUnit, setSelectedUnit] = useState<ViewportUnit>('dvh');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewText, setPreviewText] = useState('Hello, viewport!');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [previewType, setPreviewType] = useState<'simple' | 'layout'>('simple');

  const unitInfo = useMemo(() => UNITS.find(u => u.unit === selectedUnit)!, [selectedUnit]);

  const filteredUnits = useMemo(() =>
    activeCategory === 'all' ? UNITS : UNITS.filter(u => u.category === activeCategory),
    [activeCategory]
  );

  const cssValue = `${value}${selectedUnit}`;

  const cssCode = useMemo(() => {
    if (previewType === 'simple') {
      return `/* ${unitInfo.label} — ${unitInfo.description} */\n.element {\n  height: ${cssValue};\n  width: ${cssValue};\n}`;
    }
    return `/* Layout: ${unitInfo.label} — ${unitInfo.description} */\n.hero {\n  min-height: ${cssValue};\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n/* Fallback for older browsers */\n.hero {\n  min-height: ${value}vh; /* fallback */\n  min-height: ${cssValue};\n}`;
  }, [cssValue, unitInfo, previewType, value, selectedUnit]);

  const handleCopyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const handlePreset = useCallback((preset: Preset) => {
    setValue(preset.value);
    setSelectedUnit(preset.unit);
    setBgColor(preset.color);
  }, []);

  const handleReset = useCallback(() => {
    setValue(100);
    setSelectedUnit('dvh');
    setBgColor('#6366f1');
    setPreviewText('Hello, viewport!');
    setPreviewType('simple');
  }, []);

  const categories = ['all', 'height', 'width', 'min', 'max', 'inline', 'block'];

  const comparisonUnits = useMemo(() => {
    const base = selectedUnit.replace(/^[dsl]/, '');
    const variants = UNITS.filter(u =>
      u.unit.endsWith(base) || u.unit === base ||
      (base === 'vh' && u.unit.match(/[dsl]?vh$/)) ||
      (base === 'vw' && u.unit.match(/[dsl]?vw$/))
    );
    return variants.length > 0 ? variants : [unitInfo];
  }, [selectedUnit, unitInfo]);

  return (
    <ToolLayout
      title="CSS Viewport Units Playground"
      description="Explore dynamic (dvh, svh, lvh), legacy (vh, vw), and new (vi, vb) viewport units. Live preview, size comparison, and presets for modern responsive sizing."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Category</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Viewport Unit</label>
            <div className="grid grid-cols-3 gap-1.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredUnits.map(u => (
                <button
                  key={u.unit}
                  onClick={() => setSelectedUnit(u.unit)}
                  className={`p-2 rounded-lg text-center transition-all text-xs ${
                    selectedUnit === u.unit
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 ring-1 ring-brand-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                  }`}
                  title={u.description}
                >
                  <div className="font-mono font-bold text-sm">{u.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{u.since}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Value: <span className="font-mono text-brand-300">{cssValue}</span>
            </label>
            <input
              type="range"
              min={1}
              max={200}
              value={value}
              onChange={e => setValue(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1</span><span>200</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100, 150].map(v => (
                <button
                  key={v}
                  onClick={() => setValue(v)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    value === v ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >{v}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Preview Mode</label>
            <div className="flex gap-1.5">
              <button onClick={() => setPreviewType('simple')} className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${previewType === 'simple' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}`}>Simple Box</button>
              <button onClick={() => setPreviewType('layout')} className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${previewType === 'layout' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}`}>Layout</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-600" />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-slate-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Preview Text</label>
            <input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Presets</label>
            <div className="space-y-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => handlePreset(p)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                    selectedUnit === p.unit && value === p.value ? 'bg-brand-500/10 border border-brand-500/30' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="font-medium text-slate-300">{p.name}</span>
                  </div>
                  <div className="mt-0.5 text-slate-500">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleCopyCss} className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors">
              <Copy className="w-3.5 h-3.5" />Copy CSS
            </button>
            <button onClick={handleReset} className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 px-3 text-sm transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-brand-500/20 p-2 rounded-lg flex-shrink-0">
                <Ruler className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-brand-300">{unitInfo.label}</span>
                  <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">{unitInfo.since}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{unitInfo.description}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <MonitorSmartphone className="w-3 h-3" />Live Preview
              </span>
              <span className="font-mono text-xs text-brand-300">{cssValue}</span>
            </div>
            {previewType === 'simple' ? (
              <div className="p-6 flex items-center justify-center" style={{ minHeight: '250px' }}>
                <div
                  className="flex items-center justify-center rounded-xl transition-all duration-300 shadow-lg"
                  style={{
                    height: cssValue,
                    width: cssValue,
                    backgroundColor: bgColor,
                    maxWidth: '100%',
                    maxHeight: '400px',
                  }}
                >
                  <span className="text-white font-semibold text-center px-3 select-none" style={{ fontSize: `clamp(12px, ${Math.min(value, 30) * 0.15}px, 24px)` }}>
                    {previewText}
                  </span>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden transition-all duration-300 flex items-center justify-center" style={{ minHeight: cssValue, backgroundColor: bgColor, maxHeight: '400px' }}>
                <div className="text-center text-white p-6">
                  <h2 className="text-2xl font-bold mb-2">{previewText}</h2>
                  <p className="opacity-80 text-sm">min-height: {cssValue}</p>
                  <p className="opacity-60 text-xs mt-2">Resize your browser to see viewport units in action</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Size Comparison at {value}</h3>
            <div className="space-y-2">
              {comparisonUnits.map(u => {
                const color = CATEGORY_COLORS[u.category] || '#64748b';
                const barWidth = Math.min((value / 200) * 100, 100);
                return (
                  <div key={u.unit} className="flex items-center gap-2">
                    <span className="w-16 text-xs font-mono text-slate-400 text-right">{value}{u.unit}</span>
                    <div className="flex-1 bg-slate-700/30 rounded h-5 overflow-hidden">
                      <div className="h-full rounded transition-all duration-300 flex items-center justify-end px-2" style={{ width: `${barWidth}%`, backgroundColor: color }}>
                        {barWidth > 20 && <span className="text-[10px] text-white font-medium">{u.label}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 w-20 truncate" title={u.description}>{u.since}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Generated CSS</span>
              <button onClick={handleCopyCss} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Copy</button>
            </div>
            <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">{cssCode}</pre>
          </div>
        </div>
      </div>

      {/* Reference table */}
      <div className="mt-8 bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700/50 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Complete Viewport Unit Reference</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Unit</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Category</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Description</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Since</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Best For</th>
              </tr>
            </thead>
            <tbody>
              {UNITS.map(u => (
                <tr
                  key={u.unit}
                  onClick={() => setSelectedUnit(u.unit)}
                  className={`border-b border-slate-800 cursor-pointer transition-colors ${selectedUnit === u.unit ? 'bg-brand-500/10' : 'hover:bg-slate-800/30'}`}
                >
                  <td className="py-2 px-4">
                    <span className={`font-mono font-bold text-sm ${selectedUnit === u.unit ? 'text-brand-300' : 'text-slate-300'}`}>{u.label}</span>
                  </td>
                  <td className="py-2 px-4">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: CATEGORY_COLORS[u.category] + '20', color: CATEGORY_COLORS[u.category] }}>{u.category}</span>
                  </td>
                  <td className="py-2 px-4 text-xs text-slate-400">{u.description}</td>
                  <td className="py-2 px-4 text-xs text-slate-500">{u.since}</td>
                  <td className="py-2 px-4 text-xs text-slate-500">
                    {u.category === 'height' ? 'Full-page sections' : u.category === 'width' ? 'Horizontal layouts' : u.category === 'min' ? 'Equal-ratio shapes' : u.category === 'max' ? 'Orientation-adaptive' : u.category === 'inline' ? 'Writing-mode aware' : 'Block-direction sizing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ToolLayout>
  );
}

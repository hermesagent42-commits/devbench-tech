'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Type, SlidersHorizontal, Wand2, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// Types

interface FontAxis {
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  unit?: string;
}

interface FontDef {
  family: string;
  cssFamily: string;
  apiUrl: string;
  axes: FontAxis[];
  description: string;
  source: string;
  category: 'sans' | 'serif' | 'mono' | 'display';
}

interface AxisValue { tag: string; value: number; }

interface Preset {
  name: string; description: string; fontFamily: string;
  axes: AxisValue[]; sampleText: string; fontSize: number;
}

// Font definitions

const FONTS: FontDef[] = [
  {
    family: 'Inter', cssFamily: "'Inter Variable', 'Inter', sans-serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, step: 1 },
      { tag: 'opsz', name: 'Optical Size', min: 14, max: 32, default: 16, step: 1, unit: 'px' },
    ],
    description: 'Workhorse sans-serif. 2 axes: weight (100-900) and optical size (14-32px).',
    source: 'Google Fonts', category: 'sans',
  },
  {
    family: 'Roboto Flex', cssFamily: "'Roboto Flex Variable', 'Roboto Flex', sans-serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght,wdth,GRAD,slnt@8..144,100..1000,25..151,-200..150,-10..0&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 1000, default: 400, step: 1 },
      { tag: 'wdth', name: 'Width', min: 25, max: 151, default: 100, step: 0.1, unit: '%' },
      { tag: 'opsz', name: 'Optical Size', min: 8, max: 144, default: 14, step: 1, unit: 'px' },
      { tag: 'GRAD', name: 'Grade', min: -200, max: 150, default: 0, step: 1 },
      { tag: 'slnt', name: 'Slant', min: -10, max: 0, default: 0, step: 1, unit: 'deg' },
    ],
    description: "Google's most parametric font. 5 axes: weight, width, optical size, grade, and slant.",
    source: 'Google Fonts', category: 'sans',
  },
  {
    family: 'Recursive', cssFamily: "'Recursive Variable', 'Recursive', sans-serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Recursive:CASL,CRSV,MONO,slnt,wght@0..1,0..1,0..1,-15..0,300..1000&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 300, max: 1000, default: 400, step: 1 },
      { tag: 'slnt', name: 'Slant', min: -15, max: 0, default: 0, step: 1, unit: 'deg' },
      { tag: 'CASL', name: 'Casual', min: 0, max: 1, default: 0, step: 0.01 },
      { tag: 'CRSV', name: 'Cursive', min: 0, max: 1, default: 0.5, step: 0.01 },
      { tag: 'MONO', name: 'Monospace', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    description: '5-in-1 design: weight, slant, casual, cursive, and monospace axes. Transforms from sans to mono.',
    source: 'Google Fonts', category: 'sans',
  },
  {
    family: 'Fraunces', cssFamily: "'Fraunces Variable', 'Fraunces', serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, step: 1 },
      { tag: 'opsz', name: 'Optical Size', min: 9, max: 144, default: 16, step: 1, unit: 'px' },
      { tag: 'SOFT', name: 'Softness', min: 0, max: 100, default: 0, step: 0.1, unit: '%' },
      { tag: 'WONK', name: 'Wonky', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    description: 'Display serif with personality. Weight, optical size, softness, and wonky axes.',
    source: 'Google Fonts', category: 'serif',
  },
  {
    family: 'Source Serif 4', cssFamily: "'Source Serif 4 Variable', 'Source Serif 4', serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 200, max: 900, default: 400, step: 1 },
      { tag: 'opsz', name: 'Optical Size', min: 8, max: 60, default: 16, step: 1, unit: 'px' },
    ],
    description: 'Elegant serif by Frank Griesshammer. Weight and optical size axes.',
    source: 'Google Fonts', category: 'serif',
  },
  {
    family: 'Oswald', cssFamily: "'Oswald Variable', 'Oswald', sans-serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@200..700&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 200, max: 700, default: 400, step: 1 },
    ],
    description: 'Condensed sans-serif. Single weight axis (200-700). Great for headlines.',
    source: 'Google Fonts', category: 'display',
  },
  {
    family: 'Crimson Pro', cssFamily: "'Crimson Pro Variable', 'Crimson Pro', serif",
    apiUrl: 'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&display=swap',
    axes: [
      { tag: 'wght', name: 'Weight', min: 200, max: 900, default: 400, step: 1 },
    ],
    description: 'Professional book serif. Weight axis (200-900) plus italic variant.',
    source: 'Google Fonts', category: 'serif',
  },
];

// Presets

const PRESETS: Preset[] = [
  { name: 'Headline Bold', description: 'Bold, wide headline treatment', fontFamily: 'Roboto Flex', axes: [{tag:'wght',value:800},{tag:'wdth',value:120},{tag:'opsz',value:72},{tag:'GRAD',value:0},{tag:'slnt',value:0}], sampleText: 'Make an Impact', fontSize: 56 },
  { name: 'Condensed Caption', description: 'Narrow, light body text', fontFamily: 'Roboto Flex', axes: [{tag:'wght',value:300},{tag:'wdth',value:75},{tag:'opsz',value:12},{tag:'GRAD',value:0},{tag:'slnt',value:0}], sampleText: 'Fine print that still looks sharp.', fontSize: 16 },
  { name: 'Casual Script', description: 'Friendly, handwritten feel', fontFamily: 'Recursive', axes: [{tag:'wght',value:500},{tag:'slnt',value:-8},{tag:'CASL',value:1},{tag:'CRSV',value:0.8},{tag:'MONO',value:0}], sampleText: 'Just a quick note...', fontSize: 24 },
  { name: 'Monospace Code', description: 'Clean monospace for code blocks', fontFamily: 'Recursive', axes: [{tag:'wght',value:400},{tag:'slnt',value:0},{tag:'CASL',value:0},{tag:'CRSV',value:0.5},{tag:'MONO',value:1}], sampleText: 'function greet(name: string) {\n  return "Hello, " + name;\n}', fontSize: 16 },
  { name: 'Delicate Serif', description: 'Light, elegant display serif', fontFamily: 'Fraunces', axes: [{tag:'wght',value:300},{tag:'opsz',value:64},{tag:'SOFT',value:80},{tag:'WONK',value:0}], sampleText: 'Elegance and Grace', fontSize: 52 },
  { name: 'Wonky Display', description: 'Playful, quirky display text', fontFamily: 'Fraunces', axes: [{tag:'wght',value:700},{tag:'opsz',value:72},{tag:'SOFT',value:60},{tag:'WONK',value:1}], sampleText: 'Uniquely Yours', fontSize: 48 },
  { name: 'Ultra Thin UI', description: 'Hairline weight for minimal UI', fontFamily: 'Inter', axes: [{tag:'wght',value:100},{tag:'opsz',value:24}], sampleText: 'minimal design', fontSize: 36 },
  { name: 'Heavy Headline', description: 'Maximum weight for impact', fontFamily: 'Inter', axes: [{tag:'wght',value:900},{tag:'opsz',value:32}], sampleText: 'ALL CAPS HEADLINE', fontSize: 48 },
];

const SAMPLE_TEXTS = [
  'The quick brown fox jumps over the lazy dog.',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '0123456789 .,;:!?@#$%^&*()',
  'Variable fonts are the future of web typography.',
  'Design is not just what it looks like. Design is how it works.',
];

export default function VariableFontsPlayground() {
  const [selectedFont, setSelectedFont] = useState('Roboto Flex');
  const [axes, setAxes] = useState<AxisValue[]>([]);
  const [sampleText, setSampleText] = useState(SAMPLE_TEXTS[0]);
  const [fontSize, setFontSize] = useState(48);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [textIndex, setTextIndex] = useState(0);

  const fontDef = FONTS.find(f => f.family === selectedFont)!;

  useEffect(() => {
    if (!fontDef) return;
    setFontLoaded(false);
    setLoadError('');
    const linkId = 'vf-font-link';
    document.getElementById(linkId)?.remove();
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = fontDef.apiUrl;
    link.onload = () => { document.fonts.ready.then(() => setFontLoaded(true)); };
    link.onerror = () => setLoadError('Failed to load font.');
    document.head.appendChild(link);
    setAxes(fontDef.axes.map(a => ({ tag: a.tag, value: a.default })));
    return () => { link.remove(); };
  }, [fontDef]);

  const variationSettings = useMemo(() => {
    return axes.filter(a => {
      const def = fontDef.axes.find(ad => ad.tag === a.tag);
      return def && a.value !== def.default;
    }).map(a => '"' + a.tag + '" ' + a.value).join(', ');
  }, [axes, fontDef]);

  const cssOutput = useMemo(() => {
    const lines: string[] = [];
    lines.push('font-family: ' + fontDef.cssFamily + ';');
    lines.push('font-size: ' + fontSize + 'px;');
    if (variationSettings) lines.push('font-variation-settings: ' + variationSettings + ';');
    const wght = axes.find(a => a.tag === 'wght');
    if (wght && fontDef.axes.some(a => a.tag === 'wght')) lines.push('/* or: font-weight: ' + Math.round(wght.value) + '; */');
    const slnt = axes.find(a => a.tag === 'slnt');
    if (slnt && fontDef.axes.some(a => a.tag === 'slnt')) lines.push('/* or: font-style: oblique ' + Math.abs(slnt.value) + 'deg; */');
    const wdth = axes.find(a => a.tag === 'wdth');
    if (wdth && fontDef.axes.some(a => a.tag === 'wdth')) lines.push('/* or: font-stretch: ' + Math.round(wdth.value) + '%; */');
    return lines.join('\n');
  }, [fontDef, fontSize, variationSettings, axes]);

  const handleAxisChange = useCallback((tag: string, value: number) => {
    setAxes(prev => prev.map(a => a.tag === tag ? { ...a, value } : a));
  }, []);

  const resetAxes = useCallback(() => {
    setAxes(fontDef.axes.map(a => ({ tag: a.tag, value: a.default })));
  }, [fontDef]);

  const applyPreset = useCallback((preset: Preset) => {
    setSelectedFont(preset.fontFamily);
    setSampleText(preset.sampleText);
    setFontSize(preset.fontSize);
    setTimeout(() => setAxes(preset.axes), 100);
  }, []);

  const cycleText = useCallback(() => {
    const next = (textIndex + 1) % SAMPLE_TEXTS.length;
    setTextIndex(next);
    setSampleText(SAMPLE_TEXTS[next]);
  }, [textIndex]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput);
    toast.success('CSS copied!');
  }, [cssOutput]);

  const activeAxes = useMemo(() => {
    return fontDef.axes.map(axis => ({
      ...axis,
      currentValue: axes.find(a => a.tag === axis.tag)?.value ?? axis.default,
    }));
  }, [fontDef, axes]);

  const cat: Record<string, string> = {
    sans: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    serif: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    mono: 'bg-green-500/10 text-green-300 border-green-500/30',
    display: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  return (
    <ToolLayout title="Variable Fonts Playground" description="Explore variable fonts - adjust weight, width, slant, optical size, and more in real-time. 7 fonts with up to 5 customizable axes each.">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />
            <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {FONTS.map(f => <option key={f.family} value={f.family}>{f.family}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Size:</label>
            <input type="range" min={8} max={144} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-28 accent-brand-500" />
            <span className="text-xs text-slate-300 font-mono w-10">{fontSize}px</span>
          </div>
          <button onClick={resetAxes} className="px-3 py-1.5 rounded-md text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1.5 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Reset Axes</button>
          <button onClick={cycleText} className="px-3 py-1.5 rounded-md text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1.5 transition-colors"><RefreshCw className="w-3.5 h-3.5" /> New Sample</button>
          {fontLoaded && <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Font loaded</span>}
          {loadError && <span className="text-xs text-red-400">{loadError}</span>}
        </div>

        <div className="flex flex-wrap items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">{fontDef.family}</h3>
            <p className="text-sm text-slate-400 mt-1">{fontDef.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={'text-xs px-2 py-0.5 rounded-full border ' + cat[fontDef.category]}>{fontDef.category}</span>
              <span className="text-xs text-slate-500">{fontDef.source} • {fontDef.axes.length} axes</span>
            </div>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{fontDef.axes.map(a => a.tag).join(' · ')}</span>
        </div>

        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
            <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-amber-500/70" /><div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-slate-500">Live Preview</span>
          </div>
          <div className="p-8 sm:p-12 min-h-[200px] flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div style={{
              fontFamily: fontDef.cssFamily, fontSize: fontSize + 'px',
              fontVariationSettings: variationSettings || 'normal', lineHeight: 1.3,
              color: '#e2e8f0', textAlign: 'center', maxWidth: '800px',
              wordBreak: 'break-word', transition: 'font-variation-settings 0.15s ease',
              opacity: fontLoaded ? 1 : 0.3,
            }}>{sampleText}</div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-brand-400" /> Customize Axes
            <span className="text-xs text-slate-500 font-normal">({activeAxes.filter(a => a.currentValue !== a.default).length} modified)</span>
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {activeAxes.map(axis => {
              const isModified = axis.currentValue !== axis.default;
              return (
                <div key={axis.tag} className={'p-3 rounded-lg border transition-colors ' + (isModified ? 'border-brand-500/50 bg-brand-500/5' : 'border-slate-700/50 bg-slate-800/30')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded">{axis.tag}</code>
                      <span className="text-sm text-slate-300">{axis.name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{axis.currentValue}{axis.unit || ''}{isModified && <span className="text-brand-400 ml-1">(default: {axis.default})</span>}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-10 text-right">{axis.min}</span>
                    <input type="range" min={axis.min} max={axis.max} step={axis.step || 1} value={axis.currentValue} onChange={e => handleAxisChange(axis.tag, Number(e.target.value))} className="flex-1 accent-brand-500 h-1.5" />
                    <span className="text-xs text-slate-500 w-10">{axis.max}</span>
                    <button onClick={() => handleAxisChange(axis.tag, axis.default)} className={'text-xs px-1.5 py-0.5 rounded ' + (isModified ? 'text-brand-400 hover:bg-brand-500/10' : 'text-slate-600 cursor-default')} disabled={!isModified} title="Reset">↺</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
            <span className="text-sm text-slate-300 flex items-center gap-2"><Eye className="w-4 h-4 text-brand-400" /> Generated CSS</span>
            <button onClick={copyCSS} className="px-3 py-1 rounded-md text-xs bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 flex items-center gap-1.5 transition-colors"><Copy className="w-3.5 h-3.5" /> Copy CSS</button>
          </div>
          <pre className="p-4 bg-slate-900 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">{cssOutput || '/* Set axes to non-default values to generate CSS */'}</pre>
        </div>

        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3"><Wand2 className="w-4 h-4 text-brand-400" /> Quick Presets</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESETS.map((preset, i) => (
              <button key={i} onClick={() => applyPreset(preset)} className="text-left p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">{preset.name}</span>
                  <span className="text-xs text-slate-500">{preset.fontFamily}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{preset.description}</p>
                <div className="text-xs text-slate-500 truncate" style={{
                  fontFamily: FONTS.find(f => f.family === preset.fontFamily)?.cssFamily,
                  fontVariationSettings: preset.axes.map(a => '"' + a.tag + '" ' + a.value).join(', '),
                  fontSize: '11px',
                }}>{preset.sampleText.split('\n')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-white mb-2">About Variable Fonts</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Variable fonts (OpenType 1.8+) pack multiple font styles into a single file. One variable font file covers an entire design space instead of loading separate files for each weight, width, or style. Control exact appearance with <code className="text-brand-300 bg-brand-500/10 px-1 rounded">font-variation-settings</code> in CSS. 93% of browsers support variable fonts globally.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

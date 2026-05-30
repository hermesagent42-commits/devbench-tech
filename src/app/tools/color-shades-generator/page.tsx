'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Check, RefreshCw, Palette, Droplets, Sun, Moon, Sparkles,
  Download, Pipette, SlidersHorizontal, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorSwatch {
  hex: string;
  hsl: HSL;
  rgb: RGB;
  label: string;
}

interface HarmonyColors {
  name: string;
  description: string;
  colors: string[];
}

type Tab = 'tints-shades' | 'harmonies' | 'export';

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return '#' + toHex(r) + toHex(g) + toHex(b).toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color);
  };
  return { r: f(0), g: f(8), b: f(4) };
}

function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function generateShades(hex: string): { tints: ColorSwatch[]; shades: ColorSwatch[]; tones: ColorSwatch[] } {
  const hsl = rgbToHsl(hexToRgb(hex).r, hexToRgb(hex).g, hexToRgb(hex).b);

  const tints: ColorSwatch[] = [];
  const shades: ColorSwatch[] = [];
  const tones: ColorSwatch[] = [];

  for (let i = 0; i <= 10; i++) {
    const factor = i * 10;

    const tintL = Math.round(hsl.l + (100 - hsl.l) * (factor / 100));
    const tintS = Math.round(hsl.s * (1 - factor / 200));
    const tintHex = hslToHex(hsl.h, tintS, tintL);
    const tintRgb = hslToRgb(hsl.h, tintS, tintL);
    tints.push({
      hex: tintHex,
      hsl: { h: hsl.h, s: tintS, l: tintL },
      rgb: tintRgb,
      label: 'Tint ' + factor + '%',
    });

    const shadeL = Math.round(hsl.l * (1 - factor / 100));
    const shadeS = Math.round(hsl.s * (1 - factor / 200));
    const shadeHex = hslToHex(hsl.h, shadeS, shadeL);
    const shadeRgb = hslToRgb(hsl.h, shadeS, shadeL);
    shades.push({
      hex: shadeHex,
      hsl: { h: hsl.h, s: shadeS, l: shadeL },
      rgb: shadeRgb,
      label: 'Shade ' + factor + '%',
    });

    const toneS = Math.round(hsl.s * (1 - factor / 100));
    const toneHex = hslToHex(hsl.h, toneS, hsl.l);
    const toneRgb = hslToRgb(hsl.h, toneS, hsl.l);
    tones.push({
      hex: toneHex,
      hsl: { h: hsl.h, s: toneS, l: hsl.l },
      rgb: toneRgb,
      label: 'Tone ' + factor + '%',
    });
  }

  return { tints, shades, tones };
}

function generateHarmonies(hex: string): HarmonyColors[] {
  const hsl = rgbToHsl(hexToRgb(hex).r, hexToRgb(hex).g, hexToRgb(hex).b);

  const rotate = (degrees: number): number => (hsl.h + degrees + 360) % 360;

  return [
    {
      name: 'Complementary',
      description: 'Colors opposite on the color wheel. High contrast, vibrant.',
      colors: [hex, hslToHex(rotate(180), hsl.s, hsl.l)],
    },
    {
      name: 'Split Complementary',
      description: 'Base + two colors adjacent to the complement. Balanced contrast.',
      colors: [hex, hslToHex(rotate(150), hsl.s, hsl.l), hslToHex(rotate(210), hsl.s, hsl.l)],
    },
    {
      name: 'Analogous',
      description: 'Colors adjacent on the wheel. Harmonious, natural-looking.',
      colors: [
        hslToHex(rotate(-30), hsl.s, hsl.l),
        hex,
        hslToHex(rotate(30), hsl.s, hsl.l),
        hslToHex(rotate(60), hsl.s, hsl.l),
      ],
    },
    {
      name: 'Triadic',
      description: 'Three evenly spaced colors. Vibrant and balanced.',
      colors: [hex, hslToHex(rotate(120), hsl.s, hsl.l), hslToHex(rotate(240), hsl.s, hsl.l)],
    },
    {
      name: 'Tetradic (Rectangle)',
      description: 'Two complementary pairs. Rich and varied palette.',
      colors: [
        hex,
        hslToHex(rotate(60), hsl.s, hsl.l),
        hslToHex(rotate(180), hsl.s, hsl.l),
        hslToHex(rotate(240), hsl.s, hsl.l),
      ],
    },
    {
      name: 'Square',
      description: 'Four evenly spaced colors. Bold and dynamic.',
      colors: [
        hex,
        hslToHex(rotate(90), hsl.s, hsl.l),
        hslToHex(rotate(180), hsl.s, hsl.l),
        hslToHex(rotate(270), hsl.s, hsl.l),
      ],
    },
    {
      name: 'Monochromatic',
      description: 'Single hue with varying saturation/lightness. Clean, cohesive.',
      colors: [
        hslToHex(hsl.h, Math.min(100, hsl.s + 20), Math.max(10, hsl.l - 30)),
        hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 15)),
        hex,
        hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 15)),
        hslToHex(hsl.h, Math.max(10, hsl.s - 20), Math.min(95, hsl.l + 30)),
      ],
    },
  ];
}

function SwatchCard({ swatch, size }: { swatch: ColorSwatch; size: 'medium' | 'small' }) {
  const [copied, setCopied] = useState(false);
  const isLight = swatch.hsl.l > 65;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(swatch.hex);
    setCopied(true);
    toast.success('Copied ' + swatch.hex);
    setTimeout(() => setCopied(false), 1500);
  }, [swatch.hex]);

  const isMedium = size === 'medium';

  return (
    <button
      onClick={handleCopy}
      className={'group relative rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:z-10 cursor-pointer border-2 border-transparent hover:border-white/30 ' +
        (isMedium ? 'h-24' : 'h-16')}
      style={{ backgroundColor: swatch.hex }}
      title={swatch.label + ': ' + swatch.hex + ' -- Click to copy'}
    >
      {isMedium ? (
        <div className={'absolute inset-0 flex flex-col items-center justify-center transition-opacity ' +
          (isLight ? 'text-slate-900' : 'text-white')}>
          <span className="text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            {copied ? (
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Copied!</span>
            ) : (
              swatch.hex
            )}
          </span>
        </div>
      ) : (
        <div className={'absolute bottom-1 left-1 right-1 text-center text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate ' +
          (isLight ? 'text-slate-900' : 'text-white')}>
          {copied ? 'Copied!' : swatch.hex}
        </div>
      )}
      <div className={'absolute top-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded opacity-60 group-hover:opacity-0 transition-opacity ' +
        (isLight ? 'text-slate-900 bg-white/40' : 'text-white bg-black/20')}>
        {swatch.label}
      </div>
    </button>
  );
}

function HarmonyBlock({ harmony }: { harmony: HarmonyColors }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = useCallback((hex: string, idx: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(idx);
    toast.success('Copied ' + hex);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  return (
    <div className="bg-surface-light rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/30">
        <h3 className="text-white font-semibold text-sm">{harmony.name}</h3>
        <p className="text-slate-400 text-xs mt-0.5">{harmony.description}</p>
      </div>
      <div className="flex h-32">
        {harmony.colors.map((color, i) => (
          <button
            key={i}
            onClick={() => handleCopy(color, i)}
            className="flex-1 relative group cursor-pointer transition-all duration-200 hover:flex-[1.5]"
            style={{ backgroundColor: color }}
            title={color + ' -- Click to copy'}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedIdx === i ? (
                <span className="text-xs font-bold px-2 py-1 rounded bg-black/30 text-white flex items-center gap-1">
                  <Check className="w-3 h-3" /> Copied!
                </span>
              ) : (
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-black/30 text-white">
                  {color}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExportPanel({ hex, shades }: { hex: string; shades: ReturnType<typeof generateShades> }) {
  const [format, setFormat] = useState<'css' | 'tailwind' | 'json' | 'scss'>('css');
  const baseName = 'primary';

  const cssOutput = useMemo(() => {
    const lines: string[] = [':root {'];
    shades.shades.forEach((s, i) => {
      lines.push('  --' + baseName + '-' + ((i + 1) * 100) + ': ' + s.hex + ';');
    });
    lines.push('  --' + baseName + ': ' + hex + ';');
    shades.tints.forEach((t, i) => {
      lines.push('  --' + baseName + '-tint-' + ((i + 1) * 100) + ': ' + t.hex + ';');
    });
    lines.push('}');
    return lines.join('\n');
  }, [hex, shades, baseName]);

  const tailwindOutput = useMemo(() => {
    const lines: string[] = [
      '// tailwind.config.js',
      'module.exports = {',
      '  theme: {',
      '    extend: {',
      '      colors: {',
      "        '" + baseName + "': {",
    ];
    shades.shades.forEach((s, i) => {
      lines.push("          '" + ((i + 1) * 100) + "': '" + s.hex + "',");
    });
    lines.push("          DEFAULT: '" + hex + "',");
    shades.tints.forEach((t, i) => {
      lines.push("          'tint-" + ((i + 1) * 100) + "': '" + t.hex + "',");
    });
    lines.push('        },');
    lines.push('      },');
    lines.push('    },');
    lines.push('  },');
    lines.push('};');
    return lines.join('\n');
  }, [hex, shades, baseName]);

  const jsonOutput = useMemo(() => {
    const obj: Record<string, string> = {};
    obj[baseName] = hex;
    shades.shades.forEach((s, i) => {
      obj[baseName + '-' + ((i + 1) * 100)] = s.hex;
    });
    shades.tints.forEach((t, i) => {
      obj[baseName + '-tint-' + ((i + 1) * 100)] = t.hex;
    });
    return JSON.stringify(obj, null, 2);
  }, [hex, shades, baseName]);

  const scssOutput = useMemo(() => {
    const lines: string[] = [];
    shades.shades.forEach((s, i) => {
      lines.push('$' + baseName + '-' + ((i + 1) * 100) + ': ' + s.hex + ';');
    });
    lines.push('$' + baseName + ': ' + hex + ';');
    shades.tints.forEach((t, i) => {
      lines.push('$' + baseName + '-tint-' + ((i + 1) * 100) + ': ' + t.hex + ';');
    });
    return lines.join('\n');
  }, [hex, shades, baseName]);

  const output = format === 'css' ? cssOutput
    : format === 'tailwind' ? tailwindOutput
    : format === 'json' ? jsonOutput
    : scssOutput;

  const handleCopyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
    toast.success('Copied ' + format.toUpperCase() + ' output');
  }, [output, format]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['css', 'tailwind', 'scss', 'json'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' +
              (format === f
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white')}
          >
            {f === 'css' ? 'CSS Variables' : f === 'tailwind' ? 'Tailwind' : f === 'scss' ? 'SCSS' : 'JSON'}
          </button>
        ))}
        <button
          onClick={handleCopyOutput}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1.5"
        >
          <Copy className="w-3 h-3" />
          Copy {format.toUpperCase()}
        </button>
      </div>
      <pre className="bg-slate-950 rounded-xl border border-slate-700/50 p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 overflow-y-auto">
        {output}
      </pre>
    </div>
  );
}

export default function ColorShadesGenerator() {
  const [colorInput, setColorInput] = useState('#6366F1');
  const [activeTab, setActiveTab] = useState<Tab>('tints-shades');

  const normalizedHex = useMemo(() => {
    const cleaned = colorInput.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      return '#' + cleaned.toUpperCase();
    }
    return '#6366F1';
  }, [colorInput]);

  const shadesData = useMemo(() => generateShades(normalizedHex), [normalizedHex]);
  const harmonies = useMemo(() => generateHarmonies(normalizedHex), [normalizedHex]);
  const rgb = useMemo(() => hexToRgb(normalizedHex), [normalizedHex]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const handleRandomColor = useCallback(() => {
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    setColorInput(randomHex);
  }, []);

  const popularColors = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4',
    '#F97316', '#84CC16', '#14B8A6', '#E11D48',
  ];

  return (
    <ToolLayout
      title="Color Shades Generator"
      description="Generate tints, shades, tones, and color harmonies from any hex color. Export as CSS, Tailwind, SCSS, or JSON."
    >
      <div className="space-y-8">
        <div className="bg-surface-light rounded-xl border border-slate-700/50 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl border-2 border-slate-600 flex-shrink-0 shadow-lg"
              style={{ backgroundColor: normalizedHex }}
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={normalizedHex}
                    onChange={(e) => setColorInput(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Pick a color"
                  />
                  <button className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                    <Pipette className="w-3.5 h-3.5" />
                    Picker
                  </button>
                </div>
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="#6366F1"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                />
                <button
                  onClick={handleRandomColor}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Random color"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                <span>HEX: {normalizedHex}</span>
                <span>RGB: ({rgb.r}, {rgb.g}, {rgb.b})</span>
                <span>HSL: ({hsl.h + '°'}, {hsl.s}%, {hsl.l}%)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">Quick:</span>
            {popularColors.map((c) => (
              <button
                key={c}
                onClick={() => setColorInput(c)}
                className={'w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ' +
                  (normalizedHex === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/50')}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
          {([
            { key: 'tints-shades' as Tab, icon: Layers, label: 'Tints and Shades' },
            { key: 'harmonies' as Tab, icon: Sparkles, label: 'Harmonies' },
            { key: 'export' as Tab, icon: Download, label: 'Export' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ' +
                (activeTab === tab.key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white')}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'tints-shades' ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Shades (adding black)</h3>
                <span className="text-xs text-slate-500">Darker variations</span>
              </div>
              <div className="grid grid-cols-11 gap-1.5">
                {shadesData.shades.map((s) => (
                  <SwatchCard key={s.label} swatch={s} size="medium" />
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Base Color</h3>
              </div>
              <div className="w-full h-20 rounded-xl border-2 border-brand-500/40" style={{ backgroundColor: normalizedHex }}>
                <div className="h-full flex items-center justify-center">
                  <span className="text-sm font-bold font-mono bg-black/20 px-3 py-1 rounded">
                    {normalizedHex}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Tints (adding white)</h3>
                <span className="text-xs text-slate-500">Lighter variations</span>
              </div>
              <div className="grid grid-cols-11 gap-1.5">
                {shadesData.tints.map((t) => (
                  <SwatchCard key={t.label} swatch={t} size="medium" />
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Tones (adding gray)</h3>
                <span className="text-xs text-slate-500">Muted variations</span>
              </div>
              <div className="grid grid-cols-11 gap-1.5">
                {shadesData.tones.map((t) => (
                  <SwatchCard key={t.label} swatch={t} size="small" />
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'harmonies' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {harmonies.map((h) => (
              <HarmonyBlock key={h.name} harmony={h} />
            ))}
          </div>
        ) : (
          <ExportPanel hex={normalizedHex} shades={shadesData} />
        )}

        <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-brand-400">Pro Tip</h4>
              <p className="text-xs text-slate-400 mt-1">
                Click any swatch to copy its hex code. Use the Export tab to generate CSS variables,
                Tailwind config, SCSS variables, or JSON -- ready to paste into your project.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

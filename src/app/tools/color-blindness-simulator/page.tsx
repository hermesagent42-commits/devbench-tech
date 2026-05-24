'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Plus, Trash2, Palette, Eye, EyeOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CVDType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface CVDConfig {
  label: string;
  abbr: string;
  description: string;
  prevalence: string;
  /** LMS cone deficiency simulation matrices (Brettel-Vienot-Mollon) */
  matrix: number[][];
}

interface ColorEntry {
  id: string;
  hex: string;
}

// ── Color vision deficiency simulation matrices ───────────────────────────
// Based on: Brettel, Vienot, Mollon (1997) + Machado et al. (2009)
// These are LMS-space projection matrices for dichromacy simulation.
// We convert RGB → LMS → apply projection → LMS → RGB.

const CVD_CONFIGS: Record<CVDType, CVDConfig> = {
  protanopia: {
    label: 'Protanopia',
    abbr: 'P',
    description: 'Red-blind: missing or anomalous L-cones (long wavelength). Reds appear darker, often confused with greens and browns.',
    prevalence: '~1% of males, ~0.01% of females',
    matrix: [
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758],
    ],
  },
  deuteranopia: {
    label: 'Deuteranopia',
    abbr: 'D',
    description: 'Green-blind: missing or anomalous M-cones (medium wavelength). Greens appear muted, confused with reds and browns. Most common form.',
    prevalence: '~1.5% of males, ~0.01% of females',
    matrix: [
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ],
  },
  tritanopia: {
    label: 'Tritanopia',
    abbr: 'T',
    description: 'Blue-blind: missing or anomalous S-cones (short wavelength). Blues appear greenish, yellows appear pinkish. Very rare.',
    prevalence: '~0.001% of population (males + females)',
    matrix: [
      [0.95, 0.05, 0],
      [0, 0.433, 0.567],
      [0, 0.475, 0.525],
    ],
  },
  achromatopsia: {
    label: 'Achromatopsia',
    abbr: 'A',
    description: 'Total color blindness (monochromacy): no cone function. Only shades of gray are perceived. Extremely rare.',
    prevalence: '~0.003% of population',
    matrix: [
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
    ],
  },
};

// ── Color math utilities ───────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    return [
      parseInt(cleaned[0] + cleaned[0], 16),
      parseInt(cleaned[1] + cleaned[1], 16),
      parseInt(cleaned[2] + cleaned[2], 16),
    ];
  }
  return [
    parseInt(cleaned.substring(0, 2), 16),
    parseInt(cleaned.substring(2, 4), 16),
    parseInt(cleaned.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === nr) {
    h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
  } else if (max === ng) {
    h = ((nb - nr) / d + 2) / 6;
  } else {
    h = ((nr - ng) / d + 4) / 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToLms(r: number, g: number, b: number): [number, number, number] {
  // RGB linearization + Hunt-Pointer-Estevez transform (simplified)
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);
  return [
    lr * 0.31399022 + lg * 0.63951294 + lb * 0.04649755,
    lr * 0.15537241 + lg * 0.75789446 + lb * 0.08670142,
    lr * 0.01775239 + lg * 0.10944209 + lb * 0.87256922,
  ];
}

function lmsToRgb(l: number, m: number, s: number): [number, number, number] {
  const r = l * 5.47221206 + m * -4.6419601 + s * 0.16963708;
  const g = l * -1.1252419 + m * 2.29317094 + s * -0.1678952;
  const b = l * 0.02980165 + m * -0.19318073 + s * 1.16364789;

  const delin = (c: number) => {
    const v = Math.max(0, Math.min(1, c));
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  return [
    Math.round(delin(r) * 255),
    Math.round(delin(g) * 255),
    Math.round(delin(b) * 255),
  ];
}

function simulateCVD(r: number, g: number, b: number, matrix: number[][]): [number, number, number] {
  const [l, m, s] = rgbToLms(r, g, b);
  const sl = l * matrix[0][0] + m * matrix[0][1] + s * matrix[0][2];
  const sm = l * matrix[1][0] + m * matrix[1][1] + s * matrix[1][2];
  const ss = l * matrix[2][0] + m * matrix[2][1] + s * matrix[2][2];
  return lmsToRgb(sl, sm, ss);
}

// ── Preset palettes ────────────────────────────────────────────────────

const PRESET_PALETTES: { name: string; colors: string[] }[] = [
  {
    name: 'Tailwind Red',
    colors: ['#fef2f2', '#fecaca', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  },
  {
    name: 'Tailwind Blue',
    colors: ['#eff6ff', '#bfdbfe', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  },
  {
    name: 'Material Primary',
    colors: ['#e3f2fd', '#90caf9', '#42a5f5', '#1e88e5', '#1565c0', '#0d47a1'],
  },
  {
    name: 'Traffic Lights',
    colors: ['#ef4444', '#f59e0b', '#22c55e'],
  },
  {
    name: 'Chart Colors',
    colors: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'],
  },
  {
    name: 'Grayscale',
    colors: ['#030712', '#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#f9fafb'],
  },
];

// ── Component ───────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function ColorBlindnessSimulatorPage() {
  const [colors, setColors] = useState<ColorEntry[]>([
    { id: 'default-1', hex: '#ef4444' },
    { id: 'default-2', hex: '#22c55e' },
    { id: 'default-3', hex: '#3b82f6' },
    { id: 'default-4', hex: '#f59e0b' },
    { id: 'default-5', hex: '#8b5cf6' },
  ]);
  const [newHex, setNewHex] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const validColors = useMemo(
    () => colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex)),
    [colors],
  );

  const updateColor = useCallback((id: string, hex: string) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, hex } : c)));
  }, []);

  const removeColor = useCallback((id: string) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addColor = useCallback(() => {
    const hex = newHex.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      toast.error('Enter a valid hex color (e.g. #ff9900)');
      return;
    }
    setColors((prev) => [...prev, { id: generateId(), hex }]);
    setNewHex('');
    toast.success('Color added');
  }, [newHex]);

  const applyPreset = useCallback((preset: typeof PRESET_PALETTES[number]) => {
    setActivePreset(preset.name);
    setColors(
      preset.colors.map((hex) => ({ id: generateId(), hex })),
    );
    toast.success(`Loaded "${preset.name}" palette`);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') addColor();
    },
    [addColor],
  );

  const copyAllReport = useCallback(async () => {
    if (validColors.length === 0) return;
    const cvdTypes: CVDType[] = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
    const lines: string[] = ['# Color Blindness Simulation Report', ''];
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('| Original | Protanopia | Deuteranopia | Tritanopia | Achromatopsia |');
    lines.push('|----------|------------|--------------|------------|---------------|');

    for (const color of validColors) {
      const [r, g, b] = hexToRgb(color.hex);
      const row = [color.hex];
      for (const type of cvdTypes) {
        const [sr, sg, sb] = simulateCVD(r, g, b, CVD_CONFIGS[type].matrix);
        row.push(rgbToHex(sr, sg, sb));
      }
      lines.push(`| ${row.join(' | ')} |`);
    }

    lines.push('');
    lines.push('## Legend');
    lines.push('');
    for (const type of cvdTypes) {
      const cfg = CVD_CONFIGS[type];
      lines.push(`- **${cfg.label}** (${cfg.abbr}): ${cfg.description}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Report copied to clipboard');
  }, [validColors]);

  return (
    <ToolLayout
      title="Color Blindness Simulator"
      description="See how your color choices appear to people with protanopia, deuteranopia, tritanopia, and achromatopsia. Essential for accessible design."
    >
      {/* Color input bar */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <Palette className="w-5 h-5 text-brand-400 shrink-0" />
        <div className="flex items-center gap-2 flex-1">
          <span className="text-slate-400 text-sm font-medium shrink-0">Add color:</span>
          <input
            type="text"
            value={newHex}
            onChange={(e) => setNewHex(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="#ff9900"
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors max-w-[160px]"
            spellCheck={false}
            autoComplete="off"
          />
          {/^#[0-9a-fA-F]{6}$/.test(newHex.trim()) && (
            <div
              className="w-8 h-8 rounded-md border border-slate-600 shrink-0"
              style={{ backgroundColor: newHex.trim() }}
            />
          )}
        </div>
        <button
          onClick={addColor}
          className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Active colors row */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-1">Palette:</span>
        {colors.map((color) => {
          const isValid = /^#[0-9a-fA-F]{6}$/.test(color.hex);
          return (
            <div key={color.id} className="flex items-center gap-1.5 group">
              <input
                type="color"
                value={isValid ? color.hex : '#000000'}
                onChange={(e) => updateColor(color.id, e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent p-0"
              />
              <input
                type="text"
                value={color.hex}
                onChange={(e) => updateColor(color.id, e.target.value)}
                className={`w-[85px] text-xs font-mono bg-slate-800 border rounded px-2 py-1 focus:outline-none focus:border-brand-500 transition-colors ${
                  isValid ? 'text-white border-slate-600' : 'text-red-400 border-red-500/50'
                }`}
                spellCheck={false}
              />
              <button
                onClick={() => removeColor(color.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Presets:</span>
        {PRESET_PALETTES.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              activePreset === preset.name
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:border-slate-500/50 hover:text-slate-300'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Simulation table */}
      {validColors.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Add at least one valid hex color to see simulations</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">
                      Original
                    </th>
                    {Object.entries(CVD_CONFIGS).map(([key, cfg]) => (
                      <th key={key} className="text-center px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">
                        <div>{cfg.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal normal-case mt-0.5">{cfg.abbr}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validColors.map((color) => {
                    const [r, g, b] = hexToRgb(color.hex);
                    const [h, s, l] = rgbToHsl(r, g, b);

                    return (
                      <tr key={color.id} className="border-b border-slate-700/30 group hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg border border-slate-600 shadow-inner shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div>
                              <div className="font-mono font-semibold text-white text-sm">{color.hex}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                hsl({h}, {s}%, {l}%)
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(color.hex);
                                setCopiedId(color.id);
                                toast.success('Copied');
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-400 hover:text-brand-400 transition-all"
                              title="Copy hex"
                            >
                              {copiedId === color.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        {(Object.keys(CVD_CONFIGS) as CVDType[]).map((type) => {
                          const matrix = CVD_CONFIGS[type].matrix;
                          const [sr, sg, sb] = simulateCVD(r, g, b, matrix);
                          const simHex = rgbToHex(sr, sg, sb);
                          const isSame = simHex.toLowerCase() === color.hex.toLowerCase();

                          return (
                            <td key={type} className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div
                                  className="w-10 h-10 rounded-lg border border-slate-600 shadow-inner"
                                  style={{ backgroundColor: simHex }}
                                />
                                <span className={`font-mono text-xs ${isSame ? 'text-green-400' : 'text-slate-400'}`}>
                                  {simHex}
                                </span>
                                {isSame && (
                                  <span className="text-[10px] text-green-500/70">unchanged</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Copy report */}
          <div className="flex justify-end mb-8">
            <button
              onClick={copyAllReport}
              className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-600/50 transition-colors flex items-center gap-2 border border-slate-600/30"
            >
              <Copy className="w-4 h-4" />
              Copy Report as Markdown
            </button>
          </div>

          {/* Info cards about each CVD type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {(Object.entries(CVD_CONFIGS) as [CVDType, CVDConfig][]).map(([key, cfg]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-surface-light border border-slate-700/50 hover:border-slate-600/70 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-brand-400" />
                  <h3 className="font-semibold text-white text-sm">{cfg.label}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono">
                    {cfg.abbr}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{cfg.description}</p>
                <div className="text-[11px] text-slate-500">
                  <span className="text-slate-600">Prevalence:</span> {cfg.prevalence}
                </div>
              </div>
            ))}
          </div>

          {/* Accessibility note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-1">Designing for Accessibility</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Color should never be the <strong className="text-slate-300">only</strong> way to convey information.
                Supplement color with icons, patterns, text labels, or underlines. Use sufficient contrast ratios
                (4.5:1 for normal text per WCAG AA). Check your palettes with our{' '}
                <a href="/tools/color-contrast-checker" className="text-brand-400 hover:underline">
                  Color Contrast Checker
                </a>{' '}
                to ensure readability for all users.
              </p>
            </div>
          </div>
        </>
      )}
    </ToolLayout>
  );
}

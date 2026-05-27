'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Palette,
  Copy,
  Search,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── All 148 CSS Named Colors ───────────────────────────────────────────────

interface NamedColor {
  name: string;
  hex: string;
  family: string;
}

const CSS_COLORS: NamedColor[] = [
  { name: 'AliceBlue', hex: '#F0F8FF', family: 'White' },
  { name: 'AntiqueWhite', hex: '#FAEBD7', family: 'White' },
  { name: 'Aqua', hex: '#00FFFF', family: 'Cyan' },
  { name: 'Aquamarine', hex: '#7FFFD4', family: 'Cyan' },
  { name: 'Azure', hex: '#F0FFFF', family: 'White' },
  { name: 'Beige', hex: '#F5F5DC', family: 'White' },
  { name: 'Bisque', hex: '#FFE4C4', family: 'Orange' },
  { name: 'Black', hex: '#000000', family: 'Gray' },
  { name: 'BlanchedAlmond', hex: '#FFEBCD', family: 'Orange' },
  { name: 'Blue', hex: '#0000FF', family: 'Blue' },
  { name: 'BlueViolet', hex: '#8A2BE2', family: 'Purple' },
  { name: 'Brown', hex: '#A52A2A', family: 'Red' },
  { name: 'BurlyWood', hex: '#DEB887', family: 'Brown' },
  { name: 'CadetBlue', hex: '#5F9EA0', family: 'Cyan' },
  { name: 'Chartreuse', hex: '#7FFF00', family: 'Green' },
  { name: 'Chocolate', hex: '#D2691E', family: 'Orange' },
  { name: 'Coral', hex: '#FF7F50', family: 'Orange' },
  { name: 'CornflowerBlue', hex: '#6495ED', family: 'Blue' },
  { name: 'Cornsilk', hex: '#FFF8DC', family: 'White' },
  { name: 'Crimson', hex: '#DC143C', family: 'Red' },
  { name: 'Cyan', hex: '#00FFFF', family: 'Cyan' },
  { name: 'DarkBlue', hex: '#00008B', family: 'Blue' },
  { name: 'DarkCyan', hex: '#008B8B', family: 'Cyan' },
  { name: 'DarkGoldenRod', hex: '#B8860B', family: 'Yellow' },
  { name: 'DarkGray', hex: '#A9A9A9', family: 'Gray' },
  { name: 'DarkGreen', hex: '#006400', family: 'Green' },
  { name: 'DarkKhaki', hex: '#BDB76B', family: 'Yellow' },
  { name: 'DarkMagenta', hex: '#8B008B', family: 'Purple' },
  { name: 'DarkOliveGreen', hex: '#556B2F', family: 'Green' },
  { name: 'DarkOrange', hex: '#FF8C00', family: 'Orange' },
  { name: 'DarkOrchid', hex: '#9932CC', family: 'Purple' },
  { name: 'DarkRed', hex: '#8B0000', family: 'Red' },
  { name: 'DarkSalmon', hex: '#E9967A', family: 'Red' },
  { name: 'DarkSeaGreen', hex: '#8FBC8F', family: 'Green' },
  { name: 'DarkSlateBlue', hex: '#483D8B', family: 'Purple' },
  { name: 'DarkSlateGray', hex: '#2F4F4F', family: 'Green' },
  { name: 'DarkTurquoise', hex: '#00CED1', family: 'Cyan' },
  { name: 'DarkViolet', hex: '#9400D3', family: 'Purple' },
  { name: 'DeepPink', hex: '#FF1493', family: 'Pink' },
  { name: 'DeepSkyBlue', hex: '#00BFFF', family: 'Blue' },
  { name: 'DimGray', hex: '#696969', family: 'Gray' },
  { name: 'DodgerBlue', hex: '#1E90FF', family: 'Blue' },
  { name: 'FireBrick', hex: '#B22222', family: 'Red' },
  { name: 'FloralWhite', hex: '#FFFAF0', family: 'White' },
  { name: 'ForestGreen', hex: '#228B22', family: 'Green' },
  { name: 'Fuchsia', hex: '#FF00FF', family: 'Purple' },
  { name: 'Gainsboro', hex: '#DCDCDC', family: 'White' },
  { name: 'GhostWhite', hex: '#F8F8FF', family: 'White' },
  { name: 'Gold', hex: '#FFD700', family: 'Yellow' },
  { name: 'GoldenRod', hex: '#DAA520', family: 'Yellow' },
  { name: 'Gray', hex: '#808080', family: 'Gray' },
  { name: 'Green', hex: '#008000', family: 'Green' },
  { name: 'GreenYellow', hex: '#ADFF2F', family: 'Green' },
  { name: 'HoneyDew', hex: '#F0FFF0', family: 'White' },
  { name: 'HotPink', hex: '#FF69B4', family: 'Pink' },
  { name: 'IndianRed', hex: '#CD5C5C', family: 'Red' },
  { name: 'Indigo', hex: '#4B0082', family: 'Purple' },
  { name: 'Ivory', hex: '#FFFFF0', family: 'White' },
  { name: 'Khaki', hex: '#F0E68C', family: 'Yellow' },
  { name: 'Lavender', hex: '#E6E6FA', family: 'Purple' },
  { name: 'LavenderBlush', hex: '#FFF0F5', family: 'Pink' },
  { name: 'LawnGreen', hex: '#7CFC00', family: 'Green' },
  { name: 'LemonChiffon', hex: '#FFFACD', family: 'Yellow' },
  { name: 'LightBlue', hex: '#ADD8E6', family: 'Blue' },
  { name: 'LightCoral', hex: '#F08080', family: 'Red' },
  { name: 'LightCyan', hex: '#E0FFFF', family: 'Cyan' },
  { name: 'LightGoldenRodYellow', hex: '#FAFAD2', family: 'Yellow' },
  { name: 'LightGray', hex: '#D3D3D3', family: 'Gray' },
  { name: 'LightGreen', hex: '#90EE90', family: 'Green' },
  { name: 'LightPink', hex: '#FFB6C1', family: 'Pink' },
  { name: 'LightSalmon', hex: '#FFA07A', family: 'Orange' },
  { name: 'LightSeaGreen', hex: '#20B2AA', family: 'Cyan' },
  { name: 'LightSkyBlue', hex: '#87CEFA', family: 'Blue' },
  { name: 'LightSlateGray', hex: '#778899', family: 'Gray' },
  { name: 'LightSteelBlue', hex: '#B0C4DE', family: 'Blue' },
  { name: 'LightYellow', hex: '#FFFFE0', family: 'Yellow' },
  { name: 'Lime', hex: '#00FF00', family: 'Green' },
  { name: 'LimeGreen', hex: '#32CD32', family: 'Green' },
  { name: 'Linen', hex: '#FAF0E6', family: 'White' },
  { name: 'Magenta', hex: '#FF00FF', family: 'Purple' },
  { name: 'Maroon', hex: '#800000', family: 'Red' },
  { name: 'MediumAquaMarine', hex: '#66CDAA', family: 'Green' },
  { name: 'MediumBlue', hex: '#0000CD', family: 'Blue' },
  { name: 'MediumOrchid', hex: '#BA55D3', family: 'Purple' },
  { name: 'MediumPurple', hex: '#9370DB', family: 'Purple' },
  { name: 'MediumSeaGreen', hex: '#3CB371', family: 'Green' },
  { name: 'MediumSlateBlue', hex: '#7B68EE', family: 'Purple' },
  { name: 'MediumSpringGreen', hex: '#00FA9A', family: 'Green' },
  { name: 'MediumTurquoise', hex: '#48D1CC', family: 'Cyan' },
  { name: 'MediumVioletRed', hex: '#C71585', family: 'Pink' },
  { name: 'MidnightBlue', hex: '#191970', family: 'Blue' },
  { name: 'MintCream', hex: '#F5FFFA', family: 'White' },
  { name: 'MistyRose', hex: '#FFE4E1', family: 'Pink' },
  { name: 'Moccasin', hex: '#FFE4B5', family: 'Orange' },
  { name: 'NavajoWhite', hex: '#FFDEAD', family: 'Orange' },
  { name: 'Navy', hex: '#000080', family: 'Blue' },
  { name: 'OldLace', hex: '#FDF5E6', family: 'White' },
  { name: 'Olive', hex: '#808000', family: 'Yellow' },
  { name: 'OliveDrab', hex: '#6B8E23', family: 'Green' },
  { name: 'Orange', hex: '#FFA500', family: 'Orange' },
  { name: 'OrangeRed', hex: '#FF4500', family: 'Red' },
  { name: 'Orchid', hex: '#DA70D6', family: 'Purple' },
  { name: 'PaleGoldenRod', hex: '#EEE8AA', family: 'Yellow' },
  { name: 'PaleGreen', hex: '#98FB98', family: 'Green' },
  { name: 'PaleTurquoise', hex: '#AFEEEE', family: 'Cyan' },
  { name: 'PaleVioletRed', hex: '#DB7093', family: 'Pink' },
  { name: 'PapayaWhip', hex: '#FFEFD5', family: 'Orange' },
  { name: 'PeachPuff', hex: '#FFDAB9', family: 'Orange' },
  { name: 'Peru', hex: '#CD853F', family: 'Brown' },
  { name: 'Pink', hex: '#FFC0CB', family: 'Pink' },
  { name: 'Plum', hex: '#DDA0DD', family: 'Purple' },
  { name: 'PowderBlue', hex: '#B0E0E6', family: 'Cyan' },
  { name: 'Purple', hex: '#800080', family: 'Purple' },
  { name: 'RebeccaPurple', hex: '#663399', family: 'Purple' },
  { name: 'Red', hex: '#FF0000', family: 'Red' },
  { name: 'RosyBrown', hex: '#BC8F8F', family: 'Brown' },
  { name: 'RoyalBlue', hex: '#4169E1', family: 'Blue' },
  { name: 'SaddleBrown', hex: '#8B4513', family: 'Brown' },
  { name: 'Salmon', hex: '#FA8072', family: 'Red' },
  { name: 'SandyBrown', hex: '#F4A460', family: 'Brown' },
  { name: 'SeaGreen', hex: '#2E8B57', family: 'Green' },
  { name: 'SeaShell', hex: '#FFF5EE', family: 'White' },
  { name: 'Sienna', hex: '#A0522D', family: 'Brown' },
  { name: 'Silver', hex: '#C0C0C0', family: 'Gray' },
  { name: 'SkyBlue', hex: '#87CEEB', family: 'Blue' },
  { name: 'SlateBlue', hex: '#6A5ACD', family: 'Purple' },
  { name: 'SlateGray', hex: '#708090', family: 'Gray' },
  { name: 'Snow', hex: '#FFFAFA', family: 'White' },
  { name: 'SpringGreen', hex: '#00FF7F', family: 'Green' },
  { name: 'SteelBlue', hex: '#4682B4', family: 'Blue' },
  { name: 'Tan', hex: '#D2B48C', family: 'Brown' },
  { name: 'Teal', hex: '#008080', family: 'Cyan' },
  { name: 'Thistle', hex: '#D8BFD8', family: 'Purple' },
  { name: 'Tomato', hex: '#FF6347', family: 'Red' },
  { name: 'Turquoise', hex: '#40E0D0', family: 'Cyan' },
  { name: 'Violet', hex: '#EE82EE', family: 'Purple' },
  { name: 'Wheat', hex: '#F5DEB3', family: 'Brown' },
  { name: 'White', hex: '#FFFFFF', family: 'White' },
  { name: 'WhiteSmoke', hex: '#F5F5F5', family: 'White' },
  { name: 'Yellow', hex: '#FFFF00', family: 'Yellow' },
  { name: 'YellowGreen', hex: '#9ACD32', family: 'Green' },
];

// ── Derive RGB and HSL ─────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return [
    parseInt(full.substring(0, 2), 16),
    parseInt(full.substring(2, 4), 16),
    parseInt(full.substring(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr:
        h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
        break;
      case ng:
        h = ((nb - nr) / d + 2) / 6;
        break;
      case nb:
        h = ((nr - ng) / d + 4) / 6;
        break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

type CompleteColor = NamedColor & { rgb: [number, number, number]; hsl: [number, number, number] };

const COMPLETE_COLORS: CompleteColor[] = CSS_COLORS.map((c) => {
  const rgb = hexToRgb(c.hex);
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return { ...c, rgb, hsl };
});

// ── Color Families ─────────────────────────────────────────────────────────

const FAMILIES = [
  'All',
  'Red',
  'Pink',
  'Orange',
  'Yellow',
  'Brown',
  'Green',
  'Cyan',
  'Blue',
  'Purple',
  'White',
  'Gray',
] as const;

const FAMILY_ICONS: Record<string, string> = {
  Red: '🔴',
  Pink: '💖',
  Orange: '🟠',
  Yellow: '🟡',
  Brown: '🟤',
  Green: '🟢',
  Cyan: '🩵',
  Blue: '🔵',
  Purple: '🟣',
  White: '⚪',
  Gray: '⬜',
};

// ── Sort modes ──────────────────────────────────────────────────────────────

type SortMode = 'name-asc' | 'name-desc' | 'hue-asc' | 'hue-desc' | 'family' | 'lightness-asc' | 'lightness-desc';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'hue-asc', label: 'Hue ↑' },
  { value: 'hue-desc', label: 'Hue ↓' },
  { value: 'lightness-asc', label: 'Dark → Light' },
  { value: 'lightness-desc', label: 'Light → Dark' },
  { value: 'family', label: 'By Family' },
];

// ── Helper: luminance for text contrast ────────────────────────────────────

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function textColor(r: number, g: number, b: number): string {
  return getLuminance(r, g, b) > 0.5 ? '#111827' : '#ffffff';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssNamedColorsPage() {
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState<string>('All');
  const [sort, setSort] = useState<SortMode>('name-asc');
  const [selected, setSelected] = useState<CompleteColor | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let colors = COMPLETE_COLORS;

    if (family !== 'All') {
      colors = colors.filter((c) => c.family === family);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      colors = colors.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.hex.toLowerCase().includes(q) ||
          `rgb(${c.rgb.join(',')})`.includes(q)
      );
    }

    // Sort
    switch (sort) {
      case 'name-asc':
        colors = [...colors].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        colors = [...colors].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'hue-asc':
        colors = [...colors].sort((a, b) => a.hsl[0] - b.hsl[0]);
        break;
      case 'hue-desc':
        colors = [...colors].sort((a, b) => b.hsl[0] - a.hsl[0]);
        break;
      case 'lightness-asc':
        colors = [...colors].sort((a, b) => a.hsl[2] - b.hsl[2]);
        break;
      case 'lightness-desc':
        colors = [...colors].sort((a, b) => b.hsl[2] - a.hsl[2]);
        break;
      case 'family':
        colors = [...colors].sort(
          (a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name)
        );
        break;
    }

    return colors;
  }, [search, family, sort]);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`Copied: ${text}`);
      setTimeout(() => setCopiedField(null), 1500);
    },
    []
  );

  // ── Stats ──────────────────────────────────────────────────────────────────

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of COMPLETE_COLORS) {
      counts[c.family] = (counts[c.family] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <ToolLayout
      title="CSS Named Colors"
      description="Explore all 148 CSS named colors. Search, filter by family, sort by name or hue, and copy hex, RGB, or HSL values."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search colors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Family filter */}
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f === 'All' ? `All (${COMPLETE_COLORS.length})` : `${FAMILY_ICONS[f] || ''} ${f} (${familyCounts[f] || 0})`}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Palette className="w-3.5 h-3.5" />
          {filtered.length} of {COMPLETE_COLORS.length} colors
        </span>
        {search && (
          <span>
            matching &ldquo;{search}&rdquo;
          </span>
        )}
      </div>

      {/* ── Color grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-8">
        {filtered.map((color) => {
          const txt = textColor(color.rgb[0], color.rgb[1], color.rgb[2]);
          const isSelected = selected?.name === color.name;
          return (
            <button
              key={color.name}
              onClick={() => setSelected(color)}
              className={`relative rounded-lg overflow-hidden transition-all duration-150 border-2 ${
                isSelected
                  ? 'border-brand-400 shadow-lg shadow-brand-500/20 scale-[1.03]'
                  : 'border-transparent hover:scale-[1.02] hover:shadow-md'
              }`}
            >
              <div
                className="h-20 flex items-end p-2"
                style={{ backgroundColor: color.hex }}
              >
                <span
                  className="text-xs font-medium truncate w-full"
                  style={{ color: txt }}
                >
                  {color.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Palette className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No colors match your search.</p>
        </div>
      )}

      {/* ── Selected color detail ──────────────────────────────────────────── */}
      {selected && (
        <div className="rounded-xl border border-slate-700/60 overflow-hidden bg-slate-900/50">
          {/* Color preview bar */}
          <div
            className="h-24 flex items-center justify-center relative"
            style={{ backgroundColor: selected.hex }}
          >
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => copyToClipboard(selected.name, 'name')}
                className="px-2 py-0.5 rounded text-xs font-mono backdrop-blur-sm bg-black/20 hover:bg-black/40 transition-colors"
                style={{ color: textColor(selected.rgb[0], selected.rgb[1], selected.rgb[2]) }}
              >
                {copiedField === 'name' ? (
                  <Check className="w-3 h-3 inline mr-1" />
                ) : (
                  <Copy className="w-3 h-3 inline mr-1" />
                )}
                {selected.name}
              </button>
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: textColor(selected.rgb[0], selected.rgb[1], selected.rgb[2]) }}
            >
              {selected.name}
            </h2>
          </div>

          {/* Detail rows */}
          <div className="p-4 grid gap-3">
            {[
              { label: 'HEX', value: selected.hex },
              { label: 'RGB', value: `rgb(${selected.rgb[0]}, ${selected.rgb[1]}, ${selected.rgb[2]})` },
              { label: 'HSL', value: `hsl(${selected.hsl[0]}, ${selected.hsl[1]}%, ${selected.hsl[2]}%)` },
              { label: 'Family', value: selected.family },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer group"
                onClick={() => copyToClipboard(value, label)}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-200 group-hover:text-brand-300 transition-colors">
                    {value}
                  </span>
                  {copiedField === label ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

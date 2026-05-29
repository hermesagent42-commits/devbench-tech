'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ChevronDown, Eye, EyeOff, Globe, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
type Direction = 'ltr' | 'rtl';

interface LogicalProperty {
  category: string;
  property: string;
  physicalEquivalent: string;
  description: string;
  defaultValue: string;
}

interface PropertyState {
  [key: string]: string;
}

interface Preset {
  name: string;
  description: string;
  writingMode: WritingMode;
  direction: Direction;
  properties: PropertyState;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LOGICAL_PROPERTIES: LogicalProperty[] = [
  // Margin
  { category: 'Margin', property: 'margin-inline-start', physicalEquivalent: 'margin-left (LTR) / margin-right (RTL)', description: 'Start edge in the inline direction', defaultValue: '0' },
  { category: 'Margin', property: 'margin-inline-end', physicalEquivalent: 'margin-right (LTR) / margin-left (RTL)', description: 'End edge in the inline direction', defaultValue: '0' },
  { category: 'Margin', property: 'margin-block-start', physicalEquivalent: 'margin-top', description: 'Start edge in the block direction', defaultValue: '0' },
  { category: 'Margin', property: 'margin-block-end', physicalEquivalent: 'margin-bottom', description: 'End edge in the block direction', defaultValue: '0' },
  { category: 'Margin', property: 'margin-inline', physicalEquivalent: 'margin-left + margin-right', description: 'Shorthand for inline-start + inline-end', defaultValue: '0' },
  { category: 'Margin', property: 'margin-block', physicalEquivalent: 'margin-top + margin-bottom', description: 'Shorthand for block-start + block-end', defaultValue: '0' },
  // Padding
  { category: 'Padding', property: 'padding-inline-start', physicalEquivalent: 'padding-left (LTR) / padding-right (RTL)', description: 'Start edge inner space in inline direction', defaultValue: '0' },
  { category: 'Padding', property: 'padding-inline-end', physicalEquivalent: 'padding-right (LTR) / padding-left (RTL)', description: 'End edge inner space in inline direction', defaultValue: '0' },
  { category: 'Padding', property: 'padding-block-start', physicalEquivalent: 'padding-top', description: 'Start edge inner space in block direction', defaultValue: '0' },
  { category: 'Padding', property: 'padding-block-end', physicalEquivalent: 'padding-bottom', description: 'End edge inner space in block direction', defaultValue: '0' },
  { category: 'Padding', property: 'padding-inline', physicalEquivalent: 'padding-left + padding-right', description: 'Shorthand for inline-start + inline-end', defaultValue: '0' },
  { category: 'Padding', property: 'padding-block', physicalEquivalent: 'padding-top + padding-bottom', description: 'Shorthand for block-start + block-end', defaultValue: '0' },
  // Border
  { category: 'Border', property: 'border-inline-start', physicalEquivalent: 'border-left (LTR) / border-right (RTL)', description: 'Start edge border in inline direction', defaultValue: '0' },
  { category: 'Border', property: 'border-inline-end', physicalEquivalent: 'border-right (LTR) / border-left (RTL)', description: 'End edge border in inline direction', defaultValue: '0' },
  { category: 'Border', property: 'border-block-start', physicalEquivalent: 'border-top', description: 'Start edge border in block direction', defaultValue: '0' },
  { category: 'Border', property: 'border-block-end', physicalEquivalent: 'border-bottom', description: 'End edge border in block direction', defaultValue: '0' },
  // Size
  { category: 'Size', property: 'inline-size', physicalEquivalent: 'width (horizontal-tb) / height (vertical)', description: 'Size in the inline dimension', defaultValue: 'auto' },
  { category: 'Size', property: 'block-size', physicalEquivalent: 'height (horizontal-tb) / width (vertical)', description: 'Size in the block dimension', defaultValue: 'auto' },
  { category: 'Size', property: 'min-inline-size', physicalEquivalent: 'min-width (horizontal-tb)', description: 'Minimum size in the inline dimension', defaultValue: '0' },
  { category: 'Size', property: 'min-block-size', physicalEquivalent: 'min-height (horizontal-tb)', description: 'Minimum size in the block dimension', defaultValue: '0' },
  { category: 'Size', property: 'max-inline-size', physicalEquivalent: 'max-width (horizontal-tb)', description: 'Maximum size in the inline dimension', defaultValue: 'none' },
  { category: 'Size', property: 'max-block-size', physicalEquivalent: 'max-height (horizontal-tb)', description: 'Maximum size in the block dimension', defaultValue: 'none' },
  // Positioning
  { category: 'Position', property: 'inset-inline-start', physicalEquivalent: 'left (LTR) / right (RTL)', description: 'Inset start in the inline direction', defaultValue: 'auto' },
  { category: 'Position', property: 'inset-inline-end', physicalEquivalent: 'right (LTR) / left (RTL)', description: 'Inset end in the inline direction', defaultValue: 'auto' },
  { category: 'Position', property: 'inset-block-start', physicalEquivalent: 'top', description: 'Inset start in the block direction', defaultValue: 'auto' },
  { category: 'Position', property: 'inset-block-end', physicalEquivalent: 'bottom', description: 'Inset end in the block direction', defaultValue: 'auto' },
  { category: 'Position', property: 'inset-inline', physicalEquivalent: 'left + right', description: 'Shorthand for inset-inline-start + inset-inline-end', defaultValue: 'auto' },
  { category: 'Position', property: 'inset-block', physicalEquivalent: 'top + bottom', description: 'Shorthand for inset-block-start + inset-block-end', defaultValue: 'auto' },
  // Text
  { category: 'Text', property: 'text-align', physicalEquivalent: '—', description: 'Aligns text in the inline direction (start, end, center, justify)', defaultValue: 'start' },
];

const CATEGORIES = ['Margin', 'Padding', 'Border', 'Size', 'Position', 'Text'];

const WRITING_MODES: { value: WritingMode; label: string; icon: string }[] = [
  { value: 'horizontal-tb', label: 'Horizontal (TB)', icon: '≡' },
  { value: 'vertical-rl', label: 'Vertical (RL)', icon: '||' },
  { value: 'vertical-lr', label: 'Vertical (LR)', icon: '||' },
];

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'ltr', label: 'LTR' },
  { value: 'rtl', label: 'RTL' },
];

const SAMPLE_TEXT_EN = 'The quick brown fox jumps over the lazy dog. CSS logical properties make this layout writing-mode-aware — flip the writing mode or direction and watch everything adapt automatically. No physical direction assumptions, just pure flow-relative design.';
const SAMPLE_TEXT_AR = 'الثعلب البني السريع يقفز فوق الكلب الكسول. الخصائص المنطقية لـ CSS تجعل هذا التخطيط متوافقًا مع اتجاه الكتابة.';

const PRESETS: Preset[] = [
  {
    name: 'Card Layout (LTR)',
    description: 'Standard LTR card with logical margins and padding',
    writingMode: 'horizontal-tb', direction: 'ltr',
    properties: {
      'margin-inline': '16px', 'margin-block': '12px',
      'padding-inline': '20px', 'padding-block': '16px',
      'border-inline-start': '4px solid #3b82f6', 'border-block-start': '1px solid #334155',
      'inline-size': '320px', 'block-size': 'auto',
      'text-align': 'start',
    },
  },
  {
    name: 'Card Layout (RTL)',
    description: 'Same card in RTL — margins and borders flip automatically',
    writingMode: 'horizontal-tb', direction: 'rtl',
    properties: {
      'margin-inline': '16px', 'margin-block': '12px',
      'padding-inline': '20px', 'padding-block': '16px',
      'border-inline-start': '4px solid #3b82f6', 'border-block-start': '1px solid #334155',
      'inline-size': '320px', 'block-size': 'auto',
      'text-align': 'start',
    },
  },
  {
    name: 'Vertical Text (Japanese)',
    description: 'Vertical writing mode with logical sizing',
    writingMode: 'vertical-rl', direction: 'ltr',
    properties: {
      'margin-inline': '8px', 'margin-block': '12px',
      'padding-inline': '12px', 'padding-block': '20px',
      'border-inline-start': '3px solid #a855f7', 'border-block-start': '1px solid #334155',
      'inline-size': 'auto', 'block-size': '300px',
      'text-align': 'start',
    },
  },
  {
    name: 'Sidebar with Inline Padding',
    description: 'Sidebar that adapts to RTL — padding swaps sides',
    writingMode: 'horizontal-tb', direction: 'ltr',
    properties: {
      'padding-inline-start': '24px', 'padding-inline-end': '12px',
      'padding-block': '16px',
      'border-inline-end': '1px solid #475569',
      'inline-size': '240px', 'block-size': '100%',
      'text-align': 'start',
    },
  },
  {
    name: 'Absolute Positioned Badge',
    description: 'Badge using inset-logical for writing-mode-safe positioning',
    writingMode: 'horizontal-tb', direction: 'ltr',
    properties: {
      'inset-inline-end': '8px', 'inset-block-start': '8px',
      'padding-inline': '10px', 'padding-block': '6px',
      'border-inline-start': '2px solid #f59e0b',
      'inline-size': 'auto', 'block-size': 'auto',
    },
  },
  {
    name: 'Full RTL Page Card',
    description: 'Complete card with RTL Arabic content',
    writingMode: 'horizontal-tb', direction: 'rtl',
    properties: {
      'margin-inline': '20px', 'margin-block': '16px',
      'padding-inline': '24px', 'padding-block': '20px',
      'border-inline-start': '5px solid #10b981', 'border-block-start': '1px solid #475569',
      'inline-size': '380px', 'block-size': 'auto',
      'text-align': 'start',
    },
  },
];

const DEFAULT_PROPERTIES: PropertyState = {
  'margin-inline': '16px', 'margin-block': '12px',
  'padding-inline': '20px', 'padding-block': '16px',
  'border-inline-start': '4px solid #3b82f6',
  'inline-size': '320px', 'block-size': 'auto',
  'text-align': 'start',
};

const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

// ── Helpers ────────────────────────────────────────────────────────────────

function parseBorder(value: string): { width: string; style: string; color: string } | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '0') return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) return { width: parts[0], style: parts[1], color: parts.slice(2).join(' ') };
  return { width: parts[0] || '1px', style: parts[1] || 'solid', color: parts[2] || '#3b82f6' };
}

function isNonZero(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== '' && trimmed !== '0' && trimmed !== 'auto' && trimmed !== 'none';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssLogicalPropertiesClient() {
  const [writingMode, setWritingMode] = useState<WritingMode>('horizontal-tb');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [properties, setProperties] = useState<PropertyState>({ ...DEFAULT_PROPERTIES });
  const [activeCategory, setActiveCategory] = useState<string>('Margin');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [customText, setCustomText] = useState(LOREM_SHORT);
  const [showPhysical, setShowPhysical] = useState(true);

  const handlePreset = useCallback((preset: Preset) => {
    setWritingMode(preset.writingMode);
    setDirection(preset.direction);
    setProperties({ ...preset.properties });
    if (preset.direction === 'rtl') {
      setCustomText(SAMPLE_TEXT_AR);
    } else {
      setCustomText(LOREM_SHORT);
    }
  }, []);

  const handleReset = useCallback(() => {
    setWritingMode('horizontal-tb');
    setDirection('ltr');
    setProperties({ ...DEFAULT_PROPERTIES });
    setCustomText(LOREM_SHORT);
    setActiveCategory('Margin');
  }, []);

  const handlePropertyChange = useCallback((property: string, value: string) => {
    setProperties(prev => ({ ...prev, [property]: value }));
  }, []);

  const activeProperties = useMemo(() => {
    return LOGICAL_PROPERTIES.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const cssCode = useMemo(() => {
    const lines: string[] = ['.logical-demo {'];
    const used: string[] = [];
    for (const lp of LOGICAL_PROPERTIES) {
      const val = properties[lp.property];
      if (val !== undefined && val !== '' && val !== lp.defaultValue && val !== '0' && val !== 'none' && val !== 'auto') {
        if (lp.property === 'text-align') {
          if (val !== 'start') lines.push(`  ${lp.property}: ${val};`);
        } else {
          lines.push(`  ${lp.property}: ${val};`);
        }
        used.push(lp.property);
      }
    }
    if (used.length === 0) {
      lines.push('  /* No properties set — pick a category and add values */');
    }
    lines.push('}');
    return lines.join('\n');
  }, [properties]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  // Build inline style for the preview box
  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {};
    for (const lp of LOGICAL_PROPERTIES) {
      const val = properties[lp.property];
      if (val !== undefined && val !== '' && val !== lp.defaultValue) {
        style[lp.property] = val;
      }
    }
    return style;
  }, [properties]);

  // Compute the physical mapping
  const physicalMapping = useMemo(() => {
    const isHorizontal = writingMode === 'horizontal-tb';
    const isRTL = direction === 'rtl';

    const mapping: Record<string, string> = {};
    for (const lp of LOGICAL_PROPERTIES) {
      const val = properties[lp.property];
      if (val === undefined || val === '' || val === lp.defaultValue) continue;

      let phys = '';

      switch (lp.property) {
        // Margin
        case 'margin-inline-start': phys = isHorizontal ? (isRTL ? 'margin-right' : 'margin-left') : 'margin-top'; break;
        case 'margin-inline-end': phys = isHorizontal ? (isRTL ? 'margin-left' : 'margin-right') : 'margin-bottom'; break;
        case 'margin-block-start': phys = isHorizontal ? 'margin-top' : (writingMode === 'vertical-rl' ? 'margin-right' : 'margin-left'); break;
        case 'margin-block-end': phys = isHorizontal ? 'margin-bottom' : (writingMode === 'vertical-rl' ? 'margin-left' : 'margin-right'); break;
        case 'margin-inline': phys = isHorizontal ? 'margin-left + margin-right' : 'margin-top + margin-bottom'; break;
        case 'margin-block': phys = isHorizontal ? 'margin-top + margin-bottom' : 'margin-left + margin-right'; break;
        // Padding
        case 'padding-inline-start': phys = isHorizontal ? (isRTL ? 'padding-right' : 'padding-left') : 'padding-top'; break;
        case 'padding-inline-end': phys = isHorizontal ? (isRTL ? 'padding-left' : 'padding-right') : 'padding-bottom'; break;
        case 'padding-block-start': phys = isHorizontal ? 'padding-top' : (writingMode === 'vertical-rl' ? 'padding-right' : 'padding-left'); break;
        case 'padding-block-end': phys = isHorizontal ? 'padding-bottom' : (writingMode === 'vertical-rl' ? 'padding-left' : 'padding-right'); break;
        case 'padding-inline': phys = isHorizontal ? 'padding-left + padding-right' : 'padding-top + padding-bottom'; break;
        case 'padding-block': phys = isHorizontal ? 'padding-top + padding-bottom' : 'padding-left + padding-right'; break;
        // Border
        case 'border-inline-start': phys = isHorizontal ? (isRTL ? 'border-right' : 'border-left') : 'border-top'; break;
        case 'border-inline-end': phys = isHorizontal ? (isRTL ? 'border-left' : 'border-right') : 'border-bottom'; break;
        case 'border-block-start': phys = isHorizontal ? 'border-top' : (writingMode === 'vertical-rl' ? 'border-right' : 'border-left'); break;
        case 'border-block-end': phys = isHorizontal ? 'border-bottom' : (writingMode === 'vertical-rl' ? 'border-left' : 'border-right'); break;
        // Size
        case 'inline-size': phys = isHorizontal ? 'width' : 'height'; break;
        case 'block-size': phys = isHorizontal ? 'height' : 'width'; break;
        case 'min-inline-size': phys = isHorizontal ? 'min-width' : 'min-height'; break;
        case 'min-block-size': phys = isHorizontal ? 'min-height' : 'min-width'; break;
        case 'max-inline-size': phys = isHorizontal ? 'max-width' : 'max-height'; break;
        case 'max-block-size': phys = isHorizontal ? 'max-height' : 'max-width'; break;
        // Position
        case 'inset-inline-start': phys = isHorizontal ? (isRTL ? 'right' : 'left') : 'top'; break;
        case 'inset-inline-end': phys = isHorizontal ? (isRTL ? 'left' : 'right') : 'bottom'; break;
        case 'inset-block-start': phys = isHorizontal ? 'top' : (writingMode === 'vertical-rl' ? 'right' : 'left'); break;
        case 'inset-block-end': phys = isHorizontal ? 'bottom' : (writingMode === 'vertical-rl' ? 'left' : 'right'); break;
        case 'inset-inline': phys = isHorizontal ? 'left + right' : 'top + bottom'; break;
        case 'inset-block': phys = isHorizontal ? 'top + bottom' : 'left + right'; break;
        // Text
        case 'text-align': phys = 'text-align'; break;
      }

      if (phys) mapping[lp.property] = `${val} → ${phys}: ${val}`;
    }
    return mapping;
  }, [properties, writingMode, direction]);

  return (
    <ToolLayout
      title="CSS Logical Properties Playground"
      description="Build writing-mode-aware layouts using flow-relative CSS properties. Toggle writing modes and directions, see the physical mapping in real time, and copy production-ready CSS."
    >
      <div className="space-y-6">
        {/* ── Writing Mode & Direction Controls ─────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center gap-6">
            {/* Writing Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Writing Mode
              </label>
              <div className="inline-flex rounded-lg border border-slate-700/50 bg-slate-800/50 overflow-hidden">
                {WRITING_MODES.map(wm => (
                  <button
                    key={wm.value}
                    onClick={() => setWritingMode(wm.value)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      writingMode === wm.value
                        ? 'bg-brand-600/20 text-brand-400 border-x border-brand-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <span className="mr-1.5">{wm.icon}</span>
                    {wm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Direction
              </label>
              <div className="inline-flex rounded-lg border border-slate-700/50 bg-slate-800/50 overflow-hidden">
                {DIRECTIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDirection(d.value)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      direction === d.value
                        ? 'bg-emerald-600/20 text-emerald-400 border-x border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <ArrowRight className={`w-3.5 h-3.5 inline mr-1 ${d.value === 'rtl' ? 'rotate-180' : ''}`} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Physical Mapping Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Physical Map
              </label>
              <button
                onClick={() => setShowPhysical(!showPhysical)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  showPhysical
                    ? 'bg-amber-600/10 text-amber-400 border-amber-500/30'
                    : 'text-slate-400 border-slate-700/50 hover:text-slate-200'
                }`}
              >
                {showPhysical ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showPhysical ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>

          {/* Writing mode context info */}
          <div className="mt-3 text-xs text-slate-500 bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
            <span className="text-slate-400 font-medium">Current context:</span>{' '}
            Inline flows{' '}
            <span className="text-brand-400">
              {writingMode === 'horizontal-tb' ? 'left-to-right then top-to-bottom' :
               writingMode === 'vertical-rl' ? 'top-to-bottom then right-to-left' :
               'top-to-bottom then left-to-right'}
            </span>
            {direction === 'rtl' && writingMode === 'horizontal-tb' && (
              <span className="text-emerald-400"> — RTL flips all inline-start/end mappings</span>
            )}
          </div>
        </div>

        {/* ── Property Categories & Controls ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Editor */}
          <div className="lg:col-span-2 glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Properties</h3>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 border border-slate-700/30 hover:text-slate-200 hover:border-slate-600/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Property rows */}
            <div className="space-y-3">
              {activeProperties.map(lp => {
                const val = properties[lp.property] || lp.defaultValue;
                const showPhys = showPhysical && physicalMapping[lp.property];
                return (
                  <div key={lp.property} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-brand-300 bg-brand-950/30 px-1.5 py-0.5 rounded">
                          {lp.property}
                        </code>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">{lp.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val}
                        onChange={e => handlePropertyChange(lp.property, e.target.value)}
                        className="flex-1 bg-slate-800/70 border border-slate-700/50 rounded-md px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                      />
                      <button
                        onClick={() => handlePropertyChange(lp.property, lp.defaultValue)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                        title="Reset to default"
                      >
                        default
                      </button>
                    </div>
                    {showPhys && (
                      <p className="text-[10px] text-amber-400/70 font-mono ml-1">
                        ↳ {physicalMapping[lp.property]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Presets & CSS Output */}
          <div className="space-y-4">
            {/* Presets */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-400" />
                Presets
              </h3>
              <div className="space-y-2">
                {PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handlePreset(preset)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-700/30 hover:border-brand-500/30 hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{preset.description}</div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400 font-mono">
                        {preset.writingMode}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        preset.direction === 'rtl' ? 'bg-emerald-700/20 text-emerald-400' : 'bg-slate-700/30 text-slate-400'
                      }`}>
                        {preset.direction}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CSS Output */}
            <div className="glass-card p-4 sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">CSS Output</h3>
                <button
                  onClick={copyCss}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <pre className="bg-slate-950/80 text-xs font-mono text-slate-300 p-3 rounded-lg overflow-x-auto border border-slate-700/30 max-h-64 overflow-y-auto">
                {cssCode}
              </pre>
            </div>
          </div>
        </div>

        {/* ── Live Preview ─────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Live Preview</h3>
          <div
            className="rounded-lg border border-slate-700/50 overflow-hidden"
            style={{
              writingMode,
              direction,
              minHeight: '200px',
              backgroundColor: '#0f172a',
            }}
          >
            <div
              style={{
                ...previewStyle,
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                borderRadius: '8px',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                position: 'relative',
              }}
            >
              {/* Show border-inline-start visually */}
              {(() => {
                const b = parseBorder(properties['border-inline-start'] || '0');
                if (b) {
                  return (
                    <div
                      className="absolute rounded-l"
                      style={{
                        [writingMode === 'horizontal-tb' ? (direction === 'rtl' ? 'right' : 'left') : 'top']: 0,
                        [writingMode === 'horizontal-tb' ? 'top' : (direction === 'rtl' ? 'right' : 'left')]: 0,
                        [writingMode === 'horizontal-tb' ? 'height' : 'width']: '100%',
                        [writingMode === 'horizontal-tb' ? 'width' : 'height']: b.width,
                        backgroundColor: b.color,
                      }}
                    />
                  );
                }
                return null;
              })()}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ margin: 0 }}>{customText}</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            The preview container uses CSS{' '}
            <code className="text-brand-400">writing-mode: {writingMode}</code> and{' '}
            <code className="text-brand-400">direction: {direction}</code>. All spacing, sizing, borders, and text alignment are set with logical properties — they adapt automatically.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <p className="text-xs text-slate-400 mb-2 font-medium">Physical properties used by this container (none!):</p>
            <p className="text-xs text-emerald-400 font-mono">
              ✅ ZERO physical properties — margin, padding, border, size, inset, and text-align are all flow-relative. This layout works in any writing mode and direction without changes.
            </p>
          </div>
        </div>

        {/* ── Reference Table ───────────────────────────────────────────────── */}
        <details className="glass-card p-5 group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200 flex items-center gap-2 list-none">
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            Complete Logical Properties Reference
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                  <th className="pb-2 pr-3">Logical Property</th>
                  <th className="pb-2 pr-3">Physical (LTR, horizontal-tb)</th>
                  <th className="pb-2 pr-3 hidden sm:table-cell">Category</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {LOGICAL_PROPERTIES.map(lp => (
                  <tr key={lp.property} className="text-xs">
                    <td className="py-2 pr-3">
                      <code className="text-brand-300 bg-brand-950/20 px-1 py-0.5 rounded font-mono">
                        {lp.property}
                      </code>
                    </td>
                    <td className="py-2 pr-3">
                      <code className="text-slate-400 font-mono">{lp.physicalEquivalent}</code>
                    </td>
                    <td className="py-2 pr-3 hidden sm:table-cell text-slate-500">{lp.category}</td>
                    <td className="py-2 text-slate-400">{lp.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  CheckCircle2,
  XCircle,
  Search,
  Play,
  RotateCcw,
  Copy,
  Info,
  Globe,
  Monitor,
  Sparkles,
  Hash,
  Eye,
  Layers,
  Palette,
  Layout,
  Type,
  Grid3X3,
  PaintBucket,
  SlidersHorizontal,
  Maximize2,
  ArrowUpDown,
  Link,
  Image,
  Filter,
  GripHorizontal,
  MousePointer2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type TestResult = 'supported' | 'unsupported' | 'unknown';

interface FeatureTest {
  id: string;
  property: string;
  value: string;
  category: FeatureCategory;
}

interface FeatureResult extends FeatureTest {
  result: TestResult;
  condition: string;
}

type FeatureCategory =
  | 'layout'
  | 'color'
  | 'typography'
  | 'interaction'
  | 'media'
  | 'animation'
  | 'selectors'
  | 'other';

// ── Preset Features ────────────────────────────────────────────────────────

const PRESET_FEATURES: FeatureTest[] = [
  // Layout
  { id: 'grid', property: 'display', value: 'grid', category: 'layout' },
  { id: 'subgrid', property: 'grid-template-columns', value: 'subgrid', category: 'layout' },
  { id: 'flex-gap', property: 'gap', value: '1rem', category: 'layout' },
  { id: 'flexbox', property: 'display', value: 'flex', category: 'layout' },
  { id: 'grid-areas', property: 'grid-template-areas', value: '"a a" "b c"', category: 'layout' },
  { id: 'masonry', property: 'grid-template-rows', value: 'masonry', category: 'layout' },
  { id: 'container-queries', property: 'container-type', value: 'inline-size', category: 'layout' },
  { id: 'container-style-queries', property: 'color', value: 'style(--bg: red)', category: 'layout' },
  { id: 'multicol', property: 'column-count', value: '3', category: 'layout' },
  { id: 'subgrid-row', property: 'grid-template-rows', value: 'subgrid', category: 'layout' },

  // Color
  { id: 'oklch', property: 'color', value: 'oklch(0.7 0.2 180)', category: 'color' },
  { id: 'color-mix', property: 'background-color', value: 'color-mix(in srgb, red 50%, blue)', category: 'color' },
  { id: 'hwb', property: 'color', value: 'hwb(200 30% 10%)', category: 'color' },
  { id: 'lab', property: 'color', value: 'lab(70% -30 30)', category: 'color' },
  { id: 'lch', property: 'color', value: 'lch(70% 50 300)', category: 'color' },
  { id: 'light-dark', property: 'color', value: 'light-dark(#000, #fff)', category: 'color' },
  { id: 'color-function', property: 'background-color', value: 'color(display-p3 1 0.5 0)', category: 'color' },

  // Typography
  { id: 'text-wrap-balance', property: 'text-wrap', value: 'balance', category: 'typography' },
  { id: 'text-wrap-pretty', property: 'text-wrap', value: 'pretty', category: 'typography' },
  { id: 'initial-letter', property: 'initial-letter', value: '2', category: 'typography' },
  { id: 'font-palette', property: 'font-palette', value: 'dark', category: 'typography' },
  { id: 'font-variant-emoji', property: 'font-variant-emoji', value: 'emoji', category: 'typography' },
  { id: 'text-emphasis', property: 'text-emphasis', value: 'filled circle', category: 'typography' },
  { id: 'hyphenate-character', property: 'hyphenate-character', value: '"\\2010"', category: 'typography' },

  // Interaction
  { id: 'has-selector', property: 'color', value: 'has(> *)', category: 'selectors' },
  { id: 'has-not', property: 'color', value: 'has(:not(:empty))', category: 'selectors' },
  { id: 'popover', property: 'display', value: 'popover', category: 'interaction' },
  { id: 'anchor-positioning', property: 'position-anchor', value: '--target', category: 'interaction' },
  { id: 'field-sizing', property: 'field-sizing', value: 'content', category: 'interaction' },
  { id: 'caret-color', property: 'caret-color', value: 'auto', category: 'interaction' },
  { id: 'user-valid', property: 'color', value: ':user-valid', category: 'selectors' },

  // Media / Responsive
  { id: 'prefers-contrast', property: 'color', value: 'prefers-contrast(high)', category: 'media' },
  { id: 'prefers-reduced-data', property: 'color', value: 'prefers-reduced-data(reduce)', category: 'media' },
  { id: 'scripting', property: 'color', value: 'scripting(enabled)', category: 'media' },
  { id: 'dynamic-range', property: 'color', value: 'dynamic-range(high)', category: 'media' },

  // Animation
  { id: 'scroll-driven', property: 'animation-timeline', value: 'scroll()', category: 'animation' },
  { id: 'view-timeline', property: 'animation-timeline', value: 'view()', category: 'animation' },
  { id: 'view-transitions', property: 'view-transition-name', value: 'test', category: 'animation' },
  { id: 'starting-style', property: 'background-color', value: '@starting-style', category: 'animation' },
  { id: 'animation-composition', property: 'animation-composition', value: 'add', category: 'animation' },

  // Other
  { id: 'nesting', property: 'color', value: 'nest(&:hover) { color: red; }', category: 'other' },
  { id: 'cascade-layers', property: 'color', value: 'layer(test)', category: 'other' },
  { id: 'scope', property: 'color', value: 'scope(&)', category: 'other' },
  { id: 'accent-color', property: 'accent-color', value: 'auto', category: 'other' },
  { id: 'math-functions', property: 'width', value: 'round(up, 150px, 50px)', category: 'other' },
  { id: 'trig-functions', property: 'width', value: 'sin(45deg)', category: 'other' },
];

const CATEGORY_META: Record<FeatureCategory, { label: string; icon: typeof Layers }> = {
  layout: { label: 'Layout', icon: Layout },
  color: { label: 'Color', icon: Palette },
  typography: { label: 'Typography', icon: Type },
  interaction: { label: 'Interaction', icon: MousePointer2 },
  media: { label: 'Media', icon: Monitor },
  animation: { label: 'Animation', icon: Sparkles },
  selectors: { label: 'Selectors', icon: Hash },
  other: { label: 'Other', icon: Layers },
};

// ── Helpers ────────────────────────────────────────────────────────────────

interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  os: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CSSSupportsPlayground() {
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [customProperty, setCustomProperty] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [customResult, setCustomResult] = useState<TestResult>('unknown');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [testedFeatures, setTestedFeatures] = useState<Map<string, TestResult>>(new Map());
  const [showFullResults, setShowFullResults] = useState(true);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({ name: 'Unknown', version: '', engine: '', os: '' });

  // Detect browser info
  useEffect(() => {
    const ua = navigator.userAgent;
    let info: BrowserInfo = { name: 'Unknown', version: '', engine: '', os: '' };

    // Browser name
    if (ua.includes('Firefox/')) {
      info.name = 'Firefox';
      info.engine = 'Gecko';
      const m = ua.match(/Firefox\/(\d+)/);
      if (m) info.version = m[1];
    } else if (ua.includes('Edg/')) {
      info.name = 'Edge';
      info.engine = 'Blink';
      const m = ua.match(/Edg\/(\d+)/);
      if (m) info.version = m[1];
    } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
      info.name = 'Opera';
      info.engine = 'Blink';
      const m = ua.match(/OPR\/(\d+)/);
      if (m) info.version = m[1];
    } else if (ua.includes('Chrome/')) {
      info.name = 'Chrome';
      info.engine = 'Blink';
      const m = ua.match(/Chrome\/(\d+)/);
      if (m) info.version = m[1];
    } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      info.name = 'Safari';
      info.engine = 'WebKit';
      const m = ua.match(/Version\/(\d+)/);
      if (m) info.version = m[1];
    } else if (ua.includes('Trident/') || ua.includes('MSIE ')) {
      info.name = 'Internet Explorer';
      info.engine = 'Trident';
    }

    // OS
    if (ua.includes('Windows')) info.os = 'Windows';
    else if (ua.includes('Mac OS')) info.os = 'macOS';
    else if (ua.includes('Linux') && !ua.includes('Android')) info.os = 'Linux';
    else if (ua.includes('Android')) info.os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) info.os = 'iOS';

    setBrowserInfo(info);
  }, []);

  // Test a single feature
  const testFeature = useCallback((property: string, value: string): TestResult => {
    try {
      const condition = `(${property}: ${value})`;
      return CSS.supports(condition) ? 'supported' : 'unsupported';
    } catch {
      return 'unknown';
    }
  }, []);

  // Test a raw @supports condition
  const testCondition = useCallback((condition: string): TestResult => {
    try {
      return CSS.supports(condition) ? 'supported' : 'unsupported';
    } catch {
      return 'unknown';
    }
  }, []);

  // Run all preset tests
  const runAllTests = useCallback(() => {
    const results = new Map<string, TestResult>();
    for (const feature of PRESET_FEATURES) {
      results.set(feature.id, testFeature(feature.property, feature.value));
    }
    setTestedFeatures(results);
  }, [testFeature]);

  // Run custom test
  const runCustomTest = useCallback(() => {
    if (customProperty && customValue) {
      setCustomResult(testFeature(customProperty, customValue));
    } else if (customCondition) {
      setCustomResult(testCondition(customCondition));
    }
  }, [customProperty, customValue, customCondition, testFeature, testCondition]);

  // Auto-run on mount
  useEffect(() => {
    runAllTests();
  }, [runAllTests]);

  // Filter and search
  const filteredFeatures = useMemo(() => {
    let features = PRESET_FEATURES;
    if (selectedCategory !== 'all') {
      features = features.filter(f => f.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      features = features.filter(
        f => f.property.toLowerCase().includes(q) || f.value.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
      );
    }
    return features.map(f => ({
      ...f,
      result: testedFeatures.get(f.id) || 'unknown',
      condition: `(${f.property}: ${f.value})`,
    }));
  }, [selectedCategory, searchQuery, testedFeatures]);

  const stats = useMemo(() => {
    const total = testedFeatures.size;
    const supported = Array.from(testedFeatures.values()).filter(r => r === 'supported').length;
    const unsupported = Array.from(testedFeatures.values()).filter(r => r === 'unsupported').length;
    const unknown = Array.from(testedFeatures.values()).filter(r => r === 'unknown').length;
    return { total, supported, unsupported, unknown, pct: total > 0 ? Math.round((supported / total) * 100) : 0 };
  }, [testedFeatures]);

  // Copy results
  const copyResults = useCallback(() => {
    const lines: string[] = [
      `CSS @supports Results — ${browserInfo.name} ${browserInfo.version} on ${browserInfo.os}`,
      `Tested: ${new Date().toLocaleString()}`,
      '',
      `Summary: ${stats.supported}/${stats.total} supported (${stats.pct}%)`,
      '',
    ];

    for (const cat of Object.keys(CATEGORY_META) as FeatureCategory[]) {
      const catFeatures = PRESET_FEATURES.filter(f => f.category === cat);
      if (catFeatures.length === 0) continue;
      lines.push(`## ${CATEGORY_META[cat].label}`);
      for (const f of catFeatures) {
        const result = testedFeatures.get(f.id) || 'unknown';
        const icon = result === 'supported' ? '✅' : result === 'unsupported' ? '❌' : '❓';
        lines.push(`  ${icon} ${f.property}: ${f.value}`);
      }
      lines.push('');
    }

    navigator.clipboard.writeText(lines.join('\n')).then(
      () => toast.success('Results copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  }, [testedFeatures, stats, browserInfo]);

  return (
    <ToolLayout
      title="CSS @supports Playground"
      description="Test CSS feature support against your live browser using the CSS.supports() API. See exactly which features work in your current browser."
    >
      {/* Browser info banner */}
      <div className="mb-6 p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-400" />
            <span className="text-slate-200 font-semibold">{browserInfo.name} {browserInfo.version}</span>
          </div>
          <span className="text-slate-500">•</span>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">{browserInfo.os}</span>
          </div>
          <span className="text-slate-500">•</span>
          <span className="text-slate-500 text-sm">Engine: {browserInfo.engine}</span>
          <button
            onClick={runAllTests}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 text-sm hover:bg-brand-500/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rerun All
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 text-sm">{stats.supported}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-red-400 text-sm">{stats.unsupported}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-slate-400 text-sm">{stats.unknown}</span>
          </div>
          <span className="text-slate-300 text-sm font-semibold">
            {stats.pct}% supported
          </span>
          {/* Progress bar */}
          <div className="flex-1 min-w-[120px] h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <button
            onClick={copyResults}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy Results
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-lg bg-surface-light border border-slate-700/50">
        <button
          onClick={() => setMode('presets')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'presets' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Preset Features
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'custom' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-4 h-4" />
          Custom Test
        </button>
      </div>

      {/* Presets view */}
      {mode === 'presets' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === 'all' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                All
              </button>
              {(Object.keys(CATEGORY_META) as FeatureCategory[]).map(cat => {
                const CatIcon = CATEGORY_META[cat].icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      selectedCategory === cat ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <CatIcon className="w-3 h-3" />
                    {CATEGORY_META[cat].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature grid */}
          {filteredFeatures.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No features match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredFeatures.map(feature => (
                <div
                  key={feature.id}
                  className={`p-3 rounded-lg border transition-all ${
                    feature.result === 'supported'
                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
                      : feature.result === 'unsupported'
                      ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {feature.result === 'supported' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : feature.result === 'unsupported' ? (
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <code className="text-sm font-mono text-slate-200 block truncate">
                        {feature.property}: {feature.value}
                      </code>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {CATEGORY_META[feature.category].label}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-xs mt-2 font-medium ${
                      feature.result === 'supported'
                        ? 'text-emerald-400'
                        : feature.result === 'unsupported'
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {feature.result === 'supported'
                      ? 'Supported in this browser'
                      : feature.result === 'unsupported'
                      ? 'Not supported in this browser'
                      : 'Could not test'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Custom test view */}
      {mode === 'custom' && (
        <div className="space-y-6">
          {/* Property + Value test */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              Property + Value Test
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">CSS Property</label>
                <input
                  type="text"
                  value={customProperty}
                  onChange={e => setCustomProperty(e.target.value)}
                  placeholder="e.g., display"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Value</label>
                <input
                  type="text"
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  placeholder="e.g., grid"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={runCustomTest}
              disabled={!customProperty || !customValue}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Property
            </button>
          </div>

          {/* Condition test */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-brand-400" />
              Full @supports Condition
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Paste any @supports condition (without the @supports keyword)
              </label>
              <input
                type="text"
                value={customCondition}
                onChange={e => setCustomCondition(e.target.value)}
                placeholder='e.g., (display: grid) and (gap: 1rem) or selector(:has(&gt; *))'
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <button
              onClick={runCustomTest}
              disabled={!customCondition}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Condition
            </button>
          </div>

          {/* Result display */}
          {customResult !== 'unknown' && (
            <div
              className={`p-4 rounded-xl border ${
                customResult === 'supported'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {customResult === 'supported' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      customResult === 'supported' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {customResult === 'supported'
                      ? 'Supported in this browser'
                      : 'Not supported in this browser'}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {customProperty && customValue
                      ? `CSS.supports("(${customProperty}: ${customValue})")`
                      : customCondition
                      ? `CSS.supports("${customCondition}")`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick examples */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Example Conditions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Display Grid', condition: '(display: grid)',
                    description: 'CSS Grid Layout' },
                { label: 'Grid + Gap', condition: '(display: grid) and (gap: 1rem)',
                    description: 'Grid with gap support' },
                { label: 'Has Selector', condition: 'selector(:has(> *))',
                    description: 'Parent selector' },
                { label: 'Container Queries', condition: '(container-type: inline-size)',
                    description: 'Container query support' },
                { label: 'OKLCH', condition: '(color: oklch(0.7 0.2 180))',
                    description: 'Wide-gamut color' },
                { label: 'Color Mix', condition: '(background-color: color-mix(in srgb, red, blue))',
                    description: 'CSS Color Level 5' },
              ].map(ex => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setCustomCondition(ex.condition);
                    setTimeout(() => setCustomResult(testCondition(ex.condition)), 0);
                  }}
                  className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-500/50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-200">{ex.label}</span>
                  <code className="block text-xs text-slate-400 mt-1 font-mono">{ex.condition}</code>
                  <span className="text-xs text-slate-500 mt-0.5 block">{ex.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, List, ListOrdered, Type, Palette, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ListType = 'unordered' | 'ordered';
type MarkerContent = 'default' | 'custom';

interface Preset {
  name: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  content: string;
  listType: ListType;
  description: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Brand Blue',
    color: '#3b82f6',
    fontSize: '1em',
    fontWeight: 'bold',
    content: '',
    listType: 'unordered',
    description: 'Clean, bold blue bullets for brand consistency',
  },
  {
    name: 'Emoji Markers',
    color: 'inherit',
    fontSize: '1.3em',
    fontWeight: 'normal',
    content: '"✨"',
    listType: 'unordered',
    description: 'Replace default bullets with sparkle emojis',
  },
  {
    name: 'Numbered Gradient',
    color: '#8b5cf6',
    fontSize: '1.1em',
    fontWeight: 'bold',
    content: '',
    listType: 'ordered',
    description: 'Bold purple numbers for ordered lists',
  },
  {
    name: 'Checkmarks',
    color: '#22c55e',
    fontSize: '1.2em',
    fontWeight: 'bold',
    content: '"✓"',
    listType: 'unordered',
    description: 'Green checkmarks — perfect for todo lists',
  },
  {
    name: 'Roman Numerals',
    color: '#f59e0b',
    fontSize: '1em',
    fontWeight: '600',
    content: '',
    listType: 'ordered',
    description: 'Amber bold numbers on an ordered list',
  },
  {
    name: 'Arrows',
    color: '#06b6d4',
    fontSize: '1em',
    fontWeight: 'bold',
    content: '"→"',
    listType: 'unordered',
    description: 'Cyan arrow bullets for directional content',
  },
  {
    name: 'Minimal Gray',
    color: '#94a3b8',
    fontSize: '0.85em',
    fontWeight: 'normal',
    content: '',
    listType: 'unordered',
    description: 'Subtle gray bullets for minimal designs',
  },
  {
    name: 'Heart Bullets',
    color: '#ec4899',
    fontSize: '1.2em',
    fontWeight: 'normal',
    content: '"♥"',
    listType: 'unordered',
    description: 'Pink heart bullets for playful content',
  },
];

// ── Sample Items ───────────────────────────────────────────────────────────

const SAMPLE_UNORDERED = [
  'Design and prototype user interfaces',
  'Write clean, maintainable CSS',
  'Optimize for accessibility (WCAG AA)',
  'Test across browsers and devices',
  'Deploy and monitor performance',
];

const SAMPLE_ORDERED = [
  'Initialize the project repository',
  'Set up CI/CD pipeline and linting',
  'Implement core feature set',
  'Write unit and integration tests',
  'Deploy to staging for QA review',
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssMarkerPlayground() {
  const [listType, setListType] = useState<ListType>('unordered');
  const [markerColor, setMarkerColor] = useState('#3b82f6');
  const [markerFontSize, setMarkerFontSize] = useState('1em');
  const [markerFontWeight, setMarkerFontWeight] = useState('bold');
  const [markerContent, setMarkerContent] = useState('');
  const [useCustomContent, setUseCustomContent] = useState(false);
  const [bgColor, setBgColor] = useState('#1e293b');
  const [textColor, setTextColor] = useState('#e2e8f0');
  const [showInfo, setShowInfo] = useState(false);

  const items = useMemo(
    () => (listType === 'unordered' ? SAMPLE_UNORDERED : SAMPLE_ORDERED),
    [listType],
  );

  const cssCode = useMemo(() => {
    const lines: string[] = [];
    lines.push(`li::marker {`);
    lines.push(`  color: ${markerColor};`);
    lines.push(`  font-size: ${markerFontSize};`);
    lines.push(`  font-weight: ${markerFontWeight};`);
    if (useCustomContent && markerContent) {
      lines.push(`  content: ${markerContent};`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }, [markerColor, markerFontSize, markerFontWeight, markerContent, useCustomContent]);

  const fullCss = useMemo(() => {
    const typeStyle = listType === 'ordered'
      ? 'list-style-type: decimal;'
      : 'list-style-type: disc;';
    return `ul, ol {
  background: ${bgColor};
  color: ${textColor};
  padding: 1.5rem 1.5rem 1.5rem 2.5rem;
  border-radius: 0.75rem;
  ${typeStyle}
}

li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

li::marker {
  color: ${markerColor};
  font-size: ${markerFontSize};
  font-weight: ${markerFontWeight};
  ${useCustomContent && markerContent ? `content: ${markerContent};` : ''}
}`;
  }, [listType, markerColor, markerFontSize, markerFontWeight, markerContent, useCustomContent, bgColor, textColor]);

  const applyPreset = useCallback((preset: Preset) => {
    setMarkerColor(preset.color);
    setMarkerFontSize(preset.fontSize);
    setMarkerFontWeight(preset.fontWeight);
    setListType(preset.listType);
    if (preset.content) {
      setMarkerContent(preset.content);
      setUseCustomContent(true);
    } else {
      setMarkerContent('');
      setUseCustomContent(false);
    }
  }, []);

  const reset = useCallback(() => {
    setListType('unordered');
    setMarkerColor('#3b82f6');
    setMarkerFontSize('1em');
    setMarkerFontWeight('bold');
    setMarkerContent('');
    setUseCustomContent(false);
    setBgColor('#1e293b');
    setTextColor('#e2e8f0');
    toast.success('Reset to defaults');
  }, []);

  const copyCode = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${label} copied!`);
  }, []);

  const fontSizeOptions = ['0.75em', '0.85em', '1em', '1.1em', '1.2em', '1.35em', '1.5em', '1.75em', '2em'];
  const fontWeightOptions = ['normal', '500', '600', 'bold', '800', '900'];

  return (
    <ToolLayout
      title="CSS ::marker Playground"
      description="Customize list item bullets and numbers with the ::marker pseudo-element. Tweak colors, sizes, weights, and even replace markers with custom text or emojis — all with live preview."
    >
      {/* ── Presets ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Presets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/50 bg-surface-light hover:bg-slate-800/60 transition-colors text-left group"
              title={preset.description}
            >
              <span
                className="w-5 h-5 rounded flex-shrink-0 border border-slate-600 flex items-center justify-center text-xs"
                style={{
                  backgroundColor: preset.color === 'inherit' ? 'transparent' : preset.color,
                  color: '#fff',
                }}
              >
                {preset.listType === 'ordered' ? '1' : '•'}
              </span>
              <span className="text-xs text-slate-300 group-hover:text-white truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Controls */}
        <div className="space-y-5">
          {/* List type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <List className="w-4 h-4" />
              List Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setListType('unordered')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  listType === 'unordered'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <List className="w-4 h-4" />
                Unordered (ul)
              </button>
              <button
                onClick={() => setListType('ordered')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  listType === 'ordered'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                Ordered (ol)
              </button>
            </div>
          </div>

          {/* Marker color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Palette className="w-4 h-4" />
              Marker Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={markerColor}
                onChange={(e) => setMarkerColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={markerColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setMarkerColor(v);
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Font size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Type className="w-4 h-4" />
              Font Size
            </label>
            <div className="flex flex-wrap gap-2">
              {fontSizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => setMarkerFontSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    markerFontSize === size
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Font weight */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              Font Weight
            </label>
            <div className="flex flex-wrap gap-2">
              {fontWeightOptions.map((weight) => (
                <button
                  key={weight}
                  onClick={() => setMarkerFontWeight(weight)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    markerFontWeight === weight
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                  style={{ fontWeight: weight }}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>

          {/* Custom content */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              Custom Marker Content
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomContent}
                  onChange={(e) => setUseCustomContent(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-500/30"
                />
                Replace default marker with custom content
              </label>
              {useCustomContent && (
                <input
                  type="text"
                  value={markerContent}
                  onChange={(e) => setMarkerContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
                  placeholder='e.g. "→", "✓", "★", "Step " counter(step) "."'
                />
              )}
              {useCustomContent && (
                <p className="text-xs text-slate-500">
                  Tip: Wrap text in quotes for string values (e.g. &quot;✓&quot;). Use emojis or any Unicode character.
                </p>
              )}
            </div>
          </div>

          {/* Background & text color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              Container Colors
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Background</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
                  />
                  <div className="flex gap-1">
                    {['#ffffff', '#1e293b', '#0f172a', '#18181b'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-6 h-6 rounded border-2 transition-colors ${
                          bgColor === c ? 'border-brand-400' : 'border-slate-600 hover:border-slate-400'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Text</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
                  />
                  <div className="flex gap-1">
                    {['#e2e8f0', '#f8fafc', '#1e293b', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`w-6 h-6 rounded border-2 transition-colors ${
                          textColor === c ? 'border-brand-400' : 'border-slate-600 hover:border-slate-400'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Type className="w-4 h-4" />
            Live Preview
          </label>
          <div
            id="css-marker-preview"
            className="p-6 rounded-xl border border-slate-700 min-h-[320px]"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {listType === 'unordered' ? (
              <ul
                className="space-y-2 pl-0"
                style={{
                  listStyleType: useCustomContent ? 'none' : 'disc',
                  paddingLeft: '1.5rem',
                }}
              >
                {items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      color: textColor,
                      lineHeight: 1.6,
                      marginBottom: '0.5rem',
                      // ::marker simulation via custom properties for the marker
                    }}
                  >
                    <span
                      style={{
                        display: 'inline',
                        // We apply marker styles via a ::marker class simulation
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ol
                className="space-y-2 pl-0"
                style={{
                  listStyleType: 'decimal',
                  paddingLeft: '1.5rem',
                }}
              >
                {items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      color: textColor,
                      lineHeight: 1.6,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The preview above uses live CSS. Open your browser DevTools and inspect the{' '}
            <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">::marker</code> pseudo-element
            to see the styles in action.
          </p>
        </div>
      </div>

      {/* ── Dynamic Style Tag ────────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #css-marker-preview ul li::marker,
            #css-marker-preview ol li::marker {
              color: ${markerColor};
              font-size: ${markerFontSize};
              font-weight: ${markerFontWeight};
              ${useCustomContent && markerContent ? `content: ${markerContent};` : ''}
            }
          `,
        }}
      />

      {/* ── Code Output ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Generated Code
        </h2>

        {/* CSS */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">CSS (::marker only)</span>
            <button
              onClick={() => copyCode(cssCode, 'CSS')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 overflow-x-auto">
            <code>{cssCode}</code>
          </pre>
        </div>

        {/* Full CSS */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Full CSS (with container styles)</span>
            <button
              onClick={() => copyCode(fullCss, 'Full CSS')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 overflow-x-auto">
            <code>{fullCss}</code>
          </pre>
        </div>
      </section>

      {/* ── Info Section ──────────────────────────────────────────────── */}
      <section className="mt-10 p-4 rounded-xl bg-slate-900/60 border border-slate-700/30">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">::marker</code> is a
              CSS pseudo-element that targets the bullet or number portion of a list item.
              It&apos;s supported in all modern browsers (Chrome 86+, Firefox 68+, Safari 11.1+).
            </p>
            <p>
              Properties you can use on <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">::marker</code>:
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">color</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">font-size</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">font-weight</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">font-family</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">content</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">direction</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">unicode-bidi</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">text-combine-upright</code>,
              {' '}<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">animation</code>,
              {' '}and <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">transition</code> properties.
            </p>
            <p>
              For custom marker content: set <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">list-style-type: none</code>
              {' '}on the list and use <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">content</code> on
              {' '}<code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">::marker</code> to define
              your own string. Wrap text in quotes!
            </p>
          </div>
        </div>
      </section>
    </ToolLayout>
  );
}

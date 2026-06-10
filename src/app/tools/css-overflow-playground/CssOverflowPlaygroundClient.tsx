'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ChevronDown, Info, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type OverflowValue = 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';

interface Preset {
  name: string;
  description: string;
  overflowX: OverflowValue;
  overflowY: OverflowValue;
  clipMargin: number;
  content: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const OVERFLOW_VALUES: {
  value: OverflowValue;
  label: string;
  cssValue: string;
  icon: string;
  shortDesc: string;
}[] = [
  { value: 'visible', label: 'Visible', cssValue: 'visible', icon: '👁️', shortDesc: 'Content renders outside the box' },
  { value: 'hidden', label: 'Hidden', cssValue: 'hidden', icon: '🙈', shortDesc: 'Content is clipped, no scrollbars' },
  { value: 'clip', label: 'Clip', cssValue: 'clip', icon: '✂️', shortDesc: 'Like hidden but no programmatic scroll' },
  { value: 'scroll', label: 'Scroll', cssValue: 'scroll', icon: '📜', shortDesc: 'Always show scrollbars' },
  { value: 'auto', label: 'Auto', cssValue: 'auto', icon: '🔄', shortDesc: 'Scrollbars only when needed' },
];

const OVERFLOW_BEHAVIOR: Record<
  OverflowValue,
  { scrollable: boolean; showsScrollbar: boolean; clipContent: boolean; allowProgrammatic: boolean }
> = {
  visible: { scrollable: false, showsScrollbar: false, clipContent: false, allowProgrammatic: false },
  hidden: { scrollable: false, showsScrollbar: false, clipContent: true, allowProgrammatic: true },
  clip: { scrollable: false, showsScrollbar: false, clipContent: true, allowProgrammatic: false },
  scroll: { scrollable: true, showsScrollbar: true, clipContent: true, allowProgrammatic: true },
  auto: { scrollable: true, showsScrollbar: false, clipContent: true, allowProgrammatic: true },
};

const LONG_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`;

const BOX_MODEL_TEXT = `┌──────────────────────────────┐
│  margin (outside)              │
│  ┌──────────────────────────┐ │
│  │  border                     │ │
│  │  ┌──────────────────────┐ │ │
│  │  │  padding               │ │ │
│  │  │  ┌──────────────────┐ │ │ │
│  │  │  │  CONTENT AREA     │ │ │ │
│  │  │  │  This box is too   │ │ │ │
│  │  │  │  large for its     │ │ │ │
│  │  │  │  container!        │ │ │ │
│  │  │  └──────────────────┘ │ │ │
│  │  └──────────────────────┘ │ │
│  └──────────────────────────┘ │
└──────────────────────────────┘`;

const IMAGE_GALLERY_MOCK = `🖼️  Mountain Sunrise.jpg  ........  4.2 MB
🖼️  Beach Sunset.png       ........  2.8 MB
🖼️  City Skyline.webp      ........  1.5 MB
🖼️  Forest Path.avif       ........  3.1 MB
🖼️  Desert Dunes.jpeg      ........  5.7 MB
🖼️  Northern Lights.png    ........  6.3 MB
🖼️  Autumn Leaves.webp     ........  2.2 MB
🖼️  Snowy Peaks.avif       ........  4.9 MB
🖼️  Ocean Waves.jpeg       ........  3.6 MB
🖼️  Starry Night.png       ........  8.1 MB`;

const CODE_SNIPPET = `// A long code snippet that overflows horizontally
const response = await fetch('https://api.very-long-domain-name.example.com/v2/endpoints/widgets/configurations?include=metadata,timestamps,relations,permissions,audit_logs');

function calculateOptimalLayoutStrategy(containerWidth: number, itemCount: number, minItemWidth: number, maxItemWidth: number, gapSize: number, paddingHorizontal: number): LayoutStrategy {

  // This is a very long line that demonstrates horizontal overflow when using overflow-x: hidden or clip vs scroll vs auto
  const result = performComplexGridCalculation(containerWidth, itemCount, minItemWidth, maxItemWidth, gapSize, paddingHorizontal);

  return result;
}`;

const PRESETS: Preset[] = [
  {
    name: 'Text Overflow (auto)',
    description: 'overflow: auto — scrollbars appear only when content exceeds the container. The classic scrollable container pattern.',
    overflowX: 'auto',
    overflowY: 'auto',
    clipMargin: 0,
    content: LONG_TEXT,
  },
  {
    name: 'Truncate (hidden)',
    description: 'overflow: hidden — content is clipped cleanly. No scrollbars. Use with text-overflow: ellipsis for single-line truncation.',
    overflowX: 'hidden',
    overflowY: 'hidden',
    clipMargin: 0,
    content: LONG_TEXT,
  },
  {
    name: 'Horizontal Code Scroll',
    description: 'overflow-x: auto — scroll horizontally for long code lines, but hide vertical overflow. Perfect for code blocks.',
    overflowX: 'auto',
    overflowY: 'hidden',
    clipMargin: 0,
    content: CODE_SNIPPET,
  },
  {
    name: 'File List Scroll',
    description: 'overflow-y: auto — a scrollable file list with fixed height. Common in file managers and sidebars.',
    overflowX: 'hidden',
    overflowY: 'auto',
    clipMargin: 0,
    content: IMAGE_GALLERY_MOCK,
  },
  {
    name: 'Force Scrollbars',
    description: 'overflow: scroll — always shows scrollbars even if content fits. Useful for preventing layout shift.',
    overflowX: 'scroll',
    overflowY: 'scroll',
    clipMargin: 0,
    content: BOX_MODEL_TEXT,
  },
  {
    name: 'Clip (no scroll)',
    description: 'overflow: clip — content is clipped like hidden, but programmatic scrolling is blocked. Use with overflow-clip-margin to extend the clip edge.',
    overflowX: 'clip',
    overflowY: 'clip',
    clipMargin: 0,
    content: LONG_TEXT,
  },
  {
    name: 'Clip + Margin',
    description: 'overflow: clip with overflow-clip-margin: 20px — extends the clip boundary so content peeks out before being clipped.',
    overflowX: 'clip',
    overflowY: 'clip',
    clipMargin: 20,
    content: LONG_TEXT,
  },
  {
    name: 'Gallery with XY Scroll',
    description: 'overflow: scroll on both axes — a large image grid that scrolls in both directions. Used for map views, spreadsheets, artboards.',
    overflowX: 'scroll',
    overflowY: 'scroll',
    clipMargin: 0,
    content: IMAGE_GALLERY_MOCK + '\n\n' + CODE_SNIPPET,
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function BehaviorItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {active ? (
        <span className="w-4 h-4 flex items-center justify-center rounded bg-green-500/20 text-green-400 text-xs font-bold">
          ✓
        </span>
      ) : (
        <span className="w-4 h-4 flex items-center justify-center rounded bg-slate-700/50 text-slate-500 text-xs">
          ✗
        </span>
      )}
      <span className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function BehaviorTable({ value }: { value: OverflowValue }) {
  const b = OVERFLOW_BEHAVIOR[value];
  const rows = [
    { label: 'Content clipped', active: b.clipContent },
    { label: 'Scrollbars shown', active: b.showsScrollbar },
    { label: 'User can scroll', active: b.scrollable },
    { label: 'Programmatic scroll', active: b.allowProgrammatic },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <BehaviorItem key={row.label} label={row.label} active={row.active} />
      ))}
    </div>
  );
}

function AllValuesComparison() {
  const compareText = 'This text overflows its tiny container because it is intentionally longer than the box width.';

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        All Values at a Glance
      </h4>
      {OVERFLOW_VALUES.map((val) => (
        <div
          key={val.value}
          className="flex items-start gap-3 p-2 rounded border border-slate-800 bg-slate-900/30"
        >
          <span className="text-xs font-mono text-indigo-400 w-16 shrink-0 pt-0.5">
            {val.cssValue}
          </span>
          <div
            className="text-xs text-slate-300 leading-relaxed flex-1 max-h-10 overflow-hidden border border-slate-700/50 rounded"
            style={{
              overflowX: val.value as any,
              overflowY: 'hidden',
              overflowClipMargin: val.value === 'clip' ? '10px' : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            <span className="whitespace-nowrap px-1 py-0.5 block">{compareText}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function IndependentXYDemo({
  overflowX,
  overflowY,
  clipMargin,
  content,
  containerClasses,
}: {
  overflowX: OverflowValue;
  overflowY: OverflowValue;
  clipMargin: number;
  content: string;
  containerClasses?: string;
}) {
  return (
    <div
      className={containerClasses || 'bg-slate-800/80 rounded-lg border border-slate-700/50'}
      style={{
        overflowX,
        overflowY,
        overflowClipMargin: (overflowX === 'clip' || overflowY === 'clip') ? `${clipMargin}px` : undefined,
        maxHeight: 280,
        maxWidth: '100%',
      }}
    >
      <div className="min-w-[520px] p-4">
        <pre className="text-slate-200 text-[13px] leading-relaxed font-sans whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CssOverflowPlaygroundClient() {
  const [overflowX, setOverflowX] = useState<OverflowValue>('auto');
  const [overflowY, setOverflowY] = useState<OverflowValue>('auto');
  const [clipMargin, setClipMargin] = useState(0);
  const [linkAxes, setLinkAxes] = useState(true);
  const [showCss, setShowCss] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [showAllValues, setShowAllValues] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('Text Overflow (auto)');

  const handleOverflowXChange = useCallback(
    (val: OverflowValue) => {
      setOverflowX(val);
      if (linkAxes) setOverflowY(val);
    },
    [linkAxes],
  );

  const handleOverflowYChange = useCallback((val: OverflowValue) => {
    setOverflowY(val);
  }, []);

  const handlePreset = useCallback((preset: Preset) => {
    setOverflowX(preset.overflowX);
    setOverflowY(preset.overflowY);
    setClipMargin(preset.clipMargin);
    setSelectedPreset(preset.name);
    if (preset.overflowX !== preset.overflowY) setLinkAxes(false);
  }, []);

  const handleReset = useCallback(() => {
    setOverflowX('auto');
    setOverflowY('auto');
    setClipMargin(0);
    setLinkAxes(true);
    setSelectedPreset('Text Overflow (auto)');
  }, []);

  const cssCode = useMemo(() => {
    const lines: string[] = [];
    if (overflowX === overflowY) {
      lines.push(`overflow: ${overflowX};`);
    } else {
      lines.push(`overflow-x: ${overflowX};`);
      lines.push(`overflow-y: ${overflowY};`);
    }
    if ((overflowX === 'clip' || overflowY === 'clip') && clipMargin > 0) {
      lines.push(`overflow-clip-margin: ${clipMargin}px;`);
    }
    if (overflowX === 'hidden' || overflowY === 'hidden') {
      lines.push(`/* For single-line text truncation add: */`);
      lines.push(`/* text-overflow: ellipsis; white-space: nowrap; */`);
    }
    return lines.join('\n');
  }, [overflowX, overflowY, clipMargin]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const showClipMargin = overflowX === 'clip' || overflowY === 'clip';

  return (
    <ToolLayout
      title="CSS Overflow Playground"
      description="Visually explore all CSS overflow values — visible, hidden, clip, scroll, and auto. Control x and y axes independently, adjust overflow-clip-margin, and see exactly how each value behaves with live previews."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* X-axis selector */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                overflow-x
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {overflowX}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {OVERFLOW_VALUES.map((val) => (
                <button
                  key={val.value}
                  onClick={() => handleOverflowXChange(val.value)}
                  title={val.shortDesc}
                  className={`p-2 rounded-lg text-center transition-all ${
                    overflowX === val.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="text-lg leading-none mb-0.5">{val.icon}</div>
                  <div className="text-[10px] font-medium">{val.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Y-axis selector */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                overflow-y
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLinkAxes(!linkAxes)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-all ${
                    linkAxes
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Link axes
                </button>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {overflowY}
                </span>
              </div>
            </div>
            {!linkAxes && (
              <div className="grid grid-cols-5 gap-2">
                {OVERFLOW_VALUES.map((val) => (
                  <button
                    key={val.value}
                    onClick={() => handleOverflowYChange(val.value)}
                    title={val.shortDesc}
                    className={`p-2 rounded-lg text-center transition-all ${
                      overflowY === val.value
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-lg leading-none mb-0.5">{val.icon}</div>
                    <div className="text-[10px] font-medium">{val.label}</div>
                  </button>
                ))}
              </div>
            )}
            {linkAxes && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                overflow-y is linked to overflow-x. Toggle &ldquo;Link axes&rdquo; to set independently.
              </p>
            )}
          </div>

          {/* Behavior reference */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              How &ldquo;{overflowX}&rdquo; behaves
            </h3>
            <BehaviorTable value={overflowX} />
          </div>

          {/* Clip margin (only shown for clip) */}
          {showClipMargin && (
            <div className="card border-indigo-500/20 bg-indigo-500/5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                overflow-clip-margin: {clipMargin}px
              </h3>
              <input
                type="range"
                min={0}
                max={60}
                step={2}
                value={clipMargin}
                onChange={(e) => setClipMargin(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0px — tight</span>
                <span>60px — loose</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                overflow-clip-margin extends the clipping boundary so content can peek out before being clipped.
              </p>
            </div>
          )}

          {/* Presets */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Presets
            </h3>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPreset === preset.name
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-200">{preset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {preset.overflowX === preset.overflowY
                        ? preset.overflowX
                        : `x:${preset.overflowX} y:${preset.overflowY}`}
                    </span>
                    {preset.clipMargin > 0 && (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        clip-margin: {preset.clipMargin}px
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="card border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">
              About CSS Overflow
            </h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>
                <strong className="text-slate-300">visible</strong> — Default. Content renders outside the
                element&apos;s box. No clipping, no scroll mechanism.
              </li>
              <li>
                <strong className="text-slate-300">hidden</strong> — Content is clipped at the padding edge.
                No scrollbars, but programmatic scrolling works via scrollTop/scrollLeft.
              </li>
              <li>
                <strong className="text-slate-300">clip</strong> — Like hidden, but programmatic scrolling is
                also disabled. The element is not a scroll container at all. Use overflow-clip-margin to
                extend the clip boundary.
              </li>
              <li>
                <strong className="text-slate-300">scroll</strong> — Always shows scrollbars (even if content
                fits). Prevents layout shift when content changes.
              </li>
              <li>
                <strong className="text-slate-300">auto</strong> — Shows scrollbars only when content
                overflows. The most commonly used value for scrollable containers.
              </li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT: Preview + CSS ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Live preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Live Preview
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {overflowX === overflowY
                  ? `overflow: ${overflowX}`
                  : `x: ${overflowX} / y: ${overflowY}`}
                {showClipMargin && clipMargin > 0 ? ` + clip-margin: ${clipMargin}px` : ''}
              </span>
            </div>

            <IndependentXYDemo
              overflowX={overflowX}
              overflowY={overflowY}
              clipMargin={clipMargin}
              content={LONG_TEXT}
            />

            {/* Scroll indicators */}
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span
                className={`flex items-center gap-1 ${
                  overflowX === 'auto' || overflowX === 'scroll'
                    ? 'text-green-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    overflowX === 'auto' || overflowX === 'scroll' ? 'bg-green-400' : 'bg-slate-600'
                  }`}
                />
                Horizontal scroll: {overflowX === 'auto' || overflowX === 'scroll' ? 'active' : 'inactive'}
              </span>
              <span
                className={`flex items-center gap-1 ${
                  overflowY === 'auto' || overflowY === 'scroll'
                    ? 'text-green-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    overflowY === 'auto' || overflowY === 'scroll' ? 'bg-green-400' : 'bg-slate-600'
                  }`}
                />
                Vertical scroll: {overflowY === 'auto' || overflowY === 'scroll' ? 'active' : 'inactive'}
              </span>
            </div>

            {/* visual hint for clip vs hidden */}
            {(overflowX === 'hidden' || overflowX === 'clip' || overflowY === 'hidden' || overflowY === 'clip') && (
              <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Content beyond the container boundary is clipped and inaccessible.
                {overflowX === 'clip' || overflowY === 'clip'
                  ? ' With clip, even JavaScript can&apos;t scroll to the hidden content.'
                  : ' With hidden, JavaScript can still scroll programmatically.'}
              </div>
            )}
          </div>

          {/* Comparison preview: visual side-by-side */}
          <div className="card">
            <button
              onClick={() => setShowAllValues(!showAllValues)}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors w-full text-left"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showAllValues ? 'rotate-0' : '-rotate-90'}`}
              />
              All Values Compared
            </button>
            {showAllValues && (
              <div className="mt-3">
                <AllValuesComparison />
              </div>
            )}
          </div>

          {/* Independent XY demo with a shorter snippet */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Axis-Specific Preview — x:{overflowX} y:{overflowY}
            </h3>
            <IndependentXYDemo
              overflowX={overflowX}
              overflowY={overflowY}
              clipMargin={clipMargin}
              content={CODE_SNIPPET}
              containerClasses="bg-slate-800/80 rounded-lg border border-slate-700/50"
            />
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" />
              Long code lines test horizontal overflow. This content has a min-width of 520px — wider than the container.
            </p>
          </div>

          {/* CSS output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowCss(!showCss)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCss ? 'rotate-0' : '-rotate-90'}`}
                />
                Generated CSS
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="btn-secondary text-xs px-2 py-1">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </button>
                <button onClick={copyCss} className="btn-secondary text-xs px-2 py-1">
                  <Copy className="w-3 h-3 mr-1" />
                  Copy CSS
                </button>
              </div>
            </div>
            {showCss && (
              <pre className="bg-slate-950 rounded-lg p-4 text-sm font-mono text-slate-300 border border-slate-800 overflow-x-auto">
                <code>{cssCode}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

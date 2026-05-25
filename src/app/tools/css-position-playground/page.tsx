'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, MoveHorizontal, MoveVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

interface ParentConfig {
  width: number;
  height: number;
  padding: number;
  overflowEnabled: boolean;
}

interface ChildConfig {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  position: PositionValue;
  zIndex: number;
  opacity: number;
}

const POSITION_INFO: Record<PositionValue, { title: string; description: string; icon: string }> = {
  static: {
    title: 'Static',
    description: 'Default. Element flows normally in the document. top/right/bottom/left and z-index have no effect.',
    icon: '📄',
  },
  relative: {
    title: 'Relative',
    description: 'Positioned relative to its normal position. Offset with top/right/bottom/left. Other content still occupies the original space.',
    icon: '📌',
  },
  absolute: {
    title: 'Absolute',
    description: 'Removed from normal flow. Positioned relative to the nearest positioned ancestor (or initial containing block). No space reserved.',
    icon: '🎯',
  },
  fixed: {
    title: 'Fixed',
    description: 'Removed from normal flow. Positioned relative to the viewport. Stays in place during scrolling. No space reserved.',
    icon: '📍',
  },
  sticky: {
    title: 'Sticky',
    description: 'Hybrid of relative and fixed. Scrolls normally until it hits a threshold, then sticks. Requires a top/right/bottom/left value.',
    icon: '🧲',
  },
};

const POSITION_COLORS: Record<PositionValue, string> = {
  static: '#94a3b8',
  relative: '#38bdf8',
  absolute: '#f43f5e',
  fixed: '#22c55e',
  sticky: '#f59e0b',
};

const PRESETS = [
  {
    name: 'Default (Static)',
    child: { position: 'static' as PositionValue, top: 0, right: 0, bottom: 0, left: 0, zIndex: 0, width: 120, height: 80, opacity: 1 },
    parent: { width: 500, height: 350, padding: 24, overflowEnabled: true },
  },
  {
    name: 'Relative Offset',
    child: { position: 'relative' as PositionValue, top: 40, right: 0, bottom: 0, left: 60, zIndex: 5, width: 120, height: 80, opacity: 1 },
    parent: { width: 500, height: 350, padding: 24, overflowEnabled: true },
  },
  {
    name: 'Absolute Corner',
    child: { position: 'absolute' as PositionValue, top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, width: 100, height: 100, opacity: 0.9 },
    parent: { width: 500, height: 350, padding: 24, overflowEnabled: false },
  },
  {
    name: 'Fixed Badge',
    child: { position: 'fixed' as PositionValue, top: 16, right: 16, bottom: 0, left: 0, zIndex: 999, width: 60, height: 60, opacity: 0.95 },
    parent: { width: 500, height: 350, padding: 24, overflowEnabled: true },
  },
  {
    name: 'Sticky Header',
    child: { position: 'sticky' as PositionValue, top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, width: 120, height: 50, opacity: 1 },
    parent: { width: 500, height: 350, padding: 24, overflowEnabled: true },
  },
];

function generateCSS(child: ChildConfig, parent: ParentConfig): string {
  const parentLines = [
    '.parent {',
    `  width: ${parent.width}px;`,
    `  height: ${parent.height}px;`,
    `  padding: ${parent.padding}px;`,
  ];
  if (child.position === 'absolute' || child.position === 'sticky') {
    parentLines.push('  position: relative;');
  }
  if (parent.overflowEnabled) {
    parentLines.push('  overflow: auto;');
  }
  parentLines.push('}');

  const childLines = [
    '',
    '.child {',
    `  position: ${child.position};`,
    `  width: ${child.width}px;`,
    `  height: ${child.height}px;`,
  ];

  if (child.position !== 'static') {
    childLines.push(`  top: ${child.top}px;`);
    childLines.push(`  right: ${child.right}px;`);
    childLines.push(`  bottom: ${child.bottom}px;`);
    childLines.push(`  left: ${child.left}px;`);
    childLines.push(`  z-index: ${child.zIndex};`);
  }

  if (child.opacity < 1) {
    childLines.push(`  opacity: ${child.opacity};`);
  }

  childLines.push('}');

  return [...parentLines, ...childLines].join('\n');
}

export default function CssPositionPlaygroundPage() {
  const [child, setChild] = useState<ChildConfig>({
    position: 'relative',
    top: 40,
    right: 0,
    bottom: 0,
    left: 60,
    zIndex: 5,
    width: 120,
    height: 80,
    opacity: 1,
  });

  const [parent, setParent] = useState<ParentConfig>({
    width: 500,
    height: 350,
    padding: 24,
    overflowEnabled: true,
  });

  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setChild({ ...preset.child });
    setParent({ ...preset.parent });
  }, []);

  const reset = useCallback(() => {
    setChild({
      position: 'static',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 0,
      width: 120,
      height: 80,
      opacity: 1,
    });
    setParent({
      width: 500,
      height: 350,
      padding: 24,
      overflowEnabled: true,
    });
  }, []);

  const updateChild = useCallback(
    <K extends keyof ChildConfig>(key: K, value: ChildConfig[K]) => {
      setChild((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateParent = useCallback(
    <K extends keyof ParentConfig>(key: K, value: ParentConfig[K]) => {
      setParent((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const cssOutput = useMemo(() => generateCSS(child, parent), [child, parent]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => {
        setCopiedLabel('CSS');
        setTimeout(() => setCopiedLabel(null), 1500);
        toast.success('CSS copied!');
      },
      () => toast.error('Failed to copy'),
    );
  }, [cssOutput]);

  const info = POSITION_INFO[child.position];
  const color = POSITION_COLORS[child.position];

  const childStyle: React.CSSProperties = {
    position: child.position as React.CSSProperties['position'],
    width: child.width,
    height: child.height,
    backgroundColor: color,
    zIndex: child.zIndex,
    opacity: child.opacity,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontWeight: 600,
    fontSize: 13,
    color: '#0f172a',
    boxShadow: '0 4px 12px ' + color + '40',
    border: '2px solid ' + color,
    cursor: 'default',
    userSelect: 'none',
  };

  if (child.position !== 'static') {
    childStyle.top = child.top;
    childStyle.right = child.right;
    childStyle.bottom = child.bottom;
    childStyle.left = child.left;
  }

  const parentStyle: React.CSSProperties = {
    width: parent.width,
    height: parent.height,
    padding: parent.padding,
    overflow: parent.overflowEnabled ? 'auto' : 'visible',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    border: '2px dashed #475569',
    position: (child.position === 'absolute' || child.position === 'sticky') ? 'relative' : 'static',
    transition: 'all 0.3s ease',
  };

  return (
    <ToolLayout
      title="CSS Position Playground"
      description="Visually experiment with CSS position values — static, relative, absolute, fixed, and sticky. See how each one behaves in real-time with interactive controls."
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Controls */}
        <div className="xl:col-span-1 space-y-4">
          {/* Position selector */}
          <div className="card">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Position Value
            </h3>
            <div className="space-y-1.5">
              {(Object.keys(POSITION_INFO) as PositionValue[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateChild('position', pos)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
                    child.position === pos
                      ? 'bg-brand-500/15 text-white border border-brand-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface border border-transparent'
                  }`}
                >
                  <span className="text-base">{POSITION_INFO[pos].icon}</span>
                  <div>
                    <div className="font-medium">{pos.charAt(0).toUpperCase() + pos.slice(1)}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {POSITION_INFO[pos].description.slice(0, 60)}...
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Offset controls */}
          {child.position !== 'static' && (
            <div className="card">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Offsets (px)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <ArrowUp className="w-3 h-3" /> Top
                  </label>
                  <input
                    type="number"
                    value={child.top}
                    onChange={(e) => updateChild('top', Number(e.target.value))}
                    className="input-field w-full text-center text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <ArrowDown className="w-3 h-3" /> Bottom
                  </label>
                  <input
                    type="number"
                    value={child.bottom}
                    onChange={(e) => updateChild('bottom', Number(e.target.value))}
                    className="input-field w-full text-center text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <ArrowLeft className="w-3 h-3" /> Left
                  </label>
                  <input
                    type="number"
                    value={child.left}
                    onChange={(e) => updateChild('left', Number(e.target.value))}
                    className="input-field w-full text-center text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                    <ArrowRight className="w-3 h-3" /> Right
                  </label>
                  <input
                    type="number"
                    value={child.right}
                    onChange={(e) => updateChild('right', Number(e.target.value))}
                    className="input-field w-full text-center text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div className="card">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Element Size
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                  <MoveHorizontal className="w-3 h-3" /> Width
                </label>
                <input
                  type="number"
                  min={20}
                  max={400}
                  value={child.width}
                  onChange={(e) => updateChild('width', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                  <MoveVertical className="w-3 h-3" /> Height
                </label>
                <input
                  type="number"
                  min={20}
                  max={400}
                  value={child.height}
                  onChange={(e) => updateChild('height', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Z-Index</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={child.zIndex}
                  onChange={(e) => updateChild('zIndex', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Opacity</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={child.opacity}
                  onChange={(e) => updateChild('opacity', Number(e.target.value))}
                  className="w-full mt-1 accent-brand-500"
                />
                <div className="text-center text-[10px] text-slate-500">{Math.round(child.opacity * 100)}%</div>
              </div>
            </div>
          </div>

          {/* Parent container config */}
          <div className="card">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Parent Container
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Width</label>
                <input
                  type="number"
                  min={200}
                  max={800}
                  step={10}
                  value={parent.width}
                  onChange={(e) => updateParent('width', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Height</label>
                <input
                  type="number"
                  min={150}
                  max={600}
                  step={10}
                  value={parent.height}
                  onChange={(e) => updateParent('height', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Padding</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={parent.padding}
                  onChange={(e) => updateParent('padding', Number(e.target.value))}
                  className="input-field w-full text-center text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parent.overflowEnabled}
                    onChange={(e) => updateParent('overflowEnabled', e.target.checked)}
                    className="rounded bg-surface border-slate-600 accent-brand-500"
                  />
                  <span className="text-xs text-slate-400">Overflow: auto</span>
                </label>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="card">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Presets
            </h3>
            <div className="space-y-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-surface border border-transparent hover:border-slate-600/50 transition-all"
                >
                  {preset.name}
                </button>
              ))}
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all mt-2"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview + Output */}
        <div className="xl:col-span-2 space-y-6">
          {/* Info banner */}
          <div className="card" style={{ borderLeft: '4px solid ' + color }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{info.icon}</span>
              <div>
                <h3 className="text-white font-semibold text-sm">{info.title} Positioning</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{info.description}</p>
              </div>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
                Visual Preview
              </h3>
              <div className="text-[10px] text-slate-500 font-mono">
                Parent: {parent.width}×{parent.height}px
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto pb-2">
              <div style={parentStyle} className="relative">
                {child.position === 'relative' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: parent.padding,
                      left: parent.padding,
                      width: child.width,
                      height: child.height,
                      border: '2px dashed #64748b',
                      borderRadius: 8,
                      opacity: 0.4,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={childStyle}>
                  {child.position}
                </div>
                {parent.overflowEnabled && child.position === 'sticky' && (
                  <>
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 36,
                          margin: '3px 0',
                          backgroundColor: '#334155',
                          borderRadius: 4,
                          opacity: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 12,
                          fontSize: 11,
                          color: '#64748b',
                        }}
                      >
                        Content row {i + 1}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-500" />
                Parent border
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed opacity-40" style={{ borderColor: '#64748b' }} />
                Original position (relative)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
                Positioned element
              </div>
            </div>
          </div>

          {/* Generated CSS */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
                Generated CSS
              </h3>
              <button
                onClick={copyCSS}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${
                  copiedLabel === 'CSS'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLabel === 'CSS' ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 overflow-x-auto">
              <code className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">
                {cssOutput}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

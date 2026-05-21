'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Minus, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface FlexItem {
  id: number;
  label: string;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: string;
  order: number;
  color: string;
}

const ITEM_COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#0ea5e9',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
  '#84cc16', '#06b6d4',
];

const DIRECTION_OPTIONS = ['row', 'row-reverse', 'column', 'column-reverse'] as const;
const WRAP_OPTIONS = ['nowrap', 'wrap', 'wrap-reverse'] as const;
const JUSTIFY_OPTIONS = [
  'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
] as const;
const ALIGN_OPTIONS = ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'] as const;
const ALIGN_CONTENT_OPTIONS = [
  'stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around',
] as const;
const ALIGN_SELF_OPTIONS = ['auto', 'stretch', 'flex-start', 'flex-end', 'center', 'baseline'] as const;

function createItem(id: number): FlexItem {
  return {
    id,
    label: String(id),
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    alignSelf: 'auto',
    order: 0,
    color: ITEM_COLORS[(id - 1) % ITEM_COLORS.length],
  };
}

function generateCSS(
  direction: string,
  wrap: string,
  justify: string,
  alignItems: string,
  alignContent: string,
  gap: number,
  items: FlexItem[],
): string {
  const lines: string[] = [
    '.flex-container {',
    '  display: flex;',
    `  flex-direction: ${direction};`,
    `  flex-wrap: ${wrap};`,
    `  justify-content: ${justify};`,
    `  align-items: ${alignItems};`,
  ];
  if (wrap !== 'nowrap') {
    lines.push(`  align-content: ${alignContent};`);
  }
  if (gap > 0) {
    lines.push(`  gap: ${gap}px;`);
  }
  lines.push('}');

  const hasItemStyles = items.some(
    (item) =>
      item.flexGrow !== 0 ||
      item.flexShrink !== 1 ||
      item.flexBasis !== 'auto' ||
      item.alignSelf !== 'auto' ||
      item.order !== 0,
  );

  if (hasItemStyles) {
    lines.push('');
    items.forEach((item) => {
      const itemLines: string[] = [];
      let shorthand = '';
      if (item.flexGrow !== 0 || item.flexShrink !== 1 || item.flexBasis !== 'auto') {
        shorthand = `flex: ${item.flexGrow} ${item.flexShrink} ${item.flexBasis};`;
      }
      if (shorthand || item.alignSelf !== 'auto' || item.order !== 0) {
        itemLines.push(`.flex-item:nth-child(${item.id}) {`);
        if (shorthand) itemLines.push(`  ${shorthand}`);
        if (item.alignSelf !== 'auto') itemLines.push(`  align-self: ${item.alignSelf};`);
        if (item.order !== 0) itemLines.push(`  order: ${item.order};`);
        itemLines.push('}');
        lines.push(itemLines.join('\n'));
      }
    });
  }

  return lines.join('\n');
}

export default function FlexboxPlaygroundPage() {
  const [direction, setDirection] = useState<string>('row');
  const [wrap, setWrap] = useState<string>('nowrap');
  const [justify, setJustify] = useState<string>('flex-start');
  const [alignItems, setAlignItems] = useState<string>('stretch');
  const [alignContent, setAlignContent] = useState<string>('stretch');
  const [gap, setGap] = useState(16);
  const [items, setItems] = useState<FlexItem[]>([
    createItem(1),
    createItem(2),
    createItem(3),
    createItem(4),
    createItem(5),
  ]);
  const [nextId, setNextId] = useState(6);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [showItems, setShowItems] = useState(false);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createItem(nextId)]);
    setNextId((n) => n + 1);
  }, [nextId]);

  const removeItem = useCallback(
    (id: number) => {
      if (items.length <= 1) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem === id) setSelectedItem(null);
    },
    [items.length, selectedItem],
  );

  const updateItem = useCallback(
    (id: number, field: keyof FlexItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const resetAll = useCallback(() => {
    setDirection('row');
    setWrap('nowrap');
    setJustify('flex-start');
    setAlignItems('stretch');
    setAlignContent('stretch');
    setGap(16);
    const fresh = [createItem(1), createItem(2), createItem(3), createItem(4), createItem(5)];
    setItems(fresh);
    setNextId(6);
    setSelectedItem(null);
    toast.success('Playground reset');
  }, []);

  const cssOutput = useMemo(
    () => generateCSS(direction, wrap, justify, alignItems, alignContent, gap, items),
    [direction, wrap, justify, alignItems, alignContent, gap, items],
  );

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cssOutput]);

  const selectedItemData = selectedItem ? items.find((i) => i.id === selectedItem) : null;

  return (
    <ToolLayout
      title="CSS Flexbox Playground"
      description="Visually build and test CSS Flexbox layouts. Adjust container and item properties in real-time and copy the generated CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls — left sidebar on large screens */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          {/* Container Controls */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">
              Container
            </h3>

            {/* flex-direction */}
            <div className="mb-4">
              <label className="text-slate-400 text-xs mb-1.5 block">flex-direction</label>
              <div className="flex flex-wrap gap-1">
                {DIRECTION_OPTIONS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setDirection(val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                      direction === val
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* flex-wrap */}
            <div className="mb-4">
              <label className="text-slate-400 text-xs mb-1.5 block">flex-wrap</label>
              <div className="flex flex-wrap gap-1">
                {WRAP_OPTIONS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setWrap(val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                      wrap === val
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* justify-content */}
            <div className="mb-4">
              <label className="text-slate-400 text-xs mb-1.5 block">justify-content</label>
              <div className="flex flex-wrap gap-1">
                {JUSTIFY_OPTIONS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setJustify(val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                      justify === val
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* align-items */}
            <div className="mb-4">
              <label className="text-slate-400 text-xs mb-1.5 block">align-items</label>
              <div className="flex flex-wrap gap-1">
                {ALIGN_OPTIONS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setAlignItems(val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                      alignItems === val
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* align-content (only when wrapping) */}
            {wrap !== 'nowrap' && (
              <div className="mb-4">
                <label className="text-slate-400 text-xs mb-1.5 block">align-content</label>
                <div className="flex flex-wrap gap-1">
                  {ALIGN_CONTENT_OPTIONS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setAlignContent(val)}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                        alignContent === val
                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                          : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* gap */}
            <div className="mb-3">
              <label className="text-slate-400 text-xs mb-1.5 flex items-center justify-between">
                <span>gap</span>
                <span className="font-mono text-brand-300">{gap}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={4}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* Item Controls */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
                Items
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={addItem}
                  className="text-slate-400 hover:text-brand-400 transition-colors p-1"
                  title="Add item"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowItems(!showItems)}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-xs"
                >
                  {showItems ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Item list (compact) */}
            <div className="space-y-1.5 mb-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
                    selectedItem === item.id
                      ? 'bg-brand-500/10 border border-brand-500/20'
                      : 'bg-surface border border-transparent hover:border-slate-700/50'
                  }`}
                  onClick={() => setSelectedItem(item.id)}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-300 font-mono flex-1 truncate">
                    Item {item.label}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                      title="Remove item"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Item detail editor */}
            {selectedItemData && showItems && (
              <div className="border-t border-slate-700/50 pt-3 mt-3 space-y-3">
                <p className="text-xs text-brand-400 font-semibold">
                  Editing Item {selectedItemData.label}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-0.5">flex-grow</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={selectedItemData.flexGrow}
                      onChange={(e) =>
                        updateItem(selectedItemData.id, 'flexGrow', Number(e.target.value))
                      }
                      className="input-field w-full py-1 px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-0.5">flex-shrink</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={selectedItemData.flexShrink}
                      onChange={(e) =>
                        updateItem(selectedItemData.id, 'flexShrink', Number(e.target.value))
                      }
                      className="input-field w-full py-1 px-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">flex-basis</label>
                  <div className="flex gap-1">
                    {['auto', '0', '100px', '150px', '200px', '50%'].map((val) => (
                      <button
                        key={val}
                        onClick={() => updateItem(selectedItemData.id, 'flexBasis', val)}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                          selectedItemData.flexBasis === val
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                            : 'bg-surface text-slate-500 border border-slate-700/30 hover:text-slate-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">align-self</label>
                  <div className="flex flex-wrap gap-1">
                    {ALIGN_SELF_OPTIONS.map((val) => (
                      <button
                        key={val}
                        onClick={() => updateItem(selectedItemData.id, 'alignSelf', val)}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                          selectedItemData.alignSelf === val
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                            : 'bg-surface text-slate-500 border border-slate-700/30 hover:text-slate-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block mb-0.5">order</label>
                  <input
                    type="number"
                    min={-10}
                    max={10}
                    value={selectedItemData.order}
                    onChange={(e) =>
                      updateItem(selectedItemData.id, 'order', Number(e.target.value))
                    }
                    className="input-field w-full py-1 px-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 bg-surface-light hover:bg-slate-700 border border-slate-700/50 rounded-lg py-2 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Preview + CSS — right side */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* Live Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
                Live Preview
              </h3>
              <span className="text-slate-500 text-xs">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div
              className="bg-surface rounded-lg border-2 border-dashed border-slate-600/50 min-h-[280px] p-2 transition-all duration-200"
              style={{
                display: 'flex',
                flexDirection: direction as any,
                flexWrap: wrap as any,
                justifyContent: justify as any,
                alignItems: alignItems as any,
                alignContent: alignContent as any,
                gap: `${gap}px`,
              }}
            >
              {[...items]
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg flex items-center justify-center text-white font-semibold text-sm cursor-pointer transition-all duration-200 min-w-[48px] min-h-[48px] border-2 border-transparent hover:border-white/30"
                    style={{
                      backgroundColor: item.color,
                      flexGrow: item.flexGrow,
                      flexShrink: item.flexShrink,
                      flexBasis: item.flexBasis === 'auto' ? 'auto' : item.flexBasis,
                      alignSelf: item.alignSelf === 'auto' ? undefined : item.alignSelf,
                      padding: '12px 20px',
                    }}
                    onClick={() => setSelectedItem(item.id)}
                    title={`Item ${item.label}${selectedItem === item.id ? ' (selected)' : ''}`}
                  >
                    {item.label}
                  </div>
                ))}
            </div>
            {/* Axis labels */}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Main Axis</span>
                <svg width="32" height="12" viewBox="0 0 32 12" className="flex-shrink-0">
                  <line x1="2" y1="6" x2="30" y2="6" stroke="#38bdf8" strokeWidth="2" />
                  <polygon points="30,3 30,9 34,6" fill="#38bdf8" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cross Axis</span>
                <svg width="12" height="32" viewBox="0 0 12 32" className="flex-shrink-0">
                  <line x1="6" y1="30" x2="6" y2="2" stroke="#f472b6" strokeWidth="2" />
                  <polygon points="3,2 9,2 6,-2" fill="#f472b6" />
                </svg>
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
                className="flex items-center gap-1.5 text-slate-400 hover:text-brand-400 transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 overflow-y-auto">
              <code>{cssOutput}</code>
            </pre>
          </div>

          {/* Quick Presets */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Quick Presets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: 'Center',
                  config: {
                    direction: 'row', wrap: 'nowrap', justify: 'center', alignItems: 'center',
                    alignContent: 'stretch', gap: 16,
                  },
                },
                {
                  label: 'Space Between',
                  config: {
                    direction: 'row', wrap: 'nowrap', justify: 'space-between', alignItems: 'center',
                    alignContent: 'stretch', gap: 16,
                  },
                },
                {
                  label: 'Column',
                  config: {
                    direction: 'column', wrap: 'nowrap', justify: 'flex-start', alignItems: 'stretch',
                    alignContent: 'stretch', gap: 12,
                  },
                },
                {
                  label: 'Wrap Rows',
                  config: {
                    direction: 'row', wrap: 'wrap', justify: 'flex-start', alignItems: 'flex-start',
                    alignContent: 'flex-start', gap: 8,
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setDirection(preset.config.direction);
                    setWrap(preset.config.wrap);
                    setJustify(preset.config.justify);
                    setAlignItems(preset.config.alignItems);
                    setAlignContent(preset.config.alignContent);
                    setGap(preset.config.gap);
                    const fresh = [
                      createItem(1), createItem(2), createItem(3),
                      createItem(4), createItem(5),
                    ];
                    setItems(fresh);
                    setNextId(6);
                    setSelectedItem(null);
                    toast.success(`Applied "${preset.label}" preset`);
                  }}
                  className="bg-surface hover:bg-surface-lighter border border-slate-700/50 hover:border-brand-500/20 rounded-lg py-2 px-3 text-xs text-slate-300 transition-colors text-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

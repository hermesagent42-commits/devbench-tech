'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, Square, Plus, Minus, Trash2, Copy, Clock, Maximize2, Ruler, Eye, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

type BoxSizingMode = 'content-box' | 'border-box' | 'device-pixel-content-box';

interface ObservedBox {
  id: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

interface ResizeEntry {
  id: number;
  time: string;
  boxId: number;
  contentRect: { width: number; height: number; top: number; left: number };
  borderBoxSize: { inlineSize: number; blockSize: number }[];
  contentBoxSize: { inlineSize: number; blockSize: number }[];
  devicePixelContentBoxSize: { inlineSize: number; blockSize: number }[];
}

const BOX_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];

const PRESETS: { label: string; boxes: { width: number; height: number; label: string }[] }[] = [
  {
    label: 'Card Grid (3 col)',
    boxes: [
      { width: 200, height: 160, label: 'Card A' },
      { width: 200, height: 160, label: 'Card B' },
      { width: 200, height: 160, label: 'Card C' },
    ],
  },
  {
    label: 'Sidebar + Content',
    boxes: [
      { width: 220, height: 300, label: 'Sidebar' },
      { width: 460, height: 300, label: 'Main Content' },
    ],
  },
  {
    label: 'Dashboard Widgets',
    boxes: [
      { width: 280, height: 140, label: 'Stats' },
      { width: 180, height: 140, label: 'Chart' },
      { width: 180, height: 140, label: 'Activity' },
      { width: 180, height: 140, label: 'Alerts' },
    ],
  },
  {
    label: 'Single Hero',
    boxes: [{ width: 500, height: 240, label: 'Hero Banner' }],
  },
];

let nextId = 1;
function createBox(overrides: Partial<ObservedBox> = {}): ObservedBox {
  return {
    id: nextId++,
    width: 250,
    height: 180,
    color: BOX_COLORS[(nextId - 1) % BOX_COLORS.length],
    label: `Box ${nextId}`,
    ...overrides,
  };
}

function formatSize(size: { inlineSize: number; blockSize: number } | undefined): string {
  if (!size) return '—';
  return `${size.inlineSize.toFixed(0)} × ${size.blockSize.toFixed(0)}`;
}

export default function ResizeObserverPlaygroundPage() {
  const [boxes, setBoxes] = useState<ObservedBox[]>(() => [
    createBox({ label: 'Box 1', width: 250, height: 180, color: BOX_COLORS[0] }),
    createBox({ label: 'Box 2', width: 250, height: 180, color: BOX_COLORS[1] }),
  ]);
  const [observing, setObserving] = useState(false);
  const [entries, setEntries] = useState<ResizeEntry[]>([]);
  const [boxSizing, setBoxSizing] = useState<BoxSizingMode>('content-box');
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const observerRef = useRef<ResizeObserver | null>(null);
  const boxRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const startObserving = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    const obs = new ResizeObserver((observedEntries) => {
      if (paused) return;

      const now = new Date().toLocaleTimeString();
      const newEntries: ResizeEntry[] = observedEntries.map((entry) => {
        const boxId = Number((entry.target as HTMLElement).dataset.boxId);
        return {
          id: Date.now() + Math.random(),
          time: now,
          boxId,
          contentRect: {
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
            top: Math.round(entry.contentRect.top),
            left: Math.round(entry.contentRect.left),
          },
          borderBoxSize: Array.from(entry.borderBoxSize).map((s) => ({
            inlineSize: Math.round(s.inlineSize),
            blockSize: Math.round(s.blockSize),
          })),
          contentBoxSize: Array.from(entry.contentBoxSize).map((s) => ({
            inlineSize: Math.round(s.inlineSize),
            blockSize: Math.round(s.blockSize),
          })),
          devicePixelContentBoxSize: Array.from(entry.devicePixelContentBoxSize).map((s) => ({
            inlineSize: Math.round(s.inlineSize),
            blockSize: Math.round(s.blockSize),
          })),
        };
      });

      setEntries((prev) => [...newEntries, ...prev].slice(0, 200));
    });

    boxRefs.current.forEach((el) => obs.observe(el, { box: boxSizing }));
    observerRef.current = obs;
    setObserving(true);
  }, [boxSizing, paused]);

  const stopObserving = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    setObserving(false);
  }, []);

  useEffect(() => {
    if (observing) {
      observerRef.current?.disconnect();
      const obs = new ResizeObserver((observedEntries) => {
        if (paused) return;
        const now = new Date().toLocaleTimeString();
        const newEntries: ResizeEntry[] = observedEntries.map((entry) => {
          const boxId = Number((entry.target as HTMLElement).dataset.boxId);
          return {
            id: Date.now() + Math.random(),
            time: now,
            boxId,
            contentRect: {
              width: Math.round(entry.contentRect.width),
              height: Math.round(entry.contentRect.height),
              top: Math.round(entry.contentRect.top),
              left: Math.round(entry.contentRect.left),
            },
            borderBoxSize: Array.from(entry.borderBoxSize).map((s) => ({
              inlineSize: Math.round(s.inlineSize),
              blockSize: Math.round(s.blockSize),
            })),
            contentBoxSize: Array.from(entry.contentBoxSize).map((s) => ({
              inlineSize: Math.round(s.inlineSize),
              blockSize: Math.round(s.blockSize),
            })),
            devicePixelContentBoxSize: Array.from(entry.devicePixelContentBoxSize).map((s) => ({
              inlineSize: Math.round(s.inlineSize),
              blockSize: Math.round(s.blockSize),
            })),
          };
        });
        setEntries((prev) => [...newEntries, ...prev].slice(0, 200));
      });
      boxRefs.current.forEach((el) => obs.observe(el, { box: boxSizing }));
      observerRef.current = obs;
    }
    return () => {
      observerRef.current?.disconnect();
    };
  }, [boxSizing, observing, paused]);

  const addBox = useCallback(() => {
    const newBox = createBox();
    setBoxes((prev) => [...prev, newBox]);
  }, []);

  const removeBox = useCallback((id: number) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    setEntries((prev) => prev.filter((e) => e.boxId !== id));
    if (selectedBox === id) setSelectedBox(null);
  }, [selectedBox]);

  const updateBoxSize = useCallback((id: number, field: 'width' | 'height', value: number) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: Math.max(60, Math.min(800, value)) } : b)));
  }, []);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setEntries([]);
    const newBoxes = preset.boxes.map((b, i) => createBox({ ...b, color: BOX_COLORS[i % BOX_COLORS.length] }));
    setBoxes(newBoxes);
  }, []);

  const selectedEntries = useMemo(() => {
    if (!selectedBox) return entries;
    return entries.filter((e) => e.boxId === selectedBox);
  }, [entries, selectedBox]);

  const boxSizingOptions: { value: BoxSizingMode; label: string; desc: string }[] = [
    { value: 'content-box', label: 'content-box', desc: 'Content area only (default)' },
    { value: 'border-box', label: 'border-box', desc: 'Content + padding + border' },
    { value: 'device-pixel-content-box', label: 'device-pixel-content-box', desc: 'Physical pixels (HiDPI)' },
  ];

  return (
    <ToolLayout
      title="ResizeObserver Playground"
      description="Resize elements and watch the ResizeObserver API fire in real-time. Inspect contentRect, borderBoxSize, contentBoxSize, and devicePixelContentBoxSize — all client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Controls */}
        <div className="space-y-5">
          {/* Observer controls */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Observer Controls
            </h2>

            <div className="flex gap-2">
              {!observing ? (
                <button
                  onClick={startObserving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Start Observing
                </button>
              ) : (
                <button
                  onClick={stopObserving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all text-sm font-medium"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              )}
              <button
                onClick={() => setPaused(!paused)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  paused
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-slate-500/20 border-slate-600/50 text-slate-400 hover:text-white'
                }`}
              >
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Box Sizing Mode</label>
              <div className="grid gap-1">
                {boxSizingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBoxSizing(opt.value)}
                    className={`text-left px-3 py-2 rounded-md text-xs transition-all ${
                      boxSizing === opt.value
                        ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                        : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-mono text-[11px]">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Status:{' '}
              <span className={observing && !paused ? 'text-emerald-400' : paused ? 'text-amber-400' : 'text-slate-400'}>
                {observing && !paused ? '● Active' : paused ? '⏸ Paused' : '○ Inactive'}
              </span>
              {observing && <span className="ml-2">— {boxRefs.current.size} targets</span>}
            </div>
          </div>

          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-brand-400" />
              Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Box List */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-brand-400" />
                Boxes ({boxes.length})
              </h2>
              <button
                onClick={addBox}
                className="text-brand-400 hover:text-brand-300 flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="space-y-2">
              {boxes.map((box) => (
                <div
                  key={box.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedBox === box.id
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-surface border-slate-600/30 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedBox(selectedBox === box.id ? null : box.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: box.color }} />
                      <span className="text-xs text-slate-300 font-medium">{box.label}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBox(box.id);
                      }}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">W</span>
                      <input
                        type="number"
                        value={box.width}
                        onChange={(e) => updateBoxSize(box.id, 'width', Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">H</span>
                      <input
                        type="number"
                        value={box.height}
                        onChange={(e) => updateBoxSize(box.id, 'height', Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER + RIGHT: Preview + Event log */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview Canvas */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
              <Ruler className="w-4 h-4 text-brand-400" />
              Observed Elements (resize by dragging corner)
            </h2>
            <div
              ref={containerRef}
              className="min-h-[320px] rounded-lg p-6 flex flex-wrap gap-4 items-start content-start border-2 border-dashed border-slate-700/60"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              {boxes.map((box) => (
                <div
                  key={box.id}
                  data-box-id={box.id}
                  ref={(el) => {
                    if (el) boxRefs.current.set(box.id, el);
                    else boxRefs.current.delete(box.id);
                  }}
                  style={{
                    width: box.width,
                    height: box.height,
                    backgroundColor: box.color + '20',
                    borderColor: selectedBox === box.id ? box.color : box.color + '50',
                    resize: 'both',
                    overflow: 'auto',
                    minWidth: 60,
                    minHeight: 60,
                    maxWidth: 800,
                    maxHeight: 600,
                  }}
                  className="relative rounded-xl border-2 transition-colors p-4 flex flex-col items-center justify-center cursor-default"
                >
                  <div
                    className="absolute top-2 left-2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: box.color }}
                  />
                  <span className="text-xs text-slate-300 font-medium">{box.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    {box.width} × {box.height}
                  </span>
                  {/* Resize handle indicator */}
                  <div className="absolute bottom-1 right-1 w-4 h-4 opacity-40 pointer-events-none">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="text-slate-400">
                      <path d="M12 14v-2h2v2h-2zM9 14v-5h2v5H9zM6 14V8h2v6H6zM3 14v-3h2v3H3z" />
                      <path d="M14 12v2h-2v-2h2zM14 9v2h-2V9h2zM14 6v2h-2V6h2zM14 3v2h-2V3h2z" />
                    </svg>
                  </div>
                </div>
              ))}
              {boxes.length === 0 && (
                <div className="text-slate-500 text-sm py-16 w-full text-center">
                  No boxes. Click &quot;Add&quot; or select a preset.
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-3">
              Drag the bottom-right corner of any box to resize it. The ResizeObserver will fire events for all observed elements.
              {observing && ' Observer is active — resize away!'}
            </p>
          </div>

          {/* Last Entry Details */}
          {observing && entries.length > 0 && (
            <div className="card space-y-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-brand-400" />
                Entry Inspector
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">contentRect</div>
                  <div className="text-sm text-emerald-400 font-mono mt-1">
                    {entries[0].contentRect.width} × {entries[0].contentRect.height}
                  </div>
                </div>
                <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">contentBoxSize</div>
                  <div className="text-sm text-blue-400 font-mono mt-1">
                    {formatSize(entries[0].contentBoxSize[0])}
                  </div>
                </div>
                <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">borderBoxSize</div>
                  <div className="text-sm text-purple-400 font-mono mt-1">
                    {formatSize(entries[0].borderBoxSize[0])}
                  </div>
                </div>
                <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">devicePixelSize</div>
                  <div className="text-sm text-amber-400 font-mono mt-1">
                    {formatSize(entries[0].devicePixelContentBoxSize[0])}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Event Log */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                Event Log
                <span className="text-[10px] text-slate-500 font-normal">
                  ({selectedBox ? 'filtered' : entries.length} entries)
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {selectedBox && (
                  <button
                    onClick={() => setSelectedBox(null)}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Clear filter
                  </button>
                )}
                <button
                  onClick={() => {
                    setEntries([]);
                    toast.success('Log cleared');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {selectedEntries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {observing
                  ? 'No entries yet — resize an observed box to see events appear here'
                  : 'Start observing and resize elements to see entries'}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {selectedEntries.slice(0, 50).map((entry) => {
                  const box = boxes.find((b) => b.id === entry.boxId);
                  return (
                    <div
                      key={entry.id}
                      className="bg-surface rounded-lg border border-slate-700/50 p-2.5 group hover:border-slate-600/60 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: box?.color ?? '#6366f1' }}
                        />
                        <span className="text-[10px] text-slate-500 font-mono">{entry.time}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{box?.label ?? `Box ${entry.boxId}`}</span>
                        <span className="text-[11px] text-emerald-400 font-mono ml-auto">
                          {entry.contentRect.width}×{entry.contentRect.height}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-1.5 text-[9px]">
                        <div>
                          <span className="text-slate-600">borderBox:</span>{' '}
                          <span className="text-purple-400 font-mono">{formatSize(entry.borderBoxSize[0])}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">contentBox:</span>{' '}
                          <span className="text-blue-400 font-mono">{formatSize(entry.contentBoxSize[0])}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">dprBox:</span>{' '}
                          <span className="text-amber-400 font-mono">{formatSize(entry.devicePixelContentBoxSize[0])}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">pos:</span>{' '}
                          <span className="text-slate-500 font-mono">
                            ({entry.contentRect.left},{entry.contentRect.top})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedEntries.length > 50 && (
                  <div className="text-center text-[10px] text-slate-600 py-2">
                    Showing latest 50 of {selectedEntries.length} entries
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useRef, type DragEvent } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Trash2, Play, Eye, EyeOff, GripHorizontal, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface DragEventLog {
  id: number;
  timestamp: number;
  event: string;
  target: string;
  detail: string;
}

interface DropZone {
  id: string;
  label: string;
  accept: string;
  effect: 'copy' | 'move' | 'link';
  highlightBg: string;
  borderColor: string;
}

interface DraggableItem {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  type: string;
}

const ITEMS: DraggableItem[] = [
  { id: 'item-1', label: 'Document', emoji: '\ud83d\udcc4', bg: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50', type: 'document' },
  { id: 'item-2', label: 'Image', emoji: '\ud83d\uddbc\ufe0f', bg: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50', type: 'image' },
  { id: 'item-3', label: 'Audio', emoji: '\ud83c\udfb5', bg: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50', type: 'audio' },
  { id: 'item-4', label: 'Video', emoji: '\ud83c\udfac', bg: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50', type: 'video' },
  { id: 'item-5', label: 'Archive', emoji: '\ud83d\udce6', bg: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50', type: 'archive' },
  { id: 'item-6', label: 'Code', emoji: '\ud83d\udcbb', bg: 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/50', type: 'code' },
  { id: 'item-7', label: 'Text', emoji: '\ud83d\udcdd', bg: 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/50', type: 'text' },
  { id: 'item-8', label: 'Link', emoji: '\ud83d\udd17', bg: 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/50', type: 'link' },
];

const ZONES: DropZone[] = [
  { id: 'zone-1', label: 'Copy Zone', accept: 'all', effect: 'copy', highlightBg: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' },
  { id: 'zone-2', label: 'Move Zone', accept: 'all', effect: 'move', highlightBg: 'rgba(34, 197, 94, 0.15)', borderColor: '#22c55e' },
  { id: 'zone-3', label: 'Link Zone', accept: 'all', effect: 'link', highlightBg: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7' },
  { id: 'zone-4', label: 'Images Only', accept: 'image', effect: 'copy', highlightBg: 'rgba(34, 197, 94, 0.15)', borderColor: '#22c55e' },
];

export default function DragDropPlaygroundPage() {
  const [logs, setLogs] = useState<DragEventLog[]>([]);
  const [showLog, setShowLog] = useState(true);
  const [dragEffect, setDragEffect] = useState<'copy' | 'move' | 'link'>('copy');
  const [globalDragActive, setGlobalDragActive] = useState(false);
  const [droppedItems, setDroppedItems] = useState<Record<string, DraggableItem[]>>({});
  const [activeDragItem, setActiveDragItem] = useState<DraggableItem | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [showDataTransfer, setShowDataTransfer] = useState(false);
  const logCounter = useRef(0);

  const log = useCallback((event: string, target: string, detail: string) => {
    logCounter.current += 1;
    setLogs(prev => [{ id: logCounter.current, timestamp: Date.now(), event, target, detail }, ...prev].slice(0, 200));
  }, []);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, item: DraggableItem) => {
    setActiveDragItem(item);
    setGlobalDragActive(true);
    if (dragEffect === 'copy') e.dataTransfer.effectAllowed = 'copy';
    else if (dragEffect === 'move') e.dataTransfer.effectAllowed = 'move';
    else e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', item.label);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setDragImage(e.currentTarget, 40, 40);
    log('dragstart', item.label, 'type=' + item.type + ', effectAllowed=' + e.dataTransfer.effectAllowed);
  }, [dragEffect, log]);

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>, item: DraggableItem) => {
    setGlobalDragActive(false);
    setActiveDragItem(null);
    setHoveredZone(null);
    log('dragend', item.label, 'dropEffect=' + (e.dataTransfer.dropEffect || 'none'));
  }, [log]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredZone(zone.id);
    log('dragenter', zone.label, 'accept=' + zone.accept);
  }, [log]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault();
    e.stopPropagation();
    if (zone.effect === 'copy') e.dataTransfer.dropEffect = 'copy';
    else if (zone.effect === 'move') e.dataTransfer.dropEffect = 'move';
    else e.dataTransfer.dropEffect = 'link';
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredZone(null);
    log('dragleave', zone.label, '');
  }, [log]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, zone: DropZone) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredZone(null);
    const jsonData = e.dataTransfer.getData('application/json');
    let item: DraggableItem | null = null;
    try { item = JSON.parse(jsonData); } catch { /* not JSON */ }
    if (item) {
      if (zone.accept !== 'all' && item.type !== zone.accept) {
        log('drop-rejected', zone.label, 'Item type "' + item.type + '" not accepted (needs "' + zone.accept + '")');
        toast.error('Zone only accepts "' + zone.accept + '" items');
        return;
      }
      setDroppedItems(prev => {
        const current = prev[zone.id] || [];
        if (current.find(i => i.id === item!.id)) return prev;
        return { ...prev, [zone.id]: [...current, item!] };
      });
      log('drop', zone.label, 'item="' + item.label + '", effect=' + e.dataTransfer.dropEffect);
      toast.success('Dropped "' + item.label + '" in ' + zone.label);
    }
  }, [log]);

  const clearLogs = useCallback(() => { setLogs([]); logCounter.current = 0; }, []);
  const clearDrops = useCallback(() => { setDroppedItems({}); toast.success('All drop zones cleared'); }, []);

  const effectModes = [
    { value: 'copy' as const, label: 'Copy', icon: '\ud83d\udccb' },
    { value: 'move' as const, label: 'Move', icon: '\ud83d\udce4' },
    { value: 'link' as const, label: 'Link', icon: '\ud83d\udd17' },
  ];

  return (
    <ToolLayout
      title="Drag & Drop Playground"
      description="Test and explore the HTML Drag and Drop API — drag items, observe events, and inspect DataTransfer in real time."
      controls={
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Effect:</span>
          {effectModes.map(mode => (
            <button
              key={mode.value}
              onClick={() => setDragEffect(mode.value)}
              className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' + (
                dragEffect === mode.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
              )}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-700" />
          <button onClick={clearDrops} className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800/50 transition-colors">
            Clear Zones
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Draggable Items Palette */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-brand-400" />
              Draggable Items
            </h3>
            <div className="space-y-2">
              {ITEMS.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={(e) => handleDragEnd(e, item)}
                  className={'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all duration-150 select-none ' + item.bg + ' ' + (activeDragItem?.id === item.id ? 'ring-2 ring-brand-500 scale-105' : '')}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-sm font-medium text-slate-200">{item.label}</span>
                  <span className="ml-auto text-[10px] text-slate-500 uppercase">{item.type}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Drag items into drop zones below. Observe <code className="text-brand-400 bg-brand-500/10 px-1 rounded">DataTransfer</code> and event flow.
            </p>
          </div>

          {activeDragItem && (
            <div className="card mt-4 border-brand-500/30 bg-brand-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-brand-400" />
                <h4 className="text-xs font-semibold text-brand-400">Dragging</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeDragItem.emoji}</span>
                <span className="text-sm text-slate-200">{activeDragItem.label}</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                <div>Type: {activeDragItem.type}</div>
                <div>Effect: {dragEffect}</div>
              </div>
            </div>
          )}
        </div>

        {/* Drop Zones */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Drop Zones</h3>
          <div className="space-y-4">
            {ZONES.map(zone => {
              const zoneItems = droppedItems[zone.id] || [];
              const isHovered = hoveredZone === zone.id;
              const isActive = globalDragActive;
              return (
                <div
                  key={zone.id}
                  onDragEnter={(e) => handleDragEnter(e, zone)}
                  onDragOver={(e) => handleDragOver(e, zone)}
                  onDragLeave={(e) => handleDragLeave(e, zone)}
                  onDrop={(e) => handleDrop(e, zone)}
                  className="rounded-xl border-2 border-dashed transition-all duration-200 min-h-[100px]"
                  style={{
                    borderColor: isHovered ? zone.borderColor : isActive ? 'rgba(148, 163, 184, 0.4)' : 'rgba(71, 85, 105, 0.5)',
                    backgroundColor: isHovered ? zone.highlightBg : 'transparent',
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{zone.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">{zone.effect}</span>
                        {zone.accept !== 'all' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{zone.accept} only</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{zoneItems.length} item{zoneItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    {zoneItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {zoneItems.map(item => (
                          <div key={item.id} className={'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ' + item.bg}>
                            <span>{item.emoji}</span>
                            <span className="text-slate-200">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {isHovered ? '\u2728 Release to drop here!' : isActive ? 'Drop items here...' : 'Drag items here'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Log */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Event Log</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLog(!showLog)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors" title={showLog ? 'Hide log' : 'Show log'}>
                {showLog ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={clearLogs} className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Clear log">
                <Trash2 className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">{logs.length} events</span>
            </div>
          </div>

          {showLog && (
            <div className="card max-h-[500px] overflow-y-auto p-3 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Drag an item to start logging events...</p>
              ) : (
                <div className="space-y-0.5">
                  {logs.map(entry => {
                    const eventColor = entry.event === 'drop' ? 'text-green-400' :
                      entry.event === 'dragstart' ? 'text-blue-400' :
                      entry.event === 'dragend' ? 'text-purple-400' :
                      entry.event === 'dragenter' ? 'text-amber-400' :
                      entry.event === 'dragleave' ? 'text-orange-400' : 'text-slate-400';
                    return (
                      <div key={entry.id} className="flex items-start gap-2 py-0.5 border-b border-slate-800/50">
                        <span className="text-slate-600 shrink-0 w-10 text-right">{new Date(entry.timestamp).toISOString().slice(11, 19)}</span>
                        <span className={'shrink-0 w-[90px] font-semibold ' + eventColor}>{entry.event}</span>
                        <span className="text-slate-400 shrink-0 w-[90px] truncate">{entry.target}</span>
                        <span className="text-slate-500 truncate">{entry.detail}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DataTransfer API Reference */}
          <div className="mt-4">
            <button onClick={() => setShowDataTransfer(!showDataTransfer)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
              <Play className={'w-3 h-3 transition-transform ' + (showDataTransfer ? 'rotate-90' : '')} />
              DataTransfer API Reference
            </button>
            {showDataTransfer && (
              <div className="mt-2 card p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-1 text-slate-400 font-medium">Property/Method</th>
                      <th className="text-left py-1 text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">effectAllowed</td><td className="py-1">copy, move, link, copyMove, etc.</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">dropEffect</td><td className="py-1">Actual effect on drop (copy/move/link/none)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">types</td><td className="py-1">Array of MIME types in the drag data</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">files</td><td className="py-1">FileList of dragged files (if any)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">items</td><td className="py-1">DataTransferItemList for each item</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">setData(format, data)</td><td className="py-1">Add data for a specific format</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">getData(format)</td><td className="py-1">Retrieve data for a format</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-1 pr-3 font-mono text-brand-400">clearData()</td><td className="py-1">Remove all drag data</td></tr>
                    <tr><td className="py-1 pr-3 font-mono text-brand-400">setDragImage(img, x, y)</td><td className="py-1">Set custom drag feedback image</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Trash2, Play, Pause, Filter, Eye,
  MousePointer2, Keyboard, Hand, Move, FileText,
  Monitor, Camera, Zap, ChevronRight, ChevronDown, Info, Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Event Categories & Types ───────────────────────────────────────────────

const EVENT_CATEGORIES: Record<string, { label: string; icon: typeof MousePointer2; events: string[] }> = {
  mouse: {
    label: 'Mouse',
    icon: MousePointer2,
    events: ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'contextmenu', 'wheel', 'auxclick'],
  },
  keyboard: {
    label: 'Keyboard',
    icon: Keyboard,
    events: ['keydown', 'keyup', 'keypress'],
  },
  focus: {
    label: 'Focus',
    icon: Eye,
    events: ['focus', 'blur', 'focusin', 'focusout'],
  },
  form: {
    label: 'Form',
    icon: FileText,
    events: ['input', 'change', 'submit', 'reset', 'select', 'invalid'],
  },
  drag: {
    label: 'Drag & Drop',
    icon: Move,
    events: ['drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop'],
  },
  touch: {
    label: 'Touch & Pointer',
    icon: Hand,
    events: ['touchstart', 'touchend', 'touchmove', 'touchcancel', 'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave', 'pointercancel', 'gotpointercapture', 'lostpointercapture'],
  },
  window: {
    label: 'Window',
    icon: Monitor,
    events: ['resize', 'scroll', 'load', 'beforeunload', 'unload', 'error', 'popstate', 'hashchange', 'online', 'offline', 'visibilitychange'],
  },
  clipboard: {
    label: 'Clipboard',
    icon: Copy,
    events: ['copy', 'cut', 'paste'],
  },
  animation: {
    label: 'Animation & Transition',
    icon: Zap,
    events: ['animationstart', 'animationend', 'animationiteration', 'transitionstart', 'transitionend', 'transitionrun', 'transitioncancel'],
  },
  media: {
    label: 'Media',
    icon: Camera,
    events: ['play', 'pause', 'ended', 'volumechange', 'timeupdate', 'loadeddata', 'canplay', 'canplaythrough', 'seeking', 'seeked', 'ratechange', 'durationchange'],
  },
};

interface LogEntry {
  id: number;
  type: string;
  timestamp: number;
  category: string;
  properties: Record<string, unknown>;
}

// ── Property Inspector ──────────────────────────────────────────────────────

function extractEventProperties(e: Event): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  // Core
  props.type = e.type;
  props.bubbles = e.bubbles;
  props.cancelable = e.cancelable;
  props.composed = e.composed;
  props.eventPhase = ['NONE', 'CAPTURING', 'AT_TARGET', 'BUBBLING'][e.eventPhase] ?? e.eventPhase;
  props.isTrusted = e.isTrusted;
  props.timeStamp = Math.round(e.timeStamp);

  // Mouse
  if (e instanceof MouseEvent) {
    props.clientX = e.clientX;
    props.clientY = e.clientY;
    props.screenX = e.screenX;
    props.screenY = e.screenY;
    props.button = e.button;
    props.buttons = e.buttons;
    props.altKey = e.altKey;
    props.ctrlKey = e.ctrlKey;
    props.shiftKey = e.shiftKey;
    props.metaKey = e.metaKey;
    props.movementX = e.movementX;
    props.movementY = e.movementY;
  }

  // Keyboard
  if (e instanceof KeyboardEvent) {
    props.key = e.key;
    props.code = e.code;
    props.keyCode = e.keyCode;
    props.altKey = e.altKey;
    props.ctrlKey = e.ctrlKey;
    props.shiftKey = e.shiftKey;
    props.metaKey = e.metaKey;
    props.repeat = e.repeat;
    props.location = e.location;
  }

  // Wheel
  if (e instanceof WheelEvent) {
    props.deltaX = e.deltaX;
    props.deltaY = e.deltaY;
    props.deltaZ = e.deltaZ;
    props.deltaMode = ['DOM_DELTA_PIXEL', 'DOM_DELTA_LINE', 'DOM_DELTA_PAGE'][e.deltaMode] ?? e.deltaMode;
  }

  // Focus
  if (e instanceof FocusEvent) {
    props.relatedTarget = e.relatedTarget ? `${(e.relatedTarget as HTMLElement).tagName}${(e.relatedTarget as HTMLElement).id ? '#' + (e.relatedTarget as HTMLElement).id : ''}` : null;
  }

  // Input/Form
  if (e.target instanceof HTMLInputElement) {
    props.targetValue = e.target.value;
    props.targetName = e.target.name || '(unnamed)';
    props.targetType = e.target.type;
  } else if (e.target instanceof HTMLTextAreaElement) {
    props.targetValue = e.target.value;
    props.targetName = e.target.name || '(unnamed)';
  } else if (e.target instanceof HTMLSelectElement) {
    props.targetValue = e.target.value;
    props.targetName = e.target.name || '(unnamed)';
  }

  // Clipboard
  if (e instanceof ClipboardEvent) {
    props.clipboardData = e.clipboardData ? `types: [${e.clipboardData.types.join(', ')}]` : null;
  }

  // Target info
  props.targetTag = (e.target as HTMLElement).tagName;
  props.targetId = (e.target as HTMLElement).id || '(none)';
  props.targetClass = (e.target as HTMLElement).className || '(none)';

  return props;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EventListenerExplorerPage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(Object.keys(EVENT_CATEGORIES)));
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['mouse', 'keyboard', 'focus', 'form']));
  const testAreaRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);

  // Auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Attach listeners
  useEffect(() => {
    const target = testAreaRef.current;
    if (!target) return;

    const handleEvent = (e: Event) => {
      if (!isRecording) return;
      const category = Object.entries(EVENT_CATEGORIES).find(([, v]) =>
        v.events.includes(e.type)
      )?.[0] ?? 'other';
      if (!selectedCategories.has(category)) return;

      idCounterRef.current += 1;
      setLog((prev) => [
        ...prev.slice(-199), // Keep max 200
        {
          id: idCounterRef.current,
          type: e.type,
          timestamp: performance.now(),
          category,
          properties: extractEventProperties(e),
        },
      ]);
    };

    // Attach all events inside the test area
    const allEvents = Object.values(EVENT_CATEGORIES).flatMap((c) => c.events);
    const seen = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => !seen.has(e) && seen.add(e));
    uniqueEvents.forEach((eventType) => {
      target.addEventListener(eventType, handleEvent, { passive: false, capture: false });
    });

    // Window events
    const windowEvents = EVENT_CATEGORIES.window.events;
    const windowHandler = (e: Event) => {
      if (!isRecording) return;
      if (!selectedCategories.has('window')) return;
      idCounterRef.current += 1;
      setLog((prev) => [
        ...prev.slice(-199),
        {
          id: idCounterRef.current,
          type: e.type,
          timestamp: performance.now(),
          category: 'window',
          properties: extractEventProperties(e),
        },
      ]);
    };

    windowEvents.forEach((eventType) => {
      window.addEventListener(eventType, windowHandler);
    });
    const handleResize = () => handleEvent(new Event('resize'));
    const handleScroll = () => handleEvent(new Event('scroll'));
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      uniqueEvents.forEach((eventType) => {
        target.removeEventListener(eventType, handleEvent);
      });
      windowEvents.forEach((eventType) => {
        window.removeEventListener(eventType, windowHandler);
      });
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isRecording, selectedCategories]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleCategoryExpand = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
    setSelectedEntry(null);
    toast.success('Log cleared');
  }, []);

  const copyLog = useCallback(() => {
    const text = log
      .map((e) => `[${e.category}/${e.type}] @${Math.round(e.timestamp)}ms — ${JSON.stringify(e.properties)}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Event log copied as text');
  }, [log]);

  const copyProperties = useCallback((entry: LogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry.properties, null, 2));
    toast.success('Properties copied as JSON');
  }, []);

  const entryCount = log.length;
  const visibleEvents = Object.values(EVENT_CATEGORIES)
    .filter((c) => selectedCategories.has(
      Object.keys(EVENT_CATEGORIES).find((k) => EVENT_CATEGORIES[k] === c)!
    ))
    .flatMap((c) => c.events)
    .length;

  return (
    <ToolLayout
      title="DOM Event Listener Explorer"
      description="Explore every DOM event in real-time. Interact with the test area below and see every event fired with full property inspection. Filter by category, inspect event objects — understand the event model completely."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isRecording
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRecording ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={clearLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={copyLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
            disabled={log.length === 0}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Log
          </button>
          <span className="ml-auto text-xs text-slate-400">
            {entryCount} events logged · {visibleEvents} event types listening
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar: categories */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-400" />
              Event Categories
            </h3>
            <div className="space-y-1">
              {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
                const Icon = cat.icon;
                const isActive = selectedCategories.has(key);
                const isExpanded = expandedCategories.has(key);
                const count = log.filter((e) => e.category === key).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCategoryExpand(key)}
                        className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleCategory(key)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                          isActive
                            ? 'bg-brand-500/10 text-brand-300'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 text-left">{cat.label}</span>
                        <span className="text-[10px] tabular-nums text-slate-500">
                          {count > 0 ? count : cat.events.length}
                        </span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="ml-8 mt-1 space-y-0.5">
                        {cat.events.map((eventName) => (
                          <div
                            key={eventName}
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              isActive ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            {eventName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center/Right: test area + log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Area */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-brand-400" />
              Test Area — Interact Here
            </h3>
            <div
              ref={testAreaRef}
              className="rounded-lg border-2 border-dashed border-slate-600 p-6 min-h-[200px] flex flex-col gap-4 items-center justify-center select-none transition-colors hover:border-brand-500/50"
              style={{ cursor: 'default' }}
            >
              {/* Interactive elements */}
              <div className="flex flex-wrap gap-3 items-center justify-center">
                <button
                  className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Click Me
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500 transition-colors cursor-pointer"
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  Double-Click
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500 transition-colors cursor-pointer"
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  Right-Click
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-center justify-center w-full max-w-md">
                <input
                  type="text"
                  placeholder="Type something..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
                <select
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option>Option A</option>
                  <option>Option B</option>
                  <option>Option C</option>
                </select>
              </div>

              <div
                className="w-32 h-32 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white/80 text-xs font-medium cursor-grab active:cursor-grabbing"
                draggable
              >
                Drag Me
              </div>

              <div className="text-xs text-slate-500 text-center mt-1">
                Click, type, drag, scroll, focus, blur, resize the window — every DOM event is captured here
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" />
              Event Log
            </h3>
            {log.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                {isRecording ? 'Interact with the test area above to see events appear here' : 'Recording is paused — click Resume to start'}
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {log.map((entry) => {
                  const cat = EVENT_CATEGORIES[entry.category];
                  const CatIcon = cat?.icon ?? Info;
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(isSelected ? null : entry)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-500/10 border border-brand-500/30'
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <CatIcon className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="font-mono font-semibold text-brand-300 min-w-[100px]">{entry.type}</span>
                      <span className="text-slate-500 tabular-nums min-w-[50px]">+{Math.round(entry.timestamp)}ms</span>
                      <span className="text-slate-600 truncate flex-1">
                        {String((entry.properties as Record<string, string | number | boolean | null>).targetTag ?? '')}
                        {(entry.properties as Record<string, string | number | boolean | null>).key ? ` key="${(entry.properties as Record<string, string | number | boolean | null>).key}"` : ''}
                        {(entry.properties as Record<string, string | number | boolean | null>).clientX != null ? ` @(${(entry.properties as Record<string, string | number | boolean | null>).clientX}, ${(entry.properties as Record<string, string | number | boolean | null>).clientY})` : ''}
                      </span>
                      <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
                    </button>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

          {/* Property inspector */}
          {selectedEntry && (
            <div className="p-4 rounded-xl bg-surface-light border border-brand-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-400" />
                  Event Properties: <span className="font-mono text-brand-300">{selectedEntry.type}</span>
                </h3>
                <button
                  onClick={() => copyProperties(selectedEntry)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Object.entries(selectedEntry.properties).map(([key, value]) => (
                  <div key={key} className="flex flex-col px-2.5 py-1.5 rounded bg-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-mono">{key}</span>
                    <span className="text-xs text-slate-200 font-mono break-all">
                      {value === null ? <span className="text-slate-600 italic">null</span> :
                       value === true ? <span className="text-emerald-400">true</span> :
                       value === false ? <span className="text-red-400">false</span> :
                       String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

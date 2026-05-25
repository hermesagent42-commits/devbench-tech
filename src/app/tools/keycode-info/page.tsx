'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Keyboard, ChevronDown, History, Trash2, Info, ArrowDown, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface KeyEventInfo {
  id: number;
  timestamp: number;
  key: string;
  code: string;
  keyCode: number;
  which: number;
  location: KeyboardEvent['location'];
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  type: 'keydown' | 'keyup' | 'keypress';
  charCode?: number;
}

type LocationName = 'Standard' | 'Left side' | 'Right side' | 'Numpad' | 'Mobile/Other';

// ── Helpers ────────────────────────────────────────────────────────────────

function locationName(loc: number): LocationName {
  switch (loc) {
    case 0: return 'Standard';
    case 1: return 'Left side';
    case 2: return 'Right side';
    case 3: return 'Numpad';
    default: return 'Mobile/Other';
  }
}

function modifierLabel(val: boolean): string {
  return val ? '✅ true' : '⬜ false';
}

// ── Constants ───────────────────────────────────────────────────────────────

const LOCATION_NAMES: Record<number, LocationName> = {
  0: 'Standard',
  1: 'Left side',
  2: 'Right side',
  3: 'Numpad',
  4: 'Mobile/Other',
};

const TYPE_COLORS: Record<string, string> = {
  keydown: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  keyup: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  keypress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const SPECIAL_KEYS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↵',
  Tab: '⇥',
  Backspace: '⌫',
  Delete: '⌦',
  Escape: 'Esc',
  Space: '␣',
  Shift: '⇧',
  Control: '⌃',
  Alt: '⌥',
  Meta: '⌘',
  CapsLock: '⇪',
};

// ── Component ───────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): number { idCounter += 1; return idCounter; }

export default function KeycodeInfoPage() {
  const [history, setHistory] = useState<KeyEventInfo[]>([]);
  const [paused, setPaused] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [lastType, setLastType] = useState<'keydown' | 'keyup' | 'keypress' | null>(null);
  const [eventCount, setEventCount] = useState({ keydown: 0, keyup: 0, keypress: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback((evt: KeyboardEvent, type: 'keydown' | 'keyup' | 'keypress') => {
    if (paused) return;

    const info: KeyEventInfo = {
      id: nextId(),
      timestamp: Date.now(),
      key: evt.key,
      code: evt.code,
      keyCode: evt.keyCode,
      which: evt.which,
      location: evt.location,
      altKey: evt.altKey,
      ctrlKey: evt.ctrlKey,
      metaKey: evt.metaKey,
      shiftKey: evt.shiftKey,
      repeat: evt.repeat,
      isComposing: evt.isComposing,
      type,
      charCode: (evt as KeyboardEvent & { charCode?: number }).charCode,
    };

    setHistory(prev => {
      const next = [info, ...prev];
      if (next.length > 200) next.pop();
      return next;
    });

    setLastType(type);
    setShowIntro(false);

    setEventCount(prev => ({ ...prev, [type]: prev[type] + 1 }));
  }, [paused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => addEvent(e, 'keydown');
    const handleKeyUp = (e: KeyboardEvent) => addEvent(e, 'keyup');
    const handleKeyPress = (e: KeyboardEvent) => addEvent(e, 'keypress');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [addEvent]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setShowIntro(true);
    setLastType(null);
    setEventCount({ keydown: 0, keyup: 0, keypress: 0 });
    toast.success('History cleared');
  }, []);

  const copyInfo = useCallback((info: KeyEventInfo) => {
    const lines = [
      `Key Event: ${info.type.toUpperCase()}`,
      `key: "${info.key}"`,
      `code: "${info.code}"`,
      `keyCode: ${info.keyCode}`,
      `which: ${info.which}`,
      `location: ${info.location} (${LOCATION_NAMES[info.location] || 'Unknown'})`,
      `altKey: ${info.altKey}`,
      `ctrlKey: ${info.ctrlKey}`,
      `metaKey: ${info.metaKey}`,
      `shiftKey: ${info.shiftKey}`,
      `repeat: ${info.repeat}`,
      `isComposing: ${info.isComposing}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Key info copied');
  }, []);

  const latest = history[0];

  return (
    <ToolLayout
      title="Keycode Info"
      description="Press any key and see every KeyboardEvent property — key, code, keyCode, modifiers, location, and more. Essential for debugging keyboard shortcuts."
      controls={
        <div className="flex items-center gap-3 w-full flex-wrap">
          <button
            onClick={() => setPaused(p => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              paused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <div className="ml-auto flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              keydown: {eventCount.keydown}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              keypress: {eventCount.keypress}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              keyup: {eventCount.keyup}
            </span>
          </div>
        </div>
      }
    >
      <div ref={containerRef} className="space-y-6">
        {/* Intro / call-to-action */}
        {showIntro && (
          <div className="text-center py-16 border-2 border-dashed border-slate-600/50 rounded-2xl bg-slate-800/30">
            <Keyboard className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Press Any Key</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Focus this window and press a key to see all its keyboard event properties.
              Try combinations like Ctrl+S, Shift+Arrow, or special keys.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-sm">
              <ArrowDown className="w-4 h-4 animate-bounce" />
              <span>Listening for keyboard events…</span>
            </div>
          </div>
        )}

        {/* Live current event */}
        {latest && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${TYPE_COLORS[latest.type] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                  {latest.type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(latest.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <button
                onClick={() => copyInfo(latest)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-slate-700/20">
              {/* Key identity */}
              <InfoCell label="key" value={latest.key} icon="🔑" />
              <InfoCell label="code" value={latest.code} icon="🏷️" />
              <InfoCell label="keyCode" value={String(latest.keyCode)} icon="🔢" />
              <InfoCell label="which" value={String(latest.which)} icon="🔢" />
              <InfoCell label="location" value={`${latest.location} — ${LOCATION_NAMES[latest.location] || '?'}`} icon="📍" />
              {latest.charCode !== undefined && (
                <InfoCell label="charCode" value={String(latest.charCode)} icon="🔤" />
              )}

              {/* Modifiers */}
              <InfoCell label="altKey" value={modifierLabel(latest.altKey)} icon={latest.altKey ? '🟢' : '⚪'} />
              <InfoCell label="ctrlKey" value={modifierLabel(latest.ctrlKey)} icon={latest.ctrlKey ? '🟢' : '⚪'} />
              <InfoCell label="metaKey" value={modifierLabel(latest.metaKey)} icon={latest.metaKey ? '🟢' : '⚪'} />
              <InfoCell label="shiftKey" value={modifierLabel(latest.shiftKey)} icon={latest.shiftKey ? '🟢' : '⚪'} />

              {/* State */}
              <InfoCell label="repeat" value={modifierLabel(latest.repeat)} icon={latest.repeat ? '🟢' : '⚪'} />
              <InfoCell label="isComposing" value={modifierLabel(latest.isComposing)} icon={latest.isComposing ? '🟢' : '⚪'} />
            </div>

            {/* Visual key display */}
            <div className="px-4 py-4 bg-slate-800/50 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-slate-700 border border-slate-600">
                {latest.ctrlKey && <KeyBadge label="Ctrl" />}
                {latest.altKey && <KeyBadge label="Alt" />}
                {latest.metaKey && <KeyBadge label={navigator.platform.includes('Mac') ? '⌘' : 'Win'} />}
                {latest.shiftKey && <KeyBadge label="Shift" />}
                <span className="text-4xl font-bold text-white">
                  {SPECIAL_KEYS[latest.key] || (latest.key.length === 1 ? latest.key.toUpperCase() : latest.key)}
                </span>
                <span className="text-sm text-slate-400 ml-2">{latest.code}</span>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Event History ({history.length})
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Key</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Code</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">keyCode</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 hidden sm:table-cell">Ctrl</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 hidden sm:table-cell">Shift</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 hidden sm:table-cell">Alt</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 hidden sm:table-cell">Meta</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 hidden md:table-cell">Repeat</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {history.map((evt) => (
                    <tr
                      key={evt.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[evt.type] || ''}`}>
                          {evt.type.slice(0, 3)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-200">{evt.key}</td>
                      <td className="px-3 py-2 font-mono text-slate-400 text-xs">{evt.code}</td>
                      <td className="px-3 py-2 font-mono text-slate-300 text-right">{evt.keyCode}</td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        <ModDot on={evt.ctrlKey} />
                      </td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        <ModDot on={evt.shiftKey} />
                      </td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        <ModDot on={evt.altKey} />
                      </td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        <ModDot on={evt.metaKey} />
                      </td>
                      <td className="px-3 py-2 text-center hidden md:table-cell">
                        {evt.repeat ? '🔁' : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => copyInfo(evt)}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                          title="Copy details"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reference section */}
        <details className="group rounded-xl border border-slate-700/50 overflow-hidden">
          <summary className="px-5 py-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-medium text-slate-300 select-none">
            <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            <Info className="w-4 h-4 text-slate-400" />
            KeyboardEvent Reference
          </summary>
          <div className="px-5 py-4 space-y-4 text-sm bg-slate-800/20">
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Event Types</h4>
              <ul className="space-y-1 text-slate-400">
                <li><code className="text-blue-300 bg-slate-700/50 px-1 rounded">keydown</code> — Fires when a key is pressed down. Repeats while held. All keys.</li>
                <li><code className="text-amber-300 bg-slate-700/50 px-1 rounded">keypress</code> — <strong className="text-slate-300">Deprecated</strong>. Fires for character-producing keys only.</li>
                <li><code className="text-emerald-300 bg-slate-700/50 px-1 rounded">keyup</code> — Fires when a key is released.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Key Properties</h4>
              <ul className="space-y-1 text-slate-400">
                <li><strong className="text-slate-300">key</strong> — Printable representation (e.g. &ldquo;a&rdquo;, &ldquo;Enter&rdquo;, &ldquo;ArrowUp&rdquo;). Modern, preferred.</li>
                <li><strong className="text-slate-300">code</strong> — Physical key location (e.g. &ldquo;KeyA&rdquo;, &ldquo;Digit1&rdquo;). Layout-independent.</li>
                <li><strong className="text-slate-300">keyCode</strong> — <strong>Deprecated</strong>. Numeric code. Use key/code instead.</li>
                <li><strong className="text-slate-300">which</strong> — <strong>Deprecated</strong>. Same as keyCode for key events.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-2">Location Values</h4>
              <ul className="space-y-1 text-slate-400">
                <li><code className="text-slate-300 bg-slate-700/50 px-1 rounded">0</code> — Standard (most keys)</li>
                <li><code className="text-slate-300 bg-slate-700/50 px-1 rounded">1</code> — Left side (e.g. left Shift)</li>
                <li><code className="text-slate-300 bg-slate-700/50 px-1 rounded">2</code> — Right side (e.g. right Alt)</li>
                <li><code className="text-slate-300 bg-slate-700/50 px-1 rounded">3</code> — Numpad</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </ToolLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoCell({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="px-4 py-3 bg-slate-800/40">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
        <span>{icon}</span> {label}
      </div>
      <div className="font-mono text-sm text-slate-200 break-all">{value}</div>
    </div>
  );
}

function KeyBadge({ label }: { label: string }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-600/50 text-slate-300 border border-slate-500/30">
      {label}
    </span>
  );
}

function ModDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${on ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-slate-600'}`}
    />
  );
}

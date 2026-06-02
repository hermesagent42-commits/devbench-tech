'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  ClipboardPaste,
  ClipboardCheck,
  ClipboardList,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Info,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Download,
  Trash2,
  Code2,
  Upload,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface ClipboardItemPreview {
  type: 'text' | 'image';
  content: string; // text content or base64 data URL
  mimeType: string;
  size: number; // bytes
}

interface LogEntry {
  id: number;
  timestamp: Date;
  event: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface EventPayload {
  type: 'copy' | 'cut' | 'paste';
  data: Record<string, string>;
  timestamp: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MDN_URL = 'https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API';
const CANIUSE_URL = 'https://caniuse.com/async-clipboard';

const SAMPLE_TEXT = `Hello from DevBench! 👋
This is a sample text copied at ${new Date().toLocaleTimeString()}.
The Clipboard API makes this effortless.

Try the following:
1. Click "Copy" to write this to clipboard
2. Click "Read" to read back what's on clipboard
3. Use Ctrl+V anywhere to paste this text`;

// ── Demo Code Snippets ─────────────────────────────────────────────────────

const CODE_SNIPPETS = {
  writeText: `// Write text to clipboard
await navigator.clipboard.writeText('Hello, World!');`,

  readText: `// Read text from clipboard
const text = await navigator.clipboard.readText();
console.log(text);`,

  read: `// Read any clipboard content (needs permission)
const items = await navigator.clipboard.read();
for (const item of items) {
  for (const type of item.types) {
    const blob = await item.getType(type);
    // Handle text, image, etc.
  }
}`,

  write: `// Write rich content to clipboard
const blob = new Blob(['Hello'], { type: 'text/plain' });
const item = new ClipboardItem({ 'text/plain': blob });
await navigator.clipboard.write([item]);`,

  events: `// Listen for clipboard events
document.addEventListener('copy', (e) => {
  const selection = document.getSelection()?.toString();
  e.clipboardData?.setData('text/plain', selection || '');
  e.preventDefault();
});

document.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text/plain');
  console.log('Pasted:', text);
});`,
};

// ── Browser Support Check ───────────────────────────────────────────────────

function checkBrowserSupport(): {
  supported: boolean;
  details: Record<string, boolean>;
} {
  const details: Record<string, boolean> = {
    'Clipboard API (navigator.clipboard)': typeof navigator !== 'undefined' && 'clipboard' in navigator,
    'writeText()': typeof navigator !== 'undefined' && typeof (navigator as any).clipboard?.writeText === 'function',
    'readText()': typeof navigator !== 'undefined' && typeof (navigator as any).clipboard?.readText === 'function',
    'read() (full access)': typeof navigator !== 'undefined' && typeof (navigator as any).clipboard?.read === 'function',
    'write() (rich content)': typeof navigator !== 'undefined' && typeof (navigator as any).clipboard?.write === 'function',
    'Secure context': typeof window !== 'undefined' && window.isSecureContext,
  };

  return {
    supported: details['Clipboard API (navigator.clipboard)'] && details['Secure context'],
    details,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ClipboardPlaygroundPage() {
  const [clipboardItems, setClipboardItems] = useState<ClipboardItemPreview[]>([]);
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(0);
  const [activeTab, setActiveTab] = useState<'text' | 'rich' | 'events' | 'code'>('text');
  const [showCode, setShowCode] = useState<string | null>(null);
  const [clipboardEvents, setClipboardEvents] = useState<EventPayload[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pasteTarget, setPasteTarget] = useState('');

  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const support = checkBrowserSupport();

  // ── Logging ────────────────────────────────────────────────────────────────

  const addLog = useCallback(
    (event: string, type: LogEntry['type'] = 'info') => {
      setLogs((prev) => [
        {
          id: nextId,
          timestamp: new Date(),
          event,
          type,
        },
        ...prev.slice(0, 49),
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  // ── Clipboard Event Listeners ─────────────────────────────────────────────

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const data: Record<string, string> = {};
      if (e.clipboardData) {
        for (const type of e.clipboardData.types) {
          try {
            data[type] = e.clipboardData.getData(type).slice(0, 200);
          } catch {
            data[type] = '[binary data]';
          }
        }
      }
      const payload: EventPayload = { type: 'copy', data, timestamp: new Date() };
      setClipboardEvents((prev) => [payload, ...prev.slice(0, 24)]);
      addLog(`copy event fired — ${Object.keys(data).length} MIME type(s)`, 'info');
    };

    const handleCut = (e: ClipboardEvent) => {
      const data: Record<string, string> = {};
      if (e.clipboardData) {
        for (const type of e.clipboardData.types) {
          try {
            data[type] = e.clipboardData.getData(type).slice(0, 200);
          } catch {
            data[type] = '[binary data]';
          }
        }
      }
      const payload: EventPayload = { type: 'cut', data, timestamp: new Date() };
      setClipboardEvents((prev) => [payload, ...prev.slice(0, 24)]);
      addLog(`cut event fired — ${Object.keys(data).length} MIME type(s)`, 'info');
    };

    const handlePaste = (e: ClipboardEvent) => {
      const data: Record<string, string> = {};
      if (e.clipboardData) {
        for (const type of e.clipboardData.types) {
          try {
            data[type] = e.clipboardData.getData(type).slice(0, 200);
          } catch {
            data[type] = '[binary data]';
          }
        }
      }
      const payload: EventPayload = { type: 'paste', data, timestamp: new Date() };
      setClipboardEvents((prev) => [payload, ...prev.slice(0, 24)]);
      addLog(`paste event fired — ${Object.keys(data).length} MIME type(s)`, 'info');

      // If Ctrl+V in paste zone, capture text
      if (e.target === pasteZoneRef.current || pasteZoneRef.current?.contains(e.target as Node)) {
        const text = e.clipboardData?.getData('text/plain') || '';
        setPasteTarget(text);
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [addLog]);

  // ── Check Clipboard Permissions ───────────────────────────────────────────

  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const checkPermission = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const status = await navigator.permissions.query({
          name: 'clipboard-read' as PermissionName,
        });
        setPermissionStatus(status.state);
        addLog(`Clipboard-read permission: ${status.state}`, 'info');

        status.addEventListener('change', () => {
          setPermissionStatus(status.state);
          addLog(`Clipboard-read permission changed: ${status.state}`, 'info');
        });
      } else {
        setPermissionStatus('unsupported');
        addLog('Permissions API not available', 'warning');
      }
    } catch (err: any) {
      setPermissionStatus('error');
      addLog(`Permission check failed: ${err.message}`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // ── Clipboard Operations ──────────────────────────────────────────────────

  const writeText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textInput);
      addLog(`✅ Copied ${textInput.length} characters to clipboard`, 'success');
      toast.success(`Copied ${textInput.length} characters`);
    } catch (err: any) {
      addLog(`❌ Copy failed: ${err.message}`, 'error');
      toast.error(`Copy failed: ${err.message}`);
    }
  }, [textInput, addLog]);

  const readText = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setClipboardItems((prev) => {
        const filtered = prev.filter((i) => i.type !== 'text');
        if (text) {
          const newItem: ClipboardItemPreview = { type: 'text', content: text, mimeType: 'text/plain', size: new Blob([text]).size };
          return [newItem, ...filtered].slice(0, 20);
        }
        return filtered;
      });
      addLog(`✅ Read ${text.length} characters from clipboard`, 'success');
      toast.success(`Read ${text.length} characters`);
    } catch (err: any) {
      addLog(`❌ Read failed: ${err.message}`, 'error');
      toast.error(`Read failed: ${err.message}`);
    }
  }, [addLog]);

  const readClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      const previews: ClipboardItemPreview[] = [];

      for (const item of items) {
        for (const type of item.types) {
          const blob = await item.getType(type);
          const preview: ClipboardItemPreview = {
            mimeType: type,
            size: blob.size,
            content: '',
            type: type.startsWith('image/') ? 'image' : 'text',
          };

          if (type.startsWith('image/')) {
            preview.content = URL.createObjectURL(blob);
            setImagePreview(preview.content);
          } else if (type.startsWith('text/')) {
            preview.content = await blob.text();
          } else {
            preview.content = `[${type} — ${blob.size} bytes]`;
          }

          previews.push(preview);
        }
      }

      setClipboardItems(previews);
      addLog(`✅ Read ${previews.length} clipboard item(s)`, 'success');
      toast.success(`Found ${previews.length} item(s) on clipboard`);
    } catch (err: any) {
      addLog(`❌ Read failed: ${err.message}`, 'error');
      toast.error(`Read failed: ${err.message}`);
    }
  }, [addLog]);

  const clearClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('');
      addLog('✅ Clipboard cleared', 'success');
      toast.success('Clipboard cleared');
      setClipboardItems([]);
    } catch (err: any) {
      addLog(`❌ Clear failed: ${err.message}`, 'error');
      toast.error(`Clear failed: ${err.message}`);
    }
  }, [addLog]);

  // ── Tab Content ───────────────────────────────────────────────────────────

  const tabs = [
    { id: 'text' as const, label: 'Text', icon: FileText },
    { id: 'rich' as const, label: 'Read', icon: Eye },
    { id: 'events' as const, label: 'Events', icon: Activity },
    { id: 'code' as const, label: 'Code', icon: Code2 },
  ];

  // ── Permission Badge ──────────────────────────────────────────────────────

  const permConfig: Record<string, { color: string; bg: string; label: string }> = {
    granted: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      label: 'Granted',
    },
    denied: {
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      label: 'Denied',
    },
    prompt: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      label: 'Prompt',
    },
    unsupported: {
      color: 'text-slate-400',
      bg: 'bg-slate-700/20 border-slate-600/50',
      label: 'Unsupported',
    },
    unknown: {
      color: 'text-slate-400',
      bg: 'bg-slate-700/20 border-slate-600/50',
      label: 'Unknown',
    },
    error: {
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      label: 'Error',
    },
  };

  const pc = permConfig[permissionStatus] || permConfig.unknown;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Clipboard API Playground"
      description="Explore the navigator.clipboard API — copy/paste text and rich content, read clipboard contents, listen to copy/cut/paste events, and check permissions. 100% client-side, secure context required."
    >
      {/* ── Browser Support Warning ── */}
      {!support.supported && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-400 mb-1">Browser Support Issue</h3>
              <p className="text-amber-300/80 text-sm mb-2">
                The Clipboard API requires a secure context (HTTPS or localhost). Some features like
                read() need user permission. Try opening this page on localhost.
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                {Object.entries(support.details).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    {value ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={value ? 'text-emerald-300' : 'text-red-300'}>{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Status Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        {/* Permission */}
        <div className={`p-3 rounded-lg border ${pc.bg} flex items-center gap-3`}>
          <ShieldCheck className={`w-5 h-5 ${pc.color} shrink-0`} />
          <div className="min-w-0">
            <div className={`text-xs font-medium ${pc.color}`}>Clipboard-read Permission</div>
            <div className="text-xs text-slate-500">{pc.label}</div>
          </div>
        </div>
        {/* Text ops count */}
        <div className="p-3 rounded-lg border border-slate-700/50 bg-surface-light flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-300">Text Operations</div>
            <div className="text-xs text-slate-500">writeText / readText</div>
          </div>
        </div>
        {/* Rich ops */}
        <div className="p-3 rounded-lg border border-slate-700/50 bg-surface-light flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-300">Rich Content</div>
            <div className="text-xs text-slate-500">write / read (permissions)</div>
          </div>
        </div>
        {/* Events */}
        <div className="p-3 rounded-lg border border-slate-700/50 bg-surface-light flex items-center gap-3">
          <Activity className="w-5 h-5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-300">DOM Events</div>
            <div className="text-xs text-slate-500">copy / cut / paste</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-slate-800/60 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/40'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TEXT TAB ── */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Text to Copy
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-40 bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 text-slate-200 font-mono text-sm resize-y focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              placeholder="Type something to copy..."
            />
            <p className="text-xs text-slate-500 mt-1">
              {textInput.length} characters &middot; {textInput.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={writeText}
              disabled={!support.supported}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
            <button
              onClick={readText}
              disabled={!support.supported}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-medium transition-colors text-sm"
            >
              <ClipboardPaste className="w-4 h-4" />
              Read Clipboard Text
            </button>
            <button
              onClick={clearClipboard}
              disabled={!support.supported}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 font-medium transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Paste Zone */}
          <div className="mt-6">
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-brand-400" />
              Paste Zone (Ctrl+V here)
            </label>
            <div
              ref={pasteZoneRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full min-h-[80px] bg-slate-900/80 border-2 border-dashed border-slate-600/50 rounded-lg p-4 text-slate-300 text-sm focus:outline-none focus:border-brand-500/50 transition-colors cursor-text"
              onInput={(e) => setPasteTarget((e.target as HTMLDivElement).innerText)}
              dangerouslySetInnerHTML={{ __html: pasteTarget ? pasteTarget.replace(/\n/g, '<br/>') : '' }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Click here and press Ctrl+V — captures the paste event and displays what was pasted.
            </p>
          </div>

          {/* Last Read */}
          {clipboardItems.some((i) => i.type === 'text') && (
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                Last Text Read from Clipboard
              </h3>
              <pre className="text-slate-300 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {clipboardItems.find((i) => i.type === 'text')?.content}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── RICH CONTENT TAB ── */}
      {activeTab === 'rich' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-400" />
              Read Full Clipboard Contents
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reads all MIME types from the clipboard — text, images, and other formats.
              This requires clipboard-read permission (a browser prompt will appear).
            </p>
            <button
              onClick={readClipboard}
              disabled={!support.supported}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              Read Clipboard
            </button>
          </div>

          {clipboardItems.length > 0 && (
            <div className="space-y-3">
              {clipboardItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-300">
                        {item.type === 'image' ? '🖼️ Image' : '📝 Text'}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 font-mono">
                        {item.mimeType} &middot; {item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} B`}
                      </span>
                    </div>
                  </div>
                  {item.type === 'image' ? (
                    <div className="rounded-lg overflow-hidden bg-slate-800/60 max-w-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.content}
                        alt="Clipboard image"
                        className="max-w-full max-h-64 object-contain"
                        onLoad={() => {
                          if (item.content.startsWith('blob:')) {
                            URL.revokeObjectURL(item.content);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <pre className="text-slate-300 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-950/60 rounded p-3">
                      {item.content.length > 2000
                        ? item.content.slice(0, 2000) + '\n\n... (truncated)'
                        : item.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {clipboardItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No clipboard content read yet.</p>
              <p className="text-xs mt-1">Copy an image or text, then click &ldquo;Read Clipboard&rdquo;.</p>
            </div>
          )}
        </div>
      )}

      {/* ── EVENTS TAB ── */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              Live Clipboard Event Monitor
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Try copying, cutting, or pasting anywhere on this page. Events are captured in real time.
            </p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Ctrl+C</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Ctrl+X</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ctrl+V</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/80 border border-slate-700/50 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {clipboardEvents.length === 0 ? (
                <div className="px-4 py-12 text-center text-slate-500 text-sm">
                  No clipboard events captured yet. Try copying some text on this page.
                </div>
              ) : (
                clipboardEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-3 border-b border-slate-800/50 ${
                      idx === 0 ? 'bg-brand-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          evt.type === 'copy'
                            ? 'bg-blue-500/10 text-blue-400'
                            : evt.type === 'cut'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {evt.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        {evt.timestamp.toLocaleTimeString('en-US', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        {'.'}
                        {String(evt.timestamp.getMilliseconds()).padStart(3, '0')}
                      </span>
                    </div>
                    {Object.keys(evt.data).length > 0 && (
                      <div className="space-y-1">
                        {Object.entries(evt.data).map(([type, content]) => (
                          <div key={type} className="text-xs">
                            <span className="text-slate-500 font-mono">{type}</span>
                            {': '}
                            <span className="text-slate-400 font-mono break-all">
                              {content || '(empty)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {Object.keys(evt.data).length === 0 && (
                      <p className="text-xs text-slate-600 italic">No data available (empty clipboard)</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CODE TAB ── */}
      {activeTab === 'code' && (
        <div className="space-y-3">
          {Object.entries(CODE_SNIPPETS).map(([key, code]) => (
            <div key={key} className="rounded-lg bg-slate-900/80 border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">
                  {key === 'writeText'
                    ? 'navigator.clipboard.writeText()'
                    : key === 'readText'
                      ? 'navigator.clipboard.readText()'
                      : key === 'read'
                        ? 'navigator.clipboard.read()'
                        : key === 'write'
                          ? 'navigator.clipboard.write()'
                          : 'Clipboard Events (copy/paste)'}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(code.trim());
                      toast.success('Code snippet copied!');
                    } catch {
                      toast.error('Failed to copy');
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                <code>{code.trim()}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* ── Event Log ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Operation Log
          </h3>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="rounded-lg bg-slate-900/80 border border-slate-700/50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No operations yet. Use the controls above to interact with the Clipboard API.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 px-4 py-2 border-b border-slate-800/50 text-sm font-mono ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 shrink-0 w-16">
                    {log.timestamp.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="break-all">{log.event}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MDN Link ── */}
      <div className="mt-6 flex gap-3">
        <a
          href={MDN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          MDN: Clipboard API
        </a>
        <a
          href={CANIUSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Can I Use: Async Clipboard
        </a>
      </div>
    </ToolLayout>
  );
}

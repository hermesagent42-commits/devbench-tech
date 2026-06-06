'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Share2, Copy, Upload, Link as LinkIcon, FileText, Image as ImageIcon, AlertCircle, Info, CheckCircle2, Send, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface LogEntry {
  id: number;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ── Detection ───────────────────────────────────────────────────────────────

function checkSupport(): { supported: boolean; canShareFiles: boolean; reason: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, canShareFiles: false, reason: 'SSR — browser only' };
  }

  const hasShare = !!navigator.share;
  let canShareFiles = false;

  if (hasShare && navigator.canShare) {
    try {
      const testFile = new File([''], 'test.txt', { type: 'text/plain' });
      canShareFiles = navigator.canShare({ files: [testFile] });
    } catch {
      canShareFiles = false;
    }
  }

  return {
    supported: hasShare,
    canShareFiles,
    reason: hasShare ? '' : 'Web Share API not available — supported in Chrome, Edge, Safari (mobile/desktop), and Samsung Internet',
  };
}

const MDN_URL = 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share';
const CANIUSE_URL = 'https://caniuse.com/web-share';

// ── Component ───────────────────────────────────────────────────────────────

export default function WebSharePlayground() {
  const [title, setTitle] = useState('Check out DevBench!');
  const [text, setText] = useState('Free developer tools — JSON formatter, regex tester, CSS playgrounds, and 250+ utilities. All client-side.');
  const [url, setUrl] = useState('https://devbench-roan.vercel.app');
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [supportCheck] = useState(() => checkSupport());

  const logIdRef = { current: 1 };

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-49), {
      id: logIdRef.current++,
      timestamp: new Date(),
      type,
      message,
    }]);
  }, []);

  // ── Share ────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      toast.error('Web Share API not supported');
      addLog('error', 'Share failed: API not available');
      return;
    }

    const data: ShareData = {};
    if (title.trim()) data.title = title.trim();
    if (text.trim()) data.text = text.trim();
    if (url.trim()) data.url = url.trim();
    if (files.length > 0) data.files = files;

    // Validate minimum content
    if (!data.title && !data.text && !data.url && files.length === 0) {
      toast.error('Add at least a title, text, URL, or file to share');
      return;
    }

    // Check if shareable
    if (navigator.canShare && !navigator.canShare(data)) {
      toast.error('This combination of data cannot be shared by your browser');
      addLog('error', 'Share rejected: navigator.canShare() returned false');
      return;
    }

    try {
      await navigator.share(data);
      addLog('success', `Shared successfully: ${data.title || data.text?.slice(0, 50) || data.url || `${files.length} file(s)`}`);
      toast.success('Shared!');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('info', 'Share cancelled by user');
      } else {
        const msg = err.message || 'Unknown share error';
        addLog('error', `Share failed: ${msg}`);
        toast.error(msg);
      }
    }
  }, [title, text, url, files, addLog]);

  // ── File Handling ────────────────────────────────────────────────────────

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles = Array.from(selected);
    setFiles(prev => [...prev, ...newFiles]);
    addLog('info', `Added ${newFiles.length} file(s): ${newFiles.map(f => f.name).join(', ')}`);
  }, [addLog]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const removed = prev[index];
      addLog('info', `Removed file: ${removed.name}`);
      return prev.filter((_, i) => i !== index);
    });
  }, [addLog]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    addLog('info', 'Cleared all files');
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // ── Presets ──────────────────────────────────────────────────────────────

  const applyPreset = useCallback((name: string) => {
    switch (name) {
      case 'article':
        setTitle('10 CSS Features You Should Be Using in 2026');
        setText('Native CSS nesting, scroll-driven animations, view transitions, popover API, anchor positioning, and more — all Baseline in 2026. No JavaScript needed.');
        setUrl('https://devbench-roan.vercel.app');
        break;
      case 'snippet':
        setTitle('Quick code snippet');
        setText('Check out this handy CSS trick for fluid typography:\n\nh1 { font-size: clamp(1.5rem, 4vw + 1rem, 3rem); }\n\nNo media queries needed!');
        setUrl('');
        break;
      case 'repo':
        setTitle('DevBench — Free Developer Tools');
        setText('Open-source collection of 250+ developer tools built with Next.js. JSON, CSS, regex, image tools, API playgrounds, and more.');
        setUrl('https://github.com/hermesagent42-commits/devbench-tech');
        break;
      default:
        break;
    }
    addLog('info', `Loaded preset: ${name}`);
  }, [addLog]);

  // ── Copy URL ─────────────────────────────────────────────────────────────

  const copyUrl = useCallback(async () => {
    if (!url.trim()) {
      toast.error('No URL to copy');
      return;
    }
    await navigator.clipboard.writeText(url.trim());
    toast.success('URL copied!');
    addLog('info', 'URL copied to clipboard');
  }, [url, addLog]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Web Share API Playground"
      description="Test the Web Share API — share text, links, and files directly from your browser using the native OS share sheet. 3 presets, file attachments, live event log."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          {!supportCheck.supported && (
            <div className="flex items-center gap-2 text-amber-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              Not supported in this browser
            </div>
          )}
          <a
            href={MDN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-brand-400 transition-colors ml-auto"
          >
            MDN Docs →
          </a>
        </div>
      }
    >
      {/* Info Banner */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">What is the Web Share API?</h3>
            <p className="text-sm text-slate-400">
              <code className="px-1.5 py-0.5 bg-slate-700 rounded text-brand-300 text-xs">navigator.share()</code> opens the
              operating system&apos;s native share dialog — the same one used by native apps. Users can share to messaging apps,
              email, social media, AirDrop, and more. All share targets are chosen by the user; the website never sees where
              content is shared.
            </p>
            <div className="flex items-center gap-2 mt-2">
              {supportCheck.supported ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Basic sharing supported
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Not available
                </span>
              )}
              {supportCheck.canShareFiles && (
                <span className="inline-flex items-center gap-1 text-xs text-green-400 ml-3">
                  <CheckCircle2 className="w-3.5 h-3.5" /> File sharing supported
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Form */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
            />
          </div>

          {/* Text */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to share..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none resize-none"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
                />
              </div>
              <button
                onClick={copyUrl}
                disabled={!url.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Files */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Files {!supportCheck.canShareFiles && <span className="text-xs text-slate-500">(may not be supported)</span>}
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Add Files
                <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  className="hidden"
                />
              </label>
              {files.length > 0 && (
                <button
                  onClick={clearFiles}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-900 rounded text-xs text-slate-300">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={!supportCheck.supported}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            Share via OS Share Sheet
          </button>

          {/* Presets */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick presets:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'article', label: 'Article' },
                { key: 'snippet', label: 'Code Snippet' },
                { key: 'repo', label: 'GitHub Repo' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Log Panel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Event Log</h3>
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 h-[420px] overflow-y-auto font-mono text-xs space-y-1.5">
            {logs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <Monitor className="w-8 h-8 opacity-30" />
                <p>Share events will appear here</p>
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                <span className={
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }>
                  {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : 'ℹ'}
                </span>
                <span className="text-slate-400 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Reference */}
      <div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-slate-400 hover:text-brand-400 transition-colors underline"
        >
          {showInfo ? 'Hide API Reference' : 'Show API Reference'}
        </button>
        {showInfo && (
          <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Web Share API Usage</h3>
            <div>
              <p className="text-xs text-slate-400 mb-2">Basic text sharing:</p>
              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
{`// Check support
if (!navigator.share) {
  console.log('Web Share not supported');
  return;
}

// Share text
try {
  await navigator.share({
    title: 'My Page',
    text: 'Check out this article!',
    url: 'https://example.com',
  });
  console.log('Shared successfully');
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('User cancelled');
  } else {
    console.error('Share failed:', err);
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">File sharing:</p>
              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
{`const file = new File(['hello'], 'greeting.txt', { type: 'text/plain' });

if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({
    title: 'My File',
    files: [file],
  });
}`}
              </pre>
            </div>
            <div className="text-xs text-slate-400">
              <p><strong>Requirements:</strong> HTTPS (or localhost), user gesture (click), secure context.</p>
              <p className="mt-1"><strong>Browser support:</strong> Chrome 61+ (desktop 89+), Edge 89+, Safari 12.1+ (desktop 15+), Samsung Internet 8.0+. Not in Firefox (in development).</p>
              <p className="mt-1"><strong>Note:</strong> On desktop, <code className="px-1 bg-slate-700 rounded">navigator.share()</code> opens a popup near the triggering element.</p>
              <div className="flex gap-3 mt-2">
                <a href={MDN_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">MDN Docs →</a>
                <a href={CANIUSE_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Can I Use →</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

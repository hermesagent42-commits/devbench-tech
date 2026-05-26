'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Plug,
  Unplug,
  Send,
  Trash2,
  Copy,
  Check,
  Clock,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Braces,
  Type,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  timestamp: number;
  direction: 'sent' | 'received';
  content: string;
  truncated: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const PRESET_ENDPOINTS = [
  { label: 'Echo Server (echo.websocket.org)', url: 'wss://ws.postman-echo.com/raw' },
  { label: 'Echo Server (ws.ifelse.io)', url: 'wss://ws.ifelse.io' },
  { label: 'PieSocket Demo', url: 'wss://demo.piesocket.com/v3/channel_1?api_key=oCdCMcMPQpbvNjUIzqtvF1d2X2okWpDQj4AwARJuAgtjhzKxVEjQU6IdCjwm&notify_self' },
];

const MAX_MESSAGE_LENGTH = 2000;
const MAX_LOG_ENTRIES = 200;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncateContent(content: string): { text: string; truncated: boolean } {
  if (content.length <= MAX_MESSAGE_LENGTH) return { text: content, truncated: false };
  return {
    text: content.slice(0, MAX_MESSAGE_LENGTH) + `\n\n... [truncated ${content.length - MAX_MESSAGE_LENGTH} characters]`,
    truncated: true,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WebSocketTester() {
  const [url, setUrl] = useState('wss://ws.postman-echo.com/raw');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [jsonMode, setJsonMode] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const msgIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Add message helper ───────────────────────────────────────────────────

  const addMessage = useCallback((direction: 'sent' | 'received', content: string) => {
    msgIdRef.current += 1;
    const { text, truncated } = truncateContent(content);
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: msgIdRef.current,
          timestamp: Date.now(),
          direction,
          content: text,
          truncated,
        },
      ];
      if (next.length > MAX_LOG_ENTRIES) return next.slice(next.length - MAX_LOG_ENTRIES);
      return next;
    });
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!url.trim()) {
      toast.error('Please enter a WebSocket URL');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');
    setErrorMessage('');
    setMessages([]);
    msgIdRef.current = 0;

    try {
      const ws = new WebSocket(url.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        addMessage('received', '🟢 Connection established');
      };

      ws.onmessage = (event) => {
        let content = event.data;
        if (typeof content === 'string') {
          // If it looks like JSON, pretty-print it
          try {
            const parsed = JSON.parse(content);
            content = JSON.stringify(parsed, null, 2);
          } catch {
            // Not JSON, keep as-is
          }
        } else if (content instanceof Blob) {
          content = '[Binary Blob — ' + content.size + ' bytes]';
        } else if (content instanceof ArrayBuffer) {
          content = '[Binary ArrayBuffer — ' + content.byteLength + ' bytes]';
        }
        addMessage('received', content);
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMessage('WebSocket error — check the URL and ensure the server is reachable');
        addMessage('received', '🔴 Connection error');
      };

      ws.onclose = (ev) => {
        setStatus('disconnected');
        const code = ev.code;
        const reason = ev.reason ? ` — ${ev.reason}` : '';
        addMessage('received', `🔴 Connection closed (code: ${code}${reason})`);
        wsRef.current = null;
      };
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to create WebSocket');
    }
  }, [url, addMessage]);

  // ── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Not connected');
      return;
    }

    let payload = inputMessage.trim();
    if (!payload) return;

    if (jsonMode) {
      try {
        JSON.parse(payload); // validate
        addMessage('sent', JSON.stringify(JSON.parse(payload), null, 2));
      } catch {
        toast.error('Invalid JSON');
        return;
      }
    } else {
      addMessage('sent', payload);
    }

    wsRef.current.send(payload);
    setInputMessage('');
  }, [inputMessage, jsonMode, addMessage]);

  // ── Keyboard shortcut ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Copy message ─────────────────────────────────────────────────────────

  const copyMessage = useCallback((content: string, id: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      toast.success('Copied');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ── Clear log ────────────────────────────────────────────────────────────

  const clearLog = useCallback(() => {
    setMessages([]);
    msgIdRef.current = 0;
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ── Status indicator config ──────────────────────────────────────────────

  const statusConfig = {
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'text-slate-400',
      bg: 'bg-slate-700/30',
      dot: 'bg-slate-500',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      dot: 'bg-amber-500 animate-pulse',
    },
    connected: {
      icon: Wifi,
      label: 'Connected',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      dot: 'bg-emerald-500',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      dot: 'bg-red-500',
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <ToolLayout
      title="WebSocket Tester"
      description="Test WebSocket connections — connect, send, and receive messages in real-time. Pure client-side, no server needed."
    >
      {/* ── Connection Bar ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* URL Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://echo.websocket.org"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
              disabled={status === 'connected' || status === 'connecting'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && status === 'disconnected') connect();
              }}
            />
          </div>

          {/* Connect / Disconnect */}
          <button
            onClick={status === 'connected' ? disconnect : connect}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              status === 'connected'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : status === 'connected' ? (
              <>
                <Unplug className="w-4 h-4" />
                Disconnect
              </>
            ) : (
              <>
                <Plug className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
        </div>

        {/* Preset endpoints */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center mr-1">Presets:</span>
          {PRESET_ENDPOINTS.map((preset) => (
            <button
              key={preset.url}
              onClick={() => {
                if (status !== 'connected' && status !== 'connecting') {
                  setUrl(preset.url);
                }
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-600/50 font-mono truncate max-w-[240px]"
              title={preset.url}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (status !== 'connected' && status !== 'connecting') {
                setUrl(`wss://echo.websocket.org`);
              }
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-600/50 font-mono"
          >
            echo.websocket.org
          </button>
        </div>

        {/* Status Bar */}
        <div className={`rounded-lg border border-slate-700/50 px-4 py-2.5 ${currentStatus.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`} />
              <StatusIcon className={`w-4 h-4 ${currentStatus.color}`} />
              <span className={`text-sm font-medium ${currentStatus.color}`}>{currentStatus.label}</span>
            </div>
            {status === 'error' && errorMessage && (
              <span className="text-xs text-red-300/80">{errorMessage}</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {messages.filter((m) => m.direction !== 'sent' && !m.content.startsWith('🟢') && !m.content.startsWith('🔴')).length} messages
          </div>
        </div>
      </div>

      {/* ── Message Sender ─────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setJsonMode(false)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              !jsonMode
                ? 'bg-slate-700 text-white border border-slate-500'
                : 'bg-transparent text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text
          </button>
          <button
            onClick={() => setJsonMode(true)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              jsonMode
                ? 'bg-slate-700 text-white border border-slate-500'
                : 'bg-transparent text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Braces className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              jsonMode
                ? '{"type": "greeting", "message": "hello"}'
                : 'Type your message and press Enter to send...'
            }
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors resize-none"
            rows={3}
            disabled={status !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={status !== 'connected' || !inputMessage.trim()}
            className="self-end px-4 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Message Log ────────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Message Log</h3>
          <button
            onClick={clearLog}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        <div className="bg-slate-850 border border-slate-700/50 rounded-lg overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <WifiOff className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1 opacity-70">Connect to a WebSocket server to start testing</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`group border-b border-slate-700/30 last:border-b-0 ${
                    msg.direction === 'sent'
                      ? 'bg-brand-500/[0.03]'
                      : msg.content.startsWith('🔴')
                      ? 'bg-red-500/[0.04]'
                      : msg.content.startsWith('🟢')
                      ? 'bg-emerald-500/[0.04]'
                      : ''
                  }`}
                >
                  <div className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {msg.direction === 'sent' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-400" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            msg.direction === 'sent' ? 'text-brand-400' : 'text-slate-400'
                          }`}
                        >
                          {msg.direction === 'sent' ? 'SENT' : 'RECEIVED'}
                        </span>
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                        {msg.truncated && (
                          <span className="text-xs text-amber-500 font-medium">(truncated)</span>
                        )}
                      </div>
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/50"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed pl-5">
                      {msg.content}
                    </pre>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

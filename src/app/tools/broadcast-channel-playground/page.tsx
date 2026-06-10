'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, MessageSquare, Radio, Wifi, WifiOff, Send, Clock, Hash, FileText, Code2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChannelMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  channel: string;
  data: unknown;
  dataType: string;
  timestamp: number;
  origin?: string;
}

interface ChannelState {
  name: string;
  connected: boolean;
}

const RANDOM_TOPICS = [
  'ping', 'sync-state', 'user-auth', 'theme-change', 'cart-update', 'notification',
  'chat-message', 'cursor-position', 'document-save', 'tab-focus', 'window-close',
  'data-refresh', 'form-draft', 'playback-state', 'search-query',
];

const SAMPLE_MESSAGES = [
  { type: 'string', value: 'Hello from another tab!' },
  { type: 'object', value: { action: 'navigate', url: '/dashboard', params: { id: 42 } } },
  { type: 'object', value: { type: 'SET_THEME', payload: { mode: 'dark', accent: '#6366f1' } } },
  { type: 'object', value: { event: 'USER_LOGIN', user: { id: 'u_789', role: 'admin' }, timestamp: Date.now() } },
  { type: 'object', value: { sync: 'cart', items: [{ id: 1, qty: 3 }, { id: 2, qty: 1 }], total: 149.97 } },
  { type: 'string', value: 'Are you still there?' },
];

export default function BroadcastChannelPlaygroundPage() {
  const [channels, setChannels] = useState<ChannelState[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [newChannelName, setNewChannelName] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState<'string' | 'object'>('string');
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('');

  const channelRefs = useRef<Map<string, BroadcastChannel>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup channels on unmount
  useEffect(() => {
    const refs = channelRefs.current;
    return () => {
      refs.forEach((ch) => ch.close());
    };
  }, []);

  const addSystemMessage = useCallback((channel: string, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'system',
        channel,
        data: text,
        dataType: 'system',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const connectChannel = useCallback(
    (name: string) => {
      if (!name.trim()) return;
      const trimmed = name.trim();

      if (channelRefs.current.has(trimmed)) {
        toast.error(`Already connected to "${trimmed}"`);
        return;
      }

      try {
        const bc = new BroadcastChannel(trimmed);

        bc.onmessage = (event: MessageEvent) => {
          const dataType =
            event.data instanceof ArrayBuffer
              ? 'ArrayBuffer'
              : event.data instanceof Blob
              ? 'Blob'
              : typeof event.data === 'object' && event.data !== null
              ? 'object'
              : typeof event.data;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: 'received',
              channel: trimmed,
              data: dataType === 'object' ? event.data : String(event.data),
              dataType,
              timestamp: Date.now(),
              origin: event.origin,
            },
          ]);
        };

        bc.onmessageerror = () => {
          addSystemMessage(trimmed, '⚠️ Message deserialization error — received data could not be deserialized');
        };

        channelRefs.current.set(trimmed, bc);
        setChannels((prev) => [...prev, { name: trimmed, connected: true }]);
        setActiveChannel(trimmed);
        addSystemMessage(trimmed, `🟢 Connected to channel "${trimmed}"`);
        toast.success(`Connected to "${trimmed}"`);
      } catch (err) {
        toast.error(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [addSystemMessage]
  );

  const disconnectChannel = useCallback(
    (name: string) => {
      const bc = channelRefs.current.get(name);
      if (bc) {
        bc.close();
        channelRefs.current.delete(name);
        addSystemMessage(name, `🔴 Disconnected from channel "${name}"`);
      }
      setChannels((prev) => prev.filter((c) => c.name !== name));
      if (activeChannel === name) {
        const remaining = channels.filter((c) => c.name !== name);
        setActiveChannel(remaining[0]?.name ?? '');
      }
    },
    [channels, activeChannel, addSystemMessage]
  );

  const sendMessage = useCallback(() => {
    if (!activeChannel || !messageInput.trim()) return;

    const bc = channelRefs.current.get(activeChannel);
    if (!bc) {
      toast.error('Channel not connected');
      return;
    }

    let data: unknown;
    let dataType: string;

    if (messageType === 'object') {
      try {
        data = JSON.parse(messageInput);
        dataType = 'object';
      } catch {
        toast.error('Invalid JSON');
        return;
      }
    } else {
      data = messageInput;
      dataType = 'string';
    }

    bc.postMessage(data);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'sent',
        channel: activeChannel,
        data,
        dataType,
        timestamp: Date.now(),
      },
    ]);

    setMessageInput('');
  }, [activeChannel, messageInput, messageType]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    toast.success('Messages cleared');
  }, []);

  const copyMessage = useCallback((msg: ChannelMessage) => {
    const text =
      typeof msg.data === 'string'
        ? msg.data
        : JSON.stringify(msg.data, null, 2);
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, []);

  const filteredMessages = useMemo(() => {
    if (!channelFilter) return messages;
    return messages.filter((m) => m.channel === channelFilter);
  }, [messages, channelFilter]);

  const messageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      counts[m.channel] = (counts[m.channel] || 0) + 1;
    });
    return counts;
  }, [messages]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <ToolLayout
      title="BroadcastChannel API Playground"
      description="Experiment with cross-tab messaging using the BroadcastChannel API. Connect to channels, send messages, and observe real-time communication between browser tabs, iframes, and workers."
    >
      {/* Channel Management */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-brand-400" />
          <h2 className="text-white font-semibold">Channels</h2>
        </div>

        {/* New channel input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newChannelName.trim()) {
                connectChannel(newChannelName);
                setNewChannelName('');
              }
            }}
            placeholder="Channel name (e.g. app-sync)"
            className="input flex-1 text-sm"
          />
          <button
            onClick={() => {
              connectChannel(newChannelName);
              setNewChannelName('');
            }}
            disabled={!newChannelName.trim()}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Connect
          </button>
        </div>

        {/* Suggested channels */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {RANDOM_TOPICS.slice(0, 8).map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setNewChannelName(topic);
                connectChannel(topic);
                setNewChannelName('');
              }}
              className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Active channels */}
        {channels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => (
              <button
                key={ch.name}
                onClick={() => setActiveChannel(ch.name)}
                onDoubleClick={() => disconnectChannel(ch.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  activeChannel === ch.name
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-slate-700/40 text-slate-300 border border-slate-600/30 hover:border-slate-500/50'
                }`}
              >
                <Wifi className="w-3 h-3" />
                <span className="font-mono">{ch.name}</span>
                <span className="text-xs opacity-60">({messageCounts[ch.name] ?? 0})</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            No channels connected. Open this page in another tab and connect to the same channel to see cross-tab messaging in action.
          </p>
        )}
      </div>

      {/* Message Composer */}
      {activeChannel && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">
              Send Message to &ldquo;<span className="font-mono text-brand-400">{activeChannel}</span>&rdquo;
            </h3>
          </div>

          {/* Message type toggle */}
          <div className="flex gap-1 mb-3 p-0.5 rounded-lg bg-slate-700/40 w-fit">
            {(['string', 'object'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMessageType(type)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  messageType === type ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'string' ? 'Text' : 'JSON'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                messageType === 'string'
                  ? 'Type a message... (Ctrl+Enter to send)'
                  : '{"key": "value"} — Ctrl+Enter to send'
              }
              className="input flex-1 text-sm min-h-[60px] resize-y font-mono"
              rows={3}
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="btn-primary self-end flex items-center gap-1.5 text-sm"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>

          {/* Quick fills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs text-slate-500 mr-1 self-center">Quick:</span>
            {SAMPLE_MESSAGES.filter((s) => s.type === messageType).map((sample, i) => (
              <button
                key={i}
                onClick={() => setMessageInput(typeof sample.value === 'string' ? sample.value : JSON.stringify(sample.value))}
                className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors max-w-[200px] truncate"
                title={typeof sample.value === 'string' ? sample.value : JSON.stringify(sample.value)}
              >
                {typeof sample.value === 'string'
                  ? sample.value.slice(0, 30) + (sample.value.length > 30 ? '...' : '')
                  : 'JSON payload'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-400" />
            <h2 className="text-white font-semibold">Messages</h2>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
              {filteredMessages.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Channel filter */}
            {channels.length > 1 && (
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-xs bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-slate-300"
              >
                <option value="">All channels</option>
                {channels.map((ch) => (
                  <option key={ch.name} value={ch.name}>
                    {ch.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={clearMessages}
              className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="max-h-[500px] overflow-y-auto space-y-1" style={{ scrollBehavior: 'smooth' }}>
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {channels.length === 0
                  ? 'Connect to a channel above to get started.'
                  : 'No messages yet. Send a message or open this page in another tab.'}
              </p>
              {channels.length > 0 && (
                <p className="text-slate-600 text-xs mt-2">
                  💡 Open another browser tab with this same URL and connect to the same channel
                </p>
              )}
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isExpanded = expandedMessage === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`rounded-lg border transition-colors ${
                    msg.type === 'sent'
                      ? 'bg-brand-500/5 border-brand-500/20'
                      : msg.type === 'received'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-500/5 border-slate-500/15'
                  }`}
                >
                  <div
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    onClick={() => setExpandedMessage(isExpanded ? null : msg.id)}
                  >
                    {/* Type indicator */}
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        msg.type === 'sent' ? 'bg-brand-400' : msg.type === 'received' ? 'bg-emerald-400' : 'bg-slate-400'
                      }`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${
                            msg.type === 'sent' ? 'text-brand-400' : msg.type === 'received' ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {msg.type === 'sent' ? 'SENT' : msg.type === 'received' ? 'RECEIVED' : 'SYSTEM'}
                        </span>
                        {msg.type !== 'system' && (
                          <>
                            <span className="text-xs text-slate-500 font-mono">{msg.channel}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-mono">
                              {msg.dataType}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-slate-600 ml-auto" title={formatTime(msg.timestamp)}>
                          {formatRelative(msg.timestamp)}
                        </span>
                      </div>

                      <div className="mt-0.5 text-sm text-slate-300 truncate font-mono">
                        {typeof msg.data === 'string'
                          ? msg.data.slice(0, 120) + (msg.data.length > 120 ? '...' : '')
                          : JSON.stringify(msg.data).slice(0, 120) + '...'}
                      </div>

                      {msg.origin && (
                        <div className="text-xs text-slate-500 mt-0.5">origin: {msg.origin}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {msg.type !== 'system' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyMessage(msg);
                          }}
                          className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
                          title="Copy message data"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-700/30 mx-3">
                      <div className="mt-3 bg-slate-900/80 rounded-md p-3 overflow-x-auto">
                        <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Full message data
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyMessage(msg);
                            }}
                            className="ml-auto px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-[300px]">
                          {typeof msg.data === 'string'
                            ? msg.data
                            : JSON.stringify(msg.data, null, 2)}
                        </pre>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(msg.timestamp).toISOString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {msg.id.slice(0, 8)}...
                        </span>
                        {msg.type !== 'system' && (
                          <span className="flex items-center gap-1">
                            <Code2 className="w-3 h-3" /> {msg.dataType}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Info panel */}
      <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-white mb-2">About BroadcastChannel API</h3>
        <div className="text-xs text-slate-400 space-y-1.5">
          <p>The BroadcastChannel API enables simple cross-context communication between windows, tabs, iframes, and workers on the same origin.</p>
          <p>
            <strong className="text-slate-300">Key facts:</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Works across tabs, windows, iframes, and web workers on the same origin</li>
            <li>Uses structured clone algorithm — supports objects, arrays, Maps, Sets, ArrayBuffer</li>
            <li>No server required — pure client-side messaging</li>
            <li>Channel names are strings — any context that connects to the same name receives messages</li>
            <li>Built into all modern browsers — <strong className="text-slate-300">Baseline: Widely available since 2022</strong></li>
          </ul>
          <p className="mt-2">
            💡 <strong className="text-slate-300">Try it:</strong> Open this page in two browser tabs, connect both to the same channel (e.g. &ldquo;app-sync&rdquo;), and send messages back and forth.
          </p>
          <p>
            ⚠️ <strong className="text-slate-300">Note:</strong> BroadcastChannel only works on the same origin. Use `window.postMessage()` for cross-origin communication or `MessageChannel` for direct port-based messaging.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

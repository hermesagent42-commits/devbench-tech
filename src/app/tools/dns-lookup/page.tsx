'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, Clock, ExternalLink, AlertCircle, Server, Globe, ChevronDown, Trash2, History, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'SRV' | 'CAA';

interface DNSAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question?: { name: string; type: number }[];
  Answer?: DNSAnswer[];
  Authority?: DNSAnswer[];
}

interface LookupEntry {
  domain: string;
  recordType: RecordType;
  timestamp: number;
  status: number;
  answers: DNSAnswer[];
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'NOERROR — Success', color: 'text-green-400' },
  1: { label: 'FORMERR — Format Error', color: 'text-yellow-400' },
  2: { label: 'SERVFAIL — Server Failure', color: 'text-red-400' },
  3: { label: 'NXDOMAIN — Non-Existent Domain', color: 'text-red-400' },
  4: { label: 'NOTIMP — Not Implemented', color: 'text-yellow-400' },
  5: { label: 'REFUSED — Query Refused', color: 'text-red-400' },
};

const RECORD_TYPES: { value: RecordType; label: string; description: string }[] = [
  { value: 'A', label: 'A', description: 'IPv4 address record' },
  { value: 'AAAA', label: 'AAAA', description: 'IPv6 address record' },
  { value: 'CNAME', label: 'CNAME', description: 'Canonical name alias' },
  { value: 'MX', label: 'MX', description: 'Mail exchange record' },
  { value: 'TXT', label: 'TXT', description: 'Text record' },
  { value: 'NS', label: 'NS', description: 'Nameserver record' },
  { value: 'SOA', label: 'SOA', description: 'Start of authority' },
  { value: 'PTR', label: 'PTR', description: 'Reverse DNS pointer' },
  { value: 'CAA', label: 'CAA', description: 'Certificate authority authorization' },
  { value: 'SRV', label: 'SRV', description: 'Service locator record' },
];

const TYPE_NUMBER_MAP: Record<RecordType, number> = {
  A: 1, AAAA: 28, CNAME: 5, MX: 15, TXT: 16, NS: 2, SOA: 6, PTR: 12, SRV: 33, CAA: 257,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DNSLookupPage() {
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DNSResponse | null>(null);
  const [recentLookups, setRecentLookups] = useState<LookupEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load recent lookups from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dns-lookup-history');
      if (stored) setRecentLookups(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = useCallback((entry: LookupEntry) => {
    setRecentLookups((prev) => {
      const updated = [entry, ...prev.filter((e) => !(e.domain === entry.domain && e.recordType === entry.recordType))].slice(0, 20);
      try { localStorage.setItem('dns-lookup-history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecentLookups([]);
    try { localStorage.removeItem('dns-lookup-history'); } catch { /* ignore */ }
    toast.success('History cleared');
  }, []);

  const lookup = useCallback(async () => {
    const trimmed = domain.trim();
    if (!trimmed) {
      setError('Please enter a domain name.');
      return;
    }
    if (!isValidDomain(trimmed)) {
      setError('Please enter a valid domain name (e.g., example.com).');
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(trimmed)}&type=${TYPE_NUMBER_MAP[recordType]}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/dns-json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data: DNSResponse = await response.json();
      setResult(data);

      const answers = data.Answer || [];
      saveToHistory({ domain: trimmed, recordType, timestamp: Date.now(), status: data.Status, answers });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DNS lookup failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [domain, recordType, saveToHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) lookup();
    },
    [lookup, loading]
  );

  const copyToClipboard = useCallback(async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const loadFromHistory = useCallback((entry: LookupEntry) => {
    setDomain(entry.domain);
    setRecordType(entry.recordType);
    setResult({ Status: entry.status, TC: false, RD: true, RA: true, AD: false, CD: false, Answer: entry.answers });
    setError(null);
  }, []);

  const selectedType = RECORD_TYPES.find((t) => t.value === recordType);

  return (
    <ToolLayout
      title="DNS Lookup"
      description="Query DNS records for any domain using Cloudflare's public DNS-over-HTTPS resolver. Supports A, AAAA, CNAME, MX, TXT, NS, SOA, PTR, CAA, and SRV records."
    >
      {/* ── Input Row ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Domain input */}
        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setError(null); setResult(null); }}
            onKeyDown={handleKeyDown}
            placeholder="example.com"
            className="w-full pl-10 pr-4 py-3 bg-surface border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono text-sm transition-colors"
            autoFocus
          />
        </div>

        {/* Record type dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-3 bg-surface border border-slate-700 rounded-lg text-slate-200 hover:border-slate-600 transition-colors min-w-[120px] justify-between"
          >
            <span className="font-mono text-sm font-semibold text-brand-400">{recordType}</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-1 w-64 bg-surface border border-slate-700 rounded-lg shadow-xl z-20 py-1 max-h-80 overflow-y-auto">
                {RECORD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => { setRecordType(type.value); setShowDropdown(false); setResult(null); setError(null); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors flex items-center justify-between ${
                      type.value === recordType ? 'bg-slate-700/30 text-brand-400' : 'text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-sm font-semibold">{type.label}</span>
                    <span className="text-xs text-slate-500">{type.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lookup button */}
        <button
          onClick={lookup}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading ? 'Looking up...' : 'Lookup'}
        </button>
      </div>

      {/* ── Error Display ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Status Bar ─────────────────────────────────────────────── */}
      {result && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className={`font-mono font-semibold ${STATUS_MAP[result.Status]?.color || 'text-slate-400'}`}>
            {STATUS_MAP[result.Status]?.label || `Status ${result.Status}`}
          </span>
          {result.TC && <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded">Truncated</span>}
          {result.AD && <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded">Authenticated Data</span>}
          {result.RA && <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-0.5 rounded">Recursion Available</span>}
        </div>
      )}

      {/* ── Results Table ──────────────────────────────────────────── */}
      {result && result.Answer && result.Answer.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Answer Records ({result.Answer.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">TTL</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Value</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider w-16">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {result.Answer.map((record, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                      {record.name.replace(/\.$/, '')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-semibold">
                        {Object.keys(TYPE_NUMBER_MAP).find((k) => TYPE_NUMBER_MAP[k as RecordType] === record.type) || record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {record.TTL}
                        <span className="text-slate-600 text-xs">({formatTTL(record.TTL)})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200 break-all">
                      {record.data}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => copyToClipboard(record.data, i)}
                        className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-500 hover:text-slate-300"
                        title="Copy value"
                      >
                        {copiedIndex === i ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Authority Section ──────────────────────────────────────── */}
      {result && result.Authority && result.Authority.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Authority Records ({result.Authority.length})
          </h3>
          <div className="space-y-2">
            {result.Authority.map((record, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <span className="font-mono text-xs text-slate-500 shrink-0">{record.name.replace(/\.$/, '')}</span>
                <span className="font-mono text-sm text-slate-300 break-all">{record.data}</span>
                <span className="text-xs text-slate-600 ml-auto shrink-0">TTL: {formatTTL(record.TTL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No Results (but success) ───────────────────────────────── */}
      {result && result.Status === 0 && (!result.Answer || result.Answer.length === 0) && (
        <div className="text-center py-12 bg-slate-800/20 rounded-lg border border-slate-700/30">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No {recordType} records found for this domain.</p>
          <p className="text-slate-600 text-sm mt-1">Try a different record type.</p>
        </div>
      )}

      {/* ── Recent Lookups ─────────────────────────────────────────── */}
      {recentLookups.length > 0 && (
        <div className="mt-10 pt-8 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Lookups
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentLookups.slice(0, 12).map((entry, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(entry)}
                className="group flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/50 hover:border-brand-500/30 rounded-lg text-sm transition-all"
              >
                <span className="font-mono text-slate-300 group-hover:text-brand-400 transition-colors">{entry.domain}</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-brand-500/20 text-brand-400 font-semibold">
                  {entry.recordType}
                </span>
                <span className="text-xs text-slate-600">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Info Footer ────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <div className="flex items-start gap-3 text-sm text-slate-500">
          <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Queries are resolved via{' '}
            <a href="https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
              Cloudflare&apos;s 1.1.1.1 DNS-over-HTTPS
            </a>{' '}
            resolver. All lookups are performed directly from your browser — no data is stored or logged by DevBench.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

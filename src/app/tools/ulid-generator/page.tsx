'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Clock, Shuffle, RefreshCw, Hash, Timer, Info, Fingerprint, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ── ULID Implementation (zero-dependency) ────────────────────────────────────

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(time: number): string {
  let str = '';
  for (let i = 0; i < TIME_LEN; i++) {
    str = ENCODING[time % ENCODING_LEN] + str;
    time = Math.floor(time / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(bytes: number[]): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += ENCODING[bytes[i] % ENCODING_LEN];
  }
  return str;
}

function getRandomBytes(count: number): number[] {
  const arr = new Uint8Array(count);
  crypto.getRandomValues(arr);
  return Array.from(arr);
}

function ulidFromTime(time: number): string {
  return encodeTime(time) + encodeRandom(getRandomBytes(RANDOM_LEN));
}

function generateUlid(): string {
  return ulidFromTime(Date.now());
}

function decodeTime(ulid: string): number | null {
  if (ulid.length < TIME_LEN) return null;
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ENCODING.indexOf(ulid[i].toUpperCase());
    if (idx === -1) return null;
    time = time * ENCODING_LEN + idx;
  }
  return time;
}

function isValidUlid(ulid: string): boolean {
  if (ulid.length !== TIME_LEN + RANDOM_LEN) return false;
  for (const ch of ulid) {
    if (!ENCODING.includes(ch.toUpperCase())) return false;
  }
  return true;
}

function generateBatch(count: number): string[] {
  const now = Date.now();
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(ulidFromTime(now + i));
  }
  return result;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function UlidGeneratorPage() {
  const [ulids, setUlids] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(1);
  const [inspectUlid, setInspectUlid] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generate = useCallback(() => {
    setUlids(generateBatch(batchSize));
  }, [batchSize]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyUlid = useCallback(async (ulid: string) => {
    await navigator.clipboard.writeText(ulid);
    setCopiedId(ulid);
    toast.success('ULID copied!');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(ulids.join('\n'));
    toast.success(`${ulids.length} ULID(s) copied!`);
  }, [ulids]);

  const decoded = useMemo(() => {
    if (!inspectUlid) return null;
    const time = decodeTime(inspectUlid);
    const valid = isValidUlid(inspectUlid);
    return { time, valid, date: time ? new Date(time) : null };
  }, [inspectUlid]);

  return (
    <ToolLayout
      title="ULID Generator"
      description="Generate sortable, URL-safe unique identifiers. ULIDs are time-based and lexicographically sortable — a modern alternative to UUIDs."
    >
      <div className="space-y-8">
        {/* Generator section */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Count:</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              >
                {[1, 5, 10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={generate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </button>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-sm">
            {ulids.map((ulid, i) => (
              <div
                key={ulid + i}
                className="flex items-center justify-between group px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-6 tabular-nums">#{i + 1}</span>
                  <span className="text-slate-200 break-all">
                    <span className="text-brand-400">{ulid.slice(0, 10)}</span>
                    <span className="text-slate-300">{ulid.slice(10)}</span>
                  </span>
                </div>
                <button
                  onClick={() => copyUlid(ulid)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-brand-400 transition-all"
                  title="Copy ULID"
                >
                  {copiedId === ulid ? <Zap className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* About ULID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard icon={Timer} title="Time-Based" description="First 10 chars encode a 48-bit timestamp (ms precision). Sorting alphabetically = sorting by time." />
          <InfoCard icon={Shuffle} title="80 Bits of Randomness" description="Last 16 chars are crypto-random. ~1.2 septillion possible IDs per millisecond." />
          <InfoCard icon={Fingerprint} title="URL-Safe" description="Uses Crockford Base32 — no ambiguous characters (I, L, O, U). Safe for URLs, filenames, and databases." />
        </div>

        {/* ULID Inspector */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Hash className="w-5 h-5 text-brand-400" />
            ULID Inspector
          </h3>
          <input
            type="text"
            value={inspectUlid}
            onChange={(e) => setInspectUlid(e.target.value.toUpperCase())}
            placeholder="Paste a ULID to inspect (e.g. 01JX4A5B6C7D8E9F0G1H)"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-200 font-mono placeholder-slate-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          />

          {inspectUlid && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Valid:</span>
                <span className={`text-sm font-medium ${decoded?.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {decoded?.valid ? 'Yes ✓' : 'Invalid'}
                </span>
              </div>
              {decoded?.valid && decoded?.date && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Timestamp (ms):</span>
                    <span className="text-sm text-slate-200 font-mono">{decoded.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Date/Time (UTC):</span>
                    <span className="text-sm text-slate-200 font-mono">{decoded.date.toISOString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Date/Time (Local):</span>
                    <span className="text-sm text-slate-200 font-mono">{decoded.date.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ULID vs UUID comparison */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-400" />
            ULID vs UUID
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium">Feature</th>
                  <th className="text-left py-2 px-4 text-brand-400 font-medium">ULID</th>
                  <th className="text-left py-2 pl-4 text-slate-400 font-medium">UUID v4</th>
                  <th className="text-left py-2 pl-4 text-slate-400 font-medium">UUID v7</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">Sortable by time</td>
                  <td className="py-2 px-4 text-green-400">Yes ✓</td>
                  <td className="py-2 pl-4 text-red-400">No ✗</td>
                  <td className="py-2 pl-4 text-green-400">Yes ✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">Length</td>
                  <td className="py-2 px-4 font-mono">26 chars</td>
                  <td className="py-2 pl-4 font-mono">36 chars</td>
                  <td className="py-2 pl-4 font-mono">36 chars</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">URL-safe</td>
                  <td className="py-2 px-4 text-green-400">Yes ✓</td>
                  <td className="py-2 pl-4">Hyphens only</td>
                  <td className="py-2 pl-4">Hyphens only</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 pr-4">Case-insensitive</td>
                  <td className="py-2 px-4 text-green-400">Yes ✓</td>
                  <td className="py-2 pl-4 text-red-400">No ✗</td>
                  <td className="py-2 pl-4 text-red-400">No ✗</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Collision risk</td>
                  <td className="py-2 px-4">~0 (time + random)</td>
                  <td className="py-2 pl-4">~0 (random)</td>
                  <td className="py-2 pl-4">~0 (time + random)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

function InfoCard({ icon: Icon, title, description }: {
  icon: typeof Timer;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-brand-400" />
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

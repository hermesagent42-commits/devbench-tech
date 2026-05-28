'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Network, Copy, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// Pure IPv4 CIDR / Subnet Calculator
// ============================================================

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    throw new Error('Invalid IP');
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

function prefixToMask(prefix: number): number {
  if (prefix === 0) return 0;
  return ((0xffffffff << (32 - prefix)) >>> 0);
}

function maskToPrefix(mask: number): number {
  // Count leading 1s
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((mask >>> i) & 1) count++;
    else break;
  }
  return count;
}

interface SubnetResult {
  cidr: string;
  ip: string;
  prefix: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  ipBinary: string;
  maskBinary: string;
  ipClass: string;
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
}

function calculateSubnet(input: string): SubnetResult | null {
  try {
    // Parse "ip/prefix" or just "ip" or "ip mask"
    let ipStr: string;
    let prefix: number;

    const trimmed = input.trim();

    if (trimmed.includes('/')) {
      // CIDR notation: 192.168.1.0/24
      const [part1, part2] = trimmed.split('/');
      ipStr = part1.trim();
      prefix = parseInt(part2, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    } else if (trimmed.includes(' ')) {
      // IP + subnet mask: "192.168.1.0 255.255.255.0"
      const parts = trimmed.split(/\s+/);
      if (parts.length !== 2) return null;
      ipStr = parts[0].trim();
      const maskInt = ipToInt(parts[1].trim());
      prefix = maskToPrefix(maskInt);
    } else {
      ipStr = trimmed;
      prefix = 32;
    }

    const ipInt = ipToInt(ipStr);
    const maskInt = prefixToMask(prefix);
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    const totalHosts = prefix === 32 ? 1 : (prefix === 31 ? 2 : Math.pow(2, 32 - prefix));
    const usableHosts = prefix >= 31 ? 0 : totalHosts - 2;

    const firstHost = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
    const lastHost = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

    // Binary representations
    const ipBinary = ipInt.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim();
    const maskBinary = maskInt.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim();

    // IP class
    const firstOctet = (ipInt >>> 24) & 0xff;
    let ipClass = 'E';
    if (firstOctet < 128) ipClass = 'A';
    else if (firstOctet < 192) ipClass = 'B';
    else if (firstOctet < 224) ipClass = 'C';
    else if (firstOctet < 240) ipClass = 'D';

    // Special ranges
    const isLoopback = firstOctet === 127;
    const isLinkLocal = firstOctet === 169 && ((ipInt >>> 16) & 0xff) === 254;
    const isPrivate =
      (firstOctet === 10) ||
      (firstOctet === 172 && ((ipInt >>> 16) & 0xff) >= 16 && ((ipInt >>> 16) & 0xff) <= 31) ||
      (firstOctet === 192 && ((ipInt >>> 16) & 0xff) === 168);

    return {
      cidr: `${intToIp(networkInt)}/${prefix}`,
      ip: intToIp(ipInt),
      prefix,
      subnetMask: intToIp(maskInt),
      wildcardMask: intToIp(wildcardInt),
      networkAddress: intToIp(networkInt),
      broadcastAddress: intToIp(broadcastInt),
      firstHost: prefix >= 31 ? 'N/A' : intToIp(firstHost),
      lastHost: prefix >= 31 ? 'N/A' : intToIp(lastHost),
      totalHosts,
      usableHosts,
      ipBinary,
      maskBinary,
      ipClass,
      isPrivate,
      isLoopback,
      isLinkLocal,
    };
  } catch {
    return null;
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PRESETS = [
  { label: 'Loopback', cidr: '127.0.0.1/8' },
  { label: 'Class A Private', cidr: '10.0.0.0/8' },
  { label: 'Class B Private', cidr: '172.16.0.0/12' },
  { label: 'Class C Private', cidr: '192.168.1.0/24' },
  { label: 'Link-Local', cidr: '169.254.0.0/16' },
  { label: 'Docker Default', cidr: '172.17.0.0/16' },
  { label: '/24 Home LAN', cidr: '192.168.1.0/24' },
  { label: 'Point-to-Point', cidr: '10.0.0.0/31' },
  { label: 'Host Route', cidr: '8.8.8.8/32' },
  { label: 'AWS VPC', cidr: '10.0.0.0/16' },
  { label: 'RFC 1918 All', cidr: '10.0.0.0/8' },
  { label: 'Multicast', cidr: '224.0.0.0/4' },
];

function InfoRow({
  label,
  value,
  extra,
  mono = true,
}: {
  label: string;
  value: string;
  extra?: string;
  mono?: boolean;
}) {
  const copyVal = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success('Copied!');
  }, [value]);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-light border border-slate-700/40 hover:border-slate-600/60 transition-colors group">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider w-36 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <code
          className={`text-sm text-slate-200 truncate ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </code>
        {extra && (
          <span className="text-xs text-slate-500 shrink-0">{extra}</span>
        )}
      </div>
      <button
        onClick={copyVal}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/50 shrink-0"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </div>
  );
}

function Badge({
  label,
  color,
}: {
  label: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${colors[color]}`}
    >
      {label}
    </span>
  );
}

export default function SubnetCalculatorPage() {
  const [input, setInput] = useState('192.168.1.0/24');
  const [result, setResult] = useState<SubnetResult | null>(() => calculateSubnet('192.168.1.0/24'));
  const [error, setError] = useState<string | null>(null);

  const handleInput = useCallback((val: string) => {
    setInput(val);
    const r = calculateSubnet(val);
    if (r) {
      setResult(r);
      setError(null);
    } else if (val.trim()) {
      setResult(null);
      setError('Enter a valid CIDR (e.g., 192.168.1.0/24) or IP + mask (e.g., 10.0.0.0 255.0.0.0)');
    } else {
      setResult(null);
      setError(null);
    }
  }, []);

  const handlePreset = useCallback((cidr: string) => {
    setInput(cidr);
    handleInput(cidr);
  }, [handleInput]);

  // Visual bit bar
  const bitBar = useMemo(() => {
    if (!result) return null;
    const bits: { label: string; color: string }[] = [];
    for (let i = 0; i < 32; i++) {
      if (i < result.prefix) {
        bits.push({ label: 'N', color: 'bg-brand-500' });
      } else {
        bits.push({ label: 'H', color: 'bg-slate-600' });
      }
    }
    return bits;
  }, [result]);

  return (
    <ToolLayout
      title="CIDR / Subnet Calculator"
      description="Calculate subnet masks, network addresses, broadcast addresses, and host ranges. Supports CIDR notation and dotted-decimal masks."
      controls={
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400">Pure client-side — no data leaves your browser</span>
        </div>
      }
    >
      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">CIDR Notation</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => handleInput(e.target.value)}
            placeholder="e.g., 192.168.1.0/24 or 10.0.0.0 255.0.0.0"
            className="flex-1 px-4 py-3 rounded-lg bg-surface border border-slate-600 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors placeholder:text-slate-500"
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Presets */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Common Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.cidr}
              onClick={() => handlePreset(p.cidr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                input === p.cidr
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'bg-surface-light border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <span className="text-slate-500 text-[10px] mr-1.5">{p.label}</span>
              {p.cidr}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-mono">{result.cidr}</h3>
              <div className="flex items-center gap-2">
                {result.isLoopback && <Badge label="Loopback" color="blue" />}
                {result.isPrivate && <Badge label="Private" color="green" />}
                {result.isLinkLocal && <Badge label="Link-Local" color="yellow" />}
                <Badge label={`Class ${result.ipClass}`} color="red" />
              </div>
            </div>

            {/* Bit bar */}
            <div className="mb-4">
              <div className="flex gap-px">
                {bitBar?.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-6 ${bit.color} ${i % 8 === 0 ? 'rounded-l-sm' : ''} ${(i + 1) % 8 === 0 ? 'rounded-r-sm' : ''} flex items-center justify-center`}
                    title={`Bit ${i + 1}: ${bit.label === 'N' ? 'Network' : 'Host'}`}
                  >
                    <span className="text-[8px] font-bold text-white/70">{bit.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-500">
                  <span className="text-brand-400 font-semibold">{result.prefix} bits</span> network
                </span>
                <span className="text-[10px] text-slate-500">
                  <span className="text-slate-400 font-semibold">{32 - result.prefix} bits</span> host
                </span>
              </div>
            </div>

            {/* Host counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-surface/50 border border-slate-700/40">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Addresses</div>
                <div className="text-xl font-bold text-white font-mono">{formatNumber(result.totalHosts)}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface/50 border border-slate-700/40">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Usable Hosts</div>
                <div className="text-xl font-bold text-brand-400 font-mono">
                  {result.usableHosts > 0 ? formatNumber(result.usableHosts) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-1">
            <InfoRow label="Network Address" value={result.networkAddress} />
            <InfoRow label="Broadcast" value={result.broadcastAddress} />
            <InfoRow label="Usable Host Range" value={`${result.firstHost} — ${result.lastHost}`} />
            <InfoRow label="Subnet Mask" value={result.subnetMask} />
            <InfoRow label="CIDR Prefix" value={`/${result.prefix}`} />
            <InfoRow label="Wildcard Mask" value={result.wildcardMask} />
            <InfoRow label="Binary Subnet Mask" value={result.maskBinary} />
            <InfoRow label="Binary IP" value={result.ipBinary} />
            <InfoRow label="IP Class" value={`Class ${result.ipClass}`} mono={false} />
          </div>

          {/* Quick reference */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/40">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Copy</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'CIDR', val: result.cidr },
                { label: 'Subnet Mask', val: result.subnetMask },
                { label: 'Wildcard Mask', val: result.wildcardMask },
                { label: 'Network', val: result.networkAddress },
                { label: 'Broadcast', val: result.broadcastAddress },
                { label: 'First Host', val: result.firstHost },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    navigator.clipboard.writeText(item.val);
                    toast.success(`Copied ${item.label}!`);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group"
                >
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-xs font-mono text-slate-200 group-hover:text-brand-300 transition-colors">
                    {item.val}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <Network className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            Enter a CIDR notation above to see subnet details
          </p>
        </div>
      )}
    </ToolLayout>
  );
}

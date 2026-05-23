'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, Clock, ExternalLink, AlertCircle, Globe, ChevronDown, Trash2, History, Loader2, Check, MapPin, Wifi, Building2, Shield, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface IPInfo {
  ip: string;
  version: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_code: string;
  country_code_iso3: string;
  country_name: string;
  country_capital: string;
  country_tld: string;
  continent_code: string;
  in_eu: boolean;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  currency_name: string;
  languages: string;
  country_area: number;
  country_population: number;
  asn: string;
  org: string;
  network: string;
}

interface LookupEntry {
  ip: string;
  timestamp: number;
  info: IPInfo;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

// ── Info Field Config ───────────────────────────────────────────────────────

interface FieldGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: keyof IPInfo; label: string; format?: (v: unknown, info?: IPInfo) => string }[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    label: 'Location',
    icon: MapPin,
    fields: [
      { key: 'city', label: 'City' },
      { key: 'region', label: 'Region' },
      { key: 'country_name', label: 'Country' },
      { key: 'country_code', label: 'Country Code' },
      { key: 'continent_code', label: 'Continent' },
      { key: 'postal', label: 'Postal Code' },
      { key: 'latitude', label: 'Latitude', format: (v) => String(v) },
      { key: 'longitude', label: 'Longitude', format: (v) => String(v) },
    ],
  },
  {
    label: 'Network',
    icon: Wifi,
    fields: [
      { key: 'ip', label: 'IP Address' },
      { key: 'version', label: 'IP Version' },
      { key: 'network', label: 'Network' },
      { key: 'asn', label: 'ASN' },
      { key: 'org', label: 'ISP / Organization' },
    ],
  },
  {
    label: 'Time & Region',
    icon: Clock,
    fields: [
      { key: 'timezone', label: 'Timezone' },
      { key: 'utc_offset', label: 'UTC Offset' },
      { key: 'country_calling_code', label: 'Calling Code' },
      { key: 'currency_name', label: 'Currency', format: (v, info) => `${v} (${(info as IPInfo).currency})` },
      { key: 'languages', label: 'Languages' },
    ],
  },
  {
    label: 'Country Info',
    icon: Globe,
    fields: [
      { key: 'country_capital', label: 'Capital' },
      { key: 'country_tld', label: 'TLD' },
      { key: 'country_area', label: 'Area (km²)', format: (v) => `${formatNumber(v as number)} km²` },
      { key: 'country_population', label: 'Population', format: (v) => formatNumber(v as number) },
      { key: 'country_code_iso3', label: 'ISO 3166-1 Alpha-3' },
      { key: 'in_eu', label: 'In EU', format: (v) => (v ? 'Yes' : 'No') },
    ],
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function IPLookupPage() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectingOwn, setDetectingOwn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IPInfo | null>(null);
  const [recentLookups, setRecentLookups] = useState<LookupEntry[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load recent lookups from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ip-lookup-history');
      if (stored) setRecentLookups(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = useCallback((entry: LookupEntry) => {
    setRecentLookups((prev) => {
      const updated = [entry, ...prev.filter((e) => e.ip !== entry.ip)].slice(0, 20);
      try { localStorage.setItem('ip-lookup-history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecentLookups([]);
    try { localStorage.removeItem('ip-lookup-history'); } catch { /* ignore */ }
    toast.success('History cleared');
  }, []);

  const detectOwnIP = useCallback(async () => {
    setDetectingOwn(true);
    setError(null);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) throw new Error('Failed to detect your IP');
      const data = await response.json();
      setIp(data.ip);
      toast.success('Your IP detected');
    } catch {
      setError('Failed to detect your IP. Please enter it manually.');
    } finally {
      setDetectingOwn(false);
    }
  }, []);

  const lookup = useCallback(async () => {
    const trimmed = ip.trim();
    if (!trimmed) {
      setError('Please enter an IP address or use "Detect My IP".');
      return;
    }
    if (!isValidIP(trimmed)) {
      setError('Please enter a valid IPv4 or IPv6 address.');
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`https://ipapi.co/${encodeURIComponent(trimmed)}/json/`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.reason || 'Lookup failed. Check the IP and try again.');
      }

      setResult(data);
      saveToHistory({ ip: trimmed, timestamp: Date.now(), info: data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IP lookup failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [ip, saveToHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) lookup();
    },
    [lookup, loading]
  );

  const copyField = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const copyAllJSON = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast.success('Copied all data as JSON');
    } catch {
      toast.error('Failed to copy');
    }
  }, [result]);

  const loadFromHistory = useCallback((entry: LookupEntry) => {
    setIp(entry.ip);
    setResult(entry.info);
    setError(null);
  }, []);

  const googleMapsUrl = result
    ? `https://www.google.com/maps?q=${result.latitude},${result.longitude}`
    : '';

  const countryFlag = result?.country_code
    ? `https://flagcdn.com/24x18/${result.country_code.toLowerCase()}.png`
    : '';

  return (
    <ToolLayout
      title="IP Lookup"
      description="Look up geolocation, network, and ISP information for any IP address. Auto-detect your own IP or query any IPv4/IPv6 address using ipapi.co — 100% client-side."
    >
      {/* ── Input Row ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={ip}
            onChange={(e) => { setIp(e.target.value); setError(null); setResult(null); }}
            onKeyDown={handleKeyDown}
            placeholder="8.8.8.8 or 2001:4860:4860::8888"
            className="w-full pl-10 pr-4 py-3 bg-surface border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono text-sm transition-colors"
            autoFocus
          />
        </div>

        <button
          onClick={detectOwnIP}
          disabled={detectingOwn}
          className="flex items-center gap-2 px-4 py-3 bg-surface border border-slate-700 rounded-lg text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-50"
        >
          {detectingOwn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
          {detectingOwn ? 'Detecting...' : 'Detect My IP'}
        </button>

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
          <p className="text-red-400 font-medium text-sm">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* Country + IP header */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/40 rounded-lg border border-slate-700/50">
            {countryFlag && (
              <img
                src={countryFlag}
                alt={result.country_code}
                className="w-8 h-auto rounded shadow-sm"
                style={{ imageRendering: 'auto' }}
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-100">{result.ip}</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-brand-500/20 text-brand-400">
                  {result.version}
                </span>
                {result.in_eu && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400">
                    EU
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {[result.city, result.region, result.country_name].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <button
                onClick={copyAllJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy JSON
              </button>
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Maps
                </a>
              )}
            </div>
          </div>

          {/* Field groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELD_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div
                  key={group.label}
                  className="bg-slate-800/20 border border-slate-700/50 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                    <GroupIcon className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      {group.label}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {group.fields.map(({ key, label, format }) => {
                      const rawValue = result[key];
                      const value = rawValue === null || rawValue === undefined || rawValue === ''
                        ? '—'
                        : format
                          ? format(rawValue, result)
                          : String(rawValue);
                      const copyValue = rawValue === null || rawValue === undefined || rawValue === '' ? '' : String(rawValue);

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/20 transition-colors"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-slate-500">{label}</span>
                            <span className={`text-sm ${rawValue === null || rawValue === undefined || rawValue === '' ? 'text-slate-600 italic' : 'text-slate-200'}`}>
                              {value}
                            </span>
                          </div>
                          {rawValue !== null && rawValue !== undefined && rawValue !== '' && (
                            <button
                              onClick={() => copyField(key, copyValue)}
                              className="p-1.5 rounded hover:bg-slate-600 transition-colors text-slate-500 hover:text-slate-300 shrink-0 ml-2"
                              title={`Copy ${label}`}
                            >
                              {copiedField === key ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
                <span className="font-mono text-slate-300 group-hover:text-brand-400 transition-colors">
                  {entry.ip}
                </span>
                <span className="text-xs text-slate-600">
                  {entry.info.country_code && (
                    <img
                      src={`https://flagcdn.com/16x12/${entry.info.country_code.toLowerCase()}.png`}
                      alt={entry.info.country_code}
                      className="inline-block w-4 h-auto"
                    />
                  )}
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
            IP geolocation data is provided by{' '}
            <a href="https://ipapi.co/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
              ipapi.co
            </a>
            {' '}(free tier, no API key required). All lookups are performed directly from your browser — no data is stored or logged by DevBench.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

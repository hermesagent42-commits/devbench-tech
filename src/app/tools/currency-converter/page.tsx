'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowRightLeft, RefreshCw, AlertTriangle, ChevronDown, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Currency {
  code: string;
  name: string;
  flag: string;
}

interface RateCache {
  base: string;
  rates: Record<string, number>;
  date: string;
  fetchedAt: number;
}

// ── Currencies ─────────────────────────────────────────────────────────────

const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Złoty', flag: '🇵🇱' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'VND', name: 'Vietnamese Đồng', flag: '🇻🇳' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'RON', name: 'Romanian Leu', flag: '🇷🇴' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'DZD', name: 'Algerian Dinar', flag: '🇩🇿' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'ISK', name: 'Icelandic Króna', flag: '🇮🇸' },
  { code: 'CRC', name: 'Costa Rican Colón', flag: '🇨🇷' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
];

const currencyMap = new Map(CURRENCIES.map((c) => [c.code, c]));

// ── API ────────────────────────────────────────────────────────────────────

const RATE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchRates(base: string): Promise<RateCache> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    base: data.base,
    rates: data.rates,
    date: data.date,
    fetchedAt: Date.now(),
  };
}

// ── Format helpers ─────────────────────────────────────────────────────────

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'IDR' || currency === 'VND' ? 0 : 6,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDecimal(value: number, currency: string): string {
  const decimals = ['JPY', 'KRW', 'IDR', 'VND', 'CLP'].includes(currency) ? 0 : 4;
  return value.toFixed(decimals);
}

// ── Popular conversions ────────────────────────────────────────────────────

const POPULAR_PAIRS: [string, string, string][] = [
  ['USD', 'EUR', 'US Dollar → Euro'],
  ['USD', 'GBP', 'US Dollar → Pound'],
  ['USD', 'JPY', 'US Dollar → Yen'],
  ['EUR', 'USD', 'Euro → US Dollar'],
  ['GBP', 'USD', 'Pound → US Dollar'],
  ['USD', 'CAD', 'US Dollar → CAD'],
  ['USD', 'AUD', 'US Dollar → AUD'],
  ['USD', 'INR', 'US Dollar → Rupee'],
  ['EUR', 'GBP', 'Euro → Pound'],
  ['USD', 'CNY', 'US Dollar → Yuan'],
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [rateCache, setRateCache] = useState<RateCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  // Parse amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amount]);

  // Fetch rates
  const loadRates = useCallback(async (base: string) => {
    setLoading(true);
    setError(null);
    try {
      const rates = await fetchRates(base);
      setRateCache(rates);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch exchange rates';
      setError(msg);
      toast.error('Failed to fetch exchange rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates(fromCurrency);
  }, [fromCurrency, loadRates]);

  // Convert
  const result = useMemo(() => {
    if (!rateCache || !rateCache.rates) return 0;
    const rate = rateCache.rates[toCurrency];
    if (rate === undefined) return 0;
    return numericAmount * rate;
  }, [numericAmount, toCurrency, rateCache]);

  const inverseRate = useMemo(() => {
    if (!rateCache || !rateCache.rates) return null;
    const rate = rateCache.rates[toCurrency];
    if (rate === undefined) return null;
    return 1 / rate;
  }, [rateCache, toCurrency]);

  // Swap currencies
  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    // Amount stays the same — user probably wants to see the reverse
    setFromOpen(false);
    setToOpen(false);
  }, [fromCurrency, toCurrency]);

  // Copy result
  const handleCopy = useCallback(async () => {
    const text = formatAmount(result, toCurrency);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [result, toCurrency]);

  // Load popular pair
  const loadPopularPair = useCallback((from: string, to: string) => {
    setFromCurrency(from);
    setToCurrency(to);
    setFromOpen(false);
    setToOpen(false);
  }, []);

  // Filtered currency lists
  const filteredFrom = useMemo(() => {
    if (!fromSearch) return CURRENCIES;
    const q = fromSearch.toLowerCase();
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [fromSearch]);

  const filteredTo = useMemo(() => {
    if (!toSearch) return CURRENCIES;
    const q = toSearch.toLowerCase();
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [toSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!fromOpen && !toOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-currency-dropdown]')) {
        setFromOpen(false);
        setToOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fromOpen, toOpen]);

  const fromCurrencyObj = currencyMap.get(fromCurrency);
  const toCurrencyObj = currencyMap.get(toCurrency);
  const cacheAge = rateCache ? Math.round((Date.now() - rateCache.fetchedAt) / 1000) : null;

  return (
    <ToolLayout
      title="Currency Converter"
      description="Convert between 50 world currencies with live exchange rates. Swap, copy, and quick popular pairs — all powered by the Frankfurter API."
    >
      <div className="max-w-2xl mx-auto">
        {/* ── Main converter card ───────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          {/* Amount + From currency */}
          <div className="p-6 pb-4">
            <div className="flex gap-3 items-stretch">
              {/* Amount input */}
              <div className="flex-1">
                <label className="block text-xs text-slate-500 font-medium mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="any"
                  className="w-full bg-surface border border-slate-700/50 rounded-lg px-4 py-3 font-mono text-lg text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
                  placeholder="0"
                />
              </div>

              {/* From currency dropdown */}
              <div className="w-48 relative" data-currency-dropdown>
                <label className="block text-xs text-slate-500 font-medium mb-2">From</label>
                <button
                  onClick={() => { setFromOpen(!fromOpen); setToOpen(false); }}
                  className="w-full flex items-center justify-between bg-surface border border-slate-700/50 rounded-lg px-3 py-3 text-white hover:border-brand-500/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{fromCurrencyObj?.flag || '🏳️'}</span>
                    <span className="font-mono font-semibold">{fromCurrency}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${fromOpen ? 'rotate-180' : ''}`} />
                </button>
                {fromOpen && (
                  <div className="absolute z-20 mt-1 w-64 bg-surface-dark border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-slate-700/50">
                      <input
                        type="text"
                        value={fromSearch}
                        onChange={(e) => setFromSearch(e.target.value)}
                        placeholder="Search currency..."
                        className="w-full bg-surface border border-slate-700/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {filteredFrom.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setFromCurrency(c.code); setFromOpen(false); setFromSearch(''); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-500/10 transition-colors ${
                            c.code === fromCurrency ? 'bg-brand-500/20 text-brand-400' : 'text-slate-300'
                          }`}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <span className="font-mono font-semibold">{c.code}</span>
                          <span className="text-slate-500 text-xs">{c.name}</span>
                        </button>
                      ))}
                      {filteredFrom.length === 0 && (
                        <p className="px-3 py-4 text-sm text-slate-500 text-center">No currencies found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwap}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-surface border-2 border-slate-700 flex items-center justify-center text-brand-400 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all disabled:opacity-50"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To currency */}
          <div className="p-6 pt-4">
            <div className="flex gap-3 items-stretch">
              {/* Result display */}
              <div className="flex-1">
                <label className="block text-xs text-slate-500 font-medium mb-2">Converted To</label>
                <div className="w-full bg-surface border border-slate-700/50 rounded-lg px-4 py-3 font-mono text-lg min-h-[52px] flex items-center">
                  {loading ? (
                    <span className="text-slate-500 animate-pulse">Loading rates...</span>
                  ) : error ? (
                    <span className="text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Failed to load
                    </span>
                  ) : (
                    <span className="text-white truncate">{formatAmount(result, toCurrency)}</span>
                  )}
                </div>
              </div>

              {/* To currency dropdown */}
              <div className="w-48 relative" data-currency-dropdown>
                <label className="block text-xs text-slate-500 font-medium mb-2">To</label>
                <button
                  onClick={() => { setToOpen(!toOpen); setFromOpen(false); }}
                  className="w-full flex items-center justify-between bg-surface border border-slate-700/50 rounded-lg px-3 py-3 text-white hover:border-brand-500/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{toCurrencyObj?.flag || '🏳️'}</span>
                    <span className="font-mono font-semibold">{toCurrency}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${toOpen ? 'rotate-180' : ''}`} />
                </button>
                {toOpen && (
                  <div className="absolute z-20 mt-1 w-64 bg-surface-dark border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-slate-700/50">
                      <input
                        type="text"
                        value={toSearch}
                        onChange={(e) => setToSearch(e.target.value)}
                        placeholder="Search currency..."
                        className="w-full bg-surface border border-slate-700/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500/50"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {filteredTo.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setToCurrency(c.code); setToOpen(false); setToSearch(''); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-500/10 transition-colors ${
                            c.code === toCurrency ? 'bg-brand-500/20 text-brand-400' : 'text-slate-300'
                          }`}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <span className="font-mono font-semibold">{c.code}</span>
                          <span className="text-slate-500 text-xs">{c.name}</span>
                        </button>
                      ))}
                      {filteredTo.length === 0 && (
                        <p className="px-3 py-4 text-sm text-slate-500 text-center">No currencies found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action bar + Rate info */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                disabled={loading || !!error}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50'
                } disabled:opacity-50`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => loadRates(fromCurrency)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors disabled:opacity-50"
                title="Refresh rates"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {inverseRate && !error && !loading && (
                <span className="font-mono">
                  1 {toCurrency} = {formatDecimal(inverseRate, toCurrency)} {fromCurrency}
                </span>
              )}
              {rateCache && !loading && !error && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {rateCache.date}
                  {cacheAge !== null && (
                    <span className="text-slate-600">
                      · {cacheAge < 60 ? `${cacheAge}s ago` : `${Math.round(cacheAge / 60)}m ago`}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-6 mb-6 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to fetch exchange rates</p>
                <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Popular pairs ─────────────────────────────────────────────── */}
        <div className="mt-8">
          <h3 className="text-white font-semibold text-sm mb-3">Popular Conversions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {POPULAR_PAIRS.map(([from, to, label]) => (
              <button
                key={`${from}-${to}`}
                onClick={() => loadPopularPair(from, to)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  fromCurrency === from && toCurrency === to
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'text-slate-400 bg-surface border-slate-700/50 hover:text-white hover:border-brand-500/30'
                }`}
              >
                <span className="font-mono">{from}/{to}</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Info ──────────────────────────────────────────────────────── */}
        <div className="mt-8 card border-l-4 border-l-brand-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">About This Converter</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Exchange rates provided by the <a href="https://www.frankfurter.app" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Frankfurter API</a> (ECB data)</li>
            <li>• Rates are updated daily by the European Central Bank</li>
            <li>• Results are cached for 10 minutes to avoid rate limits</li>
            <li>• 50 currencies supported — search by code or name</li>
            <li>• Click refresh to get the latest rates from the API</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}

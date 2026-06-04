'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ArrowLeftRight, Copy, RefreshCw, TrendingUp, Globe, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string; // emoji flag
}

interface Rates {
  base: string;
  rates: Record<string, number>;
  date: string;
  timestamp: number;
}

// ── Currency definitions ───────────────────────────────────────────────────

const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar',             symbol: '$',    flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',                  symbol: '€',    flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound',         symbol: '£',    flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen',          symbol: '¥',    flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar',     symbol: 'A$',   flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar',       symbol: 'C$',   flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc',           symbol: 'CHF',  flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan',          symbol: '¥',    flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee',          symbol: '₹',    flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real',        symbol: 'R$',   flag: '🇧🇷' },
  { code: 'KRW', name: 'South Korean Won',      symbol: '₩',    flag: '🇰🇷' },
  { code: 'MXN', name: 'Mexican Peso',          symbol: 'MX$',  flag: '🇲🇽' },
  { code: 'SEK', name: 'Swedish Krona',         symbol: 'kr',   flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone',       symbol: 'kr',   flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone',          symbol: 'kr',   flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty',          symbol: 'zł',   flag: '🇵🇱' },
  { code: 'TRY', name: 'Turkish Lira',          symbol: '₺',    flag: '🇹🇷' },
  { code: 'HKD', name: 'Hong Kong Dollar',      symbol: 'HK$',  flag: '🇭🇰' },
  { code: 'SGD', name: 'Singapore Dollar',      symbol: 'S$',   flag: '🇸🇬' },
  { code: 'THB', name: 'Thai Baht',             symbol: '฿',    flag: '🇹🇭' },
  { code: 'ZAR', name: 'South African Rand',    symbol: 'R',    flag: '🇿🇦' },
  { code: 'NZD', name: 'New Zealand Dollar',    symbol: 'NZ$',  flag: '🇳🇿' },
  { code: 'RUB', name: 'Russian Ruble',         symbol: '₽',    flag: '🇷🇺' },
  { code: 'PHP', name: 'Philippine Peso',       symbol: '₱',    flag: '🇵🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit',     symbol: 'RM',   flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah',     symbol: 'Rp',   flag: '🇮🇩' },
  { code: 'VND', name: 'Vietnamese Dong',       symbol: '₫',    flag: '🇻🇳' },
  { code: 'CZK', name: 'Czech Koruna',          symbol: 'Kč',   flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint',      symbol: 'Ft',   flag: '🇭🇺' },
  { code: 'RON', name: 'Romanian Leu',          symbol: 'lei',  flag: '🇷🇴' },
  { code: 'ILS', name: 'Israeli Shekel',        symbol: '₪',    flag: '🇮🇱' },
  { code: 'CLP', name: 'Chilean Peso',          symbol: 'CLP$', flag: '🇨🇱' },
  { code: 'COP', name: 'Colombian Peso',        symbol: 'COL$', flag: '🇨🇴' },
  { code: 'ARS', name: 'Argentine Peso',        symbol: 'AR$',  flag: '🇦🇷' },
  { code: 'NGN', name: 'Nigerian Naira',        symbol: '₦',    flag: '🇳🇬' },
  { code: 'EGP', name: 'Egyptian Pound',        symbol: 'E£',   flag: '🇪🇬' },
  { code: 'KES', name: 'Kenyan Shilling',       symbol: 'KSh',  flag: '🇰🇪' },
  { code: 'AED', name: 'UAE Dirham',            symbol: 'د.إ',  flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal',           symbol: '﷼',    flag: '🇸🇦' },
  { code: 'PKR', name: 'Pakistani Rupee',       symbol: '₨',    flag: '🇵🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka',      symbol: '৳',    flag: '🇧🇩' },
  { code: 'UAH', name: 'Ukrainian Hryvnia',     symbol: '₴',    flag: '🇺🇦' },
  { code: 'TWD', name: 'Taiwan Dollar',         symbol: 'NT$',  flag: '🇹🇼' },
  { code: 'PEN', name: 'Peruvian Sol',          symbol: 'S/',   flag: '🇵🇪' },
];

// ── HARDCODED FALLBACK RATES (EUR base, June 2026 approximate) ────────────

const FALLBACK_RATES: Record<string, number> = {
  USD: 1.08,  EUR: 1.0,    GBP: 0.85,   JPY: 162.5,
  AUD: 1.62,  CAD: 1.46,   CHF: 0.96,   CNY: 7.82,
  INR: 90.2,  BRL: 5.85,   KRW: 1450.0, MXN: 20.8,
  SEK: 11.3,  NOK: 11.6,   DKK: 7.46,   PLN: 4.35,
  TRY: 35.5,  HKD: 8.42,   SGD: 1.44,   THB: 38.5,
  ZAR: 19.6,  NZD: 1.75,   RUB: 106.0,  PHP: 62.8,
  MYR: 5.05,  IDR: 17600.0,VND: 27600.0,CZK: 25.0,
  HUF: 402.0, RON: 4.98,   ILS: 4.05,   CLP: 1030.0,
  COP: 4550.0,ARS: 1240.0, NGN: 1680.0,EGP: 52.5,
  KES: 140.0,AED: 3.97,    SAR: 4.05,   PKR: 304.0,
  BDT: 130.0,UAH: 43.5,    TWD: 34.6,   PEN: 4.07,
};

// ── API ────────────────────────────────────────────────────────────────────

function buildFallbackRates(): Rates {
  return {
    base: 'EUR',
    rates: FALLBACK_RATES,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
  };
}

async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    return {
      base: data.base_code || 'EUR',
      rates: data.rates || {},
      date: data.time_last_update_utc?.split(' ')[0] || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };
  } catch {
    return buildFallbackRates();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function convert(amount: number, fromRate: number, toRate: number): number {
  return (amount / fromRate) * toRate;
}

function formatAmount(value: number, decimals: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toFixed(decimals > 6 ? decimals : 6);
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getRate(from: string, to: string, rates: Record<string, number>): number {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 0;
  return toRate / fromRate;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CurrencyConverter() {
  const [rates, setRates] = useState<Rates>(buildFallbackRates());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [decimals, setDecimals] = useState(4);

  // Fetch live rates on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchRates();
        if (!cancelled) {
          setRates(r);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load live rates. Using estimated rates.');
          setRates(buildFallbackRates());
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Parse amount
  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '.' || cleaned === '-') return 0;
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }, [amount]);

  const result = useMemo(() => {
    return convert(parsedAmount, rates.rates[fromCurrency] ?? 1, rates.rates[toCurrency] ?? 1);
  }, [parsedAmount, fromCurrency, toCurrency, rates.rates]);

  const exchangeRate = useMemo(() => {
    return getRate(fromCurrency, toCurrency, rates.rates);
  }, [fromCurrency, toCurrency, rates.rates]);

  const fromCurrencyData = useMemo(() => CURRENCIES.find(c => c.code === fromCurrency), [fromCurrency]);
  const toCurrencyData = useMemo(() => CURRENCIES.find(c => c.code === toCurrency), [toCurrency]);

  const swap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount(formatAmount(result, decimals));
  }, [fromCurrency, toCurrency, result, decimals]);

  const copyResult = useCallback(() => {
    const text = formatAmount(result, decimals);
    navigator.clipboard.writeText(text).then(
      () => toast.success('Result copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [result, decimals]);

  const copyRate = useCallback(() => {
    const text = `1 ${fromCurrency} = ${formatAmount(exchangeRate, 6)} ${toCurrency}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success('Rate copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [fromCurrency, toCurrency, exchangeRate]);

  const refreshRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchRates();
      setRates(r);
      setLoading(false);
    } catch {
      setError('Failed to refresh rates.');
      setLoading(false);
    }
  }, []);

  const popularConversions = useMemo(() => [
    { from: 'USD', to: 'EUR' },
    { from: 'EUR', to: 'GBP' },
    { from: 'USD', to: 'JPY' },
    { from: 'USD', to: 'CNY' },
    { from: 'GBP', to: 'USD' },
    { from: 'USD', to: 'INR' },
  ], []);

  return (
    <ToolLayout
      title="Currency Converter"
      description="Convert between 45 currencies with live exchange rates. Free, fast — all client-side after initial load."
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Rate source indicator */}
        {!loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
            <Globe className="w-3.5 h-3.5" />
            <span>
              {error ? 'Using estimated fallback rates' : `Live rates — ${rates.date}`} 
              {' · '}EUR base
            </span>
            <button
              onClick={refreshRates}
              className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
              title="Refresh rates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading live exchange rates...</span>
            </div>
          </div>
        )}

        {/* Converter card */}
        {!loading && (
          <div className="bg-surface-light rounded-xl border border-slate-700/50 p-6 space-y-5">
            {/* From */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors"
                  placeholder="0"
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-3 text-white font-medium min-w-[110px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <button
                onClick={swap}
                className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 hover:text-white hover:border-brand-500 transition-all active:scale-95"
                title="Swap currencies"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Converted To</label>
              <div className="flex gap-3">
                <div className="flex-1 bg-brand-900/20 border border-brand-800/50 rounded-lg px-4 py-3 text-brand-300 text-lg font-mono flex items-center justify-between">
                  <span className="truncate">
                    {toCurrencyData?.symbol && (
                      <span className="text-brand-400 mr-1">{toCurrencyData.symbol}</span>
                    )}
                    {formatAmount(result, decimals)}
                  </span>
                  <button
                    onClick={copyResult}
                    className="ml-3 p-1.5 rounded-md hover:bg-brand-800/30 text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
                    title="Copy result"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-3 text-white font-medium min-w-[110px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate display */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <span className="text-slate-300">
                  1 <span className="font-medium text-white">{fromCurrency}</span>
                  {' = '}
                  <span className="font-mono text-brand-400">
                    {formatAmount(exchangeRate, 6)}
                  </span>
                  {' '}
                  <span className="font-medium text-white">{toCurrency}</span>
                </span>
              </div>
              <button
                onClick={copyRate}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Copy exchange rate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inverse rate */}
            <div className="text-center text-xs text-slate-500">
              1 {toCurrency} = {formatAmount(1 / exchangeRate, 6)} {fromCurrency}
            </div>

            {/* Decimals control */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Decimals</label>
              <div className="flex gap-1">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDecimals(d)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      decimals === d
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular conversions */}
        <div className="bg-surface-light rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            Popular Conversions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {popularConversions.map(({ from, to }) => {
              const rate = getRate(from, to, rates.rates);
              if (!rate || rate === 0) return null;
              const fromData = CURRENCIES.find(c => c.code === from);
              const toData = CURRENCIES.find(c => c.code === to);
              return (
                <button
                  key={`${from}-${to}`}
                  onClick={() => {
                    setFromCurrency(from);
                    setToCurrency(to);
                  }}
                  className="text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-brand-500/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="text-xs text-slate-400 mb-1">
                    {fromData?.flag} {from} → {toData?.flag} {to}
                  </div>
                  <div className="text-sm font-mono text-white group-hover:text-brand-400 transition-colors">
                    {formatAmount(rate, 4)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-500 space-y-1">
            <p>
              Exchange rates update once per day via{' '}
              <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                ExchangeRate-API
              </a>
              {' '}(European Central Bank data).
            </p>
            <p>
              45 currencies supported. Conversion happens entirely in your browser after the initial rate fetch.
              If the API is unavailable, estimated fallback rates are used.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

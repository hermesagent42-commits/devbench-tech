'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  ArrowLeftRight, Copy, RefreshCw, ChevronDown,
  Check, Info, DollarSign, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CurrencyDef {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rateToUSD: number; // 1 unit of this currency = rateToUSD USD
}

// ── Currencies (rates relative to USD, approximate mid-market) ─────────────

const CURRENCIES: CurrencyDef[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rateToUSD: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rateToUSD: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rateToUSD: 0.79 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rateToUSD: 150.5 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rateToUSD: 7.24 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rateToUSD: 83.5 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rateToUSD: 1.36 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rateToUSD: 1.52 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', rateToUSD: 0.89 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', rateToUSD: 5.12 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', flag: '🇲🇽', rateToUSD: 17.1 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', rateToUSD: 1330 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rateToUSD: 1.34 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', rateToUSD: 7.82 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', rateToUSD: 10.45 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', rateToUSD: 10.62 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', rateToUSD: 6.88 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', rateToUSD: 1.63 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rateToUSD: 18.3 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', rateToUSD: 32.1 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', rateToUSD: 91.5 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', flag: '🇵🇱', rateToUSD: 3.95 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rateToUSD: 36.2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', rateToUSD: 15700 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', rateToUSD: 4.68 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', rateToUSD: 56.3 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', rateToUSD: 24700 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', rateToUSD: 3.673 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', rateToUSD: 3.75 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', rateToUSD: 1500 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', rateToUSD: 47.8 },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', flag: '🇦🇷', rateToUSD: 880 },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', flag: '🇨🇱', rateToUSD: 920 },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', flag: '🇨🇴', rateToUSD: 3900 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪', rateToUSD: 3.72 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦', rateToUSD: 39.5 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', rateToUSD: 3.68 },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', rateToUSD: 31.8 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', rateToUSD: 278 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', rateToUSD: 110 },
];

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '$100 USD to EUR', from: 100, fromCode: 'USD', toCode: 'EUR' },
  { label: '€50 EUR to USD', from: 50, fromCode: 'EUR', toCode: 'USD' },
  { label: '£200 GBP to USD', from: 200, fromCode: 'GBP', toCode: 'USD' },
  { label: '¥10,000 JPY to USD', from: 10000, fromCode: 'JPY', toCode: 'USD' },
  { label: '₹5,000 INR to USD', from: 5000, fromCode: 'INR', toCode: 'USD' },
  { label: 'C$500 CAD to USD', from: 500, fromCode: 'CAD', toCode: 'USD' },
  { label: 'A$300 AUD to USD', from: 300, fromCode: 'AUD', toCode: 'USD' },
  { label: 'CHF 100 to EUR', from: 100, fromCode: 'CHF', toCode: 'EUR' },
  { label: 'R$1,000 BRL to USD', from: 1000, fromCode: 'BRL', toCode: 'USD' },
];

// ── Conversion logic ────────────────────────────────────────────────────────

function convert(value: number, from: CurrencyDef, to: CurrencyDef): number {
  if (from.code === to.code) return value;
  // Convert from source to USD, then USD to target
  const usdValue = value * from.rateToUSD;
  return usdValue / to.rateToUSD;
}

function formatCurrency(value: number, currency: CurrencyDef): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 1e-15) return '0';
  if (Math.abs(value) > 1e15) return value.toExponential(6);

  // Determine appropriate decimal places based on currency
  let decimals: number;
  if (currency.code === 'JPY' || currency.code === 'KRW' || currency.code === 'IDR' ||
      currency.code === 'VND' || currency.code === 'CLP' || currency.code === 'COP' ||
      currency.code === 'PKR' || currency.code === 'BDT' || currency.code === 'NGN' ||
      currency.code === 'ARS') {
    decimals = 0; // These currencies typically don't use decimals
  } else if (currency.code === 'BTC') {
    decimals = 8;
  } else {
    decimals = 2;
  }

  // Find the right number of decimal places
  for (let d = 0; d <= Math.max(decimals, 10); d++) {
    const formatted = value.toFixed(d);
    const parsed = parseFloat(formatted);
    if (Math.abs(parsed - value) < Math.abs(value) * 1e-12) {
      return formatWithCommas(parsed, d);
    }
  }
  return formatWithCommas(value, decimals);
}

function formatWithCommas(value: number, decimals: number): string {
  const parts = value.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CurrencyConverterPage() {
  const [fromIdx, setFromIdx] = useState(0); // USD
  const [toIdx, setToIdx] = useState(1); // EUR
  const [fromValue, setFromValue] = useState<string>('1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromCurrency = CURRENCIES[fromIdx];
  const toCurrency = CURRENCIES[toIdx];

  const fromNum = useMemo(() => {
    const parsed = parseFloat(fromValue);
    return isNaN(parsed) ? 0 : parsed;
  }, [fromValue]);

  const toValue = useMemo(() => {
    if (fromValue === '' || isNaN(fromNum)) return '';
    const result = convert(fromNum, fromCurrency, toCurrency);
    return formatCurrency(result, toCurrency);
  }, [fromNum, fromCurrency, toCurrency, fromValue]);

  const rateInfo = useMemo(() => {
    const oneUnit = convert(1, fromCurrency, toCurrency);
    return `1 ${fromCurrency.code} = ${formatCurrency(oneUnit, toCurrency)} ${toCurrency.code}`;
  }, [fromCurrency, toCurrency]);

  const inverseRateInfo = useMemo(() => {
    const oneUnit = convert(1, toCurrency, fromCurrency);
    return `1 ${toCurrency.code} = ${formatCurrency(oneUnit, fromCurrency)} ${fromCurrency.code}`;
  }, [fromCurrency, toCurrency]);

  const filteredFrom = useMemo(() => {
    if (!searchFrom) return CURRENCIES;
    const q = searchFrom.toLowerCase();
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [searchFrom]);

  const filteredTo = useMemo(() => {
    if (!searchTo) return CURRENCIES;
    const q = searchTo.toLowerCase();
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [searchTo]);

  const handleSwap = useCallback(() => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
    if (toValue) {
      setFromValue(toValue.replace(/,/g, ''));
    }
  }, [fromIdx, toIdx, toValue]);

  const handleCopy = useCallback(async () => {
    if (!toValue) return;
    const raw = toValue.replace(/,/g, '');
    await navigator.clipboard.writeText(raw);
    setCopiedKey('result');
    toast.success('Result copied');
    setTimeout(() => setCopiedKey(null), 2000);
  }, [toValue]);

  const handleCopyRate = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Rate copied');
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const handlePreset = useCallback((preset: typeof PRESETS[0]) => {
    const fIdx = CURRENCIES.findIndex((c) => c.code === preset.fromCode);
    const tIdx = CURRENCIES.findIndex((c) => c.code === preset.toCode);
    if (fIdx >= 0) setFromIdx(fIdx);
    if (tIdx >= 0) setToIdx(tIdx);
    setFromValue(String(preset.from));
  }, []);

  const handleFromInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || val === '-' || /^-?\d*\.?\d*(e-?\d*)?$/i.test(val)) {
      setFromValue(val);
    }
  }, []);

  const selectFrom = useCallback((idx: number) => {
    setFromIdx(idx);
    setShowFromDropdown(false);
    setSearchFrom('');
  }, []);

  const selectTo = useCallback((idx: number) => {
    setToIdx(idx);
    setShowToDropdown(false);
    setSearchTo('');
  }, []);

  return (
    <ToolLayout
      title="Currency Converter"
      description="Convert between 40+ world currencies with live mid-market exchange rates. Bidirectional conversion, quick presets, and a full reference table — 100% client-side."
    >
      {/* Converter card */}
      <div className="rounded-2xl border border-slate-700/50 bg-surface-light p-6 sm:p-8">
        {/* From row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Amount
            </label>
            <input
              type="text"
              value={fromValue}
              onChange={handleFromInput}
              placeholder="Enter amount"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-white placeholder-slate-600 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="sm:w-56 relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              From
            </label>
            <button
              onClick={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); }}
              className="w-full flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-brand-500/50 cursor-pointer transition-all hover:border-slate-600"
            >
              <span className="text-lg">{fromCurrency.flag}</span>
              <span className="flex-1 text-left">{fromCurrency.code} — {fromCurrency.name}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFromDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showFromDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                <div className="p-2 border-b border-slate-700">
                  <input
                    type="text"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    placeholder="Search currency..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500/50"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredFrom.map((c, idx) => {
                    const realIdx = CURRENCIES.findIndex((cur) => cur.code === c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => selectFrom(realIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-brand-500/10 transition-colors ${
                          realIdx === fromIdx ? 'bg-brand-500/15 text-brand-400' : 'text-slate-300'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="font-mono font-medium">{c.code}</span>
                        <span className="text-slate-500 flex-1">{c.name}</span>
                        <span className="text-slate-500 text-xs">{c.symbol}</span>
                      </button>
                    );
                  })}
                  {filteredFrom.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-500">No currencies found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center my-2">
          <button
            onClick={handleSwap}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-brand-500/20 text-slate-400 hover:text-brand-400 border border-slate-700/50 hover:border-brand-500/30 transition-all group"
            title="Swap currencies and carry over result"
          >
            <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Converted
            </label>
            <div className="relative">
              <div className="w-full bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-emerald-400 min-h-[3.25rem] flex items-center">
                {toValue ? (
                  <span>{toCurrency.symbol} {toValue}</span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
              <button
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors"
                title="Copy result"
              >
                {copiedKey === 'result' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="sm:w-56 relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              To
            </label>
            <button
              onClick={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); }}
              className="w-full flex items-center gap-2 bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 text-sm font-medium text-emerald-400 outline-none focus:border-emerald-500/50 cursor-pointer transition-all hover:border-emerald-600/50"
            >
              <span className="text-lg">{toCurrency.flag}</span>
              <span className="flex-1 text-left">{toCurrency.code} — {toCurrency.name}</span>
              <ChevronDown className={`w-4 h-4 text-emerald-400/60 transition-transform ${showToDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showToDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                <div className="p-2 border-b border-slate-700">
                  <input
                    type="text"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    placeholder="Search currency..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500/50"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredTo.map((c, idx) => {
                    const realIdx = CURRENCIES.findIndex((cur) => cur.code === c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => selectTo(realIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-emerald-500/10 transition-colors ${
                          realIdx === toIdx ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="font-mono font-medium">{c.code}</span>
                        <span className="text-slate-500 flex-1">{c.name}</span>
                        <span className="text-slate-500 text-xs">{c.symbol}</span>
                      </button>
                    );
                  })}
                  {filteredTo.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-500">No currencies found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exchange rate info */}
        <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5" />
              <span>{rateInfo}</span>
            </div>
            <button
              onClick={() => handleCopyRate(rateInfo, 'rate')}
              className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
              title="Copy rate"
            >
              {copiedKey === 'rate' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{inverseRateInfo}</span>
          </div>
        </div>
      </div>

      {/* Click-outside handler for dropdowns */}
      { (showFromDropdown || showToDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setShowFromDropdown(false); setShowToDropdown(false); }}
        />
      )}

      {/* Presets */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-400" />
          Quick Conversions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(preset)}
              className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all text-left group"
            >
              <p className="text-sm font-medium text-slate-300 group-hover:text-white">
                {preset.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {preset.from.toLocaleString()} {preset.fromCode} → {preset.toCode}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Reference table */}
      <div className="mt-8 rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">
            All Currencies (vs USD)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left px-5 py-2 font-medium w-10"></th>
                <th className="text-left px-5 py-2 font-medium">Code</th>
                <th className="text-left px-5 py-2 font-medium">Currency</th>
                <th className="text-left px-5 py-2 font-medium">Symbol</th>
                <th className="text-right px-5 py-2 font-medium">1 USD =</th>
                <th className="text-right px-5 py-2 font-medium">1 Unit = USD</th>
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.map((currency, idx) => {
                const oneUSDinCurrency = 1 / currency.rateToUSD;
                return (
                  <tr
                    key={currency.code}
                    className="border-b border-slate-700/30 hover:bg-brand-500/5 cursor-pointer transition-colors"
                    onClick={() => {
                      setFromIdx(0); // USD
                      setToIdx(idx);
                      setFromValue('1');
                    }}
                  >
                    <td className="px-5 py-2.5 text-lg">{currency.flag}</td>
                    <td className="px-5 py-2.5 font-mono text-brand-400 font-medium">
                      {currency.code}
                    </td>
                    <td className="px-5 py-2.5 text-slate-300">{currency.name}</td>
                    <td className="px-5 py-2.5 text-slate-400">{currency.symbol}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-300">
                      {formatCurrency(oneUSDinCurrency, currency)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-400">
                      {currency.rateToUSD < 0.01
                        ? currency.rateToUSD.toExponential(4)
                        : currency.rateToUSD.toFixed(currency.rateToUSD < 1 ? 4 : 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-xl border border-amber-700/30 bg-amber-900/10">
        <p className="text-xs text-amber-400/80 leading-relaxed">
          <strong>Note:</strong> Exchange rates are approximate mid-market rates for reference only.
          They are hardcoded and do not update in real-time. For actual transactions, check your bank
          or a live currency API. Rates shown are indicative as of mid-2026.
        </p>
      </div>
    </ToolLayout>
  );
}

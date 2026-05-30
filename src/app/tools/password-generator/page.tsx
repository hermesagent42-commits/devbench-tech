'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  RefreshCw,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Key,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Hash,
  Zap,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'il1Lo0O';

interface PasswordEntry {
  id: number;
  value: string;
  entropy: number;
}

// ── Strength calculation ───────────────────────────────────────────────────

function calculateStrength(password: string, charsetSize: number): {
  entropy: number;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  percentage: number;
  crackTime: string;
} {
  if (!password) {
    return { entropy: 0, label: 'None', color: 'bg-slate-600', icon: ShieldOff, percentage: 0, crackTime: '—' };
  }

  const entropy = password.length * Math.log2(charsetSize);
  const guessesPerSecond = 1e9; // 1 billion guesses/sec (reasonably fast attacker)
  const seconds = Math.pow(2, entropy) / guessesPerSecond;

  let label: string;
  let color: string;
  let icon: typeof Shield;
  let percentage: number;

  if (entropy < 40) {
    label = 'Very Weak';
    color = 'bg-red-500';
    icon = ShieldOff;
    percentage = 15;
  } else if (entropy < 55) {
    label = 'Weak';
    color = 'bg-orange-500';
    icon = ShieldAlert;
    percentage = 30;
  } else if (entropy < 70) {
    label = 'Fair';
    color = 'bg-yellow-500';
    icon = Shield;
    percentage = 50;
  } else if (entropy < 85) {
    label = 'Strong';
    color = 'bg-lime-500';
    icon = ShieldCheck;
    percentage = 72;
  } else if (entropy < 100) {
    label = 'Very Strong';
    color = 'bg-emerald-500';
    icon = ShieldCheck;
    percentage = 88;
  } else {
    label = 'Excellent';
    color = 'bg-emerald-400';
    icon = ShieldCheck;
    percentage = 100;
  }

  // Human-readable crack time
  let crackTime: string;
  if (seconds < 1) crackTime = 'Instantly';
  else if (seconds < 60) crackTime = `${Math.round(seconds)}s`;
  else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)}m`;
  else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)}h`;
  else if (seconds < 31536000) crackTime = `${Math.round(seconds / 86400)} days`;
  else if (seconds < 31536000 * 100) crackTime = `${Math.round(seconds / 31536000)} years`;
  else if (seconds < 31536000 * 1000000) crackTime = `${Math.round(seconds / 31536000 / 1000)}k years`;
  else crackTime = `${Math.round(seconds / 31536000 / 1e6)}M years`;

  return { entropy, label, color, icon, percentage, crackTime };
}

// ── Generate a single password ─────────────────────────────────────────────

function generatePassword(
  length: number,
  useLower: boolean,
  useUpper: boolean,
  useNumbers: boolean,
  useSymbols: boolean,
  excludeAmbiguous: boolean,
): string {
  let charset = '';
  if (useLower) charset += LOWERCASE;
  if (useUpper) charset += UPPERCASE;
  if (useNumbers) charset += NUMBERS;
  if (useSymbols) charset += SYMBOLS;

  if (!charset) charset = LOWERCASE;

  if (excludeAmbiguous) {
    charset = charset
      .split('')
      .filter((ch) => !AMBIGUOUS.includes(ch))
      .join('');
  }

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }

  // Ensure at least one character from each enabled set
  const mustContain: string[] = [];
  if (useLower) mustContain.push(LOWERCASE);
  if (useUpper) mustContain.push(UPPERCASE);
  if (useNumbers) mustContain.push(NUMBERS);
  if (useSymbols) mustContain.push(SYMBOLS);

  if (mustContain.length > 0 && length >= mustContain.length) {
    const chars = result.split('');
    for (let i = 0; i < mustContain.length; i++) {
      const set = mustContain[i];
      const validChar = set[array[(array.length - 1 - i) % array.length] % set.length];
      chars[i] = validChar;
    }
    // Shuffle to avoid predictable positions
    for (let i = chars.length - 1; i > 0; i--) {
      const j = array[i % array.length] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    result = chars.join('');
  }

  return result;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(20);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(5);
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<PasswordEntry[]>([]);
  const [nextId, setNextId] = useState(0);

  const charsetSize = useMemo(() => {
    let size = 0;
    if (useLower) size += LOWERCASE.length;
    if (useUpper) size += UPPERCASE.length;
    if (useNumbers) size += NUMBERS.length;
    if (useSymbols) size += SYMBOLS.length;
    if (excludeAmbiguous) {
      let toRemove = 0;
      if (useLower) toRemove += AMBIGUOUS.split('').filter((ch) => LOWERCASE.includes(ch)).length;
      if (useUpper) toRemove += AMBIGUOUS.split('').filter((ch) => UPPERCASE.includes(ch)).length;
      if (useNumbers) toRemove += AMBIGUOUS.split('').filter((ch) => NUMBERS.includes(ch)).length;
      if (useSymbols) toRemove += AMBIGUOUS.split('').filter((ch) => SYMBOLS.includes(ch)).length;
      size -= toRemove;
    }
    return Math.max(size, 1);
  }, [useLower, useUpper, useNumbers, useSymbols, excludeAmbiguous]);

  const passwords = useMemo(() => {
    const pwds: PasswordEntry[] = [];
    for (let i = 0; i < count; i++) {
      const value = generatePassword(length, useLower, useUpper, useNumbers, useSymbols, excludeAmbiguous);
      pwds.push({ id: nextId + i, value, entropy: length * Math.log2(charsetSize) });
    }
    return pwds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, useLower, useUpper, useNumbers, useSymbols, excludeAmbiguous, count, nextId]);

  const regenerate = useCallback(() => {
    setNextId((prev) => prev + count);
    // Add current passwords to history
    setHistory((prev) => {
      const merged = [...passwords, ...prev];
      return merged.slice(0, 50); // Keep last 50
    });
  }, [passwords, count]);

  // Auto-generate on mount
  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleShow = useCallback((id: number) => {
    setShowPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyPassword = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(passwords.map((p) => p.value).join('\n'));
      toast.success(`Copied ${passwords.length} passwords`);
    } catch {
      toast.error('Failed to copy');
    }
  }, [passwords]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast.success('History cleared');
  }, []);

  const avgEntropy = passwords.length > 0
    ? passwords.reduce((sum, p) => sum + p.entropy, 0) / passwords.length
    : 0;
  const strength = calculateStrength(passwords[0]?.value || '', charsetSize);

  return (
    <ToolLayout
      title="Password Generator"
      description="Generate strong, cryptographically random passwords with full control over length, character sets, and complexity."
      controls={
        <div className="flex items-center gap-4 flex-wrap w-full">
          <div className="flex items-center gap-2 text-slate-300">
            <Hash className="w-4 h-4" />
            <span className="text-sm text-slate-400">Avg entropy:</span>
            <span className="text-sm font-mono font-semibold text-brand-400">
              {avgEntropy.toFixed(1)} bits
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 ml-auto">
            <button
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Settings Panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              Settings
            </h3>

            {/* Length */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Length</label>
                <span className="text-sm font-mono font-semibold text-white">{length}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLength((l) => Math.max(4, l - 1))}
                  className="p-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={length <= 4}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={4}
                  max={128}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                />
                <button
                  onClick={() => setLength((l) => Math.min(128, l + 1))}
                  className="p-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={length >= 128}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>4</span>
                <span>128</span>
              </div>
            </div>

            {/* Character sets */}
            <div className="space-y-2.5 mb-5">
              <label className="text-xs text-slate-400 block mb-1">Character Sets</label>
              {[
                { key: 'lower', label: 'Lowercase (a-z)', value: useLower, set: setUseLower, count: 26 },
                { key: 'upper', label: 'Uppercase (A-Z)', value: useUpper, set: setUseUpper, count: 26 },
                { key: 'numbers', label: 'Numbers (0-9)', value: useNumbers, set: setUseNumbers, count: 10 },
                { key: 'symbols', label: 'Symbols (!@#$...)', value: useSymbols, set: setUseSymbols, count: 24 },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.set(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex-1">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{item.count}</span>
                </label>
              ))}
            </div>

            {/* Exclude ambiguous */}
            <div className="mb-5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Exclude ambiguous ({AMBIGUOUS.split('').join(', ')})
                </span>
              </label>
            </div>

            {/* Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Generate</label>
                <span className="text-sm font-mono font-semibold text-white">{count}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="p-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={count <= 1}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <button
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  className="p-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={count >= 20}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Strength meter */}
          <div className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <strength.icon className="w-4 h-4" />
              Password Strength
            </h3>

            <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>{strength.label}</span>
              <span className="font-mono text-slate-500">{strength.entropy.toFixed(1)} bits</span>
            </div>

            <div className="text-[11px] text-slate-500">
              Estimated crack time:{' '}
              <span className="text-slate-300 font-medium">{strength.crackTime}</span>
              <span className="text-slate-600 ml-1">(at 1B guesses/s)</span>
            </div>
          </div>
        </div>

        {/* ── Passwords Display ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">
              Generated Passwords
            </h3>
            <button
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
            >
              <Copy className="w-3 h-3" />
              Copy All
            </button>
          </div>

          {passwords.map((pwd) => {
            const hidden = !showPasswords.has(pwd.id);
            const pwdStrength = calculateStrength(pwd.value, charsetSize);
            return (
              <div
                key={pwd.id}
                className="group flex items-center gap-3 rounded-lg bg-slate-900/80 border border-slate-700/50 px-4 py-3 hover:border-slate-600/70 transition-colors"
              >
                {/* Password text */}
                <div className="flex-1 font-mono text-sm min-w-0">
                  {hidden ? (
                    <span className="text-slate-600 tracking-[0.2em] select-none">
                      {'●'.repeat(pwd.value.length)}
                    </span>
                  ) : (
                    <span className="text-slate-200 break-all">{pwd.value}</span>
                  )}
                </div>

                {/* Strength mini-bar */}
                <div className="hidden sm:flex items-center gap-1.5 w-16 flex-shrink-0">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pwdStrength.color}`}
                      style={{ width: `${pwdStrength.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono w-8 text-right">
                    {pwdStrength.entropy.toFixed(0)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleShow(pwd.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                    title={hidden ? 'Show' : 'Hide'}
                  >
                    {hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => copyPassword(pwd.value)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-brand-400 hover:bg-brand-600/10 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  Recent History
                </h3>
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.slice(0, 15).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 text-xs font-mono text-slate-500 px-2 py-1 rounded hover:bg-slate-800/50 transition-colors group"
                  >
                    <Key className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="truncate flex-1">{entry.value}</span>
                    <span className="text-[10px] text-slate-600">{entry.entropy.toFixed(1)}b</span>
                    <button
                      onClick={() => copyPassword(entry.value)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-brand-400 transition-all"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

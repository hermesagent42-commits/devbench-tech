'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Eye, EyeOff, Copy, Check, Shield, RefreshCw, Zap, Key, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// Top 100 most common passwords (RockYou + common lists)
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', '1234567',
  'qwerty', 'abc123', 'monkey', '1234567890', 'letmein', '111111',
  'dragon', 'baseball', 'iloveyou', 'trustno1', 'sunshine', 'master',
  'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael',
  'ninja', 'mustang', 'password1', 'admin', 'root', 'user',
  'passwd', '1234', '0000', '123', 'test', 'guest', 'qwerty123',
  '1q2w3e4r', 'admin123', 'pass', 'p@ssword', 'p@ssw0rd', 'pa$$word',
  'password123', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'batman',
  'superman', 'princess', 'fuckyou', 'fuck', 'biteme', 'freedom',
  'whatever', 'charlie', 'thomas', 'hunter', 'harley', 'ranger',
  'killer', 'george', 'andrew', 'joshua', 'buster', 'cheese',
]);

// Calculate Shannon entropy
function calculateEntropy(password: string): number {
  if (!password) return 0;

  // Count character classes used
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  // If no pools matched (shouldn't happen), default to something
  if (poolSize === 0) poolSize = 26;

  return password.length * Math.log2(poolSize);
}

// Check for sequential patterns
function hasSequentialPattern(password: string): boolean {
  const lower = password.toLowerCase();
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'qwertzuiop',
    'azertyuiop',
  ];

  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 2; i++) {
      const chunk = seq.substring(i, i + 3);
      if (lower.includes(chunk)) return true;
      // Reverse
      if (lower.includes(chunk.split('').reverse().join(''))) return true;
    }
  }
  return false;
}

// Check for repeated characters
function hasRepeatedChars(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

// Check for keyboard walk patterns
function hasKeyboardWalk(password: string): boolean {
  const lower = password.toLowerCase();
  // Adjacent keyboard keys (simplified)
  const adjacencies = [
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'zxcv', 'xcvb', 'cvbn', 'vbnm',
  ];
  return adjacencies.some(adj => lower.includes(adj) || lower.includes(adj.split('').reverse().join('')));
}

// Estimate time to crack (offline fast hash, bcrypt, etc.)
function estimateCrackTime(entropy: number): { label: string; desc: string; color: string } {
  // Assume 1 billion guesses/sec (fast hash like MD5) and 10k/sec (slow hash like bcrypt)
  const fastAttemptsPerSecond = 1e9;
  const slowAttemptsPerSecond = 1e4;

  const fastSeconds = Math.pow(2, entropy) / fastAttemptsPerSecond;
  const slowSeconds = Math.pow(2, entropy) / slowAttemptsPerSecond;

  if (entropy < 28) {
    return { label: '< 1 second', desc: 'Instantly cracked', color: 'text-red-400' };
  } else if (entropy < 36) {
    return { label: formatTime(fastSeconds), desc: 'Fast hash (MD5)', color: 'text-red-400' };
  } else if (entropy < 60) {
    return { label: formatTime(fastSeconds), desc: 'Fast hash (MD5)', color: 'text-orange-400' };
  } else if (entropy < 80) {
    return { label: formatTime(slowSeconds), desc: 'Slow hash (bcrypt)', color: 'text-yellow-400' };
  } else if (entropy < 100) {
    return { label: 'Centuries', desc: 'Even with massive computing', color: 'text-green-400' };
  } else {
    return { label: 'Heat death of universe', desc: 'Effectively unbreakable', color: 'text-green-300' };
  }
}

function formatTime(seconds: number): string {
  if (seconds < 1) return '< 1 second';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1000) return `${Math.round(seconds / (31536000 * 100))} centuries`;
  return 'Heat death of universe';
}

function generateStrongPassword(length: number = 20): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + symbols;

  // Ensure at least one of each
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let result = '';
  result += upper[array[0] % upper.length];
  result += lower[array[1] % lower.length];
  result += digits[array[2] % digits.length];
  result += symbols[array[3] % symbols.length];

  for (let i = 4; i < length; i++) {
    result += all[array[i] % all.length];
  }

  // Shuffle
  return result.split('').sort(() => 0.5 - Math.random()).join('');
}

interface Requirement {
  id: string;
  label: string;
  check: (password: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { id: 'length', label: 'At least 8 characters', check: (p) => p.length >= 8 },
  { id: 'length-12', label: 'At least 12 characters (recommended)', check: (p) => p.length >= 12 },
  { id: 'lowercase', label: 'Contains lowercase letters', check: (p) => /[a-z]/.test(p) },
  { id: 'uppercase', label: 'Contains uppercase letters', check: (p) => /[A-Z]/.test(p) },
  { id: 'numbers', label: 'Contains numbers', check: (p) => /[0-9]/.test(p) },
  { id: 'symbols', label: 'Contains special symbols', check: (p) => /[^a-zA-Z0-9]/.test(p) },
  { id: 'no-common', label: 'Not a common password', check: (p) => !COMMON_PASSWORDS.has(p.toLowerCase()) },
  { id: 'no-sequential', label: 'No sequential patterns (abc, 123)', check: (p) => !hasSequentialPattern(p) },
  { id: 'no-repeated', label: 'No repeated characters (aaa)', check: (p) => !hasRepeatedChars(p) },
  { id: 'no-keyboard', label: 'No keyboard walks (qwerty)', check: (p) => !hasKeyboardWalk(p) },
];

function getStrength(entropy: number): { score: number; label: string; color: string; bgColor: string; width: string } {
  if (!entropy || entropy < 28) {
    return { score: 0, label: 'Very Weak', color: 'text-red-400', bgColor: 'bg-red-500', width: 'w-[5%]' };
  } else if (entropy < 36) {
    return { score: 1, label: 'Weak', color: 'text-orange-400', bgColor: 'bg-orange-500', width: 'w-[20%]' };
  } else if (entropy < 60) {
    return { score: 2, label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-500', width: 'w-[40%]' };
  } else if (entropy < 80) {
    return { score: 3, label: 'Strong', color: 'text-green-400', bgColor: 'bg-green-500', width: 'w-[65%]' };
  } else if (entropy < 100) {
    return { score: 4, label: 'Very Strong', color: 'text-emerald-400', bgColor: 'bg-emerald-500', width: 'w-[85%]' };
  } else {
    return { score: 5, label: 'Excellent', color: 'text-brand-400', bgColor: 'bg-brand-500', width: 'w-full' };
  }
}

export default function PasswordStrengthCheckerPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const entropy = useMemo(() => calculateEntropy(password), [password]);
  const strength = useMemo(() => getStrength(entropy), [entropy]);
  const crackTime = useMemo(() => estimateCrackTime(entropy), [entropy]);
  const isCommon = useMemo(() => {
    if (!password) return false;
    return COMMON_PASSWORDS.has(password.toLowerCase());
  }, [password]);
  const metRequirements = useMemo(() => {
    return REQUIREMENTS.filter(r => r.check(password));
  }, [password]);

  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [password]);

  const handleGenerate = useCallback(() => {
    const newPassword = generateStrongPassword();
    setPassword(newPassword);
    setShowPassword(true);
    toast.success('Strong password generated!');
  }, []);

  return (
    <ToolLayout
      title="Password Strength Checker"
      description="Check password strength in real-time with entropy analysis, crack-time estimates, and security recommendations — 100% client-side, your password never leaves your browser."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="password-input" className="text-white font-semibold text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-400" />
            Enter Password
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20 transition-all"
              title="Generate a strong password"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            id="password-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type or generate a password to check..."
            className="input-field w-full pr-24 font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {password && (
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded transition-all ${
                  copied
                    ? 'text-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Copy password"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>{password.length} characters</span>
          <span>·</span>
          <span>Your password is never stored or transmitted</span>
        </div>
      </div>

      {/* Strength Meter */}
      {password && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              Strength Analysis
            </h2>
            <span className={`text-sm font-bold ${strength.color}`}>
              {strength.label}
            </span>
          </div>

          {/* Strength bar */}
          <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full ${strength.bgColor} rounded-full transition-all duration-500 ease-out ${strength.width}`}
            />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-white mb-1">
                {password.length}
              </div>
              <div className="text-xs text-slate-500">Characters</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-brand-300 mb-1">
                {entropy.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">Bits of Entropy</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className={`text-lg font-mono font-bold mb-1 ${crackTime.color}`}>
                {crackTime.label}
              </div>
              <div className="text-xs text-slate-500">Time to Crack ({crackTime.desc})</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-white mb-1">
                {metRequirements.length}/{REQUIREMENTS.length}
              </div>
              <div className="text-xs text-slate-500">Checks Passed</div>
            </div>
          </div>

          {/* Common password warning */}
          {isCommon && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Common Password Detected!</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  This password appears in known data breaches. It can be cracked instantly using a dictionary attack.
                </p>
              </div>
            </div>
          )}

          {/* Entropy info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-300">About Entropy</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Each bit of entropy doubles the number of guesses required. 40 bits = ~1 trillion possibilities.
                Aim for 60+ bits for online accounts and 80+ for high-security use.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="card">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Security Checklist
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REQUIREMENTS.map((req) => {
            const met = password ? req.check(password) : false;
            return (
              <div
                key={req.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  !password
                    ? 'bg-surface border border-slate-700/30 text-slate-600'
                    : met
                    ? 'bg-green-500/5 border border-green-500/15 text-green-400'
                    : 'bg-red-500/5 border border-red-500/15 text-red-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    !password
                      ? 'bg-slate-700/50'
                      : met
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}
                >
                  {!password ? (
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  ) : met ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                  )}
                </div>
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, AlertCircle, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Regex Explainer (pure client-side, zero deps) ──────────────────────────

interface Token {
  raw: string;
  type: string;
  explanation: string;
  start: number;
  end: number;
}

const PRESETS: { label: string; pattern: string; flags: string }[] = [
  {
    label: 'Email',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: '',
  },
  {
    label: 'URL (https)',
    pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    flags: '',
  },
  {
    label: 'IPv4 Address',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    flags: '',
  },
  {
    label: 'Date (YYYY-MM-DD)',
    pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
    flags: '',
  },
  {
    label: 'Hex Color',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    flags: '',
  },
  {
    label: 'Password (8+ chars, 1 letter, 1 digit)',
    pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,}$',
    flags: '',
  },
  {
    label: 'Slug / kebab-case',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    flags: '',
  },
  {
    label: 'US Phone Number',
    pattern: '^\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$',
    flags: '',
  },
];

function tokenizeRegex(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  function push(raw: string, type: string, explanation: string) {
    tokens.push({ raw, type, explanation, start: i - raw.length, end: i });
  }

  function peek(offset: number = 0): string {
    return pattern[i + offset] ?? '';
  }

  function consume(n: number = 1): string {
    const ch = pattern.slice(i, i + n);
    i += n;
    return ch;
  }

  // Helper: read integer digits
  function readDigits(): string {
    let digits = '';
    while (/\d/.test(peek())) {
      digits += consume();
    }
    return digits;
  }

  while (i < pattern.length) {
    const ch = consume();

    // ─── Escaped sequences (backslash) ──────────────────────────────────────
    if (ch === '\\' && i < pattern.length) {
      const next = consume();
      const full = '\\' + next;

      switch (next) {
        // Digit shorthand
        case 'd': push(full, 'Shorthand', 'Any digit (0-9). Equivalent to [0-9]'); break;
        case 'D': push(full, 'Shorthand', 'Any non-digit character. Equivalent to [^0-9]'); break;
        // Word shorthand
        case 'w': push(full, 'Shorthand', 'Any word character (letter, digit, or underscore). Equivalent to [A-Za-z0-9_]'); break;
        case 'W': push(full, 'Shorthand', 'Any non-word character. Equivalent to [^A-Za-z0-9_]'); break;
        // Whitespace shorthand
        case 's': push(full, 'Shorthand', 'Any whitespace character (space, tab, newline, etc.)'); break;
        case 'S': push(full, 'Shorthand', 'Any non-whitespace character'); break;
        // Word boundary
        case 'b': push(full, 'Anchor', 'Word boundary — position between a word char and a non-word char'); break;
        case 'B': push(full, 'Anchor', 'Non-word boundary — position between two word chars or two non-word chars'); break;
        // String anchors
        case 'A': push(full, 'Anchor', 'Start of string (not just start of line)'); break;
        case 'Z': push(full, 'Anchor', 'End of string, or before a trailing newline at end of string'); break;
        case 'z': push(full, 'Anchor', 'Absolute end of string'); break;
        // Octal / null
        case '0':
          if (/\d/.test(peek())) {
            let oct = '0' + readDigits();
            push('\\' + oct, 'Escape', `Octal escape for character code ${oct}`);
          } else {
            push(full, 'Escape', 'Null character (\\0)');
          }
          break;
        // Hex escape
        case 'x': {
          const hex = consume(2);
          push('\\x' + hex, 'Escape', `Hex escape for character 0x${hex}`);
          break;
        }
        // Unicode escape
        case 'u': {
          if (peek() === '{') {
            consume(); // {
            let code = '';
            while (peek() !== '}' && i < pattern.length) code += consume();
            consume(); // }
            push('\\u{' + code + '}', 'Escape', `Unicode code point U+${code}`);
          } else {
            const code = consume(4);
            push('\\u' + code, 'Escape', `Unicode escape for U+${code}`);
          }
          break;
        }
        // Backreference
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9': {
          let digits = next;
          while (/\d/.test(peek())) digits += consume();
          push('\\' + digits, 'Backreference', `Matches the same text as capture group #${digits}`);
          break;
        }
        // Named backreference
        case 'k': {
          if (peek() === '<') {
            consume(); // <
            let name = '';
            while (peek() !== '>' && i < pattern.length) name += consume();
            consume(); // >
            push('\\k<' + name + '>', 'Backreference', `Matches the same text as named capture group "${name}"`);
          } else {
            push(full, 'Escape', `Escaped character: literal '${next}'`);
          }
          break;
        }
        // Literal escape (\. \* \+ etc.)
        default:
          push(full, 'Escape', `Escaped character: literal '${next}'`);
      }
      continue;
    }

    // ─── Anchors ────────────────────────────────────────────────────────────
    if (ch === '^') {
      push(ch, 'Anchor', 'Start of line (or start of string in single-line mode). Asserts position at the beginning.');
      continue;
    }
    if (ch === '$') {
      push(ch, 'Anchor', 'End of line (or end of string in single-line mode). Asserts position at the end.');
      continue;
    }

    // ─── Dot ────────────────────────────────────────────────────────────────
    if (ch === '.') {
      push(ch, 'Wildcard', 'Matches any single character except newline (\\n). Use dotall flag (s) to match newlines too.');
      continue;
    }

    // ─── Character class [...] ──────────────────────────────────────────────
    if (ch === '[') {
      let cls = '[';
      let negated = false;

      if (peek() === '^') {
        cls += consume();
        negated = true;
      }

      // Consume until matching ]
      let depth = 1;
      while (i < pattern.length && depth > 0) {
        const c = consume();
        if (c === '\\' && i < pattern.length) {
          cls += c + consume();
        } else if (c === '[') {
          depth++;
          cls += c;
        } else if (c === ']') {
          depth--;
          if (depth > 0) cls += c;
        } else {
          cls += c;
        }
      }

      if (negated) {
        push(cls, 'Character Class', `Negated character class — matches any character NOT in the set: [^...]`);
      } else {
        push(cls, 'Character Class', 'Character class — matches any single character from the set inside the brackets');
      }
      continue;
    }

    // ─── Group open ─────────────────────────────────────────────────────────
    if (ch === '(') {
      // Lookahead / Lookbehind
      if (peek() === '?') {
        if (peek(1) === '=') {
          // Positive lookahead
          let grp = '(?=';
          i += 2;
          let depth = 1;
          while (i < pattern.length && depth > 0) {
            const c = consume();
            if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (depth > 0) grp += c;
          }
          push(grp, 'Lookahead', 'Positive lookahead — asserts that what follows matches the pattern. Does NOT consume characters. Zero-width assertion.');
          continue;
        }
        if (peek(1) === '!') {
          // Negative lookahead
          let grp = '(?!';
          i += 2;
          let depth = 1;
          while (i < pattern.length && depth > 0) {
            const c = consume();
            if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (depth > 0) grp += c;
          }
          push(grp, 'Lookahead', 'Negative lookahead — asserts that what follows does NOT match the pattern. Zero-width assertion.');
          continue;
        }
        if (peek(1) === '<') {
          if (peek(2) === '=') {
            // Positive lookbehind
            let grp = '(?<=';
            i += 3;
            let depth = 1;
            while (i < pattern.length && depth > 0) {
              const c = consume();
              if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
              if (c === '(') depth++;
              if (c === ')') depth--;
              if (depth > 0) grp += c;
            }
            push(grp, 'Lookbehind', 'Positive lookbehind — asserts that what precedes matches the pattern. Zero-width assertion.');
            continue;
          }
          if (peek(2) === '!') {
            // Negative lookbehind
            let grp = '(?<!';
            i += 3;
            let depth = 1;
            while (i < pattern.length && depth > 0) {
              const c = consume();
              if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
              if (c === '(') depth++;
              if (c === ')') depth--;
              if (depth > 0) grp += c;
            }
            push(grp, 'Lookbehind', 'Negative lookbehind — asserts that what precedes does NOT match the pattern. Zero-width assertion.');
            continue;
          }
        }
        // Named capture group
        if (peek(1) === '<') {
          // Skip past ? and past <
          consume(); // ?
          consume(); // <
          let name = '';
          while (peek() !== '>' && i < pattern.length) name += consume();
          consume(); // >
          let grp = '(?<' + name + '>';
          let depth = 1;
          while (i < pattern.length && depth > 0) {
            const c = consume();
            if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (depth > 0) grp += c;
          }
          push(grp, 'Group', `Named capture group "${name}" — captures the matched substring with the name "${name}" for later use`);
          continue;
        }
        // Non-capturing group
        if (peek(1) === ':') {
          let grp = '(?:';
          i += 2;
          let depth = 1;
          while (i < pattern.length && depth > 0) {
            const c = consume();
            if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (depth > 0) grp += c;
          }
          push(grp, 'Group', 'Non-capturing group — groups the pattern without creating a backreference. Slightly faster than capturing groups.');
          continue;
        }
        // Atomic group or other (?… syntax)
        let grp = '(?' + peek();
        i += 1;
        let depth = 1;
        while (i < pattern.length && depth > 0) {
          const c = consume();
          if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
          if (c === '(') depth++;
          if (c === ')') depth--;
          if (depth > 0) grp += c;
        }
        push(grp, 'Group', 'Special group construct — used for lookarounds, non-capturing groups, named groups, or flags');
        continue;
      }

      // Regular capturing group
      let grp = '(';
      let depth = 1;
      while (i < pattern.length && depth > 0) {
        const c = consume();
        if (c === '\\' && i < pattern.length) { grp += c + consume(); continue; }
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (depth > 0) grp += c;
      }
      push(grp, 'Group', 'Capturing group — captures the matched substring into a numbered group for backreferences or extraction');
      continue;
    }

    // ─── Close paren (unlikely standalone, but handle) ──────────────────────
    if (ch === ')') {
      push(ch, 'Literal', 'Literal closing parenthesis — this may be part of a group parsed above, or escaped');
      continue;
    }

    // ─── Quantifiers ────────────────────────────────────────────────────────
    if (ch === '*') {
      if (peek() === '?') { consume(); push('*?', 'Quantifier', 'Zero or more times, lazy (as few as possible). Tries to match zero times first.'); }
      else if (peek() === '+') { consume(); push('*+', 'Quantifier', 'Zero or more times, possessive — matches as many as possible, never gives back.'); }
      else { push('*', 'Quantifier', 'Zero or more times, greedy. Matches as many characters as possible.'); }
      continue;
    }
    if (ch === '+') {
      if (peek() === '?') { consume(); push('+?', 'Quantifier', 'One or more times, lazy (as few as possible).'); }
      else if (peek() === '+') { consume(); push('++', 'Quantifier', 'One or more times, possessive — matches as many as possible, never gives back.'); }
      else { push('+', 'Quantifier', 'One or more times, greedy. Matches as many characters as possible.'); }
      continue;
    }
    if (ch === '?') {
      if (peek() === '?') { consume(); push('??', 'Quantifier', 'Zero or one time, lazy. Prefers to match zero times.'); }
      else if (peek() === '+') { consume(); push('?+', 'Quantifier', 'Zero or one time, possessive. Never gives back the match.'); }
      else { push('?', 'Quantifier', 'Zero or one time, greedy. Makes the preceding token optional.'); }
      continue;
    }
    if (ch === '{') {
      let q = '{';
      const firstNum = readDigits();
      q += firstNum;

      if (peek() === ',') {
        q += consume(); // ,
        const secondNum = readDigits();
        q += secondNum;
        q += consume(); // }

        if (peek(-1) === '?') {
          // Strip the } we just added and re-read
          q = q.slice(0, -1);
          consume(); // ?
          q += '}?';
          if (secondNum) {
            push(q, 'Quantifier', `Between ${firstNum} and ${secondNum} times, lazy. Matches as few as possible.`);
          } else {
            push(q, 'Quantifier', `At least ${firstNum} times, lazy. Matches as few as possible.`);
          }
        } else if (peek(-1) === '+') {
          q = q.slice(0, -1);
          consume();
          q += '}+';
          push(q, 'Quantifier', `Possessive range quantifier — matches the range and never gives back.`);
        } else {
          if (secondNum) {
            push(q, 'Quantifier', `Between ${firstNum} and ${secondNum} times, greedy. Matches as many as possible.`);
          } else {
            push(q, 'Quantifier', `At least ${firstNum} times, greedy. Matches as many as possible.`);
          }
        }
      } else {
        q += consume(); // }
        if (peek(-1) === '?') { /* already handled */ }
        push(q, 'Quantifier', `Exactly ${firstNum} times.`);
      }
      continue;
    }

    // ─── Alternation ────────────────────────────────────────────────────────
    if (ch === '|') {
      push(ch, 'Alternation', 'Alternation (OR) — matches either the pattern on the left or the pattern on the right');
      continue;
    }

    // ─── Literal character ──────────────────────────────────────────────────
    push(ch, 'Literal', `Matches the literal character '${ch}'`);
  }

  return tokens;
}

function getTokenColor(type: string): string {
  switch (type) {
    case 'Anchor': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Quantifier': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Character Class': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Group': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Lookahead':
    case 'Lookbehind': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'Backreference': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'Wildcard': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'Shorthand': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'Escape': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'Alternation': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export default function RegexExplainerPage() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('');
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);

  const tokens = useMemo(() => {
    if (!pattern.trim()) return [];
    try {
      return tokenizeRegex(pattern);
    } catch {
      return [];
    }
  }, [pattern]);

  const copyPattern = useCallback(() => {
    navigator.clipboard.writeText(pattern).then(() => toast.success('Copied!'));
  }, [pattern]);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
  }, []);

  return (
    <ToolLayout
      title="Regex Explainer"
      description="Paste any regular expression and get a plain-English, token-by-token breakdown of what it does."
    >
      {/* Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Regex Pattern</label>
          <div className="relative">
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              className="w-full bg-surface-light border border-slate-600 text-slate-200 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 pr-10"
            />
            <button
              onClick={copyPattern}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy pattern"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Flags (optional)</label>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="e.g. g, i, m, s, u, gi, gims"
            className="w-full bg-surface-light border border-slate-600 text-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            g=global, i=case-insensitive, m=multiline, s=dotall, u=unicode
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                pattern === preset.pattern
                  ? 'bg-brand-500/20 text-brand-400 border-brand-500/50'
                  : 'bg-surface-light text-slate-400 border-slate-600 hover:text-slate-200 hover:border-slate-500'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token Breakdown */}
      {tokens.length > 0 && (
        <div className="space-y-4">
          {/* Color-coded pattern display */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" />
              Visual Breakdown
            </h3>
            <div className="bg-surface-light rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {tokens.map((token, idx) => (
                <span
                  key={idx}
                  onMouseEnter={() => setHoveredToken(idx)}
                  onMouseLeave={() => setHoveredToken(null)}
                  className={`inline rounded px-0.5 border cursor-default transition-all ${
                    getTokenColor(token.type)
                  } ${hoveredToken === idx ? 'ring-1 ring-white/30 scale-105 inline-block' : ''}`}
                >
                  {token.raw}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Hover over tokens above or scroll through the table below for explanations
            </p>
          </div>

          {/* Explanation table */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" />
              Token-by-Token Explanation
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-light border-b border-slate-700/50">
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider w-12">#</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Token</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider w-32">Type</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token, idx) => (
                    <tr
                      key={idx}
                      onMouseEnter={() => setHoveredToken(idx)}
                      onMouseLeave={() => setHoveredToken(null)}
                      className={`border-b border-slate-700/30 transition-colors ${
                        hoveredToken === idx ? 'bg-brand-500/5' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block font-mono text-xs rounded px-2 py-0.5 border ${getTokenColor(token.type)}`}>
                          {token.raw}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getTokenColor(token.type)}`}>
                          {token.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 leading-relaxed">{token.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4">
            <p className="text-sm text-slate-400">
              <span className="text-brand-400 font-medium">{tokens.length}</span> tokens parsed.
              {flags && (
                <span className="ml-2">
                  Flags: <span className="font-mono text-brand-300">{flags}</span>
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!pattern.trim() && (
        <div className="text-center py-16 text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Enter a regex pattern above</p>
          <p className="text-sm mt-1">Or pick a preset to see it in action</p>
        </div>
      )}

      {/* Error state */}
      {pattern.trim() && tokens.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Could not parse the regex pattern. Check for unmatched brackets or syntax errors.</p>
        </div>
      )}
    </ToolLayout>
  );
}

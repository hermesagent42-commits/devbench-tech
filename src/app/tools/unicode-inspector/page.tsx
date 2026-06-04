'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, ChevronRight, Hash, Binary, Code2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ─────────────────────────────────────────────────────────────────

function codePointToUtf8(cp: number): number[] {
  if (cp < 0x80) return [cp];
  if (cp < 0x800) return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)];
  if (cp < 0x10000) return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return [
    0xf0 | (cp >> 18),
    0x80 | ((cp >> 12) & 0x3f),
    0x80 | ((cp >> 6) & 0x3f),
    0x80 | (cp & 0x3f),
  ];
}

function codePointToUtf16(cp: number): number[] {
  if (cp <= 0xffff) return [cp];
  const lead = 0xd800 + ((cp - 0x10000) >> 10);
  const trail = 0xdc00 + ((cp - 0x10000) & 0x3ff);
  return [lead, trail];
}

function formatHex(n: number, pad = 2): string {
  return n.toString(16).toUpperCase().padStart(pad, '0');
}

function byteHex(arr: number[]): string {
  return arr.map((b) => '0x' + formatHex(b)).join(' ');
}

function escapeJS(cp: number): string {
  if (cp <= 0xffff) return '\\u' + formatHex(cp, 4);
  return '\\u{' + formatHex(cp) + '}';
}

function escapeCSS(cp: number): string {
  return '\\' + formatHex(cp);
}

const NAMED_ENTITIES: Record<number, string> = {
  0x00A9: '&copy;',
  0x00AE: '&reg;',
  0x2122: '&trade;',
  0x00A0: '&nbsp;',
  0x00A2: '&cent;',
  0x00A3: '&pound;',
  0x00A5: '&yen;',
  0x20AC: '&euro;',
  0x00B0: '&deg;',
  0x00B1: '&plusmn;',
  0x00D7: '&times;',
  0x00F7: '&divide;',
  0x00B6: '&para;',
  0x00B5: '&micro;',
  0x03C0: '&pi;',
  0x03A3: '&Sigma;',
  0x03C3: '&sigma;',
  0x03A9: '&Omega;',
  0x0394: '&Delta;',
  0x03B4: '&delta;',
  0x039B: '&Lambda;',
  0x03BB: '&lambda;',
  0x0393: '&Gamma;',
  0x03B3: '&gamma;',
  0x0391: '&Alpha;',
  0x03B1: '&alpha;',
  0x0392: '&Beta;',
  0x03B2: '&beta;',
  0x0395: '&Epsilon;',
  0x03B5: '&epsilon;',
  0x0398: '&Theta;',
  0x03B8: '&theta;',
  0x039C: '&Mu;',
  0x03BC: '&mu;',
  0x03A6: '&Phi;',
  0x03C6: '&phi;',
  0x03A8: '&Psi;',
  0x03C8: '&psi;',
  0x03C9: '&omega;',
  0x2200: '&forall;',
  0x2202: '&part;',
  0x2203: '&exist;',
  0x2205: '&empty;',
  0x2207: '&nabla;',
  0x2208: '&isin;',
  0x2209: '&notin;',
  0x220B: '&ni;',
  0x220F: '&prod;',
  0x2211: '&sum;',
  0x2212: '&minus;',
  0x2217: '&lowast;',
  0x221A: '&radic;',
  0x221D: '&prop;',
  0x221E: '&infin;',
  0x2220: '&ang;',
  0x2227: '&and;',
  0x2228: '&or;',
  0x2229: '&cap;',
  0x222A: '&cup;',
  0x222B: '&int;',
  0x2234: '&there4;',
  0x223C: '&sim;',
  0x2245: '&cong;',
  0x2248: '&asymp;',
  0x2260: '&ne;',
  0x2261: '&equiv;',
  0x2264: '&le;',
  0x2265: '&ge;',
  0x2282: '&sub;',
  0x2283: '&sup;',
  0x2284: '&nsub;',
  0x2286: '&sube;',
  0x2287: '&supe;',
  0x2295: '&oplus;',
  0x2297: '&otimes;',
  0x22A5: '&perp;',
  0x22C5: '&sdot;',
  0x2190: '&larr;',
  0x2191: '&uarr;',
  0x2192: '&rarr;',
  0x2193: '&darr;',
  0x2194: '&harr;',
  0x21D0: '&lArr;',
  0x21D1: '&uArr;',
  0x21D2: '&rArr;',
  0x21D3: '&dArr;',
  0x21D4: '&hArr;',
  0x2660: '&spades;',
  0x2663: '&clubs;',
  0x2665: '&hearts;',
  0x2666: '&diams;',
  0x266A: '&#9834;',
  0x266B: '&#9835;',
  0x2600: '&#9728;',
  0x2601: '&#9729;',
  0x2602: '&#9730;',
  0x2603: '&#9731;',
  0x2615: '&#9749;',
  0x26A0: '&#9888;',
  0x26A1: '&#9889;',
  0x2618: '&#9752;',
  0x263A: '&#9786;',
  0x2639: '&#9785;',
  0x2620: '&#9760;',
  0x2622: '&#9762;',
  0x2623: '&#9763;',
  0x262F: '&amp;', // ampersand hack — actually 262F is ☯
  0x2713: '&check;',
  0x2714: '&#10004;',
  0x2717: '&cross;',
  0x2718: '&#10008;',
  0x2728: '&#10024;',
  0x273F: '&#10047;',
  0x2744: '&#10052;',
  0x2753: '&#10067;',
  0x2754: '&#10068;',
  0x2755: '&#10069;',
  0x2764: '&hearts;',
  0x2795: '&#10133;',
  0x2796: '&#10134;',
  0x2797: '&#10135;',
  0x2705: '&#9989;',
  0x2716: '&#10006;',
  0x1F600: '&#128512;',
  0x1F601: '&#128513;',
  0x1F602: '&#128514;',
  0x1F603: '&#128515;',
  0x1F604: '&#128516;',
  0x1F605: '&#128517;',
  0x1F609: '&#128521;',
  0x1F60D: '&#128525;',
  0x1F60E: '&#128526;',
  0x1F620: '&#128544;',
  0x1F622: '&#128546;',
  0x1F680: '&#128640;',
  0x1F44D: '&#128077;',
  0x1F44E: '&#128078;',
  0x1F48E: '&#128142;',
  0x1F4A9: '&#128169;',
  0x1F525: '&#128293;',
  0x1F308: '&#127752;',
  0x1F31F: '&#127775;',
  0x1F389: '&#127881;',
  0x1F4AF: '&#128175;',
  0x1F3B5: '&#127925;',
  0x1F3A8: '&#127912;',
  0x1F4BB: '&#128187;',
  0x1F4C4: '&#128196;',
  0x1F50D: '&#128269;',
  0x1F511: '&#128273;',
  0x1F512: '&#128274;',
  0x1F513: '&#128275;',
  0x1F6E0: '&#128736;',
  0x1F916: '&#129302;',
  0x1F4A1: '&#128161;',
  0x1F48C: '&#128140;',
  0x1F514: '&#128276;',
  0x1F6A8: '&#128680;',
  0x231B: '&#8987;',
  0x23F0: '&#9200;',
  0x23F3: '&#9203;',
  0x2B50: '&#11088;',
  0x1F31E: '&#127774;',
  0x1F31D: '&#127773;',
};

// ── Unicode Block presets ──────────────────────────────────────────────────

interface Block {
  label: string;
  chars: string[];
}

const BLOCKS: Block[] = [
  {
    label: 'Arrows',
    chars: ['→', '←', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇑', '⇓', '⇔', '↵', '↩', '↪', '↖', '↗', '↘', '↙', '↻', '↺'],
  },
  {
    label: 'Math Operators',
    chars: ['∀', '∂', '∃', '∅', '∇', '∈', '∉', '∋', '∏', '∑', '−', '∓', '∗', '√', '∝', '∞', '∠', '∧', '∨', '∩'],
  },
  {
    label: 'Greek Letters',
    chars: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'τ', 'φ', 'ψ', 'ω', 'Δ', 'Λ', 'Π', 'Σ', 'Φ', 'Ω'],
  },
  {
    label: 'Typography',
    chars: ['–', '—', '…', '•', '·', '«', '»', '‘', '’', '“', '”', '‹', '›', '†', '‡', '§', '¶', '©', '®', '™'],
  },
  {
    label: 'Currency',
    chars: ['$', '€', '£', '¥', '¢', '₿', '₩', '₹', '₽', '₪', '₫', '₴', '₱', '₮', '₦', '₲', '₼', '₾', '₸', '₺'],
  },
  {
    label: 'Box Drawing',
    chars: ['─', '━', '│', '┃', '┄', '┅', '┆', '┇', '┈', '┉', '┊', '┋', '┌', '┍', '┎', '┏', '┐', '┑', '┒', '┓'],
  },
  {
    label: 'Technical',
    chars: ['⌘', '⌥', '⌃', '⇧', '⏎', '⌫', '⌦', '⇪', '⎋', '␣', '⌧', '⏏', '⌽', '⍟', '⍝', '⌬', '⎈', '⍾', '⌁', '⌂'],
  },
  {
    label: 'Punctuation',
    chars: ['¡', '¿', '‽', '⸘', '‼', '⁇', '⁈', '⁉', '※', '⁂', '⁜', '⁝', '⁞', '⁛', '⁑', '⁏', '⁎', '‱', '′', '″'],
  },
  {
    label: 'Common Emoji',
    chars: ['😀', '😂', '🤔', '😎', '🔥', '💯', '✨', '❤️', '👍', '🚀', '💻', '🎉', '⭐', '💡', '🔍', '🔒', '🤖', '⚡', '🌈', '🎵'],
  },
];

// ── Copy helper ────────────────────────────────────────────────────────────

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied!'),
    () => toast.error('Copy failed')
  );
}

// ── InfoRow ────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  mono?: boolean;
}

function InfoRow({ label, value, icon, color, mono }: InfoRowProps) {
  return (
    <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={color}>{icon}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-24">
          {label}
        </span>
        <span
          className={`text-sm text-slate-200 truncate ${mono ? 'font-mono' : ''}`}
          title={value}
        >
          {value}
        </span>
      </div>
      <button
        onClick={() => copyText(value)}
        className="p-1.5 rounded-md text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function UnicodeInspectorPage() {
  const [inputChar, setInputChar] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const char = inputChar.slice(-1) || ''; // take last typed character
  const codePoint = char ? char.codePointAt(0)! : 0;
  const utf8 = char ? codePointToUtf8(codePoint) : [];
  const utf16 = char ? codePointToUtf16(codePoint) : [];
  const hasNamed = NAMED_ENTITIES[codePoint] != null;
  const namedEntity = hasNamed ? NAMED_ENTITIES[codePoint] : null;
  const surrogate = codePoint > 0xffff;

  const handleCharInput = useCallback(
    (ch: string) => {
      setInputChar(ch);
      if (ch) {
        setHistory((prev) => {
          const filtered = prev.filter((c) => c !== ch);
          return [ch, ...filtered].slice(0, 30);
        });
      }
    },
    []
  );

  const handleCodePointInput = useCallback((hex: string) => {
    const stripped = hex.replace(/^U\+/i, '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    if (!stripped) {
      setInputChar('');
      return;
    }
    const cp = parseInt(stripped, 16);
    if (isNaN(cp) || cp > 0x10ffff) return;
    const ch = String.fromCodePoint(cp);
    handleCharInput(ch);
  }, [handleCharInput]);

  const handleClear = useCallback(() => {
    setInputChar('');
  }, []);

  return (
    <ToolLayout
      title="Unicode Character Inspector"
      description="Inspect any Unicode character — code point, UTF-8/16 bytes, HTML entities, CSS/JS escapes, and URL encoding. Click any character to drill down."
    >
      <style>{`
        .uni-preview {
          font-size: 4rem;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 2px solid #334155;
          user-select: all;
        }
        .block-char {
          font-size: 1.25rem;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          cursor: pointer;
          background: #1e293b;
          border: 1px solid #334155;
          transition: all 0.15s;
        }
        .block-char:hover {
          border-color: #6366f1;
          background: #312e81;
          color: #c7d2fe;
        }
      `}</style>

      {/* Input Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Type or paste a character
          </label>
          <input
            type="text"
            value={inputChar}
            onChange={(e) => handleCharInput(e.target.value)}
            placeholder="Paste any character here..."
            className="w-full bg-slate-800/70 text-slate-200 text-base rounded-lg px-4 py-2.5 border border-slate-700 
                       focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                       placeholder-slate-500 transition-colors font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Or enter a code point
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={char ? 'U+' + formatHex(codePoint) : ''}
              onChange={(e) => handleCodePointInput(e.target.value)}
              placeholder="U+2603 (hex)"
              className="flex-1 bg-slate-800/70 text-slate-200 text-base rounded-lg px-4 py-2.5 border border-slate-700 
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                         placeholder-slate-500 transition-colors font-mono"
            />
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 
                         hover:border-slate-600 transition-colors text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {char ? (
        <div className="space-y-6">
          {/* Preview */}
          <div className="flex items-center gap-6 p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="uni-preview shrink-0">{char}</div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-slate-100 font-mono">
                U+{formatHex(codePoint)}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                Decimal: {codePoint} · UTF-8: {utf8.length} byte{utf8.length !== 1 ? 's' : ''}
                {surrogate && ' · Surrogate pair'}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {char === ' ' ? 'SPACE' : char.charCodeAt(0) < 32 ? `Control character (U+${formatHex(codePoint, 4)})` : `Display: "${char}"`}
              </div>
            </div>
          </div>

          {/* Encoding Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              Encoding Details
            </h3>
            <div className="space-y-2">
              <InfoRow
                label="UTF-8 Bytes"
                value={byteHex(utf8)}
                icon={<Binary className="w-3.5 h-3.5" />}
                color="text-cyan-400"
                mono
              />
              <InfoRow
                label="UTF-16 Bytes"
                value={byteHex(utf16)}
                icon={<Binary className="w-3.5 h-3.5" />}
                color="text-teal-400"
                mono
              />
              <InfoRow
                label="URL Encoding"
                value={encodeURIComponent(char)}
                icon={<Globe className="w-3.5 h-3.5" />}
                color="text-emerald-400"
                mono
              />
            </div>
          </div>

          {/* Web Representations */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              Web Representations
            </h3>
            <div className="space-y-2">
              <InfoRow
                label="HTML Decimal"
                value={`&#${codePoint};`}
                icon={<Code2 className="w-3.5 h-3.5" />}
                color="text-purple-400"
                mono
              />
              <InfoRow
                label="HTML Hex"
                value={`&#x${formatHex(codePoint)};`}
                icon={<Hash className="w-3.5 h-3.5" />}
                color="text-fuchsia-400"
                mono
              />
              {namedEntity && (
                <InfoRow
                  label="HTML Named"
                  value={namedEntity}
                  icon={<Search className="w-3.5 h-3.5" />}
                  color="text-violet-400"
                  mono
                />
              )}
              <InfoRow
                label="JavaScript"
                value={escapeJS(codePoint)}
                icon={<Code2 className="w-3.5 h-3.5" />}
                color="text-amber-400"
                mono
              />
              <InfoRow
                label="CSS Escape"
                value={escapeCSS(codePoint)}
                icon={<Code2 className="w-3.5 h-3.5" />}
                color="text-pink-400"
                mono
              />
            </div>
          </div>

          {/* Named Entity lookup if found */}
          {hasNamed && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-300">
                <span className="font-semibold">Named entity found:</span>{' '}
                <code className="text-purple-200 font-mono">{namedEntity}</code> can be used instead of
                <code className="text-purple-200 font-mono"> &#{codePoint};</code> for better readability.
              </p>
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Recently Inspected</h3>
              <div className="flex flex-wrap gap-1.5">
                {history.slice(1, 21).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleCharInput(h)}
                    className="block-char text-slate-300"
                    title={`U+${formatHex(h.codePointAt(0)!)}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-400" />
            Browse Character Blocks
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Type or paste a character above, or click any character below to inspect it.
          </p>
          {BLOCKS.map((block) => (
            <div key={block.label} className="mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {block.label}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {block.chars.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => handleCharInput(ch)}
                    className="block-char text-slate-300"
                    title={`U+${formatHex(ch.codePointAt(0)!)}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Reference */}
      <div className="mt-12 p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-brand-400" />
          Format Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { fmt: 'HTML Decimal', example: '&#169;', note: 'Always works' },
            { fmt: 'HTML Hex', example: '&#xA9;', note: 'Common in HTML source' },
            { fmt: 'HTML Named', example: '&copy;', note: 'Most readable, 200+ entities' },
            { fmt: 'JavaScript', example: '\\u00A9', note: 'BMP only, 4 hex digits' },
            { fmt: 'JS (astral)', example: '\\u{1F600}', note: 'ES6+ curly braces' },
            { fmt: 'CSS', example: '\\00A9', note: 'Backslash + hex, space after' },
            { fmt: 'URL Encoding', example: '%C2%A9', note: 'UTF-8 percent-encoded' },
            { fmt: 'Python', example: '\\u00A9', note: 'Same as JS for BMP' },
          ].map((r) => (
            <div key={r.fmt} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <div>
                <span className="text-slate-300 font-medium">{r.fmt}</span>
                <span className="text-slate-500 ml-2">{r.note}</span>
              </div>
              <code className="text-brand-300 font-mono text-xs">{r.example}</code>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}

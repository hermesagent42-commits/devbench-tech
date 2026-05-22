'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowLeftRight, Trash2, Search, Info, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Entity maps ────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '¢': '&cent;',
  '°': '&deg;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '←': '&larr;',
  '→': '&rarr;',
  '↑': '&uarr;',
  '↓': '&darr;',
  '↔': '&harr;',
  '∀': '&forall;',
  '∂': '&part;',
  '∃': '&exist;',
  '∅': '&empty;',
  '∇': '&nabla;',
  '∈': '&isin;',
  '∉': '&notin;',
  '∋': '&ni;',
  '∏': '&prod;',
  '∑': '&sum;',
  '−': '&minus;',
  '√': '&radic;',
  '∝': '&prop;',
  '∞': '&infin;',
  '∠': '&ang;',
  '∧': '&and;',
  '∨': '&or;',
  '∩': '&cap;',
  '∪': '&cup;',
  '∫': '&int;',
  '∴': '&there4;',
  '∼': '&sim;',
  '≅': '&cong;',
  '≈': '&asymp;',
  '≠': '&ne;',
  '≡': '&equiv;',
  '≤': '&le;',
  '≥': '&ge;',
  '⊂': '&sub;',
  '⊃': '&sup;',
  '⊄': '&nsub;',
  '⊆': '&sube;',
  '⊇': '&supe;',
  '⊕': '&oplus;',
  '⊗': '&otimes;',
  '⊥': '&perp;',
  '⋅': '&sdot;',
  'α': '&alpha;',
  'β': '&beta;',
  'γ': '&gamma;',
  'δ': '&delta;',
  'ε': '&epsilon;',
  'ζ': '&zeta;',
  'η': '&eta;',
  'θ': '&theta;',
  'ι': '&iota;',
  'κ': '&kappa;',
  'λ': '&lambda;',
  'μ': '&mu;',
  'ν': '&nu;',
  'ξ': '&xi;',
  'ο': '&omicron;',
  'π': '&pi;',
  'ρ': '&rho;',
  'σ': '&sigma;',
  'τ': '&tau;',
  'υ': '&upsilon;',
  'φ': '&phi;',
  'χ': '&chi;',
  'ψ': '&psi;',
  'ω': '&omega;',
  'Α': '&Alpha;',
  'Β': '&Beta;',
  'Γ': '&Gamma;',
  'Δ': '&Delta;',
  'Ε': '&Epsilon;',
  'Ζ': '&Zeta;',
  'Η': '&Eta;',
  'Θ': '&Theta;',
  'Ι': '&Iota;',
  'Κ': '&Kappa;',
  'Λ': '&Lambda;',
  'Μ': '&Mu;',
  'Ν': '&Nu;',
  'Ξ': '&Xi;',
  'Ο': '&Omicron;',
  'Π': '&Pi;',
  'Ρ': '&Rho;',
  'Σ': '&Sigma;',
  'Τ': '&Tau;',
  'Υ': '&Upsilon;',
  'Φ': '&Phi;',
  'Χ': '&Chi;',
  'Ψ': '&Psi;',
  'Ω': '&Omega;',
  '♠': '&spades;',
  '♣': '&clubs;',
  '♥': '&hearts;',
  '♦': '&diams;',
  '–': '&ndash;',
  '—': '&mdash;',
  '‘': '&lsquo;',
  '’': '&rsquo;',
  '“': '&ldquo;',
  '”': '&rdquo;',
  '•': '&bull;',
  '…': '&hellip;',
  '′': '&prime;',
  '″': '&Prime;',
  '‾': '&oline;',
  '⁄': '&frasl;',
  '℘': '&weierp;',
  'ℑ': '&image;',
  'ℜ': '&real;',
  'ℵ': '&alefsym;',
  '↵': '&crarr;',
  '⇐': '&lArr;',
  '⇑': '&uArr;',
  '⇒': '&rArr;',
  '⇓': '&dArr;',
  '⇔': '&hArr;',
  '◊': '&loz;',
  '⋆': '&star;',
  '▪': '&blacklozenge;',
  '¿': '&iquest;',
  'À': '&Agrave;',
  'Á': '&Aacute;',
  'Â': '&Acirc;',
  'Ã': '&Atilde;',
  'Ä': '&Auml;',
  'Å': '&Aring;',
  'Æ': '&AElig;',
  'Ç': '&Ccedil;',
  'È': '&Egrave;',
  'É': '&Eacute;',
  'Ê': '&Ecirc;',
  'Ë': '&Euml;',
  'Ì': '&Igrave;',
  'Í': '&Iacute;',
  'Î': '&Icirc;',
  'Ï': '&Iuml;',
  'Ð': '&ETH;',
  'Ñ': '&Ntilde;',
  'Ò': '&Ograve;',
  'Ó': '&Oacute;',
  'Ô': '&Ocirc;',
  'Õ': '&Otilde;',
  'Ö': '&Ouml;',
  'Ø': '&Oslash;',
  'Ù': '&Ugrave;',
  'Ú': '&Uacute;',
  'Û': '&Ucirc;',
  'Ü': '&Uuml;',
  'Ý': '&Yacute;',
  'Þ': '&THORN;',
  'ß': '&szlig;',
  'à': '&agrave;',
  'á': '&aacute;',
  'â': '&acirc;',
  'ã': '&atilde;',
  'ä': '&auml;',
  'å': '&aring;',
  'æ': '&aelig;',
  'ç': '&ccedil;',
  'è': '&egrave;',
  'é': '&eacute;',
  'ê': '&ecirc;',
  'ë': '&euml;',
  'ì': '&igrave;',
  'í': '&iacute;',
  'î': '&icirc;',
  'ï': '&iuml;',
  'ð': '&eth;',
  'ñ': '&ntilde;',
  'ò': '&ograve;',
  'ó': '&oacute;',
  'ô': '&ocirc;',
  'õ': '&otilde;',
  'ö': '&ouml;',
  'ø': '&oslash;',
  'ù': '&ugrave;',
  'ú': '&uacute;',
  'û': '&ucirc;',
  'ü': '&uuml;',
  'ý': '&yacute;',
  'þ': '&thorn;',
  'ÿ': '&yuml;',
  'Œ': '&OElig;',
  'œ': '&oelig;',
  'Š': '&Scaron;',
  'š': '&scaron;',
  'Ÿ': '&Yuml;',
  'ƒ': '&fnof;',
  'ˆ': '&circ;',
  '˜': '&tilde;',
  ' ': '&ensp;',
  ' ': '&emsp;',
  ' ': '&thinsp;',
  '‌': '&zwnj;',
  '‍': '&zwj;',
  '‎': '&lrm;',
  '‏': '&rlm;',
  '―': '&horbar;',
  '‖': '&Vert;',
  '‚': '&sbquo;',
  '„': '&bdquo;',
  '†': '&dagger;',
  '‡': '&Dagger;',
  '‰': '&permil;',
  '‹': '&lsaquo;',
  '›': '&rsaquo;',
};

// Build reverse map (entity → character) for decoding
const ENTITY_TO_CHAR: Record<string, string> = {};
for (const [char, entity] of Object.entries(NAMED_ENTITIES)) {
  ENTITY_TO_CHAR[entity] = char;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function encodeToNamed(text: string): string {
  return text
    .split('')
    .map((ch) => NAMED_ENTITIES[ch] ?? ch)
    .join('');
}

function encodeToNumeric(text: string): string {
  return text
    .split('')
    .map((ch) => {
      const code = ch.codePointAt(0);
      // Don't encode printable ASCII except < > & " '
      if (code !== undefined && code > 127) {
        return `&#${code};`;
      }
      if (ch === '<') return '&#60;';
      if (ch === '>') return '&#62;';
      if (ch === '&') return '&#38;';
      if (ch === '"') return '&#34;';
      if (ch === "'") return '&#39;';
      return ch;
    })
    .join('');
}

function decodeEntities(text: string): string {
  // Decode numeric entities
  let result = text.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));

  // Decode named entities
  for (const [entity, char] of Object.entries(ENTITY_TO_CHAR)) {
    result = result.split(entity).join(char);
  }

  return result;
}

// ── Entity reference table ──────────────────────────────────────────────────

const COMMON_ENTITIES: { char: string; named: string; numeric: string; description: string }[] = [
  { char: '&', named: '&amp;', numeric: '&#38;', description: 'Ampersand' },
  { char: '<', named: '&lt;', numeric: '&#60;', description: 'Less than' },
  { char: '>', named: '&gt;', numeric: '&#62;', description: 'Greater than' },
  { char: '"', named: '&quot;', numeric: '&#34;', description: 'Double quote' },
  { char: "'", named: '&apos;', numeric: '&#39;', description: 'Single quote' },
  { char: '©', named: '&copy;', numeric: '&#169;', description: 'Copyright' },
  { char: '®', named: '&reg;', numeric: '&#174;', description: 'Registered trademark' },
  { char: '™', named: '&trade;', numeric: '&#8482;', description: 'Trademark' },
  { char: '€', named: '&euro;', numeric: '&#8364;', description: 'Euro sign' },
  { char: '£', named: '&pound;', numeric: '&#163;', description: 'Pound sterling' },
  { char: '¥', named: '&yen;', numeric: '&#165;', description: 'Yen sign' },
  { char: '°', named: '&deg;', numeric: '&#176;', description: 'Degree' },
  { char: '±', named: '&plusmn;', numeric: '&#177;', description: 'Plus-minus' },
  { char: '×', named: '&times;', numeric: '&#215;', description: 'Multiplication' },
  { char: '÷', named: '&divide;', numeric: '&#247;', description: 'Division' },
  { char: '—', named: '&mdash;', numeric: '&#8212;', description: 'Em dash' },
  { char: '–', named: '&ndash;', numeric: '&#8211;', description: 'En dash' },
  { char: '“', named: '&ldquo;', numeric: '&#8220;', description: 'Left double quote' },
  { char: '”', named: '&rdquo;', numeric: '&#8221;', description: 'Right double quote' },
  { char: '‘', named: '&lsquo;', numeric: '&#8216;', description: 'Left single quote' },
  { char: '’', named: '&rsquo;', numeric: '&#8217;', description: 'Right single quote' },
  { char: '…', named: '&hellip;', numeric: '&#8230;', description: 'Ellipsis' },
  { char: '•', named: '&bull;', numeric: '&#8226;', description: 'Bullet' },
  { char: '←', named: '&larr;', numeric: '&#8592;', description: 'Left arrow' },
  { char: '→', named: '&rarr;', numeric: '&#8594;', description: 'Right arrow' },
  { char: '↑', named: '&uarr;', numeric: '&#8593;', description: 'Up arrow' },
  { char: '↓', named: '&darr;', numeric: '&#8595;', description: 'Down arrow' },
  { char: '∞', named: '&infin;', numeric: '&#8734;', description: 'Infinity' },
  { char: '≠', named: '&ne;', numeric: '&#8800;', description: 'Not equal' },
  { char: '≤', named: '&le;', numeric: '&#8804;', description: 'Less than or equal' },
  { char: '≥', named: '&ge;', numeric: '&#8805;', description: 'Greater than or equal' },
  { char: '≈', named: '&asymp;', numeric: '&#8776;', description: 'Approximately equal' },
  { char: '  ', named: '&ensp;', numeric: '&#8194;', description: 'En space' },
  { char: '  ', named: '&emsp;', numeric: '&#8195;', description: 'Em space' },
  { char: ' ', named: '&nbsp;', numeric: '&#160;', description: 'Non-breaking space' },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function HtmlEntityConverterPage() {
  const [input, setInput] = useState('');
  const [namedOutput, setNamedOutput] = useState('');
  const [numericOutput, setNumericOutput] = useState('');
  const [decodedOutput, setDecodedOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState<{ named: boolean; numeric: boolean; decoded: boolean }>({
    named: false,
    numeric: false,
    decoded: false,
  });
  const [entitySearch, setEntitySearch] = useState('');

  const handleEncode = useCallback(() => {
    setNamedOutput(encodeToNamed(input));
    setNumericOutput(encodeToNumeric(input));
    setDecodedOutput('');
  }, [input]);

  const handleDecode = useCallback(() => {
    setDecodedOutput(decodeEntities(input));
    setNamedOutput('');
    setNumericOutput('');
  }, [input]);

  const handleCopy = useCallback(async (text: string, key: 'named' | 'numeric' | 'decoded') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setNamedOutput('');
    setNumericOutput('');
    setDecodedOutput('');
  }, []);

  const handleSwapMode = useCallback(() => {
    setMode((prev) => (prev === 'encode' ? 'decode' : 'encode'));
    setInput('');
    setNamedOutput('');
    setNumericOutput('');
    setDecodedOutput('');
  }, []);

  const filteredEntities = useMemo(() => {
    if (!entitySearch.trim()) return COMMON_ENTITIES;
    const q = entitySearch.toLowerCase();
    return COMMON_ENTITIES.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.char.toLowerCase().includes(q) ||
        e.named.toLowerCase().includes(q) ||
        e.numeric.toLowerCase().includes(q)
    );
  }, [entitySearch]);

  const hasOutput = namedOutput || numericOutput || decodedOutput;

  return (
    <ToolLayout
      title="HTML Entity Converter"
      description="Encode text to HTML named or numeric entities, and decode entity strings back to plain text. Includes a reference table of 200+ entities — 100% client-side."
    >
      {/* ── Mode Toggle ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium ${mode === 'encode' ? 'text-brand-400' : 'text-slate-500'}`}>
          Encode
        </span>
        <button
          onClick={handleSwapMode}
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-slate-700 transition-colors hover:bg-slate-600"
          title="Swap encode/decode"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-brand-500 transition-transform ${
              mode === 'decode' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${mode === 'decode' ? 'text-brand-400' : 'text-slate-500'}`}>
          Decode
        </span>
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          {mode === 'encode' ? 'Text to encode' : 'Entity string to decode'}
        </label>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setNamedOutput('');
            setNumericOutput('');
            setDecodedOutput('');
          }}
          placeholder={
            mode === 'encode'
              ? 'Enter text to convert to HTML entities...\n\nExample: <div class="greeting">Hello & welcome!</div>'
              : 'Enter HTML entity string to decode...\n\nExample: &lt;div class=&quot;greeting&quot;&gt;Hello &amp; welcome!&lt;/div&gt;'
          }
          rows={6}
          className="w-full px-4 py-3 bg-surface border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono text-sm transition-colors resize-y"
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={mode === 'encode' ? handleEncode : handleDecode}
            disabled={!input.trim()}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/40 text-white rounded-lg font-medium text-sm transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mode === 'encode' ? 'Encode' : 'Decode'}
          </button>
          <button
            onClick={handleClear}
            disabled={!input && !hasOutput}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/40 text-slate-300 rounded-lg font-medium text-sm transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={handleSwapMode}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap Mode
          </button>
        </div>
      </div>

      {/* ── Output ──────────────────────────────────────────────────── */}
      {hasOutput && (
        <div className="space-y-4 mb-10">
          {namedOutput && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Named Entities
                </label>
                <button
                  onClick={() => handleCopy(namedOutput, 'named')}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
                >
                  {copied.named ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied.named ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
                {namedOutput}
              </pre>
            </div>
          )}

          {numericOutput && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Numeric Entities
                </label>
                <button
                  onClick={() => handleCopy(numericOutput, 'numeric')}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
                >
                  {copied.numeric ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied.numeric ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
                {numericOutput}
              </pre>
            </div>
          )}

          {decodedOutput && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Decoded Result
                </label>
                <button
                  onClick={() => handleCopy(decodedOutput, 'decoded')}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
                >
                  {copied.decoded ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied.decoded ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
                {decodedOutput}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Entity Reference Table ──────────────────────────────────── */}
      <div className="pt-8 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            Common HTML Entity Reference
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Search entities..."
              className="pl-9 pr-3 py-1.5 bg-surface border border-slate-700 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 text-xs font-mono w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Char</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Named</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Numeric</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredEntities.map((entity, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-200 text-lg">{entity.char}</td>
                  <td className="px-4 py-2.5 font-mono text-brand-400 text-xs">{entity.named}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400 text-xs">{entity.numeric}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{entity.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntities.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm">No entities match your search.</div>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-2 text-right">
          {filteredEntities.length} of {COMMON_ENTITIES.length} entities shown
        </p>
      </div>
    </ToolLayout>
  );
}

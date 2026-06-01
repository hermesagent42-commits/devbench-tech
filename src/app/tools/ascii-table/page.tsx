'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, X, Info, ChevronDown, Grid3X3, List, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface AsciiEntry {
  dec: number;
  hex: string;
  oct: string;
  bin: string;
  char: string;
  name: string;
  category: string;
  htmlEntity: string;
  cssEscape: string;
  escaped: string;
  urlEncoded: string;
}

// ── Build the ASCII table ──────────────────────────────────────────────────

function buildAsciiTable(): AsciiEntry[] {
  const entries: AsciiEntry[] = [];

  for (let i = 0; i < 128; i++) {
    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const oct = i.toString(8).padStart(3, '0');
    const bin = i.toString(2).padStart(7, '0');

    let char: string;
    if (i <= 31) {
      char = String.fromCodePoint(0x2400 + i);
    } else if (i === 127) {
      char = '\u2421';
    } else {
      char = String.fromCharCode(i);
    }

    let name: string;
    let category: string;

    if (i === 0) { name = 'Null'; category = 'Control'; }
    else if (i === 1) { name = 'Start of Heading'; category = 'Control'; }
    else if (i === 2) { name = 'Start of Text'; category = 'Control'; }
    else if (i === 3) { name = 'End of Text'; category = 'Control'; }
    else if (i === 4) { name = 'End of Transmission'; category = 'Control'; }
    else if (i === 5) { name = 'Enquiry'; category = 'Control'; }
    else if (i === 6) { name = 'Acknowledge'; category = 'Control'; }
    else if (i === 7) { name = 'Bell'; category = 'Control'; }
    else if (i === 8) { name = 'Backspace'; category = 'Control'; }
    else if (i === 9) { name = 'Horizontal Tab'; category = 'Whitespace'; }
    else if (i === 10) { name = 'Line Feed'; category = 'Whitespace'; }
    else if (i === 11) { name = 'Vertical Tab'; category = 'Whitespace'; }
    else if (i === 12) { name = 'Form Feed'; category = 'Whitespace'; }
    else if (i === 13) { name = 'Carriage Return'; category = 'Whitespace'; }
    else if (i === 14) { name = 'Shift Out'; category = 'Control'; }
    else if (i === 15) { name = 'Shift In'; category = 'Control'; }
    else if (i === 16) { name = 'Data Link Escape'; category = 'Control'; }
    else if (i === 17) { name = 'Device Control 1'; category = 'Control'; }
    else if (i === 18) { name = 'Device Control 2'; category = 'Control'; }
    else if (i === 19) { name = 'Device Control 3'; category = 'Control'; }
    else if (i === 20) { name = 'Device Control 4'; category = 'Control'; }
    else if (i === 21) { name = 'Negative Acknowledge'; category = 'Control'; }
    else if (i === 22) { name = 'Synchronous Idle'; category = 'Control'; }
    else if (i === 23) { name = 'End of Transmission Block'; category = 'Control'; }
    else if (i === 24) { name = 'Cancel'; category = 'Control'; }
    else if (i === 25) { name = 'End of Medium'; category = 'Control'; }
    else if (i === 26) { name = 'Substitute'; category = 'Control'; }
    else if (i === 27) { name = 'Escape'; category = 'Control'; }
    else if (i === 28) { name = 'File Separator'; category = 'Control'; }
    else if (i === 29) { name = 'Group Separator'; category = 'Control'; }
    else if (i === 30) { name = 'Record Separator'; category = 'Control'; }
    else if (i === 31) { name = 'Unit Separator'; category = 'Control'; }
    else if (i === 32) { name = 'Space'; category = 'Whitespace'; }
    else if (i === 127) { name = 'Delete'; category = 'Control'; }
    else if (i >= 33 && i <= 47) { name = getSymbolName(i); category = 'Punctuation'; }
    else if (i >= 48 && i <= 57) { name = `Digit ${String.fromCharCode(i)}`; category = 'Digit'; }
    else if (i >= 58 && i <= 64) { name = getSymbolName(i); category = 'Punctuation'; }
    else if (i >= 65 && i <= 90) { name = `Uppercase ${String.fromCharCode(i)}`; category = 'Uppercase'; }
    else if (i >= 91 && i <= 96) { name = getSymbolName(i); category = 'Punctuation'; }
    else if (i >= 97 && i <= 122) { name = `Lowercase ${String.fromCharCode(i)}`; category = 'Lowercase'; }
    else if (i >= 123 && i <= 126) { name = getSymbolName(i); category = 'Punctuation'; }
    else { name = 'Unknown'; category = 'Other'; }

    let htmlEntity: string;
    if (i === 34) htmlEntity = '&quot;';
    else if (i === 38) htmlEntity = '&amp;';
    else if (i === 39) htmlEntity = '&apos;';
    else if (i === 60) htmlEntity = '&lt;';
    else if (i === 62) htmlEntity = '&gt;';
    else if (i === 32) htmlEntity = '&nbsp;';
    else if (i >= 0 && i <= 31) htmlEntity = '';
    else if (i === 127) htmlEntity = '';
    else htmlEntity = `&#${i};`;

    let cssEscape = '';
    if (i > 31 && i !== 127) {
      cssEscape = `\\${hex.padStart(6, '0').toLowerCase()} `;
    }

    let escaped: string;
    if (i === 0) escaped = '\\0';
    else if (i === 7) escaped = '\\a';
    else if (i === 8) escaped = '\\b';
    else if (i === 9) escaped = '\\t';
    else if (i === 10) escaped = '\\n';
    else if (i === 11) escaped = '\\v';
    else if (i === 12) escaped = '\\f';
    else if (i === 13) escaped = '\\r';
    else if (i === 27) escaped = '\\e';
    else if (i === 39) escaped = "\\'";
    else if (i === 34) escaped = '\\"';
    else if (i === 92) escaped = '\\\\';
    else if (i <= 31 || i === 127) escaped = `\\x${hex.toLowerCase()}`;
    else escaped = String.fromCharCode(i);

    let urlEncoded: string;
    if ((i >= 48 && i <= 57) || (i >= 65 && i <= 90) || (i >= 97 && i <= 122) ||
        i === 45 || i === 46 || i === 95 || i === 126) {
      urlEncoded = String.fromCharCode(i);
    } else if (i === 32) {
      urlEncoded = '+';
    } else {
      urlEncoded = `%${hex}`;
    }

    entries.push({
      dec: i,
      hex: `0x${hex}`,
      oct: `0o${oct}`,
      bin: `0b${bin}`,
      char,
      name,
      category,
      htmlEntity,
      cssEscape,
      escaped,
      urlEncoded,
    });
  }

  return entries;
}

function getSymbolName(code: number): string {
  const names: Record<number, string> = {
    33: 'Exclamation Mark',
    34: 'Double Quote',
    35: 'Hash / Number Sign',
    36: 'Dollar Sign',
    37: 'Percent Sign',
    38: 'Ampersand',
    39: 'Single Quote',
    40: 'Left Parenthesis',
    41: 'Right Parenthesis',
    42: 'Asterisk',
    43: 'Plus Sign',
    44: 'Comma',
    45: 'Hyphen-Minus',
    46: 'Full Stop',
    47: 'Slash / Solidus',
    58: 'Colon',
    59: 'Semicolon',
    60: 'Less-Than Sign',
    61: 'Equals Sign',
    62: 'Greater-Than Sign',
    63: 'Question Mark',
    64: 'Commercial At',
    91: 'Left Square Bracket',
    92: 'Backslash',
    93: 'Right Square Bracket',
    94: 'Circumflex Accent',
    95: 'Underscore',
    96: 'Grave Accent',
    123: 'Left Curly Brace',
    124: 'Vertical Bar',
    125: 'Right Curly Brace',
    126: 'Tilde',
  };
  return names[code] || `Symbol (${code})`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Control': { bg: 'bg-slate-600/30', text: 'text-slate-400', border: 'border-slate-600/50' },
  'Whitespace': { bg: 'bg-cyan-700/30', text: 'text-cyan-300', border: 'border-cyan-600/50' },
  'Digit': { bg: 'bg-amber-700/30', text: 'text-amber-300', border: 'border-amber-600/50' },
  'Uppercase': { bg: 'bg-blue-700/30', text: 'text-blue-300', border: 'border-blue-600/50' },
  'Lowercase': { bg: 'bg-emerald-700/30', text: 'text-emerald-300', border: 'border-emerald-600/50' },
  'Punctuation': { bg: 'bg-purple-700/30', text: 'text-purple-300', border: 'border-purple-600/50' },
  'Other': { bg: 'bg-slate-600/30', text: 'text-slate-400', border: 'border-slate-600/50' },
};

const CATEGORIES = ['All', 'Control', 'Whitespace', 'Digit', 'Uppercase', 'Lowercase', 'Punctuation'];

// ── Component ──────────────────────────────────────────────────────────────

export default function AsciiTablePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEntry, setSelectedEntry] = useState<AsciiEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  const allEntries = useMemo(() => buildAsciiTable(), []);

  const filtered = useMemo(() => {
    let result = allEntries;
    if (selectedCategory !== 'All') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.char.toLowerCase().includes(q) ||
          e.dec.toString().includes(q) ||
          e.hex.toLowerCase().includes(q) ||
          e.oct.toLowerCase().includes(q) ||
          e.bin.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allEntries, selectedCategory, search]);

  const copyValue = useCallback((value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const copyAll = useCallback((entry: AsciiEntry) => {
    const lines = [
      `Char:      ${entry.char}`,
      `Name:      ${entry.name}`,
      `Decimal:   ${entry.dec}`,
      `Hex:       ${entry.hex}`,
      `Octal:     ${entry.oct}`,
      `Binary:    ${entry.bin}`,
      `Category:  ${entry.category}`,
      `HTML:      ${entry.htmlEntity || '\u2014'}`,
      `CSS:       ${entry.cssEscape || '\u2014'}`,
      `JS Escape: ${entry.escaped}`,
      `URL:       ${entry.urlEncoded}`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(
      () => toast.success('Character details copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  return (
    <ToolLayout
      title="ASCII Table"
      description="Complete ASCII character reference \u2014 0\u2013127 with decimal, hex, octal, binary, HTML entities, CSS escapes, URL encoding, and JS string escapes. Search, filter by category, and copy any value."
      controls={
        <div className="flex items-center gap-2 w-full flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, char, code\u2026"
              className="input-field pl-9 pr-8 w-full text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'compact'
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Compact view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 text-sm text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Table2 className="w-4 h-4" />
            {filtered.length} of 128 characters
          </span>
          {selectedCategory !== 'All' && (
            <span className="flex items-center gap-1 text-brand-400">
              \u00b7 Filtered: {selectedCategory}
            </span>
          )}
          {search && (
            <span className="flex items-center gap-1 text-brand-400 truncate max-w-sm">
              \u00b7 Search: &ldquo;{search}&rdquo;
            </span>
          )}
        </div>

        {selectedEntry && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white font-mono">
                  {selectedEntry.char}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{selectedEntry.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                    Dec: {selectedEntry.dec} \u00b7 Hex: {selectedEntry.hex}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border ${
                      CATEGORY_COLORS[selectedEntry.category]?.border || 'border-slate-600'
                    } ${CATEGORY_COLORS[selectedEntry.category]?.text || 'text-slate-400'} ${
                      CATEGORY_COLORS[selectedEntry.category]?.bg || 'bg-slate-700/20'
                    }`}>
                      {selectedEntry.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyAll(selectedEntry)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy All
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-700/20">
              <DetailCell label="Decimal" value={String(selectedEntry.dec)} onCopy={() => copyValue(String(selectedEntry.dec), 'Decimal')} />
              <DetailCell label="Hex" value={selectedEntry.hex} onCopy={() => copyValue(selectedEntry.hex, 'Hex')} />
              <DetailCell label="Octal" value={selectedEntry.oct} onCopy={() => copyValue(selectedEntry.oct, 'Octal')} />
              <DetailCell label="Binary" value={selectedEntry.bin} onCopy={() => copyValue(selectedEntry.bin, 'Binary')} />
              <DetailCell label="HTML Entity" value={selectedEntry.htmlEntity || '\u2014'} onCopy={() => selectedEntry.htmlEntity && copyValue(selectedEntry.htmlEntity, 'HTML entity')} />
              <DetailCell label="CSS Escape" value={selectedEntry.cssEscape || '\u2014'} onCopy={() => selectedEntry.cssEscape && copyValue(selectedEntry.cssEscape, 'CSS escape')} />
              <DetailCell label="JS / String" value={selectedEntry.escaped} onCopy={() => copyValue(selectedEntry.escaped, 'JS escape')} />
              <DetailCell label="URL Encoded" value={selectedEntry.urlEncoded} onCopy={() => copyValue(selectedEntry.urlEncoded, 'URL encoded')} />
              <DetailCell label="Code Point" value={`U+${selectedEntry.hex.slice(2).padStart(4, '0')}`} onCopy={() => copyValue(`U+${selectedEntry.hex.slice(2).padStart(4, '0')}`, 'Code point')} />
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No characters found</p>
            <p className="text-sm mt-1">Try a different search term or category.</p>
          </div>
        )}

        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
            {filtered.map((entry) => (
              <button
                key={entry.dec}
                onClick={() => setSelectedEntry(entry)}
                className={`relative group rounded-lg border p-3 text-center transition-all duration-150 hover:scale-105 ${
                  selectedEntry?.dec === entry.dec
                    ? 'border-brand-400/60 bg-brand-500/10 shadow-sm shadow-brand-500/10'
                    : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-500/60 hover:bg-slate-800'
                }`}
                title={`${entry.name} \u2014 Dec: ${entry.dec}, Hex: ${entry.hex}`}
              >
                <div className="text-xl sm:text-2xl font-mono font-bold text-slate-200 mb-1 leading-tight">
                  {entry.char}
                </div>
                <div className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                  {entry.dec}
                </div>
                <div className="text-[10px] font-mono text-slate-600 hidden sm:block">
                  {entry.hex}
                </div>
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 && viewMode === 'compact' && (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dec</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Hex</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Char</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">HTML</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">URL</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((entry) => (
                  <tr
                    key={entry.dec}
                    className={`cursor-pointer transition-colors ${
                      selectedEntry?.dec === entry.dec
                        ? 'bg-brand-500/10'
                        : 'hover:bg-slate-800/30'
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td className="px-3 py-2 font-mono text-slate-300 font-medium">{entry.dec}</td>
                    <td className="px-3 py-2 font-mono text-slate-400 text-xs">{entry.hex}</td>
                    <td className="px-3 py-2 font-mono text-lg text-slate-200 hidden sm:table-cell">{entry.char}</td>
                    <td className="px-3 py-2 text-slate-200 text-xs">{entry.name}</td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] border ${
                        CATEGORY_COLORS[entry.category]?.border || 'border-slate-600'
                      } ${CATEGORY_COLORS[entry.category]?.text || 'text-slate-400'} ${
                        CATEGORY_COLORS[entry.category]?.bg || 'bg-slate-700/20'
                      }`}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 hidden lg:table-cell">
                      {entry.htmlEntity || '\u2014'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 hidden lg:table-cell">
                      {entry.urlEncoded}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyValue(entry.char, 'Character');
                        }}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy character"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="group rounded-xl border border-slate-700/50 overflow-hidden">
          <summary className="px-5 py-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-medium text-slate-300 select-none">
            <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            <Info className="w-4 h-4 text-slate-400" />
            About the ASCII Table
          </summary>
          <div className="px-5 py-4 space-y-3 text-sm text-slate-400 bg-slate-800/20">
            <p>
              ASCII (American Standard Code for Information Interchange) maps 128 characters \u2014 
              letters, digits, punctuation, and control codes \u2014 to numbers 0\u2013127. 
              Every modern encoding (UTF-8, ISO-8859) is backward-compatible with ASCII.
            </p>
            <div className="flex flex-wrap gap-4">
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                const colors = CATEGORY_COLORS[cat];
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm border ${colors?.border || 'border-slate-600'}`} />
                    <span className="text-slate-300 text-xs">{cat}</span>
                    <span className="text-slate-500 text-xs">
                      ({allEntries.filter((e) => e.category === cat).length})
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Control characters (0\u201331, 127) are displayed using Unicode Control Pictures to make them visible.
              Click any character for full details including HTML entities, CSS escapes, URL encoding, and JS string escapes.
            </p>
          </div>
        </details>
      </div>
    </ToolLayout>
  );
}

function DetailCell({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-slate-800/40 group/detail">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-sm text-slate-200 break-all">{value}</code>
        <button
          onClick={onCopy}
          className="opacity-0 group-hover/detail:opacity-100 text-slate-500 hover:text-slate-300 transition-all shrink-0"
          title={`Copy ${label}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

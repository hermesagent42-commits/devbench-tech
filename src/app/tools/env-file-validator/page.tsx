'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, AlertTriangle, Info, Eye, EyeOff, FileText, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedEntry {
  line: number;
  raw: string;
  key: string | null;
  value: string | null;
  expanded: string | null;
  type: 'valid' | 'comment' | 'blank' | 'error';
  error?: string;
  isQuoted: boolean;
  hasExpansion: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseEnv(raw: string): ParsedEntry[] {
  const lines = raw.split('\n');
  const results: ParsedEntry[] = [];
  const knownVars: Map<string, string> = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      results.push({ line: i + 1, raw: line, key: null, value: null, expanded: null, type: 'blank', isQuoted: false, hasExpansion: false });
      continue;
    }

    // Comment (full-line)
    if (trimmed.startsWith('#')) {
      results.push({ line: i + 1, raw: line, key: null, value: null, expanded: null, type: 'comment', isQuoted: false, hasExpansion: false });
      continue;
    }

    // Inline comment: strip comment but preserve value
    let withoutInlineComment = line;
    let inQuote = false;
    let quoteChar = '';
    for (let c = 0; c < withoutInlineComment.length; c++) {
      if (withoutInlineComment[c] === '"' || withoutInlineComment[c] === "'") {
        if (!inQuote) {
          inQuote = true;
          quoteChar = withoutInlineComment[c];
        } else if (withoutInlineComment[c] === quoteChar) {
          inQuote = false;
        }
      }
      if (!inQuote && withoutInlineComment[c] === '#') {
        // Must be preceded by whitespace (or BOL)
        if (c === 0 || withoutInlineComment[c - 1] === ' ') {
          withoutInlineComment = withoutInlineComment.substring(0, c).trimEnd();
          break;
        }
      }
    }

    const eqIndex = withoutInlineComment.indexOf('=');
    if (eqIndex === -1) {
      // No equals sign — check if it might be an export statement
      if (trimmed.startsWith('export ')) {
        const afterExport = trimmed.substring(7).trim();
        const expEq = afterExport.indexOf('=');
        if (expEq !== -1) {
          let key = afterExport.substring(0, expEq).trim();
          let value = afterExport.substring(expEq + 1).trim();
          let isQuoted = false;

          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
            isQuoted = true;
          }

          const expanded = expandVariables(value, knownVars);
          const hasExpansion = value.includes('${') || value.includes('$');

          if (key) knownVars.set(key, expanded ?? value);

          results.push({ line: i + 1, raw: line, key: `export ${key}`, value, expanded, type: 'valid', isQuoted, hasExpansion });
          continue;
        }
      }

      results.push({ line: i + 1, raw: line, key: null, value: null, expanded: null, type: 'error', error: 'Missing = sign', isQuoted: false, hasExpansion: false });
      continue;
    }

    const key = withoutInlineComment.substring(0, eqIndex).trim();
    let value = withoutInlineComment.substring(eqIndex + 1).trim();
    let isQuoted = false;

    // Check for valid key name (alphanumeric + underscore, no spaces)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      results.push({ line: i + 1, raw: line, key, value, expanded: null, type: 'error', error: `Invalid key name: "${key}". Only [A-Za-z0-9_] allowed, must not start with a digit.`, isQuoted: false, hasExpansion: false });
      continue;
    }

    // Unquote value if quoted
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      isQuoted = true;
    }

    const expanded = expandVariables(value, knownVars);
    const hasExpansion = value.includes('${') || value.includes('$');

    if (key) knownVars.set(key, expanded ?? value);

    results.push({ line: i + 1, raw: line, key, value, expanded, type: 'valid', isQuoted, hasExpansion });
  }

  return results;
}

function expandVariables(value: string, knownVars: Map<string, string>): string | null {
  // Support ${VAR} and $VAR patterns
  const pattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let result = value;
  let matched = false;

  result = result.replace(pattern, (match, bracketed, plain) => {
    const varName = bracketed || plain;
    if (knownVars.has(varName)) {
      matched = true;
      return knownVars.get(varName)!;
    }
    // Unknown variable — leave unresolved
    return match;
  });

  return matched ? (result !== value ? result : null) : null;
}

// ── Sample ─────────────────────────────────────────────────────────────────

const SAMPLE = `# === Database ===
DATABASE_URL=postgresql://localhost:5432/mydb
DATABASE_PORT=5432

# === API ===
API_HOST=https://api.example.com
API_VERSION=v2

# === Secrets ===
JWT_SECRET="super-secret-key-change-me"
ENCRYPTION_KEY='aes-256-gcm-key-here'

# === Feature Flags ===
ENABLE_BETA_FEATURES=true
MAX_FILE_SIZE_MB=100

# === Paths ===
UPLOAD_DIR=/var/uploads

# === Expansion ===
BASE_URL=https://\${API_HOST}/api/\${API_VERSION}
FULL_URL=\${BASE_URL}/users`;

// ── Component ──────────────────────────────────────────────────────────────

export default function EnvFileValidatorPage() {
  const [input, setInput] = useState('');
  const [showValues, setShowValues] = useState(false);
  const [copied, setCopied] = useState(false);

  const entries = useMemo(() => (input.trim() ? parseEnv(input) : []), [input]);
  const stats = useMemo(() => ({
    total: entries.length,
    valid: entries.filter(e => e.type === 'valid').length,
    comments: entries.filter(e => e.type === 'comment').length,
    blank: entries.filter(e => e.type === 'blank').length,
    errors: entries.filter(e => e.type === 'error').length,
    hasExpansion: entries.filter(e => e.hasExpansion).length,
  }), [entries]);

  const loadSample = useCallback(() => {
    setInput(SAMPLE.trim());
  }, []);

  const clearAll = useCallback(() => {
    setInput('');
  }, []);

  const handleCopy = useCallback(async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text || input);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
  }, [input]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([input], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('.env downloaded!');
  }, [input]);

  // Build expanded env output
  const expandedEnv = useMemo(() => {
    return entries
      .filter(e => e.type === 'valid')
      .map(e => {
        const displayVal = e.expanded ?? e.value ?? '';
        return `${e.key}=${displayVal}`;
      })
      .join('\n');
  }, [entries]);

  return (
    <ToolLayout
      title=".env File Parser & Validator"
      description="Parse, validate, and inspect .env files. Detect syntax errors, expand variable references, view resolved vs raw values, and export clean environment files."
    >
      {/* Input */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            Paste .env Content
          </h2>
          <div className="flex gap-2">
            <button onClick={loadSample}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Load sample
            </button>
            <button onClick={clearAll}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="DATABASE_URL=postgresql://localhost:5432/mydb&#10;API_KEY=sk-abc123"
          className="w-full h-64 bg-surface rounded-lg border border-slate-600/50 p-4 text-sm font-mono text-green-400 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-y"
          spellCheck={false}
        />
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => handleCopy()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-lighter text-slate-400 hover:text-white border border-slate-700/30 transition-all">
            <Copy className="w-3 h-3" /> Copy
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-lighter text-slate-400 hover:text-white border border-slate-700/30 transition-all">
            <Download className="w-3 h-3" /> Download .env
          </button>
        </div>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{stats.valid}</div>
              <div className="text-[10px] text-slate-500">Valid Vars</div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{stats.errors}</div>
              <div className="text-[10px] text-slate-500">Errors</div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-400">{stats.comments}</div>
              <div className="text-[10px] text-slate-500">Comments</div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-brand-400">{stats.hasExpansion}</div>
              <div className="text-[10px] text-slate-500">Expansions</div>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Output */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Raw Parsed View */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Parsed Variables</h2>
              <button onClick={() => setShowValues(!showValues)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                {showValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showValues ? 'Hide' : 'Show'} values
              </button>
            </div>
            <div className="max-h-[500px] overflow-auto space-y-1">
              {entries.map(entry => {
                if (entry.type === 'blank') {
                  return <div key={entry.line} className="h-2" />;
                }
                if (entry.type === 'comment') {
                  return (
                    <div key={entry.line} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-8 text-right text-[10px]">{entry.line}</span>
                      <span>{entry.raw}</span>
                    </div>
                  );
                }
                if (entry.type === 'error') {
                  return (
                    <div key={entry.line} className="flex items-start gap-2 bg-red-500/5 rounded px-2 py-1.5 border border-red-500/10">
                      <span className="w-8 text-right text-[10px] text-red-400 mt-0.5">{entry.line}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-red-300 font-mono break-all">{entry.raw}</span>
                        {entry.error && (
                          <p className="text-[10px] text-red-400 mt-0.5">{entry.error}</p>
                        )}
                      </div>
                    </div>
                  );
                }
                // Valid entry
                return (
                  <div key={entry.line} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-brand-500/5 transition-colors">
                    <span className="w-8 text-right text-[10px] text-slate-600 mt-0.5">{entry.line}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-300 font-mono font-medium">{entry.key}</span>
                        {entry.isQuoted && <span className="text-[10px] text-amber-400/70">quoted</span>}
                        {entry.hasExpansion && <span className="text-[10px] text-purple-400/70">expands</span>}
                      </div>
                      {showValues && (
                        <span className="text-xs text-slate-400 font-mono break-all">
                          {entry.value !== null ? (entry.value || <span className="italic text-slate-600">empty</span>) : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolved (Expanded) View */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Resolved Values (expanded)</h2>
              <button onClick={() => handleCopy(expandedEnv)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-slate-700/30'
                }`}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-[#0d1117] rounded-lg border border-slate-700/50 p-4 text-xs font-mono text-emerald-400 max-h-[500px] overflow-auto leading-relaxed">
              {expandedEnv || '(no valid variables)'}
            </pre>
            {entries.filter(e => e.hasExpansion).length > 0 && (
              <p className="text-[10px] text-slate-500 mt-2">
                Variable references like $&#123;VAR&#125; have been resolved using values from the same file.
                Variable resolution respects order — earlier variables are available to later ones.
              </p>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

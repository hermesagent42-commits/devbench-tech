'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, AlignLeft, Minimize2, CaseUpper, CaseLower, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// SQL keywords grouped by category
const KEYWORDS = new Set([
  // DML
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'INTO', 'VALUES', 'SET',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'USING',
  'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
  'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE', 'NULLIF', 'CAST',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
  'OVER', 'PARTITION', 'WINDOW', 'FILTER',
  // DDL
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'TRIGGER', 'SCHEMA',
  'DATABASE', 'COLUMN', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE', 'RESTRICT', 'IF', 'TEMPORARY', 'TEMP',
  'TRUNCATE', 'RENAME', 'ADD', 'TYPE', 'ENUM', 'SERIAL', 'BIGSERIAL',
  // Data types
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'VARCHAR', 'CHAR', 'TEXT', 'BOOLEAN',
  'BOOL', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'DATE', 'TIMESTAMP', 'TIMESTAMPTZ',
  'UUID', 'JSON', 'JSONB', 'BYTEA', 'ARRAY',
  // Transaction
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
  // Misc
  'WITH', 'RECURSIVE', 'RETURNING', 'EXPLAIN', 'ANALYZE', 'GRANT', 'REVOKE',
  'ILIKE', 'SIMILAR', 'TO', 'ANY', 'SOME', 'EXCEPT', 'INTERSECT',
]);

// Words that start new indented lines
const INDENT_AFTER = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'SET', 'ORDER', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'JOIN', 'ON', 'UNION', 'EXCEPT', 'INTERSECT',
]);

const INDENT_INCREASE = new Set([
  'SELECT', 'FROM', 'WHERE', 'SET', 'HAVING', 'WITH', 'CASE',
]);

function formatSql(input: string, uppercaseKeywords: boolean): string {
  // Tokenize: split on word boundaries, preserving whitespace and punctuation
  const tokens = input.match(/\s+|--.*$|\/\*[\s\S]*?\*\/|'[^']*'|\"[^\"]*\"|`[^`]*`|\w+|[^\s\w]/gmi) || [];
  
  let indent = 0;
  const lines: string[] = [];
  let currentLine = '';
  let firstWord = true;
  let expectingIndent = false;

  const pushLine = (line: string) => {
    if (line.trim()) {
      lines.push('  '.repeat(Math.max(0, indent)) + line.trim());
    } else if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Check if it's a newline-containing whitespace
    if (/\n/.test(token)) {
      // Push current line
      pushLine(currentLine);
      currentLine = '';
      firstWord = true;
      expectingIndent = false;
      
      // Count newlines for blank line handling
      const newlineCount = (token.match(/\n/g) || []).length;
      for (let n = 0; n < newlineCount - 1; n++) {
        lines.push('');
      }
      continue;
    }

    if (token.trim() === '') {
      currentLine += token;
      continue;
    }

    // Skip whitespace tokens that don't contain newlines
    if (/^\s+$/.test(token)) {
      if (currentLine.length > 0 && !/\s$/.test(currentLine)) {
        currentLine += ' ';
      }
      continue;
    }

    // Check if it's a comment
    if (token.startsWith('--') || token.startsWith('/*')) {
      const trimmed = currentLine.trim();
      if (trimmed && trimmed !== ',') {
        pushLine(currentLine);
      } else {
        pushLine(trimmed);
      }
      currentLine = '';
      // Push comment with current indent
      lines.push('  '.repeat(Math.max(0, indent)) + token.trim());
      firstWord = false;
      continue;
    }

    const trimmed = token.trim();
    if (!trimmed) continue;

    const upper = trimmed.replace(/['"`][^'`"]*['"`]/g, '').toUpperCase();
    const isKeyword = KEYWORDS.has(upper);
    const displayToken = isKeyword 
      ? (uppercaseKeywords ? upper : trimmed.toLowerCase())
      : trimmed;

    // Handle indent decreases at specific points
    if (upper === 'END') {
      indent = Math.max(0, indent - 1);
      pushLine(currentLine);
      currentLine = '';
      currentLine = displayToken + ' ';
      pushLine(currentLine);
      currentLine = '';
      firstWord = true;
      expectingIndent = false;
      continue;
    }

    // Handle commas: they break to a new line inside SELECT/WHERE/etc
    if (trimmed === ',') {
      currentLine += ',';
      // Check if we're inside a SELECT clause or similar
      pushLine(currentLine);
      currentLine = '';
      firstWord = true;
      expectingIndent = true;
      continue;
    }

    // Handle opening parens
    if (trimmed === '(') {
      currentLine += '(';
      // Check if this is a function call (preceded by a word without space)
      const prevTrimmed = currentLine.slice(0, -1).trim();
      if (!prevTrimmed || prevTrimmed.endsWith(',')) {
        indent++;
        pushLine(currentLine);
        currentLine = '';
        firstWord = true;
        expectingIndent = false;
      }
      continue;
    }

    if (trimmed === ')') {
      indent = Math.max(0, indent - 1);
      if (currentLine.trim()) {
        pushLine(currentLine);
      }
      currentLine = '';
      currentLine = ')';
      pushLine(currentLine);
      currentLine = '';
      firstWord = true;
      expectingIndent = false;
      continue;
    }

    // Detect indent-increase keywords before adding
    if (firstWord && INDENT_INCREASE.has(upper) && indent > 0) {
      indent++;
      pushLine('');
    }

    // Add the token
    if (firstWord) {
      if (expectingIndent && indent > 0) {
        currentLine = '  ' + displayToken + ' ';
      } else {
        currentLine = displayToken + ' ';
      }
      firstWord = false;
      expectingIndent = false;
    } else {
      currentLine += displayToken + ' ';
    }

    // Check if we should break to next line
    if (!firstWord && INDENT_AFTER.has(upper)) {
      const nextTokens = tokens.slice(i + 1).map(t => t.trim()).filter(Boolean);
      // Only break if there's more content (don't break on the last keyword)
      if (nextTokens.length > 0 && nextTokens[0] !== ';') {
        pushLine(currentLine);
        currentLine = '';
        firstWord = true;
        
        // Decrease indent for non-increase keywords
        if (!INDENT_INCREASE.has(upper) && upper !== 'SELECT' && upper !== 'SET' && upper !== 'HAVING' && upper !== 'WHERE') {
          // don't change indent for AND/OR/ON etc
        }
      }
    }

    if (trimmed === ';') {
      pushLine(currentLine);
      currentLine = '';
      lines.push('');
      indent = Math.max(0, indent - 1);
      firstWord = true;
      expectingIndent = false;
    }
  }

  // Push remaining
  if (currentLine.trim()) {
    pushLine(currentLine);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function minifySql(input: string): string {
  // Remove comments, collapse whitespace
  let result = input
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove unnecessary spaces around punctuation
  result = result
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*;\s*/g, ';');
  
  return result;
}

function highlightSql(sql: string): string {
  const escapeHtml = (s: string) => 
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  return sql.replace(
    /(--.*$|\/\*[\s\S]*?\*\/|'[^']*'|\b\d+(?:\.\d+)?\b|\b[A-Z_][A-Z0-9_]*\b|\w+)/gmi,
    (match, ..._args) => {
      const escaped = escapeHtml(match);
      if (match.startsWith('--') || match.startsWith('/*')) {
        return `<span class="sql-comment">${escaped}</span>`;
      }
      if (match.startsWith("'")) {
        return `<span class="sql-string">${escaped}</span>`;
      }
      if (/^\d+(?:\.\d+)?$/.test(match)) {
        return `<span class="sql-number">${escaped}</span>`;
      }
      if (KEYWORDS.has(match.toUpperCase())) {
        return `<span class="sql-keyword">${escaped}</span>`;
      }
      return escaped;
    }
  );
}

export default function SqlFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [uppercaseKeywords, setUppercaseKeywords] = useState(true);
  const [mode, setMode] = useState<'format' | 'minify'>('format');

  const format = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    setMode('format');
    const formatted = formatSql(input, uppercaseKeywords);
    setOutput(formatted);
  }, [input, uppercaseKeywords]);

  const minify = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    setMode('minify');
    const minified = minifySql(input);
    setOutput(minified);
  }, [input]);

  const reset = useCallback(() => {
    setInput('');
    setOutput('');
    setMode('format');
  }, []);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const highlightedOutput = useMemo(() => {
    if (!output) return '';
    return highlightSql(output);
  }, [output]);

  const stats = useMemo(() => {
    if (!output && !input) return null;
    const inputLen = input.length;
    const outputLen = output.length;
    const inputLines = input.split('\n').length;
    const outputLines = output.split('\n').length;
    return { inputLen, outputLen, inputLines, outputLines };
  }, [input, output]);

  return (
    <ToolLayout
      title="SQL Formatter"
      description="Format, beautify, and minify SQL queries with keyword highlighting — 100% client-side."
    >
      {/* Toolbar */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={format}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'format' ? 'bg-brand-500 text-white' : 'bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50'}`}
              title="Format & beautify SQL"
            >
              <AlignLeft className="w-4 h-4" />
              Format
            </button>
            <button
              onClick={minify}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'minify' ? 'bg-brand-500 text-white' : 'bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50'}`}
              title="Minify SQL to a single line"
            >
              <Minimize2 className="w-4 h-4" />
              Minify
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUppercaseKeywords(!uppercaseKeywords)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${uppercaseKeywords ? 'bg-surface-lighter text-slate-300 border border-slate-600/50' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}
              title={`Keywords are ${uppercaseKeywords ? 'UPPERCASE' : 'lowercase'}`}
            >
              {uppercaseKeywords ? <CaseUpper className="w-4 h-4" /> : <CaseLower className="w-4 h-4" />}
              {uppercaseKeywords ? 'UPPER' : 'lower'}
            </button>

            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-colors bg-surface-lighter border border-slate-600/50 hover:border-red-500/30"
              title="Clear all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <label className="text-white font-semibold text-sm">Input SQL</label>
            <span className="text-xs text-slate-500">Paste your SQL here</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`SELECT u.name, o.total\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.created_at > '2024-01-01'\nGROUP BY u.name\nHAVING SUM(o.total) > 100\nORDER BY o.total DESC\nLIMIT 10;`}
            className="input-field w-full h-80 resize-y font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
          {stats && (
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>{stats.inputLines} lines</span>
              <span>{stats.inputLen.toLocaleString()} chars</span>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <label className="text-white font-semibold text-sm">
              {mode === 'format' ? 'Formatted' : 'Minified'} SQL
            </label>
            {output && (
              <button
                onClick={copyOutput}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            )}
          </div>
          {output ? (
            <pre
              className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightedOutput }}
            />
          ) : (
            <div className="bg-surface rounded-lg p-4 border border-slate-700/50 h-80 flex items-center justify-center">
              <p className="text-slate-500 text-sm">
                Click <span className="text-brand-400 font-semibold">Format</span> or{' '}
                <span className="text-brand-400 font-semibold">Minify</span> to see the result
              </p>
            </div>
          )}
          {stats && output && (
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>{stats.outputLines} lines</span>
              <span>{stats.outputLen.toLocaleString()} chars</span>
              {stats.inputLen > 0 && (
                <span className={stats.outputLen < stats.inputLen ? 'text-green-400' : 'text-slate-500'}>
                  {stats.outputLen < stats.inputLen ? '↓' : '↑'}{' '}
                  {Math.abs(Math.round((1 - stats.outputLen / stats.inputLen) * 100))}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-2">What it does</h3>
        <ul className="text-slate-400 text-sm space-y-1.5">
          <li>• <strong className="text-slate-300">Format:</strong> Beautifies SQL with consistent indentation — keywords on new lines, commas and operators aligned.</li>
          <li>• <strong className="text-slate-300">Minify:</strong> Collapses SQL to a single compact line by removing comments and unnecessary whitespace.</li>
          <li>• <strong className="text-slate-300">UPPER/lower:</strong> Toggle keyword casing between UPPERCASE and lowercase.</li>
          <li>• <strong className="text-slate-300">Privacy:</strong> All processing happens in your browser — your SQL never leaves your machine.</li>
        </ul>
      </div>

      {/* SQL highlighting styles */}
      <style jsx>{`
        .sql-keyword { color: #7dd3fc; font-weight: 600; }
        .sql-string { color: #86efac; }
        .sql-number { color: #fbbf24; }
        .sql-comment { color: #94a3b8; font-style: italic; }
      `}</style>
    </ToolLayout>
  );
}

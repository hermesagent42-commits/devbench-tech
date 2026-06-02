'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Database, Copy, Check, Download, RefreshCw, Code2,
  Table2, GitBranch, Zap, FileText, Braces, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SqlDialect = 'mysql' | 'postgresql' | 'sqlite';

interface ColumnInfo {
  name: string;
  sqlType: string;
  nullable: boolean;
  maxLength: number;
}

interface SqlConfig {
  dialect: SqlDialect;
  tableName: string;
  addIfNotExists: boolean;
  addDropTable: boolean;
  addAutoIncrement: boolean;
  wrapInserts: boolean;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_JSON = `[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "admin",
    "active": true,
    "score": 95.5,
    "joined": "2025-01-15",
    "tags": ["typescript", "react"]
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "role": "editor",
    "active": false,
    "score": 72.3,
    "joined": "2025-03-22",
    "tags": ["python", "django"]
  },
  {
    "id": 3,
    "name": "Carol Davis",
    "email": "carol@example.com",
    "role": "viewer",
    "active": true,
    "score": 88.0,
    "joined": "2025-06-01",
    "tags": ["go", "docker"]
  }
]`;

// ── Type Detection ─────────────────────────────────────────────────────────

function isDateString(val: string): boolean {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(val);
}

function detectSqlType(val: unknown, dialect: SqlDialect): string {
  if (val === null || val === undefined) {
    return dialect === 'postgresql' ? 'TEXT' : 'VARCHAR(255)';
  }
  const t = typeof val;
  if (t === 'boolean') {
    return dialect === 'postgresql' ? 'BOOLEAN' : dialect === 'mysql' ? 'TINYINT(1)' : 'INTEGER';
  }
  if (t === 'number') {
    if (Number.isInteger(val)) return 'INTEGER';
    return dialect === 'mysql' ? 'DOUBLE' : dialect === 'postgresql' ? 'DOUBLE PRECISION' : 'REAL';
  }
  if (t === 'string') {
    if (isDateString(val as string)) {
      return dialect === 'postgresql' ? 'TIMESTAMP' : 'DATETIME';
    }
    const len = (val as string).length;
    if (len > 5000) return 'TEXT';
    if (len > 255) return dialect === 'postgresql' ? 'VARCHAR(' + Math.ceil(len * 1.5) + ')' : `VARCHAR(${Math.ceil(len * 1.5)})`;
    return dialect === 'postgresql' ? 'VARCHAR(255)' : 'VARCHAR(255)';
  }
  if (Array.isArray(val)) {
    return dialect === 'postgresql' ? 'JSONB' : dialect === 'mysql' ? 'JSON' : 'TEXT';
  }
  if (t === 'object') {
    return dialect === 'postgresql' ? 'JSONB' : dialect === 'mysql' ? 'JSON' : 'TEXT';
  }
  return 'TEXT';
}

function quoteIdentifier(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return '`' + name.replace(/`/g, '``') + '`';
  if (dialect === 'postgresql') return '"' + name.replace(/"/g, '""') + '"';
  return '"' + name.replace(/"/g, '""') + '"';
}

function escapeSqlValue(val: unknown, dialect: SqlDialect): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') {
    if (dialect === 'postgresql') return val ? 'TRUE' : 'FALSE';
    return val ? '1' : '0';
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    const escaped = val.replace(/'/g, "''").replace(/\\/g, '\\\\');
    return "'" + escaped + "'";
  }
  if (Array.isArray(val) || typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return "'" + jsonStr + "'";
  }
  return String(val);
}

// ── Column Analysis ────────────────────────────────────────────────────────

function analyzeColumns(data: Record<string, unknown>[], dialect: SqlDialect): ColumnInfo[] {
  const colMap = new Map<string, { types: Set<string>; nullable: boolean; maxLength: number }>();

  for (const row of data) {
    for (const [key, val] of Object.entries(row)) {
      if (!colMap.has(key)) {
        colMap.set(key, { types: new Set(), nullable: false, maxLength: 0 });
      }
      const entry = colMap.get(key)!;
      if (val === null || val === undefined) {
        entry.nullable = true;
      } else {
        const t = detectSqlType(val, dialect);
        entry.types.add(t);
        if (typeof val === 'string') {
          entry.maxLength = Math.max(entry.maxLength, val.length);
        }
      }
    }
  }

  const columns: ColumnInfo[] = [];
  for (const [name, info] of colMap) {
    // Pick best type: prefer concrete over TEXT
    const typesArr = Array.from(info.types).filter(t => t !== 'TEXT' && t !== 'VARCHAR(255)');
    let sqlType: string;
    if (typesArr.length === 0) {
      sqlType = info.maxLength > 5000 ? 'TEXT' : info.maxLength > 255
        ? (dialect === 'postgresql' ? 'VARCHAR(' + Math.ceil(info.maxLength * 1.5) + ')' : `VARCHAR(${Math.ceil(info.maxLength * 1.5)})`)
        : 'VARCHAR(255)';
    } else if (typesArr.length === 1) {
      sqlType = typesArr[0];
    } else {
      // Mixed types — fall back to TEXT
      sqlType = 'TEXT';
    }
    columns.push({ name, sqlType, nullable: info.nullable, maxLength: info.maxLength });
  }

  return columns;
}

// ── SQL Generation ─────────────────────────────────────────────────────────

function generateSql(
  data: Record<string, unknown>[],
  columns: ColumnInfo[],
  config: SqlConfig
): string {
  const { dialect, tableName, addIfNotExists, addDropTable, addAutoIncrement, wrapInserts } = config;
  const parts: string[] = [];

  // Drop table
  if (addDropTable) {
    parts.push(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName, dialect)};`);
    parts.push('');
  }

  // CREATE TABLE
  const ifNotExists = addIfNotExists
    ? (dialect === 'postgresql' ? 'IF NOT EXISTS ' : 'IF NOT EXISTS ')
    : '';
  parts.push(`CREATE TABLE ${ifNotExists}${quoteIdentifier(tableName, dialect)} (`);

  const colDefs: string[] = [];
  let hasId = false;

  for (const col of columns) {
    let def = `  ${quoteIdentifier(col.name, dialect)} ${col.sqlType}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.name === 'id' && col.sqlType === 'INTEGER') {
      hasId = true;
      if (addAutoIncrement) {
        if (dialect === 'mysql') def += ' AUTO_INCREMENT';
        if (dialect === 'postgresql') {
          def = `  ${quoteIdentifier(col.name, dialect)} SERIAL NOT NULL`;
        }
        if (dialect === 'sqlite') {
          def = `  ${quoteIdentifier(col.name, dialect)} INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL`;
        }
      } else {
        def += ' PRIMARY KEY';
      }
    }
    colDefs.push(def);
  }

  parts.push(colDefs.join(',\n'));
  if (dialect === 'mysql') {
    parts.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  } else {
    parts.push(');');
  }
  parts.push('');

  // INSERT statements
  if (data.length > 0) {
    const colNames = columns.map(c => quoteIdentifier(c.name, dialect)).join(', ');
    const insertPrefix = `INSERT INTO ${quoteIdentifier(tableName, dialect)} (${colNames}) VALUES`;

    if (wrapInserts) {
      parts.push('BEGIN;');
      parts.push('');
    }

    const rows: string[] = [];
    for (const row of data) {
      const vals: string[] = [];
      for (const col of columns) {
        const val = row[col.name];
        vals.push(escapeSqlValue(val, dialect));
      }
      rows.push(`(${vals.join(', ')})`);
    }

    if (data.length > 5 && dialect !== 'sqlite') {
      // Multi-row INSERT
      const lines: string[] = [];
      for (let i = 0; i < rows.length; i += 5) {
        const chunk = rows.slice(i, i + 5).join(',\n  ');
        lines.push(`${insertPrefix}\n  ${chunk};`);
      }
      parts.push(lines.join('\n\n'));
    } else {
      // Single-row INSERTs
      for (const r of rows) {
        parts.push(`${insertPrefix} ${r};`);
      }
    }

    if (wrapInserts) {
      parts.push('');
      parts.push('COMMIT;');
    }
  }

  return parts.join('\n');
}

// ── Format SQL ─────────────────────────────────────────────────────────────

function formatSqlOutput(sql: string): string {
  // Ensure nice spacing around statements
  return sql.replace(/([^;]);\n\n/g, '$1;\n\n').trim();
}

// ── Component ──────────────────────────────────────────────────────────────

export default function JsonToSql() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [config, setConfig] = useState<SqlConfig>({
    dialect: 'postgresql',
    tableName: 'users',
    addIfNotExists: true,
    addDropTable: false,
    addAutoIncrement: true,
    wrapInserts: false,
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'columns' | null>(null);

  const { data, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return { data: null, parseError: 'JSON array is empty. Provide at least one object.' };
        const allObjects = parsed.every((item: unknown) => typeof item === 'object' && item !== null && !Array.isArray(item));
        if (!allObjects) return { data: null, parseError: 'Expected an array of objects. Each item must be a JSON object ({}).' };
        return { data: parsed as Record<string, unknown>[], parseError: null };
      }
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return { data: [parsed as Record<string, unknown>], parseError: null };
      }
      return { data: null, parseError: 'Expected a JSON object or an array of objects.' };
    } catch (e) {
      return { data: null, parseError: (e as Error).message };
    }
  }, [input]);

  const columns = useMemo(() => {
    if (!data) return [];
    return analyzeColumns(data, config.dialect);
  }, [data, config.dialect]);

  const sqlOutput = useMemo(() => {
    if (!data || columns.length === 0) return '';
    return formatSqlOutput(generateSql(data, columns, config));
  }, [data, columns, config]);

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      rows: data.length,
      columns: columns.length,
      insertCount: sqlOutput ? (sqlOutput.match(/INSERT INTO/gi) || []).length : 0,
      sqlLines: sqlOutput ? sqlOutput.split('\n').length : 0,
    };
  }, [data, sqlOutput, columns]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sqlOutput);
      setCopiedCode(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [sqlOutput]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([sqlOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.tableName}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded!');
  }, [sqlOutput, config.tableName]);

  const handleUseSample = useCallback(() => {
    setInput(SAMPLE_JSON);
    setConfig(prev => ({ ...prev, tableName: 'users' }));
  }, []);

  const updateConfig = useCallback(<K extends keyof SqlConfig>(key: K, value: SqlConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const dialectOptions: { value: SqlDialect; label: string; emoji: string }[] = [
    { value: 'postgresql', label: 'PostgreSQL', emoji: '🐘' },
    { value: 'mysql', label: 'MySQL', emoji: '🐬' },
    { value: 'sqlite', label: 'SQLite', emoji: '🪶' },
  ];

  return (
    <ToolLayout
      title="JSON to SQL Converter"
      description="Convert JSON data into SQL CREATE TABLE and INSERT statements. Auto-detect column types, support for PostgreSQL, MySQL & SQLite dialects — 100% client-side."
      controls={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Database className="w-4 h-4 text-brand-400" />
          <span>No data leaves your browser</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── JSON Input ─────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Braces className="w-4 h-4 text-brand-400" />
              JSON Input
            </label>
            <button
              onClick={handleUseSample}
              className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Load Sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-48 font-mono text-sm bg-[#0f1117] border border-slate-700 rounded-lg p-4 text-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-y"
            placeholder='[{"id": 1, "name": "Alice"}]'
            spellCheck={false}
          />
          {parseError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
              <span className="text-xs">⚠</span> {parseError}
            </p>
          )}
        </div>

        {/* ── Configuration ──────────────────── */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-brand-400" />
            Configuration
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Dialect */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">SQL Dialect</label>
              <div className="flex bg-[#0f1117] border border-slate-700 rounded-lg overflow-hidden">
                {dialectOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateConfig('dialect', opt.value)}
                    className={`flex-1 px-2 py-2 text-xs transition-colors ${
                      config.dialect === opt.value
                        ? 'bg-brand-500/20 text-brand-400 border-b-2 border-brand-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                    title={opt.label}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Name */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Table Name</label>
              <input
                type="text"
                value={config.tableName}
                onChange={e => updateConfig('tableName', e.target.value || 'my_table')}
                className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Toggles */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Options</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.addIfNotExists}
                    onChange={e => updateConfig('addIfNotExists', e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  IF NOT EXISTS
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.addAutoIncrement}
                    onChange={e => updateConfig('addAutoIncrement', e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Auto-increment id
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">More Options</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.addDropTable}
                    onChange={e => updateConfig('addDropTable', e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  DROP TABLE IF EXISTS
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.wrapInserts}
                    onChange={e => updateConfig('wrapInserts', e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Wrap in transaction
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Column Detection ───────────────── */}
        {columns.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'columns' ? null : 'columns')}
              className="text-sm font-semibold text-slate-200 flex items-center gap-2 hover:text-brand-400 transition-colors"
            >
              <Table2 className="w-4 h-4 text-brand-400" />
              Detected Columns ({columns.length})
              <span className="text-xs text-slate-500">
                {expandedSection === 'columns' ? '−' : '+'}
              </span>
            </button>
            {expandedSection === 'columns' && (
              <div className="mt-2 bg-[#0f1117] border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium">Column</th>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium">SQL Type</th>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium">Nullable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(col => (
                      <tr key={col.name} className="border-t border-slate-800">
                        <td className="px-4 py-2 text-slate-300 font-mono">{col.name}</td>
                        <td className="px-4 py-2 text-brand-400 font-mono">{col.sqlType}</td>
                        <td className="px-4 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            col.nullable ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-500'
                          }`}>
                            {col.nullable ? 'NULLABLE' : 'NOT NULL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SQL Output ─────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-400" />
              SQL Output
            </label>
            <div className="flex items-center gap-2">
              {stats && (
                <span className="text-xs text-slate-500">
                  {stats.rows} row{stats.rows !== 1 ? 's' : ''} · {stats.sqlLines} lines
                </span>
              )}
              <button
                onClick={handleCopy}
                disabled={!sqlOutput}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!sqlOutput}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="w-full min-h-[200px] font-mono text-sm bg-[#0f1117] border border-slate-700 rounded-lg p-4 text-slate-300 overflow-auto whitespace-pre-wrap break-all">
              <code>
                {sqlOutput ? (
                  /* Syntax highlighting */
                  sqlOutput.split('\n').map((line, i) => {
                    let highlighted = line;
                    // Highlight SQL keywords
                    const kws = ['CREATE', 'TABLE', 'INSERT', 'INTO', 'VALUES', 'DROP', 'IF', 'NOT', 'EXISTS',
                      'NULL', 'SERIAL', 'PRIMARY', 'KEY', 'AUTO_INCREMENT', 'AUTOINCREMENT', 'DEFAULT',
                      'BEGIN', 'COMMIT', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DOUBLE', 'REAL',
                      'PRECISION', 'TIMESTAMP', 'DATETIME', 'JSON', 'JSONB', 'ENGINE', 'CHARSET',
                      'COLLATE', 'TRUE', 'FALSE', 'TINYINT', 'REFERENCES', 'CONSTRAINT', 'INDEX',
                      'UNIQUE', 'CHECK', 'FOREIGN', 'ALTER', 'ADD', 'SET', 'WHERE', 'FROM',
                      'SELECT', 'UPDATE', 'DELETE', 'INNER', 'LEFT', 'RIGHT', 'JOIN', 'ON',
                      'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR'];
                    for (const kw of kws) {
                      const re = new RegExp(`\\b(${kw})\\b`, 'gi');
                      highlighted = highlighted.replace(re, (m) => {
                        // Only highlight if not inside quotes
                        const idx = highlighted.indexOf(m);
                        const before = highlighted.slice(0, idx);
                        const singleQuotes = (before.match(/'/g) || []).length;
                        if (singleQuotes % 2 === 0) {
                          return `\x1bkw\x1b${m}\x1bkw\x1b`;
                        }
                        return m;
                      });
                    }
                    // Colorize
                    const parts = highlighted.split(/\x1bkw\x1b/);
                    const colored = parts.map((p, i) => {
                      if (i % 2 === 1) return `<span style="color:#818cf8">${p}</span>`; // keyword purple
                      // Colorize strings
                      return p.replace(/'([^']*)'/g, `<span style="color:#34d399">'$1'</span>`)
                              .replace(/--.*$/g, `<span style="color:#6b7280">$&</span>`);
                    });
                    return `<span>${colored.join('')}</span>`;
                  }).join('\n')
                ) : (
                  <span className="text-slate-600 italic">
                    {parseError ? 'Fix JSON errors to generate SQL' : 'Enter valid JSON to generate SQL'}
                  </span>
                )}
              </code>
            </pre>
          </div>
        </div>

        {/* ── Tips ───────────────────────────── */}
        <div className="card bg-surface-light">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-slate-200">Quick Tips</h4>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                <li>• PostgreSQL: use <code className="text-brand-400 bg-slate-700/50 px-1 rounded">JSONB</code> for arrays/objects. MySQL: <code className="text-brand-400 bg-slate-700/50 px-1 rounded">JSON</code>.</li>
                <li>• Numbers are auto-detected as INTEGER vs DOUBLE based on value type.</li>
                <li>• Date strings (YYYY-MM-DD) are detected as DATETIME/TIMESTAMP columns.</li>
                <li>• Boolean values become BOOLEAN (PG), TINYINT(1) (MySQL), or INTEGER (SQLite).</li>
                <li>• All processing happens in your browser — no data is ever sent anywhere.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

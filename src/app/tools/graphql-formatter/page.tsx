'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

function formatGraphQL(query: string, indentSize: number = 2): string {
  const indent = ' '.repeat(indentSize);
  let result = '';
  let depth = 0;
  let i = 0;
  let newline = true;

  const pushIndent = () => { result += indent.repeat(depth); newline = false; };
  const pushNewline = () => { result += '\n'; newline = true; };

  // Tokenize: split into meaningful tokens
  const tokens: { type: string; value: string }[] = [];
  let pos = 0;
  while (pos < query.length) {
    const ch = query[pos];

    // Whitespace (skip, but track for newline)
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      pos++;
      continue;
    }

    // Newlines (collapse to single)
    if (ch === '\n') {
      pos++;
      while (pos < query.length && (query[pos] === '\n' || query[pos] === ' ' || query[pos] === '\t')) pos++;
      tokens.push({ type: 'NEWLINE', value: '\n' });
      continue;
    }

    // Comments (# ... to end of line)
    if (ch === '#') {
      let comment = '#';
      pos++;
      while (pos < query.length && query[pos] !== '\n') {
        comment += query[pos];
        pos++;
      }
      tokens.push({ type: 'COMMENT', value: comment.trimEnd() });
      continue;
    }

    // Strings (double-quoted)
    if (ch === '"') {
      let str = '"';
      pos++;
      while (pos < query.length && query[pos] !== '"') {
        if (query[pos] === '\\' && pos + 1 < query.length) {
          str += query[pos];
          pos++;
          str += query[pos];
        } else {
          str += query[pos];
        }
        pos++;
      }
      if (pos < query.length) { str += '"'; pos++; }
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Block strings (triple-quoted)
    if (ch === '"' && query[pos + 1] === '"' && query[pos + 2] === '"') {
      let str = '"""';
      pos += 3;
      while (pos < query.length) {
        if (query[pos] === '"' && query[pos + 1] === '"' && query[pos + 2] === '"') {
          str += '"""';
          pos += 3;
          break;
        }
        str += query[pos];
        pos++;
      }
      tokens.push({ type: 'BLOCK_STRING', value: str });
      continue;
    }

    // Names / keywords
    if (/[_a-zA-Z]/.test(ch)) {
      let name = '';
      while (pos < query.length && /[_a-zA-Z0-9]/.test(query[pos])) {
        name += query[pos];
        pos++;
      }
      tokens.push({ type: 'NAME', value: name });
      continue;
    }

    // Numbers (- and digits)
    if (ch === '-' && pos + 1 < query.length && /[0-9]/.test(query[pos + 1])) {
      let num = '-';
      pos++;
      while (pos < query.length && /[0-9.eE]/.test(query[pos])) {
        num += query[pos];
        pos++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (pos < query.length && /[0-9.eE]/.test(query[pos])) {
        num += query[pos];
        pos++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // Variable ($name)
    if (ch === '$') {
      let varName = '$';
      pos++;
      while (pos < query.length && /[_a-zA-Z0-9]/.test(query[pos])) {
        varName += query[pos];
        pos++;
      }
      tokens.push({ type: 'VARIABLE', value: varName });
      continue;
    }

    // Punctuation
    if (ch === '{') { tokens.push({ type: 'OPEN_BRACE', value: '{' }); pos++; continue; }
    if (ch === '}') { tokens.push({ type: 'CLOSE_BRACE', value: '}' }); pos++; continue; }
    if (ch === '(') { tokens.push({ type: 'OPEN_PAREN', value: '(' }); pos++; continue; }
    if (ch === ')') { tokens.push({ type: 'CLOSE_PAREN', value: ')' }); pos++; continue; }
    if (ch === '[') { tokens.push({ type: 'OPEN_BRACKET', value: '[' }); pos++; continue; }
    if (ch === ']') { tokens.push({ type: 'CLOSE_BRACKET', value: ']' }); pos++; continue; }
    if (ch === ':') { tokens.push({ type: 'COLON', value: ':' }); pos++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); pos++; continue; }
    if (ch === '=') { tokens.push({ type: 'EQUALS', value: '=' }); pos++; continue; }
    if (ch === '!') { tokens.push({ type: 'BANG', value: '!' }); pos++; continue; }
    if (ch === '@') { tokens.push({ type: 'AT', value: '@' }); pos++; continue; }
    if (ch === '|') { tokens.push({ type: 'PIPE', value: '|' }); pos++; continue; }
    if (ch === '.') { tokens.push({ type: 'DOT', value: '.' }); pos++; continue; }

    // Unknown character — treat as single token
    tokens.push({ type: 'UNKNOWN', value: ch });
    pos++;
  }

  // Process tokens into formatted output
  let ti = 0;
  let skipNextNewline = false;

  while (ti < tokens.length) {
    const token = tokens[ti];
    const prev = ti > 0 ? tokens[ti - 1] : null;
    const next = ti + 1 < tokens.length ? tokens[ti + 1] : null;

    switch (token.type) {
      case 'NEWLINE':
        if (!skipNextNewline) {
          pushNewline();
        }
        skipNextNewline = false;
        break;

      case 'COMMENT':
        pushNewline();
        pushIndent();
        result += token.value;
        pushNewline();
        break;

      case 'OPEN_BRACE':
        if (prev && prev.type !== 'NEWLINE' && prev.type !== 'OPEN_BRACE' && prev.type !== 'COMMA') {
          result += ' ';
        }
        result += '{';
        depth++;
        pushNewline();
        skipNextNewline = true;
        break;

      case 'CLOSE_BRACE':
        depth = Math.max(0, depth - 1);
        // Trim trailing whitespace before close brace
        result = result.trimEnd();
        if (!result.endsWith('\n') && result.length > 0) {
          pushNewline();
        }
        pushIndent();
        result += '}';
        if (next && next.type !== 'CLOSE_BRACE' && next.type !== 'NEWLINE' && next.type !== 'COMMA') {
          pushNewline();
        }
        break;

      case 'OPEN_PAREN':
        result += '(';
        break;

      case 'CLOSE_PAREN':
        result += ')';
        break;

      case 'OPEN_BRACKET':
        result += '[';
        break;

      case 'CLOSE_BRACKET':
        result += ']';
        break;

      case 'PIPE':
        result += ' | ';
        break;

      case 'COLON':
        result += ': ';
        break;

      case 'COMMA':
        result += ', ';
        break;

      case 'EQUALS':
        result += ' = ';
        break;

      case 'BANG':
        result += '!';
        break;

      case 'AT':
        result += '@';
        break;

      case 'DOT':
        result += '.';
        break;

      case 'NAME':
        if (newline) {
          pushIndent();
        } else if (prev && prev.type !== 'OPEN_PAREN' && prev.type !== 'DOT' && prev.type !== 'AT' &&
                   prev.type !== 'NEWLINE' && prev.type !== 'COMMA' && prev.type !== 'COLON' &&
                   prev.type !== 'OPEN_BRACE' && prev.type !== 'BANG' && prev.type !== 'PIPE') {
          result += ' ';
        }
        result += token.value;
        break;

      case 'STRING':
        if (newline) pushIndent();
        result += token.value;
        break;

      case 'BLOCK_STRING':
        if (newline) pushIndent();
        result += token.value;
        break;

      case 'NUMBER':
        result += token.value;
        break;

      case 'VARIABLE':
        if (newline) pushIndent();
        else if (prev && prev.type !== 'OPEN_PAREN' && prev.type !== 'COLON' && prev.type !== 'EQUALS' &&
                 prev.type !== 'COMMA' && prev.type !== 'NEWLINE' && prev.type !== 'BANG') {
          result += ' ';
        }
        result += token.value;
        break;

      default:
        result += token.value;
    }
    ti++;
  }

  // Final cleanup: trim, ensure single newline at end
  return result.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function minifyGraphQL(query: string): string {
  // Remove comments
  let result = query.replace(/#.*$/gm, '');
  // Remove extra whitespace but preserve inside strings
  let inString = false;
  let inBlockString = false;
  let stringChar = '';
  let cleaned = '';

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];

    // Block strings
    if (!inString && ch === '"' && result[i + 1] === '"' && result[i + 2] === '"') {
      inBlockString = !inBlockString;
      cleaned += '"""';
      i += 2;
      continue;
    }

    if (inBlockString) {
      cleaned += ch;
      continue;
    }

    // Regular strings
    if (ch === '"' || ch === "'") {
      if (!inString) {
        inString = true;
        stringChar = ch;
      } else if (ch === stringChar) {
        inString = false;
      }
      cleaned += ch;
      continue;
    }

    if (inString) {
      cleaned += ch;
      continue;
    }

    // Collapse whitespace (but keep newlines that might be necessary)
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== ' ') {
        cleaned += ' ';
      }
      continue;
    }

    // Remove space before punctuation
    if (ch === '{' || ch === '}' || ch === '(' || ch === ')' || ch === ',' || ch === ':' ||
        ch === '[' || ch === ']' || ch === '!' || ch === '@') {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] === ' ') {
        cleaned = cleaned.slice(0, -1);
      }
      cleaned += ch;
      if (ch === ',') cleaned += ' ';
      continue;
    }

    cleaned += ch;
  }

  // Compact operators
  cleaned = cleaned.replace(/:\s+/g, ':');
  cleaned = cleaned.replace(/\s+:/g, ':');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}

function highlightGraphQL(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    // Comments
    .replace(/(#[^\n]*)/g, '<span class="text-slate-500 italic">$1</span>')
    // Block strings
    .replace(/(""{3}[\s\S]*?""{3})/g, '<span class="text-green-400">$1</span>')
    // Strings
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
    // GraphQL keywords
    .replace(/\b(query|mutation|subscription|fragment|on|implements|interface|union|enum|input|type|schema|scalar|extend|directive|repeatable)\b/g,
      '<span class="text-purple-400">$1</span>')
    // Field arguments / built-ins
    .replace(/\b(true|false|null)\b/g, '<span class="text-amber-400">$1</span>')
    // Directives (@include, @skip, @deprecated)
    .replace(/(@\w+)/g, '<span class="text-cyan-400">$1</span>')
    // Variables ($name)
    .replace(/(\$\w+)/g, '<span class="text-orange-400">$1</span>')
    // Numbers
    .replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="text-amber-400">$1</span>')
    // Punctuation (braces, parens)
    .replace(/([{}\[\]()])/g, '<span class="text-slate-400">$1</span>');
}

export default function GraphQLFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(false);

  const format = useCallback(() => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please enter a GraphQL query to format.');
      setOutput('');
      setIsFormatted(false);
      return;
    }
    try {
      const formatted = formatGraphQL(trimmed);
      setOutput(formatted);
      setIsFormatted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Formatting error: ${message}`);
      setOutput('');
      setIsFormatted(false);
    }
  }, [input]);

  const minify = useCallback(() => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please enter a GraphQL query to minify.');
      setOutput('');
      setIsFormatted(false);
      return;
    }
    try {
      const minified = minifyGraphQL(trimmed);
      setOutput(minified);
      setIsFormatted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Minify error: ${message}`);
      setOutput('');
      setIsFormatted(false);
    }
  }, [input]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const clear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setIsFormatted(false);
  }, []);

  return (
    <ToolLayout
      title="GraphQL Formatter"
      description="Format, minify, and prettify GraphQL queries with syntax highlighting. Handles queries, mutations, subscriptions, fragments, variables, and directives."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">Input</label>
          <textarea
            className="input-field flex-1 min-h-[400px] font-mono text-sm resize-y"
            placeholder={`query GetUser($id: ID!) {\n  user(id: $id) {\n    name\n    email\n    posts {\n      title\n    }\n  }\n}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={format} className="btn-primary flex items-center gap-1.5 text-sm">
              <Maximize2 className="w-4 h-4" />
              Format
            </button>
            <button onClick={minify} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Minimize2 className="w-4 h-4" />
              Minify
            </button>
            <button onClick={clear} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">Output</label>
          {error ? (
            <div className="card border-red-500/30 bg-red-500/5 flex-1 min-h-[400px]">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          ) : isFormatted ? (
            <pre
              className="card flex-1 min-h-[400px] overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightGraphQL(output) }}
            />
          ) : (
            <div className="card flex-1 min-h-[400px] flex items-center justify-center">
              <p className="text-slate-500 text-sm">Formatted GraphQL will appear here</p>
            </div>
          )}
          <button
            onClick={copyOutput}
            disabled={!output}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}

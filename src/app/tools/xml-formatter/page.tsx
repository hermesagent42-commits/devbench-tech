'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Minimize2, Maximize2, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

function formatXML(xml: string, indentSize: number = 2): { result: string; error: string | null } {
  try {
    // Remove XML declaration for parsing
    const hasDeclaration = /^\s*<\?xml/.test(xml);
    const declarationMatch = xml.match(/<\?xml[^?]*\?>/);
    const declaration = declarationMatch ? declarationMatch[0] : null;

    // Parse using DOMParser
    const parser = new DOMParser();
    const cleanXML = declaration ? xml.replace(declaration, '').trim() : xml.trim();

    // Handle empty input
    if (!cleanXML) return { result: '', error: null };

    const doc = parser.parseFromString(cleanXML, 'text/xml');

    // Check for parser errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const errorText = parseError.textContent || 'XML parsing error';
      // Extract useful error message
      const match = errorText.match(/error on line \d+ at column \d+: (.*)/i);
      const message = match ? match[1] : errorText.replace(/This page contains[\s\S]*/, '').trim();
      return { result: '', error: message };
    }

    // Format the XML with proper indentation
    const serializer = new XMLSerializer();
    const raw = serializer.serializeToString(doc);
    const formatted = indentXML(raw, indentSize);

    // Prepend declaration if it existed
    const finalResult = declaration ? `${declaration}\n${formatted}` : formatted;

    return { result: finalResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return { result: '', error: message };
  }
}

function indentXML(xml: string, indentSize: number): string {
  const indent = ' '.repeat(indentSize);
  let formatted = '';
  let depth = 0;
  let i = 0;
  const len = xml.length;

  // Tokenize: tags, text content, comments, CDATA
  const tokens: { type: 'opening' | 'closing' | 'self-closing' | 'text' | 'comment' | 'cdata' | 'declaration' | 'doctype'; raw: string }[] = [];

  while (i < len) {
    const ch = xml[i];

    // Skip whitespace between tokens
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      i++;
      continue;
    }

    if (ch === '<') {
      // Check for comment <!-- ... -->
      if (xml.slice(i, i + 4) === '<!--') {
        const end = xml.indexOf('-->', i + 4);
        if (end === -1) {
          tokens.push({ type: 'text', raw: xml.slice(i) });
          break;
        }
        tokens.push({ type: 'comment', raw: xml.slice(i, end + 3) });
        i = end + 3;
        continue;
      }

      // Check for CDATA <![CDATA[ ... ]]>
      if (xml.slice(i, i + 9) === '<![CDATA[') {
        const end = xml.indexOf(']]>', i + 9);
        if (end === -1) {
          tokens.push({ type: 'text', raw: xml.slice(i) });
          break;
        }
        tokens.push({ type: 'cdata', raw: xml.slice(i, end + 3) });
        i = end + 3;
        continue;
      }

      // Check for declaration <? ... ?>
      if (xml[i + 1] === '?') {
        const end = xml.indexOf('?>', i + 2);
        if (end === -1) {
          tokens.push({ type: 'text', raw: xml.slice(i) });
          break;
        }
        tokens.push({ type: 'declaration', raw: xml.slice(i, end + 2) });
        i = end + 2;
        continue;
      }

      // Check for DOCTYPE <!DOCTYPE ... >
      if (xml.slice(i, i + 9).toUpperCase() === '<!DOCTYPE') {
        let j = i + 9;
        let depth2 = 0;
        while (j < len) {
          if (xml[j] === '[') depth2++;
          if (xml[j] === ']') depth2--;
          if (xml[j] === '>' && depth2 <= 0) {
            j++;
            break;
          }
          j++;
        }
        tokens.push({ type: 'doctype', raw: xml.slice(i, j) });
        i = j;
        continue;
      }

      // Check for closing tag </xxx>
      if (xml[i + 1] === '/') {
        const end = xml.indexOf('>', i + 2);
        if (end === -1) {
          tokens.push({ type: 'text', raw: xml.slice(i) });
          break;
        }
        tokens.push({ type: 'closing', raw: xml.slice(i, end + 1) });
        i = end + 1;
        continue;
      }

      // Opening or self-closing tag
      const end = xml.indexOf('>', i + 1);
      if (end === -1) {
        tokens.push({ type: 'text', raw: xml.slice(i) });
        break;
      }
      const tag = xml.slice(i, end + 1);
      if (tag.endsWith('/>')) {
        tokens.push({ type: 'self-closing', raw: tag });
      } else {
        tokens.push({ type: 'opening', raw: tag });
      }
      i = end + 1;
      continue;
    }

    // Text content
    let j = i;
    while (j < len && xml[j] !== '<') {
      j++;
    }
    const text = xml.slice(i, j).trim();
    if (text) {
      tokens.push({ type: 'text', raw: text });
    }
    i = j;
  }

  // Format with indentation
  let prevType = '';
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    const nextToken = tokens[t + 1];

    switch (token.type) {
      case 'declaration':
      case 'doctype':
        formatted += `${token.raw}\n`;
        break;
      case 'comment':
        formatted += `${indent.repeat(depth)}${token.raw}\n`;
        break;
      case 'cdata':
        formatted += `${indent.repeat(depth)}${token.raw}\n`;
        break;
      case 'opening':
        if (prevType === 'opening' || prevType === 'self-closing') {
          formatted += `\n${indent.repeat(depth)}${token.raw}`;
        } else if (prevType === 'closing') {
          formatted += `\n${indent.repeat(depth)}${token.raw}`;
        } else if (prevType === 'text') {
          formatted += `\n${indent.repeat(depth)}${token.raw}`;
        } else {
          formatted += `${indent.repeat(depth)}${token.raw}`;
        }
        // Check if next token is text (inline content)
        if (nextToken?.type === 'text') {
          // Keep inline - don't add newline
        } else {
          depth++;
        }
        break;
      case 'self-closing':
        formatted += `${indent.repeat(depth)}${token.raw}\n`;
        break;
      case 'text':
        formatted += token.raw;
        break;
      case 'closing':
        // Decrease depth before closing tag (unless it was inline text)
        if (prevType !== 'text') {
          depth = Math.max(0, depth - 1);
          formatted += `${indent.repeat(depth)}${token.raw}\n`;
        } else {
          depth = Math.max(0, depth - 1);
          formatted += `${token.raw}\n`;
        }
        break;
    }
    prevType = token.type;
  }

  return formatted.trim();
}

function minifyXML(xml: string): { result: string; error: string | null } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const errorText = parseError.textContent || 'XML parsing error';
      const match = errorText.match(/error on line \d+ at column \d+: (.*)/i);
      const message = match ? match[1] : errorText.replace(/This page contains[\s\S]*/, '').trim();
      return { result: '', error: message };
    }

    // Strip whitespace using serializer and regex
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);

    // Remove whitespace between tags and trim text nodes
    // Keep space in text content but collapse
    const minified = serialized
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { result: minified, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { result: '', error: message };
  }
}

function highlightXML(xml: string): string {
  const escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    // Comments
    .replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="text-slate-600 italic">$1</span>'
    )
    // CDATA sections
    .replace(
      /(&lt;!\[CDATA\[[\s\S]*?\]\]&gt;)/g,
      '<span class="text-slate-500">$1</span>'
    )
    // XML declarations and processing instructions
    .replace(
      /(&lt;\?[^?]*\?&gt;)/g,
      '<span class="text-slate-500">$1</span>'
    )
    // DOCTYPE
    .replace(
      /(&lt;!DOCTYPE[\s\S]*?&gt;)/gi,
      '<span class="text-slate-500 font-bold">$1</span>'
    )
    // Tag names (opening and self-closing)
    .replace(
      /&lt;(\/?)([a-zA-Z_][\w.-]*)/g,
      '&lt;<span class="text-brand-400">$1</span><span class="text-brand-400 font-semibold">$2</span>'
    )
    // Attribute names
    .replace(
      /\s([\w-]+)(?=\s*=\s*["'])/g,
      ' <span class="text-amber-400">$1</span>'
    )
    // Attribute values
    .replace(
      /=\s*(&quot;|&#39;)([^"']*?)(\1)/g,
      '=<span class="text-green-400">$1$2$3</span>'
    )
    // Closing angle brackets that remain
    .replace(
      /&gt;/g,
      '<span class="text-brand-400">&gt;</span>'
    );
}

function getXMLLineCount(xml: string): number {
  return xml ? xml.split('\n').length : 0;
}

function getXMLSize(xml: string): string {
  const bytes = new Blob([xml]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function XmlFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(false);
  const [indentSize, setIndentSize] = useState(2);

  const format = useCallback(() => {
    setError(null);
    const { result, error: err } = formatXML(input, indentSize);
    if (err) {
      setError(err);
      setOutput('');
      setIsFormatted(false);
    } else {
      setOutput(result);
      setIsFormatted(true);
    }
  }, [input, indentSize]);

  const minify = useCallback(() => {
    setError(null);
    const { result, error: err } = minifyXML(input);
    if (err) {
      setError(err);
      setOutput('');
      setIsFormatted(false);
    } else {
      setOutput(result);
      setIsFormatted(true);
    }
  }, [input]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const copyInput = useCallback(() => {
    if (!input) return;
    navigator.clipboard.writeText(input).then(
      () => toast.success('Input copied!'),
      () => toast.error('Failed to copy')
    );
  }, [input]);

  const clear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setIsFormatted(false);
  }, []);

  const loadSample = useCallback(() => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
  <book category="fiction">
    <title lang="en">The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <year>1925</year>
    <price currency="USD">12.99</price>
  </book>
  <book category="non-fiction">
    <title lang="en">Sapiens: A Brief History of Humankind</title>
    <author>Yuval Noah Harari</author>
    <year>2011</year>
    <price currency="USD">18.99</price>
  </book>
  <book category="fiction">
    <title lang="es">Cien años de soledad</title>
    <author>Gabriel García Márquez</author>
    <year>1967</year>
    <price currency="USD">15.99</price>
  </book>
</bookstore>`;
    setInput(sample);
    setOutput('');
    setError(null);
    setIsFormatted(false);
  }, []);

  const inputLines = getXMLLineCount(input);
  const inputSize = input ? getXMLSize(input) : null;
  const outputLines = output ? getXMLLineCount(output) : null;
  const outputSize = output ? getXMLSize(output) : null;

  return (
    <ToolLayout
      title="XML Formatter"
      description="Format, minify, and validate XML with syntax highlighting. Pretty-print minified XML or compress it for production — all client-side."
    >
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Indent:</span>
          {[2, 4, 8].map((size) => (
            <button
              key={size}
              onClick={() => setIndentSize(size)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                indentSize === size
                  ? 'bg-brand-500/30 text-brand-300 border border-brand-500/40'
                  : 'bg-slate-700/40 text-slate-400 hover:text-slate-300 border border-transparent'
              }`}
            >
              {size} spaces
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-slate-700" />
        <button onClick={loadSample} className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5" />
          Load sample XML
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Input</label>
            {inputSize && (
              <span className="text-xs text-slate-500">
                {inputLines} lines · {inputSize}
              </span>
            )}
          </div>
          <textarea
            className="input-field flex-1 min-h-[420px] font-mono text-sm resize-y"
            placeholder={`Paste your XML here...

<?xml version="1.0"?>
<root>
  <item id="1">Hello World</item>
</root>`}
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
            <button onClick={copyInput} disabled={!input} className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Copy className="w-4 h-4" />
              Copy Input
            </button>
            <button onClick={clear} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Output</label>
            {outputSize && (
              <span className="text-xs text-slate-500">
                {outputLines} lines · {outputSize}
              </span>
            )}
          </div>
          {error ? (
            <div className="card border-red-500/30 bg-red-500/5 flex-1 min-h-[420px]">
              <p className="text-red-400 font-mono text-sm whitespace-pre-wrap">{error}</p>
            </div>
          ) : isFormatted ? (
            <pre
              className="card flex-1 min-h-[420px] overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightXML(output) }}
            />
          ) : (
            <div className="card flex-1 min-h-[420px] flex items-center justify-center">
              <p className="text-slate-500 text-sm text-center">
                Formatted XML will appear here.
                <br />
                <span className="text-xs text-slate-600">Format or minify your XML to see the result.</span>
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyOutput}
              disabled={!output}
              className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy Output
            </button>
          </div>
        </div>
      </div>

      {/* Usage tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-brand-400" />
          How to use the XML Formatter
        </h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
          <li><strong className="text-slate-300">Format:</strong> Pretty-prints XML with configurable indentation (2, 4, or 8 spaces). Collapsed inline elements are expanded for readability.</li>
          <li><strong className="text-slate-300">Minify:</strong> Compresses XML by removing all unnecessary whitespace — great for production deployment or reducing file size.</li>
          <li><strong className="text-slate-300">Validation:</strong> Uses the browser&apos;s native XML parser. Invalid XML is caught immediately with a descriptive error message.</li>
          <li><strong className="text-slate-300">Syntax Highlighting:</strong> Tags, attributes, values, comments, CDATA sections, and declarations are all color-coded for easy reading.</li>
          <li><strong className="text-slate-300">Privacy:</strong> Everything runs in your browser — your XML data never leaves your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}

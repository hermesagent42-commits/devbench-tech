'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, ArrowRightLeft, FileJson, FileCode, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'json-to-xml' | 'xml-to-json';

interface ConversionResult {
  output: string;
  error: string | null;
}

// ── JSON → XML Converter ──────────────────────────────────────────────────

function jsonToXml(obj: unknown, rootName = 'root', indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (obj === null || obj === undefined) {
    return `${pad}<${rootName} />`;
  }

  if (typeof obj === 'string') {
    const needsCdata = /[<>&]/.test(obj);
    if (needsCdata) {
      return `${pad}<${rootName}><![CDATA[${obj}]]></${rootName}>`;
    }
    return `${pad}<${rootName}>${escapeXml(obj)}</${rootName}>`;
  }

  if (typeof obj === 'number') {
    return `${pad}<${rootName}>${obj}</${rootName}>`;
  }

  if (typeof obj === 'boolean') {
    return `${pad}<${rootName}>${obj}</${rootName}>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `${pad}<${rootName} />`;
    }
    const singularName = rootName.replace(/s$/, '') || 'item';
    const lines = obj.map((item) => jsonToXml(item, singularName, indent));
    return lines.join('\n');
  }

  if (typeof obj === 'object') {
    const objRecord = obj as Record<string, unknown>;
    const keys = Object.keys(objRecord);
    // If object has @attributes key, handle it as XML attributes
    const attrs = objRecord['@attributes'] as Record<string, string> | undefined;
    const attrStr = attrs
      ? ' ' + Object.entries(attrs)
          .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
          .join(' ')
      : '';

    const childKeys = keys.filter((k) => k !== '@attributes');

    if (childKeys.length === 0) {
      return `${pad}<${rootName}${attrStr} />`;
    }

    // If the only child is #text, render as text content
    if (childKeys.length === 1 && childKeys[0] === '#text') {
      return `${pad}<${rootName}${attrStr}>${escapeXml(String(objRecord['#text']))}</${rootName}>`;
    }

    const childLines = childKeys.map((key) => {
      const value = objRecord[key];
      return jsonToXml(value, key, indent + 1);
    });

    return `${pad}<${rootName}${attrStr}>\n${childLines.join('\n')}\n${pad}</${rootName}>`;
  }

  return `${pad}<${rootName}>${String(obj)}</${rootName}>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

// ── XML → JSON Parser ─────────────────────────────────────────────────────

interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
  cdata: string;
}

class XmlParser {
  private pos = 0;
  private xml: string;

  constructor(xml: string) {
    this.xml = xml.trim();
  }

  parse(): XmlNode[] {
    const nodes: XmlNode[] = [];
    this.skipWhitespace();
    while (this.pos < this.xml.length) {
      if (this.xml[this.pos] === '<') {
        if (this.xml.startsWith('<?', this.pos) || this.xml.startsWith('<!', this.pos)) {
          this.skipDeclaration();
          continue;
        }
        if (this.xml.startsWith('</', this.pos)) {
          break;
        }
        const node = this.parseElement();
        if (node) nodes.push(node);
      } else {
        this.pos++;
      }
    }
    return nodes;
  }

  private parseElement(): XmlNode | null {
    this.skipWhitespace();
    if (this.pos >= this.xml.length || this.xml[this.pos] !== '<') return null;

    this.pos++; // skip <

    // Read tag name
    let tag = '';
    while (this.pos < this.xml.length && /[\w:.-]/.test(this.xml[this.pos])) {
      tag += this.xml[this.pos];
      this.pos++;
    }

    if (!tag) return null;

    // Read attributes
    const attributes: Record<string, string> = {};
    this.skipWhitespace();
    while (this.pos < this.xml.length && this.xml[this.pos] !== '>' && this.xml[this.pos] !== '/') {
      let attrName = '';
      while (this.pos < this.xml.length && /[\w:.-]/.test(this.xml[this.pos])) {
        attrName += this.xml[this.pos];
        this.pos++;
      }
      if (attrName) {
        this.skipWhitespace();
        if (this.xml[this.pos] === '=') {
          this.pos++;
          this.skipWhitespace();
          const quote = this.xml[this.pos];
          if (quote === '"' || quote === "'") {
            this.pos++;
            let attrValue = '';
            while (this.pos < this.xml.length && this.xml[this.pos] !== quote) {
              attrValue += this.xml[this.pos];
              this.pos++;
            }
            this.pos++; // skip closing quote
            attributes[attrName] = unescapeXml(attrValue);
          }
        }
      }
      this.skipWhitespace();
    }

    // Self-closing tag
    if (this.xml[this.pos] === '/') {
      this.pos += 2; // skip />
      return { tag, attributes, children: [], text: '', cdata: '' };
    }

    this.pos++; // skip >

    // Read children
    let text = '';
    let cdata = '';
    const children: XmlNode[] = [];
    let textCollected = false;

    while (this.pos < this.xml.length) {
      if (this.xml.startsWith('</', this.pos)) {
        this.pos += 2;
        // Read closing tag name (skip for robustness)
        while (this.pos < this.xml.length && this.xml[this.pos] !== '>') this.pos++;
        this.pos++; // skip >
        // Collapse text nodes
        if (children.length === 0 && textCollected) {
          return { tag, attributes, children: [], text: text.trim(), cdata };
        }
        return { tag, attributes, children, text: text.trim(), cdata };
      }
      if (this.xml.startsWith('<![CDATA[', this.pos)) {
        this.pos += 9;
        let cdataContent = '';
        while (this.pos < this.xml.length && !this.xml.startsWith(']]>', this.pos)) {
          cdataContent += this.xml[this.pos];
          this.pos++;
        }
        this.pos += 3; // skip ]]>
        cdata = cdataContent;
        textCollected = true;
        continue;
      }
      if (this.xml[this.pos] === '<') {
        if (this.xml.startsWith('<?', this.pos) || this.xml.startsWith('<!', this.pos)) {
          this.skipDeclaration();
          continue;
        }
        const child = this.parseElement();
        if (child) children.push(child);
      } else {
        let txt = '';
        while (this.pos < this.xml.length && this.xml[this.pos] !== '<') {
          txt += this.xml[this.pos];
          this.pos++;
        }
        const trimmed = txt.trim();
        if (trimmed) {
          text += (text ? ' ' : '') + trimmed;
          textCollected = true;
        }
      }
    }

    return { tag, attributes, children, text: text.trim(), cdata };
  }

  private skipDeclaration(): void {
    while (this.pos < this.xml.length && this.xml[this.pos] !== '>') this.pos++;
    this.pos++; // skip >
  }

  private skipWhitespace(): void {
    while (this.pos < this.xml.length && /\s/.test(this.xml[this.pos])) this.pos++;
  }
}

function xmlNodeToJson(nodes: XmlNode[], options: { arrayThreshold?: number } = {}): Record<string, unknown> | Record<string, unknown>[] | string {
  if (nodes.length === 0) return {};

  // If root is single node, return its content directly
  if (nodes.length === 1) {
    return singleNodeToJson(nodes[0], options);
  }

  const result: Record<string, unknown> = {};
  for (const node of nodes) {
    const key = node.tag;
    const value = singleNodeToJson(node, options);
    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function singleNodeToJson(node: XmlNode, options: { arrayThreshold?: number }): Record<string, unknown> | string {
  const obj: Record<string, unknown> = {};

  // Attributes
  if (Object.keys(node.attributes).length > 0) {
    obj['@attributes'] = node.attributes;
  }

  // CDATA
  if (node.cdata) {
    obj['#text'] = node.cdata;
    return obj;
  }

  // Text content
  if (node.text && node.children.length === 0) {
    if (Object.keys(obj).length > 0) {
      obj['#text'] = node.text;
      return obj;
    }
    return node.text;
  }

  // Children
  if (node.children.length > 0) {
    const childCounts = new Map<string, number>();
    for (const child of node.children) {
      childCounts.set(child.tag, (childCounts.get(child.tag) || 0) + 1);
    }

    for (const child of node.children) {
      const key = child.tag;
      const count = childCounts.get(key) || 1;
      const value = singleNodeToJson(child, options);

      if (key in obj) {
        const existing = obj[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          obj[key] = [existing, value];
        }
      } else {
        // If multiple children with same tag, always use array
        if (count > 1) {
          obj[key] = [value];
        } else {
          obj[key] = value;
        }
      }
    }
  }

  // Empty element with attributes only
  if (Object.keys(obj).length === 0) {
    return '';
  }

  return obj;
}

function xmlToJson(xmlString: string): { json: Record<string, unknown> | Record<string, unknown>[] | string; jsonString: string } {
  const parser = new XmlParser(xmlString);
  const nodes = parser.parse();
  const json = xmlNodeToJson(nodes);
  const jsonString = JSON.stringify(json, null, 2);
  return { json, jsonString };
}

// ── Samples ────────────────────────────────────────────────────────────────

const JSON_SAMPLE = `{
  "bookstore": {
    "@attributes": {
      "name": "City Books"
    },
    "book": [
      {
        "@attributes": {
          "category": "fiction",
          "bestseller": "true"
        },
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "price": 12.99,
        "inStock": true
      },
      {
        "@attributes": {
          "category": "non-fiction"
        },
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "price": 15.99,
        "inStock": false
      },
      {
        "title": "Special <chars> & Entities",
        "author": "Test Author",
        "price": 9.99
      }
    ]
  }
}`;

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore name="City Books">
  <book category="fiction" bestseller="true">
    <title>The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <price>12.99</price>
    <inStock>true</inStock>
  </book>
  <book category="non-fiction">
    <title>Sapiens</title>
    <author>Yuval Noah Harari</author>
    <price>15.99</price>
    <inStock>false</inStock>
  </book>
  <book>
    <title><![CDATA[Special <chars> & Entities]]></title>
    <author>Test Author</author>
    <price>9.99</price>
  </book>
</bookstore>`;

// ── Component ──────────────────────────────────────────────────────────────

export default function JsonXmlConverterPage() {
  const [mode, setMode] = useState<Mode>('json-to-xml');
  const [input, setInput] = useState(JSON_SAMPLE);
  const [rootName, setRootName] = useState('root');
  const [copied, setCopied] = useState(false);
  const [indentation, setIndentation] = useState(2);

  const result = useMemo((): ConversionResult => {
    if (!input.trim()) {
      return { output: '', error: null };
    }

    if (mode === 'json-to-xml') {
      try {
        const parsed = JSON.parse(input.trim());
        const xmlLines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];

        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          // Object with single root key
          const keys = Object.keys(parsed);
          if (keys.length === 1) {
            const rootKey = keys[0];
            xmlLines.push(jsonToXml(parsed[rootKey], rootKey));
          } else {
            xmlLines.push(jsonToXml(parsed, rootName));
          }
        } else if (Array.isArray(parsed)) {
          xmlLines.push(jsonToXml(parsed, rootName));
        } else {
          xmlLines.push(jsonToXml(parsed, rootName));
        }

        return { output: xmlLines.join('\n'), error: null };
      } catch (e) {
        if (e instanceof SyntaxError) {
          return { output: '', error: `Invalid JSON: ${e.message}` };
        }
        return { output: '', error: 'Conversion error. Check your JSON structure.' };
      }
    }

    // XML → JSON
    try {
      const { jsonString } = xmlToJson(input.trim());
      return { output: jsonString, error: null };
    } catch {
      return { output: '', error: 'Invalid XML. Check for well-formed syntax (matching tags, proper structure).' };
    }
  }, [input, mode, rootName]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [result.output]);

  const handleDownload = useCallback(() => {
    if (!result.output) return;
    const ext = mode === 'json-to-xml' ? 'xml' : 'json';
    const mime = mode === 'json-to-xml' ? 'application/xml' : 'application/json';
    const blob = new Blob([result.output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded output.${ext}`);
  }, [result.output, mode]);

  const swapMode = useCallback(() => {
    const newMode: Mode = mode === 'json-to-xml' ? 'xml-to-json' : 'json-to-xml';
    setInput(newMode === 'xml-to-json' ? XML_SAMPLE : JSON_SAMPLE);
    setMode(newMode);
  }, [mode]);

  const loadSample = useCallback(() => {
    setInput(mode === 'json-to-xml' ? JSON_SAMPLE : XML_SAMPLE);
  }, [mode]);

  const isEmpty = !input.trim();

  return (
    <ToolLayout
      title="JSON ↔ XML Converter"
      description="Convert between JSON and XML formats bidirectionally. Supports XML attributes (@attributes), CDATA sections, self-closing tags, nested objects, and arrays — 100% client-side."
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => { setMode('json-to-xml'); setInput(JSON_SAMPLE); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-r border-slate-700/50 ${
              mode === 'json-to-xml' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" />
            JSON → XML
          </button>
          <button
            onClick={() => { setMode('xml-to-json'); setInput(XML_SAMPLE); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'xml-to-json' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            XML → JSON
          </button>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'json-to-xml' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Root:</label>
              <input
                type="text"
                value={rootName}
                onChange={(e) => setRootName(e.target.value || 'root')}
                className="w-20 px-2 py-1.5 rounded bg-surface border border-slate-700/50 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500/50"
              />
            </div>
          )}
          <button onClick={loadSample} className="text-xs text-slate-400 hover:text-brand-400 transition-colors">
            Load sample
          </button>
          <button
            onClick={swapMode}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors"
            title="Swap direction"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap
          </button>
        </div>
      </div>

      {/* Input + Output grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              {mode === 'json-to-xml' ? (
                <><FileJson className="w-4 h-4 text-brand-400" />Input JSON</>
              ) : (
                <><FileCode className="w-4 h-4 text-green-400" />Input XML</>
              )}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {input.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-80 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-600"
            placeholder={mode === 'json-to-xml' ? 'Paste JSON...' : 'Paste XML...'}
            spellCheck={false}
          />
          {result.error && (
            <div className="mt-3 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              {mode === 'json-to-xml' ? (
                <><FileCode className="w-4 h-4 text-green-400" />Output XML</>
              ) : (
                <><FileJson className="w-4 h-4 text-brand-400" />Output JSON</>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {result.output && (
                <>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-surface border border-transparent'
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-surface border border-transparent transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
          {isEmpty ? (
            <div className="w-full h-80 bg-surface border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Enter input to see output</p>
            </div>
          ) : result.error ? (
            <div className="w-full h-80 bg-surface border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Fix input errors to see output</p>
            </div>
          ) : (
            <pre className="w-full h-80 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre-wrap break-all">
              {result.output}
            </pre>
          )}
        </div>
      </div>

      {/* Usage tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-brand-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">JSON → XML</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Objects with one key become that root element</li>
            <li>• Use <code className="text-brand-400">@attributes</code> key for XML attributes</li>
            <li>• Arrays of objects use singularized tag names</li>
            <li>• Special chars auto-escaped or wrapped in CDATA</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">XML → JSON</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Attributes appear as <code className="text-green-400">@attributes</code> object</li>
            <li>• CDATA sections become <code className="text-green-400">#text</code> value</li>
            <li>• Repeated child elements become arrays</li>
            <li>• XML declaration and comments are stripped</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-purple-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Pro Tips</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Use <code className="text-purple-400">@attributes</code> for clean XML output with attributes instead of child elements</li>
            <li>• Set a custom root name when converting JSON arrays</li>
            <li>• Round-trip friendly: XML → JSON → XML preserves structure</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}

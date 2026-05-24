'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Code2, Layers, Eye, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  description: string;
  nested: string;
}

// ── CSS Nesting Expander ───────────────────────────────────────────────────

/**
 * A minimal CSS nesting expander that resolves nested rules into flat CSS.
 * Supports:
 *   - Direct nesting (child selectors)
 *   - & nesting (parent reference)
 *   - @nest rule (explicit nesting)
 *   - Nested @media / @supports / @container
 *   - Multiple nesting levels
 *
 * This uses a line-by-line parser, not a full CSS parser, so it's
 * intentionally simple and robust for the playground use case.
 */
function expandNesting(css: string): { expanded: string; warnings: string[] } {
  const warnings: string[] = [];
  const lines = css.split('\n');
  
  // Tokenize into blocks
  interface Block {
    parentSelector: string;
    content: string[];
    indent: number;
    isAtRule: boolean;
    atRulePrelude: string;
  }
  
  const result: string[] = [];
  let i = 0;
  
  function parseBlock(openLine: string, startIdx: number, parentSelector: string, baseIndent: number): number {
    const trimmed = openLine.trim();
    const isAtRule =
      trimmed.startsWith('@media') ||
      trimmed.startsWith('@supports') ||
      trimmed.startsWith('@container') ||
      trimmed.startsWith('@layer') ||
      trimmed.startsWith('@scope');
    
    // Determine selector for this block
    let selectorPrefix = '';
    let atRulePrelude = '';
    
    if (isAtRule) {
      atRulePrelude = trimmed;
    } else if (trimmed === '&' || trimmed.startsWith('& ') || trimmed.startsWith('&:')) {
      // & selector: replace & with parent
      if (trimmed === '&') {
        selectorPrefix = parentSelector;
      } else {
        selectorPrefix = trimmed.replace(/^&/, parentSelector);
      }
    } else if (trimmed.startsWith('@nest ')) {
      // @nest rule
      const inner = trimmed.replace(/^@nest\s+/, '');
      if (inner.includes('&')) {
        selectorPrefix = inner.replace(/&/g, parentSelector);
      } else {
        selectorPrefix = `${parentSelector} ${inner}`;
      }
    } else if (trimmed.startsWith(':')) {
      // Pseudo-class/element appended
      selectorPrefix = `${parentSelector}${trimmed}`;
    } else if (trimmed.startsWith('[')) {
      // Attribute selector
      selectorPrefix = `${parentSelector}${trimmed}`;
    } else if (trimmed.startsWith('>') || trimmed.startsWith('+') || trimmed.startsWith('~')) {
      // Combinator
      selectorPrefix = `${parentSelector} ${trimmed}`;
    } else if (trimmed === '') {
      // Empty line in body
      selectorPrefix = '';
    } else if (trimmed.startsWith('/*') || trimmed.startsWith('//')) {
      // Comment
      selectorPrefix = '';
    } else if (trimmed.endsWith(',')) {
      // Multiple selectors — keep nesting context
      const selectors = trimmed.replace(/,\s*$/, '').split(/,\s*/);
      selectorPrefix = selectors
        .map((s) => {
          s = s.trim();
          if (s === '&' || s.startsWith('& ')) return s.replace(/^&/, parentSelector);
          if (s.startsWith(':')) return `${parentSelector}${s}`;
          return `${parentSelector} ${s}`;
        })
        .join(', ');
    } else {
      // Direct descendant nesting or property (detect by checking for colon)
      // If it contains a colon and no curly brace, it might be a property, not a selector
      const hasColon = trimmed.includes(':');
      const hasCurly = trimmed.includes('{');
      
      if (hasColon && !hasCurly) {
        // Likely a property value — but we're looking at the opening line here
        // This means the trimmed starts the block, so it must look like a selector-ish thing
        // If we're here, treat as descendant
        selectorPrefix = `${parentSelector} ${trimmed}`;
      } else {
        selectorPrefix = `${parentSelector} ${trimmed}`;
      }
    }
    
    let idx = startIdx;
    const bodyLines: string[] = [];
    let blockDepth = 1;
    
    while (idx < lines.length && blockDepth > 0) {
      const line = lines[idx];
      
      // Count braces in this line (excluding the opening brace which we've already consumed)
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      blockDepth += opens - closes;
      
      if (blockDepth > 0) {
        bodyLines.push(line);
      }
      
      idx++;
    }
    
    // Process the body lines
    const bodyText = bodyLines.join('\n');
    
    if (isAtRule) {
      // For at-rules, wrap the nested content
      result.push(`${atRulePrelude} {`);
      
      // Process any nested rules inside the at-rule block
      // For simplicity, we re-enter the parser with the parentContext
      const innerLines = bodyLines.map((l) => l.trimEnd().replace(/^\s{0,2}/, ''));
      // Strip leading/trailing empty lines
      while (innerLines.length > 0 && innerLines[0].trim() === '') innerLines.shift();
      while (innerLines.length > 0 && innerLines[innerLines.length - 1].trim() === '') innerLines.pop();
      
      const innerCss = innerLines.join('\n');
      const innerExpanded = expandNesting(innerCss);
      const innerResult = innerExpanded.expanded
        .split('\n')
        .map((l) => (l.trim() ? `  ${l}` : ''))
        .join('\n');
      result.push(innerResult);
      result.push('}');
    } else if (selectorPrefix) {
      // Check body text for nested sub-blocks
      const subResult: string[] = [];
      let j = 0;
      const bodyArray = bodyLines;
      
      while (j < bodyArray.length) {
        const bline = bodyArray[j].trim();
        
        // Check if this line opens a nested block (ends with { and isn't just a property)
        if (bline.includes('{') && bline.indexOf(':') > bline.indexOf('{')) {
          // Starts with { before colon — likely a nested rule, not a property
          // Actually, a better heuristic: if the line contains '{' and has no ':' before it (or the '{' comes before ':'), it's a selector
          const colonIdx = bline.indexOf(':');
          const braceIdx = bline.indexOf('{');
          
          if (colonIdx === -1 || braceIdx < colonIdx) {
            // This is a nested selector block
            const nestedOpenLine = bodyArray[j];
            j = parseBlock(nestedOpenLine, j + 1, selectorPrefix, 0);
            continue;
          }
        }
        
        // Check for @nest in body
        if (bline.startsWith('@nest ')) {
          const rest = bline.replace(/^@nest\s+/, '');
          const semiIdx = rest.indexOf(';');
          const selector = semiIdx > 0 ? rest.substring(0, semiIdx) : rest;
          let propVal = semiIdx > 0 ? rest.substring(semiIdx + 1).trim() : '';
          
          let resolved: string;
          if (selector.includes('&')) {
            resolved = selector.replace(/&/g, selectorPrefix);
          } else {
            resolved = `${selectorPrefix} ${selector}`;
          }
          
          if (propVal && propVal.includes('{')) {
            // @nest with a block
            subResult.push(`${resolved} {`);
            const blockContent = propVal.substring(propVal.indexOf('{') + 1, propVal.lastIndexOf('}')).trim();
            subResult.push(`  ${blockContent}`);
            subResult.push('}');
          } else if (propVal) {
            // @nest selector { property }
            subResult.push(`${resolved} { ${propVal} }`);
          }
        } else {
          subResult.push(bodyArray[j]);
        }
        j++;
      }
      
      result.push(`${selectorPrefix} {`);
      result.push(subResult.join('\n'));
      result.push('}');
    }
    
    return idx;
  }
  
  // Main parse loop
  i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and comments at top level
    if (trimmed === '' || trimmed.startsWith('/*') || trimmed.startsWith('//')) {
      i++;
      continue;
    }
    
    // Check if this is a top-level rule (ends with {)
    if (trimmed.includes('{')) {
      const colonIdx = trimmed.indexOf(':');
      const braceIdx = trimmed.indexOf('{');
      
      // Heuristic: if colon comes before brace, it's probably a property (shouldn't happen at top level but be safe)
      if (colonIdx !== -1 && colonIdx < braceIdx) {
        result.push(line);
        i++;
      } else {
        // Top-level selector or at-rule
        i = parseBlock(line, i + 1, '', 0);
      }
    } else if (trimmed.includes('}')) {
      // Closing brace at top level — skip
      i++;
    } else {
      // Property or stray line at top level
      result.push(line);
      i++;
    }
  }
  
  return { expanded: result.join('\n'), warnings };
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'Component Card',
    description: 'Nested BEM-style card component',
    nested: `.card {
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;

  /* Direct child */
  & h2 {
    color: #e2e8f0;
    font-size: 1.25rem;
  }

  /* Descendant */
  & .card-body {
    margin-top: 16px;
    color: #94a3b8;
  }

  /* Pseudo-classes */
  &:hover {
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }

  &:focus-within {
    outline: 2px solid #3b82f6;
  }

  /* Nested media queries */
  @media (min-width: 768px) {
    padding: 32px;

    & h2 {
      font-size: 1.5rem;
    }
  }
}`,
  },
  {
    label: 'Button Variants',
    description: 'Button with multiple states and variants',
    nested: `.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  /* Primary variant */
  &.btn-primary {
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  /* Outline variant */
  &.btn-outline {
    background: transparent;
    border: 2px solid #3b82f6;
    color: #3b82f6;

    &:hover {
      background: #3b82f6;
      color: white;
    }
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  &.btn-sm {
    padding: 6px 12px;
    font-size: 0.875rem;
  }

  &.btn-lg {
    padding: 14px 28px;
    font-size: 1.125rem;
  }
}`,
  },
  {
    label: 'Layout & Grid',
    description: 'Page layout with nested grid areas',
    nested: `.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;

  & aside {
    background: #0f172a;
    padding: 24px;
  }

  & main {
    padding: 32px;

    & .hero {
      text-align: center;
      margin-bottom: 48px;

      & h1 {
        font-size: 2.5rem;
        background: linear-gradient(to right, #3b82f6, #8b5cf6);
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
      }
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;

    & aside {
      display: none;
    }
  }
}`,
  },
  {
    label: 'Form Fields',
    description: 'Form inputs with validation states',
    nested: `.form-group {
  margin-bottom: 20px;

  & label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #e2e8f0;
    margin-bottom: 6px;
  }

  & input,
  & textarea,
  & select {
    width: 100%;
    padding: 10px 14px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 0.938rem;

    &::placeholder {
      color: #64748b;
    }

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
  }

  /* Validation states */
  &.is-valid input {
    border-color: #22c55e;
  }

  &.is-invalid {
    & input {
      border-color: #ef4444;
    }

    & .feedback {
      color: #ef4444;
      font-size: 0.813rem;
      margin-top: 4px;
    }
  }
}`,
  },
  {
    label: 'Navigation',
    description: 'Nav bar with dropdown menus',
    nested: `nav.navbar {
  display: flex;
  align-items: center;
  background: #0f172a;
  padding: 0 24px;
  height: 64px;

  & .brand {
    font-size: 1.25rem;
    font-weight: 700;
    color: #3b82f6;
  }

  & .nav-links {
    display: flex;
    gap: 8px;
    margin-left: 48px;

    & a {
      color: #94a3b8;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        color: #e2e8f0;
        background: #1e293b;
      }

      &.active {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
    }
  }

  & .user-menu {
    margin-left: auto;
    position: relative;

    &:hover .dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    & .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);

      & a {
        display: block;
        padding: 10px 20px;
        color: #e2e8f0;

        &:hover {
          background: #1e293b;
        }
      }
    }
  }
}`,
  },
  {
    label: 'Typography Scale',
    description: 'Nested type scale with responsive adjustments',
    nested: `.prose {
  color: #cbd5e1;
  line-height: 1.75;

  & h1, & h2, & h3, & h4 {
    color: #f1f5f9;
    font-weight: 700;
    line-height: 1.3;
  }

  & h1 { font-size: 2.25rem; }
  & h2 { font-size: 1.75rem; }
  & h3 { font-size: 1.375rem; }
  & h4 { font-size: 1.125rem; }

  & p {
    margin-bottom: 1.25rem;
  }

  & a {
    color: #3b82f6;
    text-decoration: underline;

    &:hover {
      color: #60a5fa;
    }
  }

  & code {
    background: #1e293b;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.875em;
    font-family: 'Fira Code', monospace;
  }

  & pre {
    background: #0f172a;
    padding: 20px;
    border-radius: 8px;
    overflow-x: auto;

    & code {
      background: none;
      padding: 0;
    }
  }

  & blockquote {
    border-left: 3px solid #3b82f6;
    padding-left: 16px;
    color: #94a3b8;
    font-style: italic;
  }

  @media (max-width: 640px) {
    & h1 { font-size: 1.75rem; }
    & h2 { font-size: 1.375rem; }

    & pre {
      padding: 12px;
    }
  }
}`,
  },
  {
    label: '@nest Rules',
    description: 'Using @nest for explicit nesting',
    nested: `.parent {
  color: #e2e8f0;

  /* Direct child via @nest */
  @nest & > .child {
    color: #3b82f6;
  }

  /* Adjacent sibling via @nest */
  @nest & + .sibling {
    margin-top: 24px;
    border-top: 1px solid #334155;
    padding-top: 24px;
  }

  /* Conditional nesting */
  @nest .dark & {
    color: #f1f5f9;
    background: #0f172a;
  }
}`,
  },
  {
    label: 'Container Queries',
    description: '@container nested inside component styles',
    nested: `.product-grid {
  container-type: inline-size;
  container-name: product-grid;

  display: grid;
  gap: 24px;

  & .product-card {
    background: #1e293b;
    border-radius: 12px;
    overflow: hidden;

    & img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
    }

    & .info {
      padding: 16px;

      & h3 { font-size: 1rem; }
      & p { color: #94a3b8; font-size: 0.875rem; }
    }
  }

  /* 1 column on small containers */
  @container product-grid (max-width: 400px) {
    grid-template-columns: 1fr;
  }

  /* 2 columns */
  @container product-grid (min-width: 401px) and (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }

  /* 3+ columns */
  @container product-grid (min-width: 701px) {
    grid-template-columns: repeat(3, 1fr);
  }
}`,
  },
];

// ── Syntax Highlighting ────────────────────────────────────────────────────

function highlightCSS(code: string): string {
  return code
    // Comments
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 italic">$1</span>')
    // Properties (before colon at line start or after semicolon)
    .replace(/^(\s*)([a-z-]+)(\s*:)/gm, '$1<span class="text-cyan-400">$2</span>$3')
    // Values: colors (hex)
    .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-purple-400">$1</span>')
    // Values: numbers with units
    .replace(/(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|deg|s|ms|fr)\b/g, '<span class="text-amber-400">$1</span><span class="text-orange-400">$2</span>')
    // Values: bare numbers
    .replace(/(?<![0-9a-zA-Z.-])(\d+(?:\.\d+)?)(?![a-zA-Z%])/g, '<span class="text-amber-400">$1</span>')
    // Values: color functions
    .replace(/(rgba?|hsla?|hwb|lab|lch|oklch|oklab|color-mix|color)\(/g, '<span class="text-purple-400">$1</span>(')
    // Values: gradient functions
    .replace(/(linear-gradient|radial-gradient|conic-gradient)\(/g, '<span class="text-purple-400">$1</span>(')
    // Selectors: tags
    .replace(/(^|\{|,|})\s*([a-z]+)(?=\s*[{,:])/gm, '$1 <span class="text-emerald-400">$2</span>')
    // Selectors: classes
    .replace(/\.([a-zA-Z_-][\w-]*)/g, '.<span class="text-yellow-300">$1</span>')
    // Selectors: IDs
    .replace(/#([a-zA-Z_-][\w-]*)/g, '#<span class="text-orange-300">$1</span>')
    // Pseudo-classes/elements
    .replace(/::?([a-z-]+)(?=[\s,{\[(.:])/g, '<span class="text-pink-400">::$1</span>')
    // At-rules
    .replace(/@([a-z-]+)\b/g, '<span class="text-violet-400">@$1</span>')
    // Important
    .replace(/!important/g, '<span class="text-red-400">!important</span>')
    // Strings
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>')
    // & nesting
    .replace(/(?<!\w)&(?=[\s,:{.)\[])/g, '<span class="text-rose-400 font-semibold">&amp;</span>')
    // Braces and semicolons
    .replace(/([{};])/g, '<span class="text-slate-500">$1</span>');
}

function highlightLineNumbers(code: string): string {
  const lines = code.split('\n');
  return lines
    .map(
      (_, i) =>
        `<span class="text-slate-600 select-none text-right inline-block w-8 mr-4 flex-shrink-0">${i + 1}</span>`
    )
    .join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssNestingPlaygroundPage() {
  const [nestedCSS, setNestedCSS] = useState(PRESETS[0].nested);
  const [activePreset, setActivePreset] = useState(PRESETS[0].label);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const { expanded, warnings } = useMemo(() => expandNesting(nestedCSS), [nestedCSS]);

  const nestedHighlighted = useMemo(() => highlightCSS(nestedCSS), [nestedCSS]);
  const expandedHighlighted = useMemo(() => highlightCSS(expanded), [expanded]);

  const applyPreset = useCallback((preset: Preset) => {
    setNestedCSS(preset.nested);
    setActivePreset(preset.label);
  }, []);

  const resetToDefault = useCallback(() => {
    applyPreset(PRESETS[0]);
  }, [applyPreset]);

  const copyExpanded = useCallback(() => {
    navigator.clipboard.writeText(expanded).then(
      () => toast.success('Expanded CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [expanded]);

  const copyNested = useCallback(() => {
    navigator.clipboard.writeText(nestedCSS).then(
      () => toast.success('Nested CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [nestedCSS]);

  // Compute stats
  const stats = useMemo(() => {
    const nestedLines = nestedCSS.split('\n').filter((l) => l.trim()).length;
    const expandedLines = expanded.split('\n').filter((l) => l.trim()).length;
    const nestDepth = Math.max(
      ...nestedCSS.split('\n').map((l) => (l.match(/^(\s*)/)?.[1]?.length || 0) / 2),
      0
    );
    return { nestedLines, expandedLines, nestDepth };
  }, [nestedCSS, expanded]);

  return (
    <ToolLayout
      title="CSS Nesting Playground"
      description="Write native CSS nesting and see the expanded output — now Baseline across all browsers. No preprocessor needed: nest selectors, use & for parent references, write @media queries inside selectors, and watch the browser-ready CSS unfold in real-time."
    >
      {/* Presets */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === preset.label
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-surface-lighter text-slate-400 hover:text-slate-200 hover:bg-surface-light border border-slate-700/50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-surface-lighter border border-slate-700/50 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-brand-400" />
          <span>Nesting depth: <strong className="text-slate-200">{stats.nestDepth}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Nested: <strong className="text-slate-200">{stats.nestedLines}</strong> lines</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Expanded: <strong className="text-slate-200">{stats.expandedLines}</strong> lines</span>
        </div>
      </div>

      {/* Main split panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Nested Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Nested CSS (write here)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefault}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                title="Reset to default preset"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={copyNested}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                title="Copy nested CSS"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          <textarea
            value={nestedCSS}
            onChange={(e) => {
              setNestedCSS(e.target.value);
              setActivePreset('Custom');
            }}
            className="w-full h-[520px] p-4 font-mono text-sm bg-slate-950 border border-slate-700/50 rounded-xl text-slate-300 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 leading-relaxed"
            spellCheck={false}
            placeholder="Write nested CSS here..."
          />
        </div>

        {/* Right: Expanded Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Expanded CSS (browser-ready)
            </label>
            <button
              onClick={copyExpanded}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              title="Copy expanded CSS"
            >
              <Copy className="w-3 h-3" />
              Copy CSS
            </button>
          </div>
          <pre className="w-full h-[520px] p-4 font-mono text-sm bg-slate-950 border border-slate-700/50 rounded-xl text-slate-300 overflow-auto leading-relaxed">
            <code
              dangerouslySetInnerHTML={{ __html: expandedHighlighted }}
            />
          </pre>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-300 font-medium mb-1">Parser Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400/80">{w}</p>
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-brand-400">CSS Nesting Is Now Baseline</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Native CSS nesting landed in Chrome 120 (Dec 2023), Firefox 117 (Aug 2023), and Safari 17.2 (Dec 2023). 
              As of 2026, it&apos;s <strong className="text-slate-200">Baseline across all browsers</strong> — you can drop Sass/SCSS for nesting and use it directly in your stylesheets.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-500">
              <span><code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">&</code> — parent selector reference</span>
              <span><code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">@nest</code> — explicit nesting</span>
              <span><code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">@media</code> — nested queries</span>
              <span><code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">@container</code> — nested container queries</span>
              <span><code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">@supports</code> — nested feature queries</span>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

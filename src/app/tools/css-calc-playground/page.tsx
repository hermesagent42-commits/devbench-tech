'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Plus, Trash2, Play, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Token {
  type: 'number' | 'unit' | 'operator' | 'function' | 'separator' | 'variable';
  value: string;
}

interface Preset {
  name: string;
  desc: string;
  expression: string;
  result?: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Fluid Typography',
    desc: 'Scale text between 16px and 24px based on viewport',
    expression: 'clamp(16px, 2vw + 0.5rem, 24px)',
  },
  {
    name: 'Centered Max Width',
    desc: 'Full width minus padding, capped at 1200px',
    expression: 'min(100% - 2rem, 1200px)',
  },
  {
    name: 'Hero Height',
    desc: 'At least 400px, or full viewport minus nav',
    expression: 'max(400px, 100vh - 64px)',
  },
  {
    name: 'Sidebar Width',
    desc: 'Fixed 280px but never wider than 30% of parent',
    expression: 'min(280px, 30%)',
  },
  {
    name: 'Padding with Safe Area',
    desc: '16px minimum, bigger on notched devices',
    expression: 'max(16px, env(safe-area-inset-top))',
  },
  {
    name: 'Grid Column Sizing',
    desc: 'Auto-fill columns between 250px and 1fr',
    expression: 'minmax(250px, 1fr)',
  },
  {
    name: 'Complex Nested',
    desc: 'Nested calc with multiplication and addition',
    expression: 'calc((100% - 2rem) / 3 - 1rem)',
  },
  {
    name: 'Font Size with DPI',
    desc: 'Scale base font size with pixel density',
    expression: 'calc(1rem * (1 + (var(--dpi, 1) - 1) * 0.5))',
  },
];

const CSS_UNITS = ['px', 'em', 'rem', 'vw', 'vh', 'vmin', 'vmax', '%', 'ch', 'ex', 'cm', 'mm', 'in', 'pt', 'pc', 'fr', 'svh', 'svw', 'lvh', 'lvw', 'dvh', 'dvw'] as const;

const CSS_FUNCTIONS = [
  { name: 'calc', desc: 'Perform mathematical calculations', syntax: 'calc(expr)' },
  { name: 'min', desc: 'Use the smallest value from a list', syntax: 'min(val1, val2, ...)' },
  { name: 'max', desc: 'Use the largest value from a list', syntax: 'max(val1, val2, ...)' },
  { name: 'clamp', desc: 'Clamp between min, preferred, and max', syntax: 'clamp(min, preferred, max)' },
  { name: 'minmax', desc: 'Define min and max size for grid tracks', syntax: 'minmax(min, max)' },
  { name: 'abs', desc: 'Absolute value (Baseline 2025)', syntax: 'abs(value)' },
  { name: 'sign', desc: 'Sign of value: -1, 0, or 1 (Baseline 2025)', syntax: 'sign(value)' },
  { name: 'round', desc: 'Round value (Baseline 2025)', syntax: 'round(strategy, value, interval)' },
  { name: 'mod', desc: 'Modulus (remainder) (Baseline 2025)', syntax: 'mod(dividend, divisor)' },
  { name: 'rem', desc: 'Remainder, same sign as dividend (Baseline 2025)', syntax: 'rem(dividend, divisor)' },
  { name: 'pow', desc: 'Raise to power (Baseline 2025)', syntax: 'pow(base, exponent)' },
  { name: 'sqrt', desc: 'Square root (Baseline 2025)', syntax: 'sqrt(value)' },
  { name: 'hypot', desc: 'Hypotenuse (Baseline 2025)', syntax: 'hypot(a, b, ...)' },
  { name: 'log', desc: 'Logarithm (Baseline 2025)', syntax: 'log(value, base?)' },
  { name: 'exp', desc: 'e^value (Baseline 2025)', syntax: 'exp(value)' },
  { name: 'sin', desc: 'Sine (Baseline 2025)', syntax: 'sin(angle)' },
  { name: 'cos', desc: 'Cosine (Baseline 2025)', syntax: 'cos(angle)' },
  { name: 'tan', desc: 'Tangent (Baseline 2025)', syntax: 'tan(angle)' },
  { name: 'asin', desc: 'Arcsine (Baseline 2025)', syntax: 'asin(value)' },
  { name: 'acos', desc: 'Arccosine (Baseline 2025)', syntax: 'acos(value)' },
  { name: 'atan', desc: 'Arctangent (Baseline 2025)', syntax: 'atan(value)' },
  { name: 'atan2', desc: 'Arctangent of quotient (Baseline 2025)', syntax: 'atan2(y, x)' },
  { name: 'env', desc: 'Read environment variables (safe area, etc.)', syntax: 'env(name, fallback?)' },
];

function parseExpression(expr: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\b(calc|min|max|clamp|minmax|abs|sign|round|mod|rem|pow|sqrt|hypot|log|exp|sin|cos|tan|asin|acos|atan|atan2|env|var)\b|([+-/*])|(\d+(?:\.\d+)?)|(px|em|rem|vw|vh|vmin|vmax|%|ch|ex|cm|mm|in|pt|pc|fr|svh|svw|lvh|lvw|dvh|dvw)|([(),])|(--[\w-]+)/gi;
  
  let match;
  while ((match = regex.exec(expr)) !== null) {
    if (match[1]) tokens.push({ type: 'function', value: match[1] });
    else if (match[2]) tokens.push({ type: 'operator', value: match[2] });
    else if (match[3]) tokens.push({ type: 'number', value: match[3] });
    else if (match[4]) tokens.push({ type: 'unit', value: match[4] });
    else if (match[5]) tokens.push({ type: 'separator', value: match[5] });
    else if (match[6]) tokens.push({ type: 'variable', value: match[6] });
  }
  return tokens;
}

function tokenColor(type: Token['type']): string {
  switch (type) {
    case 'function': return 'text-purple-400';
    case 'number': return 'text-amber-400';
    case 'unit': return 'text-green-400';
    case 'operator': return 'text-red-400';
    case 'separator': return 'text-slate-500';
    case 'variable': return 'text-cyan-400';
    default: return 'text-slate-300';
  }
}

export default function CssCalcPlayground() {
  const [expression, setExpression] = useState('clamp(16px, 2vw + 0.5rem, 24px)');
  const [previewWidth, setPreviewWidth] = useState(400);
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(() => parseExpression(expression), [expression]);
  const isValid = useMemo(() => /^(calc|min|max|clamp|minmax|abs|sign|round|mod|rem|pow|sqrt|hypot|log|exp|sin|cos|tan|asin|acos|atan|atan2|env|var)/i.test(expression.trim()), [expression]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handlePreset = useCallback((preset: Preset) => {
    setExpression(preset.expression);
  }, []);

  // Build a live preview: use a CSS custom property approach with a demo box
  const previewStyle = useMemo(() => {
    if (!isValid) return {};
    try {
      return {
        width: expression.trim(),
        maxWidth: '100%',
      };
    } catch {
      return {};
    }
  }, [expression, isValid]);

  return (
    <ToolLayout
      title="CSS calc() Playground"
      description="Build and test CSS math functions — calc(), min(), max(), clamp(), and 20+ Baseline 2025 math functions. Token-by-token syntax highlighting, live size preview, and 8 presets."
      controls={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Preview container width:</span>
          <input
            type="range"
            min={200}
            max={1000}
            value={previewWidth}
            onChange={(e) => setPreviewWidth(Number(e.target.value))}
            className="w-32 accent-brand-500"
          />
          <span className="text-xs font-mono text-brand-400">{previewWidth}px</span>
        </div>
      }
    >
      {/* Expression Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          CSS Math Expression
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="w-full h-14 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-transparent caret-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 resize-none outline-none"
              spellCheck={false}
              style={{ lineHeight: '1.5' }}
            />
            {/* Overlay for syntax highlighting */}
            <div 
              className="absolute inset-0 px-4 py-3 pointer-events-none overflow-hidden whitespace-pre font-mono text-sm"
              style={{ lineHeight: '1.5' }}
            >
              {tokens.map((t, i) => (
                <span key={i} className={tokenColor(t.type)}>{t.value}</span>
              ))}
              {tokens.length === 0 && expression && (
                <span className="text-red-400">{expression}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleCopy(expression)}
            className="flex-shrink-0 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            title="Copy CSS"
          >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
          </button>
        </div>
        {!isValid && expression && (
          <p className="text-xs text-red-400 mt-1">Expression must start with a CSS math function (calc, min, max, clamp, etc.)</p>
        )}
      </div>

      {/* Live Preview */}
      <div className="mb-8 p-6 bg-slate-900 border border-slate-700/50 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Live Preview</h3>
          <button
            onClick={() => handleCopy(`width: ${expression.trim()};`)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Copy CSS property
          </button>
        </div>
        <div
          className="mx-auto bg-slate-800 rounded-lg border border-slate-600 overflow-hidden transition-all duration-300"
          style={{ width: previewWidth, maxWidth: '100%' }}
        >
          <div className="h-2 bg-gradient-to-r from-brand-500 to-purple-500" />
          <div
            className="h-24 flex items-center justify-center text-sm text-slate-400 bg-slate-800/50 transition-all duration-300"
            style={previewStyle}
          >
            <div className="text-center">
              <p className="font-mono text-xs text-brand-400">{expression.trim()}</p>
              <p className="text-xs text-slate-500 mt-1">Resize container above to test</p>
            </div>
          </div>
          <div className="h-2 bg-gradient-to-r from-brand-500 to-purple-500" />
        </div>
      </div>

      {/* Two-column: Presets + Function Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presets */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Presets</h3>
          <div className="space-y-2">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => handlePreset(preset)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  expression === preset.expression
                    ? 'border-brand-500/50 bg-brand-500/10'
                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-sm text-slate-200">{preset.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{preset.desc}</div>
                <div className="mt-1.5 font-mono text-xs text-brand-400">{preset.expression}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Function Reference */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Function Reference</h3>
          <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
            {CSS_FUNCTIONS.map((fn) => (
              <button
                key={fn.name}
                onClick={() => setExpression(`${fn.name}()`)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-800 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-purple-400 font-semibold">{fn.name}()</span>
                  {fn.name.includes('sin') || fn.name.includes('cos') || fn.name.includes('tan') ||
                    ['abs', 'sign', 'round', 'mod', 'rem', 'pow', 'sqrt', 'hypot', 'log', 'exp', 'atan2'].includes(fn.name) ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Baseline 2025</span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{fn.desc}</div>
                <div className="font-mono text-[11px] text-slate-500 mt-0.5">{fn.syntax}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Unit Reference */}
      <div className="mt-8 p-4 bg-slate-900 border border-slate-700/30 rounded-xl">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">CSS Unit Quick Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            { unit: 'px', desc: 'Pixels' },
            { unit: 'rem', desc: 'Root em' },
            { unit: 'em', desc: 'Element em' },
            { unit: 'vw', desc: 'Viewport width' },
            { unit: 'vh', desc: 'Viewport height' },
            { unit: 'vmin', desc: 'Smaller vw/vh' },
            { unit: 'vmax', desc: 'Larger vw/vh' },
            { unit: 'svh', desc: 'Small viewport h' },
            { unit: 'lvh', desc: 'Large viewport h' },
            { unit: 'dvh', desc: 'Dynamic viewport h' },
            { unit: '%', desc: 'Percent of parent' },
            { unit: 'ch', desc: 'Width of "0"' },
            { unit: 'ex', desc: 'x-height' },
            { unit: 'fr', desc: 'Fraction (grid)' },
          ].map((u) => (
            <button
              key={u.unit}
              onClick={() => setExpression((prev) => prev + u.unit)}
              className="p-2 rounded bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-center transition-all"
            >
              <div className="font-mono text-sm text-green-400">{u.unit}</div>
              <div className="text-[10px] text-slate-500">{u.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}

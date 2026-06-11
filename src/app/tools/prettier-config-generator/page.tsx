'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RotateCcw, FileJson, FileCode, Check, Settings, Info, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PrettierConfig {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  quoteProps: 'as-needed' | 'consistent' | 'preserve';
  jsxSingleQuote: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  bracketSpacing: boolean;
  bracketSameLine: boolean;
  arrowParens: 'always' | 'avoid';
  proseWrap: 'always' | 'never' | 'preserve';
  htmlWhitespaceSensitivity: 'css' | 'strict' | 'ignore';
  endOfLine: 'lf' | 'crlf' | 'cr' | 'auto';
  embeddedLanguageFormatting: 'auto' | 'off';
  singleAttributePerLine: boolean;
  vueIndentScriptAndStyle: boolean;
}

interface Preset {
  name: string;
  description: string;
  config: PrettierConfig;
}

// ── Defaults & Presets ────────────────────────────────────────────────────

const DEFAULTS: PrettierConfig = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  singleAttributePerLine: false,
  vueIndentScriptAndStyle: false,
};

const PRESETS: Preset[] = [
  {
    name: 'Standard (Default)',
    description: 'Prettier defaults — good for most projects',
    config: { ...DEFAULTS },
  },
  {
    name: 'Airbnb Style',
    description: 'Matches Airbnb JavaScript Style Guide conventions',
    config: {
      ...DEFAULTS,
      printWidth: 100,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
      semi: true,
      arrowParens: 'always',
    },
  },
  {
    name: 'Google Style',
    description: 'Matches Google JavaScript Style Guide',
    config: {
      ...DEFAULTS,
      printWidth: 80,
      singleQuote: true,
      bracketSpacing: true,
      semi: true,
      trailingComma: 'es5',
    },
  },
  {
    name: 'No Semicolons',
    description: 'Standard-style: no semicolons, single quotes, trailing commas',
    config: {
      ...DEFAULTS,
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
    },
  },
  {
    name: 'Minimal',
    description: 'Minimal config — only the essentials, everything else default',
    config: {
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      quoteProps: 'as-needed',
      jsxSingleQuote: false,
      trailingComma: 'es5',
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: 'always',
      proseWrap: 'preserve',
      htmlWhitespaceSensitivity: 'css',
      endOfLine: 'lf',
      embeddedLanguageFormatting: 'auto',
      singleAttributePerLine: false,
      vueIndentScriptAndStyle: false,
    },
  },
  {
    name: 'React/JSX Heavy',
    description: 'Optimized for React/JSX projects — single quotes, JSX single quotes',
    config: {
      ...DEFAULTS,
      printWidth: 100,
      singleQuote: true,
      jsxSingleQuote: true,
      bracketSameLine: false,
      arrowParens: 'avoid',
      trailingComma: 'es5',
    },
  },
  {
    name: 'Tab Indentation',
    description: 'Uses tabs instead of spaces for indentation',
    config: {
      ...DEFAULTS,
      useTabs: true,
      tabWidth: 4,
    },
  },
  {
    name: 'Max Width 120',
    description: 'Wider print width for modern wide monitors',
    config: {
      ...DEFAULTS,
      printWidth: 120,
      singleQuote: true,
    },
  },
];

// ── Option metadata ────────────────────────────────────────────────────────

interface OptionMeta {
  key: keyof PrettierConfig;
  label: string;
  description: string;
  type: 'slider' | 'number' | 'toggle' | 'radio' | 'select';
  options?: { value: string; label: string; description: string }[];
  min?: number;
  max?: number;
  step?: number;
}

const OPTIONS_META: OptionMeta[] = [
  {
    key: 'printWidth',
    label: 'Print Width',
    description: 'Specify the line length that the printer will wrap on.',
    type: 'number',
    min: 40,
    max: 200,
    step: 10,
  },
  {
    key: 'tabWidth',
    label: 'Tab Width',
    description: 'Number of spaces per indentation level.',
    type: 'radio',
    options: [
      { value: '2', label: '2 spaces', description: 'Compact, saves horizontal space' },
      { value: '4', label: '4 spaces', description: 'Most readable, standard in many languages' },
      { value: '8', label: '8 spaces', description: 'Traditional, used in some C projects' },
    ],
  },
  {
    key: 'useTabs',
    label: 'Use Tabs',
    description: 'Indent lines with tabs instead of spaces.',
    type: 'toggle',
  },
  {
    key: 'semi',
    label: 'Semicolons',
    description: 'Print semicolons at the ends of statements.',
    type: 'toggle',
  },
  {
    key: 'singleQuote',
    label: 'Single Quotes',
    description: 'Use single quotes instead of double quotes.',
    type: 'toggle',
  },
  {
    key: 'quoteProps',
    label: 'Quote Properties',
    description: 'Change when properties in objects are quoted.',
    type: 'radio',
    options: [
      { value: 'as-needed', label: 'As Needed', description: 'Only add quotes where required by the parser' },
      { value: 'consistent', label: 'Consistent', description: 'If any property requires quotes, quote all of them' },
      { value: 'preserve', label: 'Preserve', description: 'Respect the input use of quotes in object properties' },
    ],
  },
  {
    key: 'jsxSingleQuote',
    label: 'JSX Single Quotes',
    description: 'Use single quotes instead of double quotes in JSX.',
    type: 'toggle',
  },
  {
    key: 'trailingComma',
    label: 'Trailing Commas',
    description: 'Print trailing commas wherever possible in multi-line structures.',
    type: 'radio',
    options: [
      { value: 'none', label: 'None', description: 'No trailing commas' },
      { value: 'es5', label: 'ES5', description: 'Trailing commas where valid in ES5 (objects, arrays, etc.)' },
      { value: 'all', label: 'All', description: 'Trailing commas wherever possible, including function parameters' },
    ],
  },
  {
    key: 'bracketSpacing',
    label: 'Bracket Spacing',
    description: 'Print spaces between brackets in object literals.',
    type: 'toggle',
  },
  {
    key: 'bracketSameLine',
    label: 'Bracket Same Line',
    description: 'Put the > of a multi-line JSX element at the end of the last line.',
    type: 'toggle',
  },
  {
    key: 'arrowParens',
    label: 'Arrow Function Parens',
    description: 'Include parentheses around a sole arrow function parameter.',
    type: 'radio',
    options: [
      { value: 'always', label: 'Always', description: 'Always include parens. Example: (x) => x' },
      { value: 'avoid', label: 'Avoid', description: 'Omit parens when possible. Example: x => x' },
    ],
  },
  {
    key: 'proseWrap',
    label: 'Prose Wrap',
    description: 'How to wrap prose (Markdown text).',
    type: 'radio',
    options: [
      { value: 'always', label: 'Always', description: 'Wrap prose if it exceeds print width' },
      { value: 'never', label: 'Never', description: 'Never wrap prose' },
      { value: 'preserve', label: 'Preserve', description: 'Wrap prose as-is (default)' },
    ],
  },
  {
    key: 'htmlWhitespaceSensitivity',
    label: 'HTML Whitespace Sensitivity',
    description: 'How to handle whitespace in HTML, Vue, Angular, and Handlebars.',
    type: 'radio',
    options: [
      { value: 'css', label: 'CSS', description: 'Respect the default value of CSS display property' },
      { value: 'strict', label: 'Strict', description: 'All whitespace is considered significant' },
      { value: 'ignore', label: 'Ignore', description: 'All whitespace is considered insignificant' },
    ],
  },
  {
    key: 'endOfLine',
    label: 'End of Line',
    description: 'Which end of line characters to use.',
    type: 'radio',
    options: [
      { value: 'lf', label: 'LF', description: 'Line Feed only' },
      { value: 'crlf', label: 'CRLF', description: 'Carriage Return + Line Feed' },
      { value: 'cr', label: 'CR', description: 'Carriage Return only' },
      { value: 'auto', label: 'Auto', description: 'Maintain existing line endings' },
    ],
  },
  {
    key: 'embeddedLanguageFormatting',
    label: 'Embedded Language Formatting',
    description: 'Control whether Prettier formats quoted code embedded in the file.',
    type: 'radio',
    options: [
      { value: 'auto', label: 'Auto', description: 'Format embedded code if Prettier can identify it' },
      { value: 'off', label: 'Off', description: 'Never automatically format embedded code' },
    ],
  },
  {
    key: 'singleAttributePerLine',
    label: 'Single Attribute Per Line',
    description: 'Enforce single attribute per line in HTML, Vue, and JSX.',
    type: 'toggle',
  },
  {
    key: 'vueIndentScriptAndStyle',
    label: 'Vue Indent Script & Style',
    description: 'Indent <script> and <style> tags in Vue files.',
    type: 'toggle',
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────

function buildConfigJson(config: PrettierConfig): string {
  const clean: Partial<PrettierConfig> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value !== DEFAULTS[key as keyof PrettierConfig]) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }
  if (Object.keys(clean).length === 0) {
    return '{} // All values are defaults — you can use an empty {}';
  }
  return JSON.stringify(clean, null, 2);
}

function buildConfigYaml(config: PrettierConfig): string {
  const clean: Partial<PrettierConfig> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value !== DEFAULTS[key as keyof PrettierConfig]) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }
  if (Object.keys(clean).length === 0) {
    return '# All values are defaults — you can use an empty config';
  }
  const lines: string[] = [];
  for (const [key, value] of Object.entries(clean)) {
    lines.push(`${key}: ${typeof value === 'boolean' ? value : JSON.stringify(value)}`);
  }
  return lines.join('\n');
}

function configToCliArgs(config: PrettierConfig): string {
  const args: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (value !== DEFAULTS[key as keyof PrettierConfig]) {
      const dashedKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (typeof value === 'boolean') {
        args.push(`--${value ? '' : 'no-'}${dashedKey}`);
      } else {
        args.push(`--${dashedKey} ${value}`);
      }
    }
  }
  return args.length > 0 ? `prettier ${args.join(' \\\n  ')} .` : 'prettier .';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PrettierConfigGenerator() {
  const [config, setConfig] = useState<PrettierConfig>({ ...DEFAULTS });
  const [activePreset, setActivePreset] = useState<string>('Standard (Default)');
  const [outputFormat, setOutputFormat] = useState<'json' | 'yaml' | 'cli'>('json');

  const changesCount = useMemo(() => {
    let count = 0;
    for (const [key, value] of Object.entries(config)) {
      if (value !== DEFAULTS[key as keyof PrettierConfig]) count++;
    }
    return count;
  }, [config]);

  const output = useMemo(() => {
    switch (outputFormat) {
      case 'json':
        return buildConfigJson(config);
      case 'yaml':
        return buildConfigYaml(config);
      case 'cli':
        return configToCliArgs(config);
    }
  }, [config, outputFormat]);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig({ ...preset.config });
    setActivePreset(preset.name);
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig({ ...DEFAULTS });
    setActivePreset('Standard (Default)');
    toast.success('Reset to Prettier defaults');
  }, []);

  const updateConfig = useCallback(<K extends keyof PrettierConfig>(key: K, value: PrettierConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setActivePreset('Custom');
  }, []);

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard!');
  }, [output]);

  const downloadConfig = useCallback(() => {
    const ext = outputFormat === 'yaml' ? '.yaml' : outputFormat === 'json' ? 'json' : 'txt';
    const filename = outputFormat === 'cli' ? 'prettier-command.txt' : `.prettierrc.${ext}`;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }, [output, outputFormat]);

  return (
    <ToolLayout
      title="Prettier Config Generator"
      description="Visually build your .prettierrc — every option explained, 8 presets, live JSON/YAML/CLI output."
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel — Options */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Presets */}
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/70">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-slate-200">Presets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activePreset === preset.name
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-600/50'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 text-orange-300 hover:bg-slate-700 border border-orange-500/30 transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {OPTIONS_META.map((meta) => (
              <div key={meta.key} className="p-4 rounded-xl border border-slate-700 bg-slate-800/70">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-slate-200">{meta.label}</label>
                      {config[meta.key] !== DEFAULTS[meta.key] && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded">
                          modified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
                  </div>
                </div>

                {/* Toggle */}
                {meta.type === 'toggle' && (
                  <button
                    onClick={() => updateConfig(meta.key, !config[meta.key] as PrettierConfig[typeof meta.key])}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      config[meta.key] ? 'bg-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        config[meta.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                    <span className="absolute right-1.5 text-[9px] font-bold text-white/80">
                      {config[meta.key] ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}

                {/* Radio */}
                {meta.type === 'radio' && meta.options && (
                  <div className="flex flex-wrap gap-2">
                    {meta.options.map((opt) => {
                      const isActive = String(config[meta.key]) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => updateConfig(meta.key, meta.key === 'tabWidth' ? Number(opt.value) as PrettierConfig[typeof meta.key] : opt.value as PrettierConfig[typeof meta.key])}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                              : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-600/50'
                          }`}
                          title={opt.description}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Number input */}
                {meta.type === 'number' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={config[meta.key] as number}
                      onChange={(e) => updateConfig(meta.key, Number(e.target.value) as PrettierConfig[typeof meta.key])}
                      className="flex-1 h-2 appearance-none bg-slate-700 rounded-full accent-purple-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={config[meta.key] as number}
                      onChange={(e) => updateConfig(meta.key, Number(e.target.value) as PrettierConfig[typeof meta.key])}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm text-center focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Output */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Format selector */}
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-slate-200">Output</span>
                </div>
                <span className="text-xs text-slate-400">{changesCount} change{changesCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-2 mb-3">
                {(['json', 'yaml', 'cli'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      outputFormat === fmt
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-600/50'
                    }`}
                  >
                    {fmt === 'cli' ? 'CLI' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-[500px] leading-relaxed">
                {output}
              </pre>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyOutput}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <button
                  onClick={downloadConfig}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Quick usage */}
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/70">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">Quick Setup</span>
              </div>
              <div className="text-xs text-slate-400 space-y-2">
                <p>1. Save as <code className="text-purple-300 bg-slate-700 px-1 rounded">.prettierrc</code> in your project root</p>
                <p>2. Install: <code className="text-green-300 bg-slate-700 px-1 rounded">npm i -D prettier</code></p>
                <p>3. Script: <code className="text-blue-300 bg-slate-700 px-1 rounded">"format": "prettier --write ."</code></p>
                <p>4. Run: <code className="text-purple-300 bg-slate-700 px-1 rounded">npm run format</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Download, Scissors, Zap, FileCode, Check, RefreshCw, Sparkles, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

interface OptimizeOptions {
  removeComments: boolean;
  removeMetadata: boolean;
  removeXmlDeclaration: boolean;
  removeDoctype: boolean;
  collapseWhitespace: boolean;
  roundPrecision: number | false;
  shortenIds: boolean;
  removeEmptyGroups: boolean;
  removeUnusedDefs: boolean;
}

const OPTION_LABELS: Record<string, string> = {
  removeComments: 'Remove XML comments',
  removeMetadata: 'Remove metadata (title, desc)',
  removeXmlDeclaration: 'Remove XML declaration',
  removeDoctype: 'Remove DOCTYPE',
  collapseWhitespace: 'Collapse whitespace between tags',
  shortenIds: 'Shorten ID names',
  removeEmptyGroups: 'Remove empty <g> elements',
  removeUnusedDefs: 'Remove unused <defs>',
};

const PRESETS: { name: string; description: string; options: OptimizeOptions }[] = [
  {
    name: 'Safe',
    description: 'Non-destructive — removes comments, metadata, and whitespace only',
    options: { removeComments: true, removeMetadata: true, removeXmlDeclaration: true, removeDoctype: true, collapseWhitespace: true, roundPrecision: false, shortenIds: false, removeEmptyGroups: false, removeUnusedDefs: false },
  },
  {
    name: 'Aggressive',
    description: 'Full optimization — round to 3 decimals, shorten IDs, remove empties',
    options: { removeComments: true, removeMetadata: true, removeXmlDeclaration: true, removeDoctype: true, collapseWhitespace: true, roundPrecision: 3, shortenIds: true, removeEmptyGroups: true, removeUnusedDefs: true },
  },
  {
    name: 'Minimal',
    description: 'Strip whitespace and comments only',
    options: { removeComments: true, removeMetadata: false, removeXmlDeclaration: false, removeDoctype: false, collapseWhitespace: true, roundPrecision: false, shortenIds: false, removeEmptyGroups: false, removeUnusedDefs: false },
  },
];

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">\n  <!-- This is a sample SVG -->\n  <title>Sample Icon</title>\n  <desc>A simple heart icon</desc>\n  <g id="heart-group">\n    <path d="M 100,30 C 100,20 85,10 70,20 C 55,10 40,20 40,30 C 40,50 100,80 100,80 C 100,80 160,50 160,30 C 160,20 145,10 130,20 C 115,10 100,20 100,30 Z" fill="#e74c3c" stroke="#c0392b" stroke-width="2.00000"/>\n  </g>\n  <g id="empty-group"></g>\n  <defs>\n    <linearGradient id="grad-1" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#ff6b6b" />\n      <stop offset="100%" stop-color="#ee5a24" />\n    </linearGradient>\n  </defs>\n</svg>';

function escapeRegex(str: string): string { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function optimizeSvg(input: string, options: OptimizeOptions): string {
  let svg = input;
  if (options.removeXmlDeclaration) svg = svg.replace(/<\?xml[^>]*\?>\s*/g, '');
  if (options.removeDoctype) svg = svg.replace(/<!DOCTYPE[^>]*>\s*/gi, '');
  if (options.removeComments) svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  if (options.removeMetadata) svg = svg.replace(/<(title|desc)[^>]*>[\s\S]*?<\/\1>\s*/gi, '');

  const idMap = new Map();
  if (options.shortenIds && svg.includes('id="')) {
    const idRegex = /\bid\s*=\s*["']([^"']+)["']/g;
    let match, counter = 0;
    while ((match = idRegex.exec(svg)) !== null) {
      if (!idMap.has(match[1]) && match[1].length > 0) { idMap.set(match[1], 'id' + counter); counter++; }
    }
  }
  if (options.shortenIds && idMap.size > 0) {
    idMap.forEach((newId: string, oldId: string) => {
      const e = escapeRegex(oldId);
      svg = svg.replace(new RegExp('\\bid\\s*=\\s*["\']' + e + '["\']', 'g'), 'id="' + newId + '"');
      svg = svg.replace(new RegExp('url\\(\\s*#' + e + '\\s*\\)', 'g'), 'url(#' + newId + ')');
      svg = svg.replace(new RegExp('href\\s*=\\s*["\']#' + e + '["\']', 'g'), 'href="#' + newId + '"');
      svg = svg.replace(new RegExp('xlink:href\\s*=\\s*["\']#' + e + '["\']', 'g'), 'xlink:href="#' + newId + '"');
    });
  }
  if (options.roundPrecision !== false && options.roundPrecision >= 0) {
    const d = options.roundPrecision;
    svg = svg.replace(/(["\'])([^"\']+?)(["\'])/g, function(_: string, q1: string, content: string, q2: string) {
      const r = content.replace(/(\d+\.\d+)/g, function(num: string) { const v = parseFloat(num); return v.toFixed(d).replace(/\.?0+$/, '') || '0'; });
      return q1 + r + q2;
    });
  }
  if (options.removeEmptyGroups) { svg = svg.replace(/<g[^>]*>\s*<\/g>/gi, ''); svg = svg.replace(/<g[^>]*\s*\/\s*>/gi, ''); }
  if (options.removeUnusedDefs) {
    const defsMatch = svg.match(/<defs[^>]*>([\s\S]*?)<\/defs>/gi);
    if (defsMatch) {
      for (const defBlock of defsMatch) {
        const inner = defBlock.replace(/<\/?defs[^>]*>/gi, '');
        const defIds = []; let m; const ir = /\bid\s*=\s*["']([^"']+)["']/g;
        while ((m = ir.exec(inner)) !== null) defIds.push(m[1]);
        let allUnused = true;
        const svgNoDefs = svg.replace(defBlock, '');
        for (const did of defIds) {
          const re = new RegExp('(url\\(\\s*#' + escapeRegex(did) + '\\s*\\)|href\\s*=\\s*["\']#' + escapeRegex(did) + '["\']|xlink:href\\s*=\\s*["\']#' + escapeRegex(did) + '["\'])', 'i');
          if ((svgNoDefs.match(re) || []).length > 0) { allUnused = false; break; }
        }
        if (allUnused) svg = svg.replace(defBlock, '');
      }
    }
  }
  if (options.collapseWhitespace) { svg = svg.replace(/>\s+</g, '><'); svg = svg.trim(); }
  return svg;
}

export default function SvgOptimizerPage() {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<OptimizeOptions>({ removeComments: true, removeMetadata: true, removeXmlDeclaration: true, removeDoctype: true, collapseWhitespace: true, roundPrecision: 2, shortenIds: true, removeEmptyGroups: true, removeUnusedDefs: true });
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const output = useMemo(() => { if (!input.trim()) return ''; try { return optimizeSvg(input, options); } catch { return 'Error: Could not optimize SVG'; } }, [input, options]);
  const inputSize = useMemo(() => new Blob([input]).size, [input]);
  const outputSize = useMemo(() => new Blob([output]).size, [output]);
  const savings = useMemo(() => inputSize === 0 ? 0 : Math.round((1 - outputSize / inputSize) * 100), [inputSize, outputSize]);

  const loadSample = useCallback(() => setInput(SAMPLE_SVG), []);
  const clear = useCallback(() => setInput(''), []);
  const applyPreset = useCallback((preset: typeof PRESETS[number]) => setOptions({ ...preset.options }), []);
  const toggleOption = useCallback((key: Exclude<keyof OptimizeOptions, 'roundPrecision'>) => setOptions(prev => ({ ...prev, [key]: !prev[key] })), []);
  const setPrecision = useCallback((val: number | false) => setOptions(prev => ({ ...prev, roundPrecision: val })), []);
  const handleCopy = useCallback(async () => { if (!output) return; try { await navigator.clipboard.writeText(output); setCopied(true); toast.success('Optimized SVG copied!'); setTimeout(() => setCopied(false), 2000); } catch { toast.error('Failed to copy'); } }, [output]);
  const handleDownload = useCallback(() => { if (!output) return; const blob = new Blob([output], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'optimized.svg'; a.click(); URL.revokeObjectURL(url); toast.success('SVG downloaded!'); }, [output]);
  const formatBytes = (b: number): string => { if (b === 0) return '0 B'; if (b < 1024) return b + ' B'; return (b / 1024).toFixed(1) + ' KB'; };

  return (
    <ToolLayout title="SVG Optimizer" description="Strip comments, metadata, and whitespace from SVGs. Shorten IDs, round decimals, remove empty groups and unused defs — all in the browser.">
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4"><Zap className="w-4 h-4 text-brand-400" /><h2 className="text-white font-semibold text-sm">Optimization Presets</h2></div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (<button key={p.name} onClick={() => applyPreset(p)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-surface border border-slate-700/50 text-slate-300 hover:border-brand-500/40 hover:text-white" title={p.description}>{p.name}</button>))}
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><FileCode className="w-4 h-4 text-brand-400" />SVG Input</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadSample} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Load sample</button>
            <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Clear"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={'Paste your SVG code here...\n\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="blue" />\n</svg>'} className="input-field w-full h-48 resize-y font-mono text-xs" spellCheck={false} />
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span>{formatBytes(inputSize)}</span><span>•</span><span>{input.split('\n').length} lines</span></div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4"><Scissors className="w-4 h-4 text-brand-400" /><h2 className="text-white font-semibold text-sm">Optimization Options</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(OPTION_LABELS).map(key => {
            const k = key as Exclude<keyof OptimizeOptions, 'roundPrecision'>;
            return (
            <label key={key} className="flex items-center gap-3 cursor-pointer select-none group">
              <input type="checkbox" checked={options[k] as boolean} onChange={() => toggleOption(k)} className="w-4 h-4 rounded border-slate-600 bg-surface text-brand-500 focus:ring-brand-500/30" />
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{OPTION_LABELS[key]}</span>
            </label>
          )})}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Round decimals</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer"><input type="radio" name="precision" checked={options.roundPrecision === false} onChange={() => setPrecision(false)} className="w-3.5 h-3.5 text-brand-500" />Off</label>
              {[1,2,3,4,5].map(n => (<label key={n} className="flex items-center gap-1 text-sm text-slate-400 cursor-pointer"><input type="radio" name="precision" checked={options.roundPrecision === n} onChange={() => setPrecision(n)} className="w-3.5 h-3.5 text-brand-500" />{n}dp</label>))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-400" />Optimized Output</h2>
          <div className="flex items-center gap-2">
            {output && (<>
              <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">{showPreview ? <FileCode className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}{showPreview ? 'Code' : 'Preview'}</button>
              <button onClick={handleCopy} className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20')}>{copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}</button>
              <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"><Download className="w-3.5 h-3.5" />Download</button>
            </>)}
          </div>
        </div>
        {output ? (
          showPreview ? (
            <div className="bg-white rounded-lg p-4 flex items-center justify-center min-h-[200px] border border-slate-700/50"><div dangerouslySetInnerHTML={{ __html: output }} className="max-w-full max-h-[400px]" /></div>
          ) : (
            <pre className="bg-surface rounded-lg border border-slate-700/50 p-4 max-h-[400px] overflow-auto"><code className="font-mono text-xs text-brand-300 whitespace-pre">{output}</code></pre>
          )
        ) : (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-12 text-center"><Scissors className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-500 text-sm">Paste SVG code above and configure options to see the optimized output.</p></div>
        )}
        {output && inputSize > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center"><div className="text-xs text-slate-500 mb-1">Original</div><div className="text-lg font-bold text-slate-300 tabular-nums">{formatBytes(inputSize)}</div></div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center"><div className="text-xs text-slate-500 mb-1">Optimized</div><div className="text-lg font-bold text-brand-400 tabular-nums">{formatBytes(outputSize)}</div></div>
            <div className={'bg-surface rounded-lg border p-3 text-center ' + (savings > 0 ? 'border-green-500/30' : 'border-slate-700/50')}><div className="text-xs text-slate-500 mb-1">Saved</div><div className="text-lg font-bold text-green-400 tabular-nums flex items-center justify-center gap-1"><Percent className="w-4 h-4" />{savings}</div></div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-400" />Usage Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
          <li><strong className="text-slate-300">Safe preset:</strong> Good for general use. Removes non-visual elements without touching structure.</li>
          <li><strong className="text-slate-300">Aggressive preset:</strong> Maximum compression. Shortens IDs (references are auto-updated), rounds decimals, removes empty groups and unused defs.</li>
          <li><strong className="text-slate-300">Decimal rounding:</strong> Values like 12.584729 become 12.58 — huge file size savings.</li>
          <li><strong className="text-slate-300">Live preview:</strong> Toggle to verify the SVG still renders correctly after optimization.</li>
          <li><strong className="text-slate-300">ID shortening:</strong> Auto-updates all url(#...), href="#...", and xlink:href="#..." references.</li>
          <li><strong className="text-slate-300">Privacy:</strong> Everything runs in your browser. Your SVGs never leave your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}

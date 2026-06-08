'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, RotateCcw, BarChart3, TrendingUp, PieChart, Activity,
  Download, Plus, Trash2, RefreshCw, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area';

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

const DEFAULT_PALETTE = [
  '#7dd3fc', '#86efac', '#fbbf24', '#fca5a5', '#c4b5fd',
  '#fdba74', '#67e8f9', '#a5b4fc', '#d8b4fe', '#fde68a',
];

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  { type: 'line', label: 'Line', icon: <TrendingUp className="w-4 h-4" /> },
  { type: 'area', label: 'Area', icon: <Activity className="w-4 h-4" /> },
  { type: 'pie', label: 'Pie', icon: <PieChart className="w-4 h-4" /> },
  { type: 'donut', label: 'Donut', icon: <RefreshCw className="w-4 h-4" /> },
];

const SAMPLE_DATA: DataPoint[] = [
  { label: 'Jan', value: 42, color: '#7dd3fc' },
  { label: 'Feb', value: 58, color: '#86efac' },
  { label: 'Mar', value: 35, color: '#fbbf24' },
  { label: 'Apr', value: 73, color: '#fca5a5' },
  { label: 'May', value: 65, color: '#c4b5fd' },
  { label: 'Jun', value: 88, color: '#fdba74' },
];

const CHART_WIDTH = 700;
const CHART_HEIGHT = 380;
const PADDING = { top: 30, right: 40, bottom: 60, left: 60 };
const CENTER_X = CHART_WIDTH / 2;
const CENTER_Y = CHART_HEIGHT / 2;
const PIE_RADIUS = 140;
const DONUT_INNER = 80;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateBarSvg(data: DataPoint[]): string {
  const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barGap = 8;
  const barW = Math.max(4, (plotW / data.length) - barGap);

  const gridLines: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const y = PADDING.top + (plotH * i) / 5;
    const val = Math.round(maxVal - (maxVal * i) / 5);
    gridLines.push(`<line x1="${PADDING.left}" y1="${y}" x2="${CHART_WIDTH - PADDING.right}" y2="${y}" stroke="#334155" stroke-width="1" />`);
    gridLines.push(`<text x="${PADDING.left - 8}" y="${y + 4}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">${val}</text>`);
  }

  const bars: string[] = [];
  const labels: string[] = [];
  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * plotH;
    const x = PADDING.left + i * (plotW / data.length) + barGap / 2;
    const y = PADDING.top + plotH - barH;
    const rx = Math.min(4, barW / 2);
    bars.push(`<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, barH)}" rx="${rx}" fill="${d.color}" opacity="0.9">
      <title>${escapeXml(d.label)}: ${d.value}</title>
    </rect>`);
    labels.push(`<text x="${x + barW / 2}" y="${CHART_HEIGHT - PADDING.bottom + 20}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif" transform="rotate(45, ${x + barW / 2}, ${CHART_HEIGHT - PADDING.bottom + 20})">${escapeXml(d.label)}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="100%" height="100%">
  <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="#0f172a" rx="8" />
  <line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${CHART_HEIGHT - PADDING.bottom}" stroke="#475569" stroke-width="2" />
  <line x1="${PADDING.left}" y1="${CHART_HEIGHT - PADDING.bottom}" x2="${CHART_WIDTH - PADDING.right}" y2="${CHART_HEIGHT - PADDING.bottom}" stroke="#475569" stroke-width="2" />
  ${gridLines.join('\n  ')}
  ${bars.join('\n  ')}
  ${labels.join('\n  ')}
</svg>`;
}

function generateLineSvg(data: DataPoint[], fillArea: boolean): string {
  const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const gridLines: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const y = PADDING.top + (plotH * i) / 5;
    const val = Math.round(maxVal - (maxVal * i) / 5);
    gridLines.push(`<line x1="${PADDING.left}" y1="${y}" x2="${CHART_WIDTH - PADDING.right}" y2="${y}" stroke="#334155" stroke-width="1" />`);
    gridLines.push(`<text x="${PADDING.left - 8}" y="${y + 4}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">${val}</text>`);
  }

  const points = data.map((d, i) => {
    const x = PADDING.left + i * (plotW / Math.max(data.length - 1, 1));
    const y = PADDING.top + plotH - (d.value / maxVal) * plotH;
    return { x, y, ...d };
  });

  const pointStr = points.map(p => `${p.x},${p.y}`).join(' ');

  let filledArea = '';
  if (fillArea) {
    const areaPath = `${points[0].x},${PADDING.top + plotH} ${pointStr} ${points[points.length - 1].x},${PADDING.top + plotH}`;
    const lineColor = data[0]?.color || DEFAULT_PALETTE[0];
    filledArea = `<polygon points="${areaPath}" fill="${lineColor}" opacity="0.15" />`;
  }

  const dots = points.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.color}" stroke="#0f172a" stroke-width="2"><title>${escapeXml(p.label)}: ${p.value}</title></circle>`
  );

  const labels = data.map((d, i) => {
    const x = PADDING.left + i * (plotW / Math.max(data.length - 1, 1));
    return `<text x="${x}" y="${CHART_HEIGHT - PADDING.bottom + 20}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">${escapeXml(d.label)}</text>`;
  });

  const lineColor = data[0]?.color || DEFAULT_PALETTE[0];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="100%" height="100%">
  <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="#0f172a" rx="8" />
  <line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${CHART_HEIGHT - PADDING.bottom}" stroke="#475569" stroke-width="2" />
  <line x1="${PADDING.left}" y1="${CHART_HEIGHT - PADDING.bottom}" x2="${CHART_WIDTH - PADDING.right}" y2="${CHART_HEIGHT - PADDING.bottom}" stroke="#475569" stroke-width="2" />
  ${gridLines.join('\n  ')}
  ${filledArea}
  <polyline points="${pointStr}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  ${dots.join('\n  ')}
  ${labels.join('\n  ')}
</svg>`;
}

function generatePieSvg(data: DataPoint[], donut: boolean): string {
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0);
  const validData = data.filter(d => d.value > 0);
  if (total === 0 || validData.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="100%" height="100%">
  <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="#0f172a" rx="8" />
  <text x="${CENTER_X}" y="${CENTER_Y}" text-anchor="middle" fill="#64748b" font-size="14" font-family="system-ui,sans-serif">No data to display</text>
</svg>`;
  }

  // Build pie slices
  let cumAngle = -90; // Start from top
  const slices: string[] = [];

  validData.forEach((d) => {
    const sliceAngle = (d.value / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + sliceAngle;
    cumAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = CENTER_X + PIE_RADIUS * Math.cos(startRad);
    const y1 = CENTER_Y + PIE_RADIUS * Math.sin(startRad);
    const x2 = CENTER_X + PIE_RADIUS * Math.cos(endRad);
    const y2 = CENTER_Y + PIE_RADIUS * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    slices.push(`<path d="M${CENTER_X},${CENTER_Y} L${x1},${y1} A${PIE_RADIUS},${PIE_RADIUS} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${d.color}" stroke="#0f172a" stroke-width="2" opacity="0.9">
      <title>${escapeXml(d.label)}: ${d.value} (${Math.round((d.value / total) * 100)}%)</title>
    </path>`);
  });

  // Donut hole
  const donutHole = donut
    ? `<circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DONUT_INNER}" fill="#0f172a" />`
    : '';

  // Center text for donut
  const centerText = donut
    ? `<text x="${CENTER_X}" y="${CENTER_Y - 4}" text-anchor="middle" fill="#e2e8f0" font-size="22" font-weight="bold" font-family="system-ui,sans-serif">${total}</text>
    <text x="${CENTER_X}" y="${CENTER_Y + 18}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">Total</text>`
    : '';

  // Legend
  const legendItems = validData.map((d, i) => {
    const y = PADDING.top + i * 22;
    return `<rect x="${CHART_WIDTH - PADDING.right + 10}" y="${y}" width="12" height="12" rx="2" fill="${d.color}" />
    <text x="${CHART_WIDTH - PADDING.right + 28}" y="${y + 10}" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">${escapeXml(d.label)} (${d.value})</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="100%" height="100%">
  <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="#0f172a" rx="8" />
  ${slices.join('\n  ')}
  ${donutHole}
  ${centerText}
  ${legendItems.join('\n  ')}
</svg>`;
}

function generateSvg(data: DataPoint[], chartType: ChartType): string {
  switch (chartType) {
    case 'bar':
      return generateBarSvg(data);
    case 'line':
      return generateLineSvg(data, false);
    case 'area':
      return generateLineSvg(data, true);
    case 'pie':
      return generatePieSvg(data, false);
    case 'donut':
      return generatePieSvg(data, true);
    default:
      return '';
  }
}

export default function SvgChartGeneratorPage() {
  const [data, setData] = useState<DataPoint[]>(SAMPLE_DATA);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [labelInput, setLabelInput] = useState('');
  const [valueInput, setValueInput] = useState('');

  const svg = useMemo(() => generateSvg(data, chartType), [data, chartType]);

  const updatePoint = useCallback((index: number, field: 'label' | 'value' | 'color', newVal: string) => {
    setData(prev => {
      const next = [...prev];
      if (field === 'value') {
        next[index] = { ...next[index], value: parseFloat(newVal) || 0 };
      } else if (field === 'label') {
        next[index] = { ...next[index], label: newVal };
      } else {
        next[index] = { ...next[index], color: newVal };
      }
      return next;
    });
  }, []);

  const addPoint = useCallback(() => {
    if (!labelInput.trim() || !valueInput) return;
    const index = data.length % DEFAULT_PALETTE.length;
    setData(prev => [
      ...prev,
      { label: labelInput.trim(), value: parseFloat(valueInput) || 0, color: DEFAULT_PALETTE[index] },
    ]);
    setLabelInput('');
    setValueInput('');
  }, [labelInput, valueInput, data.length]);

  const removePoint = useCallback((index: number) => {
    if (data.length <= 1) return;
    setData(prev => prev.filter((_, i) => i !== index));
  }, [data.length]);

  const reset = useCallback(() => {
    setData(SAMPLE_DATA);
    setChartType('bar');
    setLabelInput('');
    setValueInput('');
  }, []);

  const copySvg = useCallback(() => {
    navigator.clipboard.writeText(svg).then(
      () => toast.success('SVG copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [svg]);

  const downloadSvg = useCallback(() => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-${chartType}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG downloaded!');
  }, [svg, chartType]);

  const addFromCsv = useCallback(() => {
    const csv = prompt('Paste CSV data (label,value per line):');
    if (!csv) return;
    const lines = csv.trim().split('\n').filter(Boolean);
    const newData: DataPoint[] = lines.map((line, i) => {
      const [label, val] = line.split(',').map(s => s.trim());
      return {
        label: label || `Item ${i + 1}`,
        value: parseFloat(val) || 0,
        color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
      };
    });
    if (newData.length > 0) setData(newData);
  }, []);

  const currentType = CHART_TYPES.find(t => t.type === chartType);

  return (
    <ToolLayout
      title="SVG Chart Generator"
      description="Generate beautiful, responsive SVG charts — bar, line, area, pie, donut. Customizable colors and data, 100% client-side, zero dependencies."
    >
      {/* Chart type selector */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-surface rounded-lg p-1">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => setChartType(ct.type)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  chartType === ct.type
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {ct.icon}
                <span className="hidden sm:inline">{ct.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addFromCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-brand-400 transition-colors bg-surface-lighter border border-slate-600/50"
              title="Import CSV data"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={copySvg}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-brand-400 transition-colors bg-surface-lighter border border-slate-600/50"
              title="Copy SVG code"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy SVG</span>
            </button>
            <button
              onClick={downloadSvg}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 border border-emerald-500/30"
              title="Download SVG file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-colors bg-surface-lighter border border-slate-600/50 hover:border-red-500/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Data input panel */}
        <div className="lg:col-span-2 card">
          <h3 className="text-white font-semibold text-sm mb-3">Data Points</h3>

          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
            {data.map((point, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface rounded-lg p-2 border border-slate-700/50 group">
                <input
                  type="color"
                  value={point.color}
                  onChange={(e) => updatePoint(i, 'color', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                  title="Color"
                />
                <input
                  type="text"
                  value={point.label}
                  onChange={(e) => updatePoint(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="input-field flex-1 min-w-0 py-1.5 px-2 text-xs"
                />
                <input
                  type="number"
                  value={point.value}
                  onChange={(e) => updatePoint(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="input-field w-20 py-1.5 px-2 text-xs"
                />
                <button
                  onClick={() => removePoint(i)}
                  disabled={data.length <= 1}
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new data point */}
          <div className="flex items-center gap-2 bg-surface rounded-lg p-2 border border-slate-700/50 border-dashed">
            <div className="w-7 h-7 rounded flex-shrink-0 bg-slate-700 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPoint()}
              placeholder="Label"
              className="input-field flex-1 min-w-0 py-1.5 px-2 text-xs"
            />
            <input
              type="number"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPoint()}
              placeholder="Value"
              className="input-field w-20 py-1.5 px-2 text-xs"
            />
            <button
              onClick={addPoint}
              disabled={!labelInput.trim() || !valueInput}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            {data.length} data point{data.length !== 1 ? 's' : ''} &middot; Click colors to customize
          </p>
        </div>

        {/* Chart preview */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">
              Preview — {currentType?.label} Chart
            </h3>
          </div>
          <div
            className="bg-surface rounded-lg p-4 flex items-center justify-center border border-slate-700/50"
            style={{ minHeight: '380px' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>

      {/* SVG code output */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">SVG Code</h3>
          <button
            onClick={copySvg}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy to clipboard
          </button>
        </div>
        <div className="relative">
          <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre">
            {svg}
          </pre>
        </div>
      </div>

      {/* Info section */}
      <div className="card mt-6">
        <h3 className="text-white font-semibold text-sm mb-2">About This Tool</h3>
        <ul className="text-slate-400 text-sm space-y-1.5">
          <li>• <strong className="text-slate-300">5 chart types:</strong> Bar, line, area, pie, and donut charts with live preview.</li>
          <li>• <strong className="text-slate-300">Custom data:</strong> Add, remove, and edit data points — labels, values, and colors.</li>
          <li>• <strong className="text-slate-300">Pure SVG:</strong> No canvas, no libraries — clean, scalable vector output you can use anywhere.</li>
          <li>• <strong className="text-slate-300">Export:</strong> Copy the SVG code to clipboard or download as a .svg file.</li>
          <li>• <strong className="text-slate-300">Import CSV:</strong> Paste CSV data (label,value) to quickly populate your chart.</li>
          <li>• <strong className="text-slate-300">Privacy:</strong> Everything happens in your browser — your data never leaves your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}

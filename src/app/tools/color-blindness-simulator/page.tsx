'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Eye, EyeOff, Copy, Download, Image as ImageIcon, Droplets, Check, Type } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CVDType =
  | 'protanopia'
  | 'protanomaly'
  | 'deuteranopia'
  | 'deuteranomaly'
  | 'tritanopia'
  | 'tritanomaly'
  | 'achromatopsia'
  | 'achromatomaly';

interface CVDInfo {
  id: CVDType;
  label: string;
  description: string;
  severity: 'severe' | 'moderate';
  population: string;
}

// ── SVG Color Matrices (Machado-Oliveira-Fernandes model) ──────────────────

const CVD_MATRICES: Record<CVDType, number[]> = {
  protanopia: [0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0],
  protanomaly: [0.817, 0.183, 0, 0, 0, 0.333, 0.667, 0, 0, 0, 0, 0.125, 0.875, 0, 0, 0, 0, 0, 1, 0],
  deuteranopia: [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0],
  deuteranomaly: [0.8, 0.2, 0, 0, 0, 0.258, 0.742, 0, 0, 0, 0, 0.142, 0.858, 0, 0, 0, 0, 0, 1, 0],
  tritanopia: [0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0],
  tritanomaly: [0.967, 0.033, 0, 0, 0, 0, 0.733, 0.267, 0, 0, 0, 0.183, 0.817, 0, 0, 0, 0, 0, 1, 0],
  achromatopsia: [0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0],
  achromatomaly: [0.618, 0.32, 0.062, 0, 0, 0.163, 0.775, 0.062, 0, 0, 0.163, 0.32, 0.516, 0, 0, 0, 0, 0, 1, 0],
};

// ── CVD Info ────────────────────────────────────────────────────────────────

const CVD_TYPES: CVDInfo[] = [
  { id: 'protanopia', label: 'Protanopia', description: 'Red-blind — no red cone response. Reds appear dark, confused with greens.', severity: 'severe', population: '~1% of males' },
  { id: 'protanomaly', label: 'Protanomaly', description: 'Red-weak — reduced red cone sensitivity. Reds appear duller and greener.', severity: 'moderate', population: '~1% of males' },
  { id: 'deuteranopia', label: 'Deuteranopia', description: 'Green-blind — no green cone response. Most common form of dichromacy.', severity: 'severe', population: '~1.5% of males' },
  { id: 'deuteranomaly', label: 'Deuteranomaly', description: 'Green-weak — reduced green sensitivity. Most common CVD (5% of males).', severity: 'moderate', population: '~5% of males' },
  { id: 'tritanopia', label: 'Tritanopia', description: 'Blue-blind — no blue cone response. Very rare, affects blue/yellow perception.', severity: 'severe', population: '~0.003% of population' },
  { id: 'tritanomaly', label: 'Tritanomaly', description: 'Blue-weak — reduced blue sensitivity. Extremely rare.', severity: 'moderate', population: '~0.01% of population' },
  { id: 'achromatopsia', label: 'Achromatopsia', description: 'Complete color blindness — sees only grayscale. Extremely rare.', severity: 'severe', population: '~0.003% of population' },
  { id: 'achromatomaly', label: 'Achromatomaly', description: 'Partial achromatopsia — very low color perception, mostly grayscale with faint hues.', severity: 'moderate', population: 'Extremely rare' },
];

// ── Helper ─────────────────────────────────────────────────────────────────

function matrixToFeColorMatrix(matrix: number[]): string {
  return matrix.map((v) => +v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')).join(' ');
}

// ── Demo color palette ─────────────────────────────────────────────────────

const DEMO_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#f8fafc',
  '#1e293b', '#dc2626', '#15803d', '#1d4ed8', '#7c3aed',
];

// ── Component ───────────────────────────────────────────────────────────────

export default function ColorBlindnessSimulatorPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [activeType, setActiveType] = useState<CVDType>('deuteranomaly');
  const [compareMode, setCompareMode] = useState(false);
  const [customColor, setCustomColor] = useState('#ef4444');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterMatrix = useMemo(() => matrixToFeColorMatrix(CVD_MATRICES[activeType]), [activeType]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const downloadImage = useCallback(() => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      // Apply SVG filter via canvas
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', String(canvas.width));
      svg.setAttribute('height', String(canvas.height));

      const defs = document.createElementNS(svgNS, 'defs');
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', 'cvd');
      const feMatrix = document.createElementNS(svgNS, 'feColorMatrix');
      feMatrix.setAttribute('type', 'matrix');
      feMatrix.setAttribute('values', filterMatrix);
      filter.appendChild(feMatrix);
      defs.appendChild(filter);
      svg.appendChild(defs);

      const imageEl = document.createElementNS(svgNS, 'image');
      imageEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', img.src);
      imageEl.setAttribute('width', String(canvas.width));
      imageEl.setAttribute('height', String(canvas.height));
      imageEl.setAttribute('filter', 'url(#cvd)');
      svg.appendChild(imageEl);

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Draw SVG to canvas, then export as PNG
      const filterImg = new window.Image();
      filterImg.onload = () => {
        ctx.drawImage(filterImg, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${imageName.replace(/\.[^.]+$/, '')}_${activeType}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Simulated image downloaded!');
      };
      filterImg.src = url;
    };
    img.src = image;
  }, [image, imageName, activeType, filterMatrix]);

  const activeInfo = CVD_TYPES.find((c) => c.id === activeType)!;

  // Compute simulated color for the color picker
  const simulatedColor = useMemo(() => {
    const hex = customColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const m = CVD_MATRICES[activeType];
    const nr = Math.round(Math.max(0, Math.min(1, m[0] * r + m[1] * g + m[2] * b + m[4])) * 255);
    const ng = Math.round(Math.max(0, Math.min(1, m[5] * r + m[6] * g + m[7] * b + m[9])) * 255);
    const nb = Math.round(Math.max(0, Math.min(1, m[10] * r + m[11] * g + m[12] * b + m[14])) * 255);

    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }, [customColor, activeType]);

  const copyCss = useCallback(() => {
    const css = `filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cvd'%3E%3CfeColorMatrix type='matrix' values='${filterMatrix}'/%3E%3C/filter%3E%3C/svg%3E#cvd");`;
    navigator.clipboard.writeText(css);
    toast.success('CSS filter copied!');
  }, [filterMatrix]);

  return (
    <ToolLayout title="Color Blindness Simulator" description="Simulate 8 types of color vision deficiency (CVD) on images and colors. Test your designs for accessibility — understand how 350M+ people worldwide experience color.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image Upload */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-400" /> Upload Image
            </h3>

            {!image ? (
              <label className="block w-full border-2 border-dashed border-slate-600 hover:border-brand-500 rounded-lg p-8 text-center cursor-pointer transition-colors">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-400">
                  Drop an image or <span className="text-brand-400">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPEG, WebP, SVG — any size</p>
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">{imageName}</span>
                  <button onClick={clearImage} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>

                <div className="relative rounded-lg overflow-hidden border border-slate-700">
                  {compareMode ? (
                    <div className="flex">
                      <div className="w-1/2 border-r border-slate-600">
                        <p className="text-[10px] text-slate-500 text-center py-1 bg-slate-800">Original</p>
                        <img src={image} alt="Original" className="w-full h-auto" />
                      </div>
                      <div className="w-1/2">
                        <p className="text-[10px] text-slate-500 text-center py-1 bg-slate-800">
                          {activeInfo.label}
                        </p>
                        <div className="relative">
                          <img
                            src={image}
                            alt={`${activeInfo.label} view`}
                            className="w-full h-auto"
                            style={{
                              filter: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cvd'%3E%3CfeColorMatrix type='matrix' values='${filterMatrix}'/%3E%3C/filter%3E%3C/svg%3E#cvd")`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={image}
                        alt={`${activeInfo.label} view`}
                        className="w-full h-auto"
                        style={{
                          filter: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cvd'%3E%3CfeColorMatrix type='matrix' values='${filterMatrix}'/%3E%3C/filter%3E%3C/svg%3E#cvd")`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompareMode((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                      compareMode
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {compareMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {compareMode ? 'Side-by-Side' : 'Compare Mode'}
                  </button>
                  <button
                    onClick={downloadImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download Simulation
                  </button>
                  <button
                    onClick={copyCss}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy CSS Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Picker Test */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-brand-400" /> Color Pick &amp; Test
            </h3>
            <p className="text-xs text-slate-500 mb-3">Pick any color and see how it appears to someone with {activeInfo.label.toLowerCase()}.</p>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer border-2 border-slate-600"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: customColor }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: simulatedColor }} />
                </div>
                <div className="text-xs">
                  <div className="text-slate-300 font-mono">
                    <span className="text-slate-500">Original: </span>
                    {customColor}
                  </div>
                  <div className="text-brand-400 font-mono">
                    <span className="text-slate-500">Simulated: </span>
                    {simulatedColor}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Palette */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-400" /> Palette Test
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Common colors and how they appear with {activeInfo.label.toLowerCase()}. Use this to check if your palette is distinguishable.
            </p>
            <div className="space-y-1">
              {DEMO_COLORS.map((color) => {
                const hex = color.replace('#', '');
                const r = parseInt(hex.slice(0, 2), 16) / 255;
                const g = parseInt(hex.slice(2, 4), 16) / 255;
                const b = parseInt(hex.slice(4, 6), 16) / 255;
                const m = CVD_MATRICES[activeType];
                const nr = Math.round(Math.max(0, Math.min(1, m[0] * r + m[1] * g + m[2] * b + m[4])) * 255);
                const ng = Math.round(Math.max(0, Math.min(1, m[5] * r + m[6] * g + m[7] * b + m[9])) * 255);
                const nb = Math.round(Math.max(0, Math.min(1, m[10] * r + m[11] * g + m[12] * b + m[14])) * 255);
                const simColor = `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
                return (
                  <div key={color} className="flex items-center gap-2 p-1.5">
                    <div className="w-5 h-5 rounded border border-slate-600 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-mono text-slate-500 w-16 flex-shrink-0">{color}</span>
                    <span className="text-slate-600">→</span>
                    <div className="w-5 h-5 rounded border border-slate-600 flex-shrink-0" style={{ backgroundColor: simColor }} />
                    <span className="text-xs font-mono text-brand-400">{simColor}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: CVD Type Selector */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 sticky top-24">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Color Vision Deficiency</h3>
            <div className="space-y-1">
              {CVD_TYPES.map((cvd) => (
                <button
                  key={cvd.id}
                  onClick={() => setActiveType(cvd.id)}
                  className={`w-full text-left px-3 py-2.5 rounded text-xs transition-colors ${
                    activeType === cvd.id
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cvd.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${cvd.severity === 'severe' ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                      {cvd.severity}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-0.5 text-[11px]">{cvd.description}</div>
                  <div className="text-slate-600 text-[10px] mt-0.5">{cvd.population}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-brand-600/5 border border-brand-600/20 rounded text-xs text-slate-400">
              <p className="font-medium text-brand-300 mb-1">Why this matters</p>
              <p className="text-slate-500">
                Over 350 million people worldwide have some form of color vision deficiency. Testing your designs against these simulations helps ensure your UI is accessible to everyone — especially critical for data visualizations, status indicators, and error messages that rely on color alone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

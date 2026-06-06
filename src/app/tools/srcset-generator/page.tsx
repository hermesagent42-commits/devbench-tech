'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  RotateCcw,
  Image,
  Plus,
  Trash2,
  Upload,
  Smartphone,
  Monitor,
  Tablet,
  MonitorSmartphone,
  GripVertical,
  FileCode,
  Eye,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SizeBreakpoint {
  id: string;
  width: number;
  sizeRule: string;
}

interface Preset {
  name: string;
  description: string;
  breakpoints: SizeBreakpoint[];
  sizes: string;
}

const DEFAULT_BREAKPOINT_ID = () => Math.random().toString(36).slice(2, 8);

const PRESETS: Preset[] = [
  {
    name: 'Full-width Hero',
    description: 'Hero image that spans the full viewport width',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 480, sizeRule: '100vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 800, sizeRule: '100vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1200, sizeRule: '100vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1800, sizeRule: '100vw' },
    ],
    sizes: '100vw',
  },
  {
    name: 'Half-width Card',
    description: 'Image in a 2-column grid card layout',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 400, sizeRule: '(max-width: 640px) 100vw, 50vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 800, sizeRule: '(max-width: 640px) 100vw, 50vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1200, sizeRule: '(max-width: 640px) 100vw, 50vw' },
    ],
    sizes: '(max-width: 640px) 100vw, 50vw',
  },
  {
    name: 'Blog Article Image',
    description: 'Article body image with max-width container',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 400, sizeRule: '(max-width: 720px) 100vw, 720px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 720, sizeRule: '(max-width: 720px) 100vw, 720px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1080, sizeRule: '(max-width: 720px) 100vw, 720px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1440, sizeRule: '(max-width: 720px) 100vw, 720px' },
    ],
    sizes: '(max-width: 720px) 100vw, 720px',
  },
  {
    name: 'Sidebar Thumbnail',
    description: 'Small thumbnail in a fixed-width sidebar',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 80, sizeRule: '80px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 160, sizeRule: '80px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 240, sizeRule: '80px' },
    ],
    sizes: '80px',
  },
  {
    name: 'Responsive Gallery',
    description: 'Gallery image that adapts columns at breakpoints',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 300, sizeRule: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 600, sizeRule: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 900, sizeRule: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 1200, sizeRule: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw' },
    ],
    sizes: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw',
  },
  {
    name: 'Logo / Fixed Size',
    description: 'A logo or fixed-size image with HiDPI variants',
    breakpoints: [
      { id: DEFAULT_BREAKPOINT_ID(), width: 100, sizeRule: '100px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 200, sizeRule: '100px' },
      { id: DEFAULT_BREAKPOINT_ID(), width: 300, sizeRule: '100px' },
    ],
    sizes: '100px',
  },
];

function generateDensitySrcset(widths: number[], baseUrl: string = 'image'): string {
  return widths.map((w) => `image-${w}.jpg ${w}w`).join(', ');
}

// Preview viewport sizes
const PREVIEW_VIEWPORTS = [
  { label: 'Mobile', width: 375, icon: Smartphone },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Desktop', width: 1280, icon: Monitor },
  { label: 'Wide', width: 1920, icon: MonitorSmartphone },
];

export default function SrcsetGenerator() {
  const [breakpoints, setBreakpoints] = useState<SizeBreakpoint[]>(() => 
    PRESETS[0].breakpoints.map(b => ({ ...b, id: DEFAULT_BREAKPOINT_ID() }))
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].name);
  const [imageName, setImageName] = useState('photo');
  const [imageFormat, setImageFormat] = useState('jpg');
  const [sizes, setSizes] = useState(PRESETS[0].sizes);
  const [previewVp, setPreviewVp] = useState(768);
  const [useDensity, setUseDensity] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handlePreset = (preset: Preset) => {
    const newBreakpoints = preset.breakpoints.map(b => ({ ...b, id: DEFAULT_BREAKPOINT_ID() }));
    setBreakpoints(newBreakpoints);
    setSizes(preset.sizes);
    setSelectedPreset(preset.name);
  };

  const handleReset = () => handlePreset(PRESETS[0]);

  const sortedBreakpoints = useMemo(() => 
    [...breakpoints].sort((a, b) => a.width - b.width),
    [breakpoints]
  );

  const srcset = useMemo(() => {
    if (useDensity) {
      return breakpoints.map((b, i) => `${imageName}.${imageFormat} ${i + 1}x`).join(', ');
    }
    return sortedBreakpoints.map((b) => `${imageName}-${b.width}.${imageFormat} ${b.width}w`).join(',\n  ');
  }, [breakpoints, sortedBreakpoints, imageName, imageFormat, useDensity]);

  const sizesAttribute = useMemo(() => {
    if (!sizes.trim()) return '100vw';
    return sizes;
  }, [sizes]);

  const selectedImageSize = useMemo(() => {
    if (sortedBreakpoints.length === 0) return 0;
    
    // Find the best image for the current preview viewport
    const targetWidth = Math.round(
      previewVp < 640 ? previewVp : 
      previewVp < 1024 ? previewVp * 0.5 : 
      previewVp * 0.33
    );
    
    // Find the smallest image width >= target (for retina)
    const ideal = sortedBreakpoints.find(b => b.width >= targetWidth);
    return ideal ? ideal.width : sortedBreakpoints[sortedBreakpoints.length - 1].width;
  }, [sortedBreakpoints, previewVp]);

  const addBreakpoint = () => {
    const maxWidth = breakpoints.length > 0 ? Math.max(...breakpoints.map(b => b.width)) : 200;
    const newWidth = maxWidth + 200;
    setBreakpoints(prev => [
      ...prev,
      { id: DEFAULT_BREAKPOINT_ID(), width: newWidth, sizeRule: sizes }
    ]);
  };

  const removeBreakpoint = (id: string) => {
    if (breakpoints.length <= 1) {
      toast.error('Need at least one image variant');
      return;
    }
    setBreakpoints(prev => prev.filter(b => b.id !== id));
  };

  const updateBreakpoint = (id: string, field: 'width' | 'sizeRule', value: string | number) => {
    setBreakpoints(prev => prev.map(b => 
      b.id === id ? { ...b, [field]: field === 'width' ? Math.max(1, parseInt(value as string) || 1) : value } : b
    ));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImageUrl(url);
    setImageName(file.name.replace(/\.[^/.]+$/, ''));
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png') setImageFormat('png');
    if (ext === 'webp') setImageFormat('webp');
    if (ext === 'avif') setImageFormat('avif');
  };

  const handleCopySrcset = useCallback(() => {
    navigator.clipboard.writeText(srcset);
    toast.success('Copied srcset to clipboard!');
  }, [srcset]);

  const handleCopyHtml = useCallback(() => {
    const html = `<img\n  src="${imageName}-${sortedBreakpoints.length > 0 ? sortedBreakpoints[0]?.width || 400 : 400}.${imageFormat}"\n  srcset="${srcset.split('\n  ').join(' ')}"\n  sizes="${sizesAttribute}"\n  alt="..."\n  loading="lazy"\n  decoding="async"\n>`;
    navigator.clipboard.writeText(html);
    toast.success('Copied HTML to clipboard!');
  }, [srcset, imageName, imageFormat, sortedBreakpoints, sizesAttribute]);

  const handleCopyAll = useCallback(() => {
    const html = `<img\n  src="${imageName}-${sortedBreakpoints.length > 0 ? sortedBreakpoints[0]?.width || 400 : 400}.${imageFormat}"\n  srcset="${srcset.split('\n  ').join(' ')}"\n  sizes="${sizesAttribute}"\n  alt="..."\n  loading="lazy"\n  decoding="async"\n>`;
    navigator.clipboard.writeText(html);
    toast.success('Full <img> tag copied!');
  }, [srcset, imageName, imageFormat, sortedBreakpoints, sizesAttribute]);

  return (
    <ToolLayout
      title="Responsive Image (srcset & sizes) Generator"
      description="Generate proper srcset and sizes attributes for responsive images. Upload your image, set breakpoints, pick sizing rules, and get copy-ready HTML — all client-side."
    >
      <div className="space-y-8">
        {/* Presets */}
        <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Layout Presets</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPreset === preset.name
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600 hover:text-slate-200'
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Breakpoints */}
          <div className="p-5 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Image className="w-4 h-4 text-brand-400" />
                Image Variants (width descriptors)
              </h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDensity}
                    onChange={(e) => setUseDensity(e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600"
                  />
                  1x/2x density
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500">Filename:</span>
              <input
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                className="w-32 bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
              <span className="text-slate-500 text-xs">.</span>
              <select
                value={imageFormat}
                onChange={(e) => setImageFormat(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="jpg">jpg</option>
                <option value="png">png</option>
                <option value="webp">webp</option>
                <option value="avif">avif</option>
              </select>
              {!useDensity && <span className="text-slate-500 text-xs">-{breakpoints[0]?.width || 400}.{imageFormat}</span>}
            </div>

            {/* Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-300 hover:border-brand-500/50 hover:text-slate-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Image (optional)
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {breakpoints.map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <input
                    type="number"
                    value={bp.width}
                    onChange={(e) => updateBreakpoint(bp.id, 'width', e.target.value)}
                    className="w-20 bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-brand-500"
                    min={1}
                    step={10}
                  />
                  <span className="text-xs text-slate-500">w</span>
                  {!useDensity && (
                    <span className="text-xs text-slate-600 font-mono truncate flex-1">
                      → {imageName}-{bp.width}.{imageFormat}
                    </span>
                  )}
                  {useDensity && (
                    <span className="text-xs text-slate-600 flex-1">
                      @ {breakpoints.indexOf(bp) + 1}x density
                    </span>
                  )}
                  <button
                    onClick={() => removeBreakpoint(bp.id)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addBreakpoint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-dashed border-slate-600 text-xs text-slate-400 hover:border-brand-500/50 hover:text-brand-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variant
            </button>
          </div>

          {/* Right: Sizes attribute */}
          <div className="p-5 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              sizes Attribute
            </h3>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">
                Defines how much space the image occupies at each viewport
              </label>
              <input
                type="text"
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                placeholder="(max-width: 640px) 100vw, 50vw"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-500 block">Quick select:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '100vw', value: '100vw' },
                  { label: '50vw', value: '50vw' },
                  { label: '33vw', value: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw' },
                  { label: '25vw', value: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw' },
                  { label: '720px max', value: '(max-width: 720px) 100vw, 720px' },
                  { label: '600px fixed', value: '600px' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSizes(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      sizes === opt.value
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage explanation */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-300 mb-1.5">How it works</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-400">srcset</strong> tells the browser which image sizes are available.{' '}
                <strong className="text-slate-400">sizes</strong> tells it how much space the image will occupy at different viewport sizes.{' '}
                The browser picks the best image based on both + device pixel ratio.
              </p>
            </div>
          </div>
        </div>

        {/* Generated Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* srcset output */}
          <div className="p-5 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">srcset</h3>
              <button
                onClick={handleCopySrcset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {srcset}
            </pre>
          </div>

          {/* Full <img> tag */}
          <div className="p-5 rounded-xl bg-surface-light border border-brand-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Full &lt;img&gt; Tag</h3>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-xs border border-brand-500/30 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="bg-slate-900 border border-brand-500/20 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
{`<img
  src="${imageName}-${sortedBreakpoints.length > 0 ? sortedBreakpoints[0]?.width || 400 : 400}.${imageFormat}"
  srcset="${srcset.split('\n  ').join(' ')}"
  sizes="${sizesAttribute}"
  alt="..."
  loading="lazy"
  decoding="async"
>`}
            </pre>
          </div>
        </div>

        {/* Visual Preview */}
        <div className="p-6 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Visual Preview — Image Selected at Each Viewport
            </h3>
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700/50">
              {PREVIEW_VIEWPORTS.map((vp) => (
                <button
                  key={vp.width}
                  onClick={() => setPreviewVp(vp.width)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    previewVp === vp.width
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <vp.icon className="w-3.5 h-3.5" />
                  {vp.label}
                  <span className="text-slate-600">({vp.width}px)</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PREVIEW_VIEWPORTS.map((vp) => {
              const targetWidth = vp.width < 640 ? vp.width : vp.width < 1024 ? vp.width * 0.5 : vp.width * 0.33;
              const bestImage = sortedBreakpoints.find(b => b.width >= targetWidth) 
                || sortedBreakpoints[sortedBreakpoints.length - 1];
              const imageW = bestImage?.width || 0;
              const isActive = previewVp === vp.width;

              return (
                <div
                  key={vp.width}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 border-brand-500/40' 
                      : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                  onClick={() => setPreviewVp(vp.width)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <vp.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-400">{vp.label} ({vp.width}px)</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-400 font-mono">
                      {imageW}w
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {imageName}-{imageW}.{imageFormat}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Target: ~{Math.round(targetWidth)}px → picked ≥{imageW}px
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected for current preview */}
          <div 
            className="relative overflow-hidden rounded-lg border border-slate-700/50 transition-all"
            style={{ maxWidth: `${previewVp}px`, margin: '0 auto' }}
          >
            <div className="bg-slate-900 p-2 border-b border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Viewport: <span className="text-slate-200">{previewVp}px</span>
              </span>
              <span className="text-brand-400 font-mono">
                Image: {imageName}-{selectedImageSize}.{imageFormat} ({selectedImageSize}w)
              </span>
            </div>
            <div className="aspect-video bg-gradient-to-br from-brand-500/10 to-purple-500/10 flex items-center justify-center">
              {uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <Image className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <span className="text-slate-600 text-sm">
                    {imageName}-{selectedImageSize}.{imageFormat}
                  </span>
                  <br />
                  <span className="text-slate-700 text-xs">
                    Upload an image to see actual preview
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-medium transition-colors border border-slate-700/50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Upload, Layers, Image } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type MaskType = 'gradient' | 'svg';

interface MaskPreset {
  label: string;
  description: string;
  maskImage: string;
  type: MaskType;
  defaultSize?: string;
  defaultPosition?: string;
  defaultRepeat?: string;
}

interface MaskState {
  maskImage: string;
  maskType: MaskType;
  maskSize: string;
  maskPosition: string;
  maskRepeat: string;
  maskComposite: string;
}

// ── SVG Mask Data URIs ─────────────────────────────────────────────────────

const SVG_STAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="black"/></svg>'
)}`;

const SVG_HEART = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,88 C20,60 5,45 5,28 C5,13 17,5 28,5 C35,5 43,9 50,20 C57,9 65,5 72,5 C83,5 95,13 95,28 C95,45 80,60 50,88Z" fill="black"/></svg>'
)}`;

const SVG_DIAMOND = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="black"/></svg>'
)}`;

const SVG_CIRCLE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="black"/></svg>'
)}`;

const SVG_HEXAGON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,27 90,73 50,95 10,73 10,27" fill="black"/></svg>'
)}`;

const SVG_BLOB = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,5 C75,5 95,20 95,45 C95,70 75,95 50,95 C25,95 5,80 5,55 C5,30 25,5 50,5Z" fill="black"/></svg>'
)}`;

const SVG_CROSS = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="35" y="5" width="30" height="90" fill="black"/><rect x="5" y="35" width="90" height="30" fill="black"/></svg>'
)}`;

const SVG_TRIANGLE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,8 92,88 8,88" fill="black"/></svg>'
)}`;

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: MaskPreset[] = [
  {
    label: 'Circle Reveal',
    description: 'Radial gradient — transparent edges',
    maskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
    type: 'gradient',
    defaultSize: 'cover',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Soft Edge Fade',
    description: 'Fade top and bottom edges',
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
    type: 'gradient',
    defaultSize: '100% 100%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Diagonal Reveal',
    description: 'Diagonal gradient sweep',
    maskImage: 'linear-gradient(45deg, transparent 20%, black 80%)',
    type: 'gradient',
    defaultSize: 'cover',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Vignette',
    description: 'Soft circular vignette',
    maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 70%)',
    type: 'gradient',
    defaultSize: 'cover',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Star Shape',
    description: 'Star-shaped mask',
    maskImage: `url("${SVG_STAR}")`,
    type: 'svg',
    defaultSize: '80%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Heart Shape',
    description: 'Heart-shaped mask',
    maskImage: `url("${SVG_HEART}")`,
    type: 'svg',
    defaultSize: '70%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Diamond',
    description: 'Diamond-shaped mask',
    maskImage: `url("${SVG_DIAMOND}")`,
    type: 'svg',
    defaultSize: '75%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Hexagon',
    description: 'Hexagon-shaped mask',
    maskImage: `url("${SVG_HEXAGON}")`,
    type: 'svg',
    defaultSize: '80%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Blob',
    description: 'Organic blob shape',
    maskImage: `url("${SVG_BLOB}")`,
    type: 'svg',
    defaultSize: '80%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Cross',
    description: 'Cross-shaped mask',
    maskImage: `url("${SVG_CROSS}")`,
    type: 'svg',
    defaultSize: '70%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Triangle',
    description: 'Triangle-shaped mask',
    maskImage: `url("${SVG_TRIANGLE}")`,
    type: 'svg',
    defaultSize: '80%',
    defaultPosition: 'center',
    defaultRepeat: 'no-repeat',
  },
  {
    label: 'Horizontal Bars',
    description: 'Striped horizontal reveal',
    maskImage: 'linear-gradient(to bottom, black 5px, transparent 5px)',
    type: 'gradient',
    defaultSize: '100% 30px',
    defaultPosition: 'center',
    defaultRepeat: 'repeat',
  },
];

// ── Sample images ──────────────────────────────────────────────────────────

const SAMPLE_IMAGES = [
  { label: '🌅 Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop' },
  { label: '🏔️ Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop' },
  { label: '🌆 City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=500&fit=crop' },
  { label: '🌸 Flowers', url: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&h=500&fit=crop' },
];

// ── Size presets ───────────────────────────────────────────────────────────

const SIZE_PRESETS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: '100%', value: '100% 100%' },
  { label: '80%', value: '80%' },
  { label: '60%', value: '60%' },
  { label: '40%', value: '40%' },
  { label: 'Auto', value: 'auto' },
];

const POSITION_PRESETS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Right', value: 'right' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Top Left', value: 'top left' },
  { label: 'Top Right', value: 'top right' },
  { label: 'Bottom Left', value: 'bottom left' },
  { label: 'Bottom Right', value: 'bottom right' },
];

const REPEAT_OPTIONS = [
  { label: 'No Repeat', value: 'no-repeat' },
  { label: 'Repeat', value: 'repeat' },
  { label: 'Repeat X', value: 'repeat-x' },
  { label: 'Repeat Y', value: 'repeat-y' },
  { label: 'Space', value: 'space' },
  { label: 'Round', value: 'round' },
];

const COMPOSITE_OPTIONS = [
  { label: 'Add (default)', value: 'add' },
  { label: 'Subtract', value: 'subtract' },
  { label: 'Intersect', value: 'intersect' },
  { label: 'Exclude', value: 'exclude' },
];

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateMaskCSS(state: MaskState): string {
  const lines: string[] = [];

  // mask-image
  lines.push(`  mask-image: ${state.maskImage};`);
  lines.push(`  -webkit-mask-image: ${state.maskImage};`);

  // mask-size
  if (state.maskSize !== 'cover') {
    lines.push(`  mask-size: ${state.maskSize};`);
    lines.push(`  -webkit-mask-size: ${state.maskSize};`);
  }

  // mask-position
  if (state.maskPosition !== 'center') {
    lines.push(`  mask-position: ${state.maskPosition};`);
    lines.push(`  -webkit-mask-position: ${state.maskPosition};`);
  }

  // mask-repeat
  if (state.maskRepeat !== 'no-repeat') {
    lines.push(`  mask-repeat: ${state.maskRepeat};`);
    lines.push(`  -webkit-mask-repeat: ${state.maskRepeat};`);
  }

  // mask-composite
  if (state.maskComposite !== 'add') {
    lines.push(`  mask-composite: ${state.maskComposite};`);
    lines.push(`  -webkit-mask-composite: ${state.maskComposite};`);
  }

  return lines.join('\n');
}

function generateFullCSS(state: MaskState): string {
  return `.masked-element {\n${generateMaskCSS(state)}\n}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssMaskPlaygroundPage() {
  const firstPreset = PRESETS[0];
  const [activePreset, setActivePreset] = useState<string>(firstPreset.label);
  const [maskState, setMaskState] = useState<MaskState>({
    maskImage: firstPreset.maskImage,
    maskType: firstPreset.type,
    maskSize: firstPreset.defaultSize || 'cover',
    maskPosition: firstPreset.defaultPosition || 'center',
    maskRepeat: firstPreset.defaultRepeat || 'no-repeat',
    maskComposite: 'add',
  });
  const [sampleImg, setSampleImg] = useState(SAMPLE_IMAGES[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState('');
  const [useCustomSize, setUseCustomSize] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = customImage || sampleImg.url;

  const maskCSS = useMemo(() => generateMaskCSS(maskState), [maskState]);
  const fullCSS = useMemo(() => generateFullCSS(maskState), [maskState]);

  const applyPreset = useCallback((preset: MaskPreset) => {
    setActivePreset(preset.label);
    setMaskState({
      maskImage: preset.maskImage,
      maskType: preset.type,
      maskSize: preset.defaultSize || 'cover',
      maskPosition: preset.defaultPosition || 'center',
      maskRepeat: preset.defaultRepeat || 'no-repeat',
      maskComposite: 'add',
    });
    setCustomSize('');
    setUseCustomSize(false);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [fullCSS]);

  const resetAll = useCallback(() => {
    applyPreset(PRESETS[0]);
  }, [applyPreset]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCustomImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const effectiveSize = useCustomSize && customSize ? customSize : maskState.maskSize;

  // Build inline mask style
  const maskStyle: React.CSSProperties = {
    maskImage: maskState.maskImage,
    WebkitMaskImage: maskState.maskImage,
    maskSize: effectiveSize,
    WebkitMaskSize: effectiveSize,
    maskPosition: maskState.maskPosition,
    WebkitMaskPosition: maskState.maskPosition,
    maskRepeat: maskState.maskRepeat,
    WebkitMaskRepeat: maskState.maskRepeat,
  };

  return (
    <ToolLayout
      title="CSS Mask Playground"
      description="Visually build and test CSS masks — shape an image with gradients or SVG paths. 12 presets, live image preview, and instant CSS generation. Use mask-image, mask-size, mask-position, mask-repeat, and mask-composite to create stunning image reveals — no Photoshop required."
    >
      {/* Presets row */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Mask Presets
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
        <p className="text-xs text-slate-500 mt-1.5">
          {PRESETS.find((p) => p.label === activePreset)?.description || ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-300">
              Preview — {customImage ? 'Custom Image' : sampleImg.label}
            </label>
            <div className="flex gap-1.5">
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.label}
                  onClick={() => { setCustomImage(null); setSampleImg(img); }}
                  className={`text-xs px-2 py-1 rounded-md transition-all ${
                    !customImage && sampleImg.url === img.url
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                  title={img.label}
                >
                  {img.label}
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`text-xs px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                  customImage
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
                title="Upload your own image"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Preview area */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900 min-h-[320px] flex items-center justify-center">
            {/* Checkerboard behind for transparency visibility */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #1e293b 25%, transparent 25%),
                  linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1e293b 75%),
                  linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            />
            <img
              src={displayImage}
              alt="Mask preview"
              className="relative z-10 w-full h-auto max-h-[420px] object-cover"
              style={maskStyle}
              onError={() => toast.error('Failed to load image')}
            />
          </div>

          {/* Mask shape indicator */}
          {activePreset !== 'Circle Reveal' && (
            <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-brand-400">Current Mask</h4>
                  <code className="text-[11px] text-slate-300 font-mono break-all">
                    {maskState.maskImage.length > 80
                      ? maskState.maskImage.slice(0, 80) + '…'
                      : maskState.maskImage}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls + CSS */}
        <div className="flex flex-col gap-4">
          {/* Mask Size */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">
              Mask Size
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setUseCustomSize(false);
                    setMaskState((prev) => ({ ...prev, maskSize: s.value }));
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    !useCustomSize && maskState.maskSize === s.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <input
                type="text"
                placeholder="custom..."
                value={customSize}
                onChange={(e) => {
                  setCustomSize(e.target.value);
                  setUseCustomSize(true);
                }}
                className={`text-xs px-2 py-1 rounded-md bg-surface-lighter text-slate-300 border w-24 placeholder-slate-600 focus:outline-none focus:border-brand-500 ${
                  useCustomSize ? 'border-brand-500/50' : 'border-slate-700/50'
                }`}
              />
            </div>
          </div>

          {/* Mask Position */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">
              Mask Position
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POSITION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setMaskState((prev) => ({ ...prev, maskPosition: p.value }))}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    maskState.maskPosition === p.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mask Repeat */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">
              Mask Repeat
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setMaskState((prev) => ({ ...prev, maskRepeat: r.value }))}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    maskState.maskRepeat === r.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mask Composite */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">
              Mask Composite
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMPOSITE_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setMaskState((prev) => ({ ...prev, maskComposite: c.value }))}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    maskState.maskComposite === c.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* CSS Output */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">CSS Output</label>
              <div className="flex gap-2">
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={copyCSS}
                  className="btn-secondary flex items-center gap-1 text-xs py-1 px-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy CSS
                </button>
              </div>
            </div>
            <pre className="card bg-slate-950 border-slate-700/50 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto min-h-[120px]">
              <code>{fullCSS}</code>
            </pre>
          </div>

          {/* Info card */}
          <div className="card border-brand-500/20 bg-brand-500/5 p-3">
            <div className="flex items-start gap-2">
              <Image className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-semibold text-brand-400">CSS Mask Support</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  CSS <code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">mask-image</code> is
                  supported in all modern browsers with the <code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">-webkit-</code> prefix.
                  Use masks to create image cutouts, reveals, and non-rectangular images — all without an image editor.
                  Gradients create smooth fades; SVG data URIs create crisp shapes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

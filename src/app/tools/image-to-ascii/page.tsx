'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Upload, RotateCcw, Image, Sun, Contrast, Type, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const CHAR_SETS: { name: string; chars: string }[] = [
  { name: 'Standard (10)', chars: ' .:-=+*#%@' },
  { name: 'Detailed (16)', chars: ' `.\u2212\u2018:_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@' },
  { name: 'Blocks (5)', chars: ' ░▒▓█' },
  { name: 'Minimal (7)', chars: ' .oO8@' },
  { name: 'Numeric (10)', chars: ' 123456789' },
  { name: 'Braille Art', chars: ' ⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿' },
  { name: 'Hearts', chars: ' ♡♥❤💕💖💗💘💙💚💛💜' },
];

const SAMPLE_IMAGES = [
  {
    label: 'DevBench Logo',
    data: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#0f172a"/><text x="100" y="90" text-anchor="middle" fill="#38bdf8" font-size="48" font-family="monospace" font-weight="900">&lt;/&gt;</text><text x="100" y="140" text-anchor="middle" fill="#818cf8" font-size="20" font-family="sans-serif" font-weight="700">DevBench</text></svg>'),
  },
  {
    label: 'Gradient Sun',
    data: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><radialGradient id="sun"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f97316"/><stop offset="70%" stop-color="#ef4444"/><stop offset="100%" stop-color="#7c2d12"/></radialGradient></defs><rect width="200" height="200" fill="#0a0a1a"/><circle cx="100" cy="100" r="70" fill="url(#sun)"/></svg>'),
  },
  {
    label: 'Checkerboard',
    data: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#1e293b"/><rect x="0" y="0" width="100" height="100" fill="#f1f5f9"/><rect x="100" y="100" width="100" height="100" fill="#f1f5f9"/><circle cx="100" cy="100" r="30" fill="#38bdf8"/></svg>'),
  },
  {
    label: 'Circle Pattern',
    data: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#0f172a"/><circle cx="60" cy="60" r="30" fill="#ef4444" opacity="0.7"/><circle cx="140" cy="60" r="30" fill="#10b981" opacity="0.7"/><circle cx="60" cy="140" r="30" fill="#3b82f6" opacity="0.7"/><circle cx="140" cy="140" r="30" fill="#f59e0b" opacity="0.7"/></svg>'),
  },
];

function getBrightness(r: number, g: number, b: number): number {
  // Luminance formula: 0.299*R + 0.587*G + 0.114*B
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function ImageToAsciiPage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [asciiOutput, setAsciiOutput] = useState('');
  const [asciiColored, setAsciiColored] = useState<string[][]>([]);
  const [width, setWidth] = useState(80);
  const [charSetIdx, setCharSetIdx] = useState(1); // Detailed
  const [colorMode, setColorMode] = useState<'mono' | 'color'>('mono');
  const [invert, setInvert] = useState(false);
  const [contrast, setContrast] = useState(100);
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);

  const charSet = CHAR_SETS[charSetIdx].chars;

  const processImage = useCallback(
    async (src: string, fileName?: string, fileType?: string) => {
      setLoading(true);
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = src;
        });

        const canvas = canvasRef.current;
        if (!canvas) { setLoading(false); return; }

        // Calculate height to maintain aspect ratio, accounting for character aspect ratio (~2:1)
        const aspectRatio = img.height / img.width;
        const charAspectRatio = 2.0; // monospace chars are roughly 2:1 height:width
        const height = Math.max(4, Math.floor(width * aspectRatio / charAspectRatio));

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setLoading(false); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const imageDataObj = ctx.getImageData(0, 0, width, height);
        const pixels = imageDataObj.data;

        // Calculate contrast factor
        const contrastFactor = (contrast * 2.55) / 255; // scale to 0-2.55 range

        let monoResult = '';
        const colorGrid: string[][] = [];

        const charCount = charSet.length;

        for (let y = 0; y < height; y++) {
          const colorRow: string[] = [];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let r = pixels[idx];
            let g = pixels[idx + 1];
            let b = pixels[idx + 2];
            const a = pixels[idx + 3];

            if (a < 128) {
              monoResult += ' ';
              colorRow.push('');
              continue;
            }

            // Apply contrast
            r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
            g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
            b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));

            const brightness = getBrightness(r, g, b);
            let normalized = brightness / 255;

            if (invert) normalized = 1 - normalized;

            const charIdx = Math.min(charCount - 1, Math.floor(normalized * charCount));
            const ch = charSet[charIdx] || ' ';

            monoResult += ch;
            const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
            colorRow.push(hex);
          }
          monoResult += '\n';
          colorGrid.push(colorRow);
        }

        setAsciiOutput(monoResult.trimEnd());
        setAsciiColored(colorGrid);
        setImageData(src);
        setFileInfo(fileName ? { name: fileName, type: fileType || '' } : null);
      } catch (err) {
        toast.error('Failed to process image');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [width, charSet, invert, contrast]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        processImage(src, file.name, file.type);
      };
      reader.readAsDataURL(file);
    },
    [processImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            handleFile(blob);
            return;
          }
        }
      }
    },
    [handleFile]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const loadSample = useCallback(
    (index: number) => {
      processImage(SAMPLE_IMAGES[index].data, SAMPLE_IMAGES[index].label, 'image/svg+xml');
    },
    [processImage]
  );

  const copyAscii = useCallback(() => {
    navigator.clipboard.writeText(asciiOutput).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Copy failed')
    );
  }, [asciiOutput]);

  const copyAsHtml = useCallback(() => {
    if (colorMode !== 'color' || asciiColored.length === 0) return;
    const lines: string[] = [];
    for (const row of asciiColored) {
      let line = '';
      for (const hex of row) {
        if (!hex) {
          line += ' ';
        } else {
          line += `<span style="color:${hex}">█</span>`;
        }
      }
      lines.push(line);
    }
    const html = `<pre style="background:#0f172a;color:#e2e8f0;padding:1rem;font-size:6px;line-height:6px;letter-spacing:0;font-family:monospace;overflow:auto">${lines.join('<br>')}</pre>`;
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([asciiOutput], { type: 'text/plain' }),
      }),
    ]).then(
      () => toast.success('Copied as colored HTML!'),
      () => toast.error('Copy failed')
    );
  }, [colorMode, asciiColored, asciiOutput]);

  const downloadTxt = useCallback(() => {
    const blob = new Blob([asciiOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [asciiOutput]);

  const stats = {
    chars: asciiOutput.length,
    lines: asciiOutput.split('\n').length,
    cols: width,
    uniqueChars: new Set(asciiOutput.replace(/\s/g, '')).size,
  };

  return (
    <ToolLayout
      title="Image to ASCII Art Converter"
      description="Convert any image to ASCII art — upload, drag-and-drop, or paste. Adjust resolution, choose character sets, toggle color mode, and export to text or colored HTML."
    >
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input & Controls */}
        <div className="space-y-4">
          {/* Upload area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="card relative overflow-hidden"
          >
            {imageData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Image className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="text-sm text-slate-300 truncate">
                      {fileInfo?.name || 'Sample image'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setImageData(null);
                      setAsciiOutput('');
                      setAsciiColored([]);
                      setFileInfo(null);
                    }}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <img
                  src={imageData}
                  alt="Uploaded"
                  className="w-full max-h-[200px] object-contain rounded-lg bg-slate-900/50"
                />
              </div>
            ) : (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700/50 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
                >
                  <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3 group-hover:text-brand-400 transition-colors" />
                  <p className="text-sm text-slate-400 mb-1">
                    <span className="text-brand-400 font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">SVG, PNG, JPG, GIF — or paste from clipboard</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            )}

            {/* Samples */}
            {!imageData && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Or try a sample:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {SAMPLE_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => loadSample(i)}
                      className="px-3 py-1.5 text-xs rounded-md border border-slate-700/50 bg-surface hover:border-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="card space-y-4">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Sun className="w-4 h-4 text-brand-400" />
              Settings
            </h3>

            {/* Width slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Width (characters)</label>
                <span className="text-xs font-mono text-slate-300">{width}</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>20 (small)</span>
                <span>200 (detailed)</span>
              </div>
            </div>

            {/* Character set */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Character Set</label>
              <div className="grid grid-cols-2 gap-1">
                {CHAR_SETS.map((set, i) => (
                  <button
                    key={set.name}
                    onClick={() => setCharSetIdx(i)}
                    className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-all ${
                      charSetIdx === i
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-slate-700/50 bg-surface text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    <div className="font-medium mb-0.5">{set.name}</div>
                    <div className="text-[10px] opacity-60 truncate">{set.chars}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color mode */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Mode</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setColorMode('mono')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    colorMode === 'mono'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 bg-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3 h-3 inline mr-1" />
                  Monochrome
                </button>
                <button
                  onClick={() => setColorMode('color')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    colorMode === 'color'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 bg-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3 h-3 inline mr-1" />
                  Color Blocks
                </button>
              </div>
            </div>

            {/* Invert */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              Invert brightness (white-on-black)
            </label>

            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Contrast</label>
                <span className="text-xs font-mono text-slate-300">{contrast}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer accent-brand-500"
              />
            </div>

            {/* Reprocess button */}
            <button
              onClick={() => {
                if (imageData) processImage(imageData, fileInfo?.name, fileInfo?.type);
              }}
              disabled={!imageData || loading}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Processing...' : 'Apply Settings'}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          {/* Stats bar */}
          {asciiOutput && (
            <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
              <span>{stats.lines} lines</span>
              <span>×</span>
              <span>{stats.cols} columns</span>
              <span>·</span>
              <span>{stats.uniqueChars} unique chars</span>
              <span>·</span>
              <span>{(stats.chars / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {/* Action buttons */}
          {asciiOutput && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyAscii}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 bg-surface text-slate-300 hover:text-white hover:border-slate-600/50 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Text
              </button>
              {colorMode === 'color' && (
                <button
                  onClick={copyAsHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 bg-surface text-slate-300 hover:text-white hover:border-slate-600/50 transition-colors"
                >
                  <Palette className="w-3 h-3" />
                  Copy HTML
                </button>
              )}
              <button
                onClick={downloadTxt}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 bg-surface text-slate-300 hover:text-white hover:border-slate-600/50 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download .txt
              </button>
            </div>
          )}

          {/* Output area */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-slate-400">Processing image...</span>
              </div>
            ) : asciiOutput ? (
              colorMode === 'color' ? (
                <pre
                  ref={previewRef}
                  className="font-mono leading-[0.55] tracking-[-0.05em] text-[7px] sm:text-[8px] bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto"
                  style={{ letterSpacing: '0' }}
                >
                  {asciiColored.map((row, y) => (
                    <div key={y} className="whitespace-pre" style={{ lineHeight: '0.55' }}>
                      {row.map((hex, x) =>
                        hex ? (
                          <span key={x} style={{ color: hex }}>
                            █
                          </span>
                        ) : (
                          <span key={x}> </span>
                        )
                      )}
                    </div>
                  ))}
                </pre>
              ) : (
                <pre className="font-mono leading-[0.6] tracking-[-0.05em] text-[7px] sm:text-[8px] text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre">
                  {asciiOutput}
                </pre>
              )
            ) : (
              <div className="flex items-center justify-center py-20 text-slate-600 text-sm">
                <div className="text-center">
                  <Image className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Upload an image to see ASCII art here</p>
                  <p className="text-xs mt-1 text-slate-700">
                    Drag & drop, click, or paste from clipboard
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          {asciiOutput && (
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <p className="text-xs text-slate-400">
                <strong className="text-slate-300">Tip:</strong> For best results, use images with strong contrast and clear shapes. Lower widths (40-80) work well for terminal/CLI display. The colored block mode uses{' '}
                <code className="text-brand-400">█</code> characters with CSS colors for a pixel-art effect.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">About Image to ASCII Art</h3>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>Images are processed entirely in your browser using the Canvas API — no data is ever uploaded to a server.</li>
          <li>The brightness of each pixel is mapped to a character from the selected character set, with darker pixels getting denser characters.</li>
          <li><strong>Monochrome mode</strong> produces plain-text ASCII art that works anywhere — terminals, source code comments, emails, and social media.</li>
          <li><strong>Color mode</strong> renders colored blocks matching the original image colors — copy as HTML for embedding in websites or rich documents.</li>
          <li>The <strong>Detailed</strong> character set (16 characters) gives the best results for most images. Use <strong>Braille Art</strong> for a unique textured look.</li>
          <li>Increase <strong>Contrast</strong> to make edges sharper; decrease it to capture subtle gradients.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}

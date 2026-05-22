'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Upload, Image, ArrowLeftRight, FileImage, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'encode' | 'decode';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
}

export default function ImageBase64Page() {
  const [tab, setTab] = useState<Tab>('encode');
  const [base64Output, setBase64Output] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [decodedSrc, setDecodedSrc] = useState('');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState(300);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Encode: file to Base64 ────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPEG, GIF, SVG, WebP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64Output(result);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setFileInfo({
          name: file.name,
          size: file.size,
          type: file.type,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = result;
    };
    reader.onerror = () => {
      toast.error('Failed to read file. Try again.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const copyBase64 = useCallback(() => {
    if (!base64Output) return;
    navigator.clipboard.writeText(base64Output).then(
      () => toast.success('Base64 copied to clipboard!'),
      () => toast.error('Failed to copy'),
    );
  }, [base64Output]);

  const clearEncode = useCallback(() => {
    setBase64Output('');
    setFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Decode: Base64 to image ───────────────────────────────────────────────

  const handleDecode = useCallback(() => {
    setDecodeError(null);
    setDecodedSrc('');
    setFileInfo(null);

    const input = base64Input.trim();
    if (!input) {
      setDecodeError('Paste a Base64 image string to decode.');
      return;
    }

    // Accept both raw base64 and data URI format
    const dataUri = input.startsWith('data:image/') ? input : `data:image/png;base64,${input}`;

    const img = new window.Image();
    img.onload = () => {
      setDecodedSrc(dataUri);
      setFileInfo({
        name: 'decoded-image',
        size: 0,
        type: input.startsWith('data:image/')
          ? input.split(';')[0].replace('data:', '')
          : 'image/png',
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      setDecodeError('Invalid Base64 image string. Check your input and try again.');
    };
    img.src = dataUri;
  }, [base64Input]);

  const downloadDecoded = useCallback(() => {
    if (!decodedSrc) return;
    const ext = fileInfo?.type.split('/')[1] || 'png';
    const a = document.createElement('a');
    a.href = decodedSrc;
    a.download = `decoded-image.${ext}`;
    a.click();
  }, [decodedSrc, fileInfo]);

  const clearDecode = useCallback(() => {
    setBase64Input('');
    setDecodedSrc('');
    setDecodeError(null);
    setFileInfo(null);
  }, []);

  // ── Clipboard paste support for encode tab ────────────────────────────────

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (tab !== 'encode') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [tab, handleFile]);

  // ── Format helpers ────────────────────────────────────────────────────────

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const base64CharCount = base64Output ? base64Output.replace(/^data:image\/\w+;base64,/, '').length : 0;

  return (
    <ToolLayout
      title="Image to Base64 Converter"
      description="Convert images to Base64 strings and back. Drag-and-drop, paste from clipboard, decode Base64 to preview — 100% client-side, no uploads."
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-lighter inline-flex">
        <button
          onClick={() => setTab('encode')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'encode'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Image → Base64
        </button>
        <button
          onClick={() => setTab('decode')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'decode'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Base64 → Image
        </button>
      </div>

      {tab === 'encode' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-300">Upload an Image</label>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all min-h-[240px] flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? 'border-brand-400 bg-brand-500/10'
                  : 'border-slate-600/50 hover:border-slate-500 hover:bg-surface-lighter'
              }`}
            >
              {base64Output && fileInfo ? (
                <>
                  <img
                    src={base64Output}
                    alt="Preview"
                    className="max-w-full rounded-lg shadow-lg"
                    style={{ maxHeight: `${previewSize}px` }}
                  />
                  <p className="text-xs text-slate-500 mt-2">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <Upload className={`w-12 h-12 ${dragOver ? 'text-brand-400' : 'text-slate-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${dragOver ? 'text-brand-400' : 'text-slate-400'}`}>
                      {dragOver ? 'Drop image here' : 'Drag & drop an image here'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">or click to browse — also paste from clipboard (Ctrl+V)</p>
                  </div>
                  <p className="text-xs text-slate-600">PNG, JPEG, GIF, SVG, WebP, BMP, ICO</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File info */}
            {fileInfo && (
              <div className="card space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-medium text-white truncate">{fileInfo.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-600">Type: </span>
                    {fileInfo.type}
                  </div>
                  <div>
                    <span className="text-slate-600">Size: </span>
                    {formatSize(fileInfo.size)}
                  </div>
                  <div>
                    <span className="text-slate-600">Dimensions: </span>
                    {fileInfo.width}×{fileInfo.height}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearEncode}
                disabled={!base64Output}
                className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <label className="text-xs text-slate-500 self-center ml-auto">
                Preview size:{' '}
                <input
                  type="range"
                  min="100"
                  max="600"
                  value={previewSize}
                  onChange={(e) => setPreviewSize(Number(e.target.value))}
                  className="w-20 align-middle accent-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Right: Base64 output */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-300">
              Base64 Output{' '}
              {base64CharCount > 0 && (
                <span className="text-slate-600 font-normal">
                  ({base64CharCount.toLocaleString()} chars)
                </span>
              )}
            </label>

            <textarea
              className="input-field flex-1 min-h-[300px] font-mono text-xs resize-y"
              readOnly
              value={base64Output}
              placeholder="Base64 string will appear here after uploading an image..."
              spellCheck={false}
            />

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyBase64}
                disabled={!base64Output}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4" />
                Copy Base64
              </button>
              <button
                onClick={() => {
                  if (!base64Output) return;
                  const a = document.createElement('a');
                  a.href = base64Output;
                  a.download = fileInfo?.name || 'image.png';
                  a.click();
                }}
                disabled={!base64Output}
                className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download Image
              </button>
            </div>

            {/* Usage tips */}
            <div className="card bg-surface-lighter border-slate-700/30 space-y-1.5">
              <p className="text-xs font-medium text-slate-400">💡 Usage tips</p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>Paste in <code className="text-brand-400/80 bg-brand-500/10 px-1 rounded">src=&quot;...&quot;</code> for inline images in HTML</li>
                <li>Use in CSS: <code className="text-brand-400/80 bg-brand-500/10 px-1 rounded">background-image: url(...)</code></li>
                <li>Embed small icons to reduce HTTP requests</li>
                <li>Works in JSON payloads, markdown, and emails</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Base64 input */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-300">Base64 String</label>
            <textarea
              className="input-field flex-1 min-h-[300px] font-mono text-xs resize-y"
              placeholder="Paste a Base64 image string (data URI or raw Base64)..."
              value={base64Input}
              onChange={(e) => setBase64Input(e.target.value)}
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={handleDecode} className="btn-primary flex items-center gap-1.5 text-sm">
                <Image className="w-4 h-4" />
                Decode &amp; Preview
              </button>
              <button onClick={clearDecode} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-300">Image Preview</label>

            <div className="card flex-1 min-h-[300px] flex items-center justify-center">
              {decodeError ? (
                <div className="text-center">
                  <X className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">{decodeError}</p>
                </div>
              ) : decodedSrc ? (
                <div className="text-center">
                  <img
                    src={decodedSrc}
                    alt="Decoded"
                    className="max-w-full rounded-lg shadow-lg"
                    style={{ maxHeight: `${previewSize}px` }}
                  />
                  {fileInfo && (
                    <p className="text-xs text-slate-500 mt-3">
                      {fileInfo.width}×{fileInfo.height} — {fileInfo.type}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Image className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Paste a Base64 string and click Decode</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadDecoded}
                disabled={!decodedSrc}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download Image
              </button>
              <label className="text-xs text-slate-500 self-center ml-auto">
                Preview size:{' '}
                <input
                  type="range"
                  min="100"
                  max="600"
                  value={previewSize}
                  onChange={(e) => setPreviewSize(Number(e.target.value))}
                  className="w-20 align-middle accent-brand-500"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

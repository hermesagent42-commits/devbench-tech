'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  ArrowLeftRight, Copy, Trash2, Upload, Download, FileImage,
  FileText, FileCode, File, Check, AlertCircle, Info,
  Eye, EyeOff, Clipboard, Link2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'encode' | 'decode';

interface EncodedFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface DecodedInfo {
  mimeType: string;
  isBase64: boolean;
  dataSize: number;
  charset: string | null;
  preview: string | null;    // text content for display
  imagePreview: string | null; // image data URL for rendering
  rawData: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const MIME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'image': FileImage,
  'text': FileText,
  'font': FileCode,
  'audio': FileCode,
  'video': FileCode,
  'application/javascript': FileCode,
  'application/json': FileCode,
  'application/xml': FileCode,
  'text/html': FileCode,
};

function getFileIcon(mimeType: string): React.ComponentType<{ className?: string }> {
  const group = mimeType.split('/')[0];
  const exact = mimeType;

  if (MIME_ICONS[exact]) return MIME_ICONS[exact];
  if (MIME_ICONS[group]) return MIME_ICONS[group];
  return File;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Decoder ────────────────────────────────────────────────────────────────

function parseDataUrl(dataUrl: string): DecodedInfo | null {
  // Match: data:[<MIME-type>][;charset=<charset>][;base64],<data>
  const regex = /^data:([^;,]*)?(?:;charset=([^;,]+))?(?:(;base64))?,([\s\S]*)$/;
  const match = dataUrl.trim().match(regex);
  if (!match) return null;

  const mimeType = match[1] || 'text/plain';
  const charset = match[2] || null;
  const isBase64 = match[3] === ';base64';
  const rawData = match[4];

  const dataSize = isBase64
    ? Math.floor((rawData.length * 3) / 4)
    : rawData.length;

  let preview: string | null = null;
  let imagePreview: string | null = null;

  try {
    if (isBase64) {
      const decoded = atob(rawData);
      if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
        imagePreview = dataUrl;
      } else if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/javascript' ||
        mimeType === 'application/xml' ||
        mimeType.includes('svg') ||
        mimeType.includes('html')
      ) {
        preview = decoded;
      } else {
        // Generic: try to show as text
        preview = decoded;
      }
    } else {
      // Not base64 — URL-encoded
      try {
        const decoded = decodeURIComponent(rawData);
        if (mimeType.startsWith('text/') || mimeType === 'application/json') {
          preview = decoded;
        } else {
          preview = decoded;
        }
      } catch {
        preview = rawData;
      }
    }
  } catch {
    preview = null;
  }

  return { mimeType, isBase64, dataSize, charset, preview, imagePreview, rawData };
}

// ── Data URL stats helpers ─────────────────────────────────────────────────

function countDataUrlStats(url: string): { lines: number; chars: number; words: number } {
  const decoded = parseDataUrl(url);
  const text = decoded?.preview || url;
  return {
    lines: text.split('\n').length,
    chars: text.length,
    words: text.split(/\s+/).filter(Boolean).length,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DataUrlConverterPage() {
  const [tab, setTab] = useState<Tab>('encode');

  // Encode state
  const [encodedFiles, setEncodedFiles] = useState<EncodedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textEncodeInput, setTextEncodeInput] = useState('');
  const [textMimeType, setTextMimeType] = useState('text/plain');
  const [textDataUrl, setTextDataUrl] = useState('');

  // Decode state
  const [decodeInput, setDecodeInput] = useState('');
  const [decodedInfo, setDecodedInfo] = useState<DecodedInfo | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  // ── Encode helpers ─────────────────────────────────────────────────────────

  const handleFiles = useCallback((files: FileList | File[]) => {
    setEncodeError(null);
    const fileArray = Array.from(files);

    const oversized = fileArray.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setEncodeError(`Skipped ${oversized.length} file(s) over 10 MB limit: ${oversized.map(f => f.name).join(', ')}`);
    }

    const validFiles = fileArray.filter(f => f.size <= MAX_FILE_SIZE);

    for (const file of validFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setEncodedFiles(prev => [...prev, {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
        }]);
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setEncodedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedOutput === index) setSelectedOutput(null);
  }, [selectedOutput]);

  const handleTextEncode = useCallback(() => {
    if (!textEncodeInput) return;
    const encoded = encodeURIComponent(textEncodeInput);
    setTextDataUrl(`data:${textMimeType},${encoded}`);
  }, [textEncodeInput, textMimeType]);

  const copyDataUrl = useCallback((dataUrl: string) => {
    navigator.clipboard.writeText(dataUrl).then(
      () => toast.success('Data URL copied!'),
      () => toast.error('Failed to copy')
    );
  }, []);

  const downloadDataUrl = useCallback((dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }, []);

  // ── Decode helpers ─────────────────────────────────────────────────────────

  const handleDecode = useCallback(() => {
    setDecodeError(null);
    if (!decodeInput.trim()) {
      setDecodedInfo(null);
      return;
    }

    if (!decodeInput.trim().startsWith('data:')) {
      setDecodeError('Not a valid data URL — must start with "data:"');
      setDecodedInfo(null);
      return;
    }

    const result = parseDataUrl(decodeInput);
    if (!result) {
      setDecodeError('Invalid data URL format — could not parse.');
      setDecodedInfo(null);
      return;
    }

    setDecodedInfo(result);
  }, [decodeInput]);

  const clearDecode = useCallback(() => {
    setDecodeInput('');
    setDecodedInfo(null);
    setDecodeError(null);
    setShowRawData(false);
  }, []);

  const truncateDataUrl = useCallback((url: string, maxLen = 80) => {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen - 3) + '...';
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Data URL Converter"
      description="Encode files and text to data: URLs for inline embedding. Decode existing data: URLs to view metadata, preview content, and extract raw data."
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
          Encode
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
          Decode
        </button>
      </div>

      {/* ── ENCODE TAB ──────────────────────────────────────────────────────── */}
      {tab === 'encode' && (
        <div className="space-y-8">
          {/* File upload */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-400" />
              Encode Files
            </h3>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-brand-400 bg-brand-500/5'
                  : 'border-slate-600/50 hover:border-slate-500 hover:bg-surface-light'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
              <p className="text-slate-300 font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-slate-500 text-sm">
                Any file type — max 10 MB per file
              </p>
            </div>

            {encodeError && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {encodeError}
              </div>
            )}

            {/* Encoded files list */}
            {encodedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                {encodedFiles.map((file, idx) => {
                  const Icon = getFileIcon(file.mimeType);
                  const isSelected = selectedOutput === idx;
                  const stats = countDataUrlStats(file.dataUrl);

                  return (
                    <div key={idx} className="rounded-lg bg-surface-light border border-slate-700/50 overflow-hidden">
                      {/* File header */}
                      <div
                        onClick={() => setSelectedOutput(isSelected ? null : idx)}
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-lighter transition-colors"
                      >
                        <Icon className="w-5 h-5 text-brand-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {file.mimeType} · {formatBytes(file.size)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyDataUrl(file.dataUrl); }}
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Copy data URL"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadDataUrl(file.dataUrl, file.name); }}
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded view */}
                      {isSelected && (
                        <div className="border-t border-slate-700/50 p-4 space-y-3">
                          {/* Stats */}
                          <div className="flex flex-wrap gap-3">
                            <div className="px-3 py-1.5 rounded-md bg-surface-lighter text-xs text-slate-300">
                              <span className="text-slate-500">Length:</span> {stats.chars.toLocaleString()} chars
                            </div>
                            <div className="px-3 py-1.5 rounded-md bg-surface-lighter text-xs text-slate-300">
                              <span className="text-slate-500">Lines:</span> {stats.lines}
                            </div>
                            <div className="px-3 py-1.5 rounded-md bg-surface-lighter text-xs text-slate-300">
                              <span className="text-slate-500">Type:</span> {file.mimeType}
                            </div>
                          </div>

                          {/* Preview for images */}
                          {file.mimeType.startsWith('image/') && (
                            <div className="rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/50 flex items-center justify-center p-4">
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="max-w-full max-h-64 object-contain rounded"
                              />
                            </div>
                          )}

                          {/* Preview for SVGs */}
                          {file.mimeType.includes('svg') && (
                            <div className="rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/50 flex items-center justify-center p-4">
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="max-w-full max-h-64 rounded"
                              />
                            </div>
                          )}

                          {/* Preview for text */}
                          {(file.mimeType.startsWith('text/') || file.mimeType === 'application/json') && (
                            <div className="rounded-lg overflow-hidden border border-slate-700/50">
                              <div className="px-3 py-1.5 border-b border-slate-700/50 flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs text-slate-400 font-mono">Content Preview</span>
                              </div>
                              <pre className="p-4 text-xs font-mono text-slate-300 max-h-48 overflow-auto whitespace-pre-wrap">
                                {file.dataUrl.slice(file.dataUrl.indexOf(',') + 1).length > 2000
                                  ? atob(file.dataUrl.split(',')[1]).slice(0, 2000) + '\n... (truncated)'
                                  : atob(
                                    file.dataUrl.split(',')[1]
                                  )}
                              </pre>
                            </div>
                          )}

                          {/* Raw data URL */}
                          <div>
                            <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                              Data URL ({formatBytes(file.dataUrl.length)})
                            </label>
                            <div className="relative group">
                              <textarea
                                readOnly
                                value={file.dataUrl}
                                rows={6}
                                className="input-field w-full min-h-[120px] font-mono text-xs resize-y text-slate-300"
                              />
                              <button
                                onClick={() => copyDataUrl(file.dataUrl)}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Clear all */}
                <div className="flex justify-end">
                  <button
                    onClick={() => { setEncodedFiles([]); setSelectedOutput(null); }}
                    className="btn-secondary flex items-center gap-1.5 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text encode */}
          <div className="border-t border-slate-700/50 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              Encode Text
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Text</label>
                <textarea
                  value={textEncodeInput}
                  onChange={(e) => setTextEncodeInput(e.target.value)}
                  placeholder="Enter text to encode..."
                  className="input-field w-full min-h-[120px] font-mono text-sm resize-y"
                  spellCheck={false}
                />
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={textMimeType}
                    onChange={(e) => setTextMimeType(e.target.value)}
                    className="input-field py-1.5 px-3 text-sm"
                  >
                    <option value="text/plain">text/plain</option>
                    <option value="text/html">text/html</option>
                    <option value="text/css">text/css</option>
                    <option value="application/json">application/json</option>
                    <option value="text/javascript">text/javascript</option>
                    <option value="text/csv">text/csv</option>
                  </select>
                  <button onClick={handleTextEncode} className="btn-primary flex items-center gap-1.5 text-sm">
                    <Link2 className="w-4 h-4" />
                    Encode
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Data URL</label>
                <textarea
                  readOnly
                  value={textDataUrl}
                  placeholder="Result will appear here..."
                  className="input-field w-full min-h-[120px] font-mono text-xs resize-y text-slate-300"
                />
                {textDataUrl && (
                  <button
                    onClick={() => copyDataUrl(textDataUrl)}
                    className="btn-secondary flex items-center gap-1.5 text-sm mt-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DECODE TAB ──────────────────────────────────────────────────────── */}
      {tab === 'decode' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Data URL to Decode
            </label>
            <textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste a data: URL here..."
              className="input-field w-full min-h-[200px] font-mono text-sm resize-y"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={handleDecode} className="btn-primary flex items-center gap-1.5 text-sm">
                <ArrowLeftRight className="w-4 h-4" />
                Decode
              </button>
              <button onClick={clearDecode} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>

            {decodeError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {decodeError}
              </div>
            )}
          </div>

          {/* Output */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Decoded Information
            </label>

            {decodedInfo ? (
              <div className="space-y-4">
                {/* Metadata card */}
                <div className="rounded-lg bg-surface-light border border-slate-700/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-400" />
                    Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">MIME Type</span>
                      <p className="text-slate-200 font-mono text-xs">{decodedInfo.mimeType}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Encoding</span>
                      <p className="text-slate-200 font-mono text-xs">
                        {decodedInfo.isBase64 ? 'Base64' : 'URL-encoded (plain)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Data Size</span>
                      <p className="text-slate-200 font-mono text-xs">{formatBytes(decodedInfo.dataSize)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Charset</span>
                      <p className="text-slate-200 font-mono text-xs">{decodedInfo.charset || 'none'}</p>
                    </div>
                  </div>
                </div>

                {/* Image preview */}
                {decodedInfo.imagePreview && (
                  <div className="rounded-lg overflow-hidden border border-slate-700/50">
                    <div className="bg-slate-900/50 flex items-center justify-center p-6">
                      <img
                        src={decodedInfo.imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-80 object-contain rounded"
                      />
                    </div>
                    <div className="px-3 py-2 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Image Preview</span>
                      <button
                        onClick={() => downloadDataUrl(decodedInfo.imagePreview!, 'image')}
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* Text preview */}
                {decodedInfo.preview && !decodedInfo.imagePreview && (
                  <div className="rounded-lg overflow-hidden border border-slate-700/50">
                    <div className="px-3 py-1.5 border-b border-slate-700/50 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">
                        Content Preview ({formatBytes(decodedInfo.preview.length)})
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(decodedInfo.preview!).then(
                            () => toast.success('Content copied!'),
                            () => toast.error('Failed to copy')
                          );
                        }}
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 max-h-80 overflow-auto whitespace-pre-wrap">
                      {decodedInfo.preview.length > 5000
                        ? decodedInfo.preview.slice(0, 5000) + '\n\n... (truncated — full content past 5000 chars)'
                        : decodedInfo.preview}
                    </pre>
                  </div>
                )}

                {/* Raw data section */}
                <div className="rounded-lg bg-surface-light border border-slate-700/50 overflow-hidden">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-lighter transition-colors"
                  >
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                      {showRawData ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      Raw Data Payload
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {decodedInfo.rawData.length.toLocaleString()} chars
                    </span>
                  </button>
                  {showRawData && (
                    <div className="border-t border-slate-700/50">
                      <pre className="p-4 text-xs font-mono text-slate-400 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                        {decodedInfo.rawData}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const fullUrl = `data:${decodedInfo.mimeType}${decodedInfo.charset ? `;charset=${decodedInfo.charset}` : ''}${decodedInfo.isBase64 ? ';base64' : ''},${decodedInfo.rawData}`;
                      copyDataUrl(fullUrl);
                    }}
                    className="btn-secondary flex items-center gap-1.5 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Full Data URL
                  </button>
                  {decodedInfo.preview && (
                    <button
                      onClick={() => {
                        const blob = new Blob([decodedInfo.preview!], { type: decodedInfo.mimeType });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `decoded.${decodedInfo.mimeType.split('/')[1] || 'txt'}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn-secondary flex items-center gap-1.5 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-surface-light border border-dashed border-slate-700/50 p-8 text-center">
                <File className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-500 text-sm">
                  Paste a data URL and click Decode to see the metadata and preview
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Info box ────────────────────────────────────────────────────────── */}
      <div className="mt-8 p-4 rounded-lg bg-brand-500/5 border border-brand-500/10">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm text-slate-400">
            <p className="font-medium text-slate-300">What are Data URLs?</p>
            <p>
              Data URLs allow you to embed small files directly into HTML, CSS, or JavaScript without
              separate HTTP requests. They follow the format:
            </p>
            <p className="font-mono text-xs px-3 py-1.5 rounded bg-surface-lighter text-brand-300">
              data:[&lt;MIME-type&gt;][;base64],&lt;data&gt;
            </p>
            <p>
              <strong>Use cases:</strong> inline images in CSS/HTML, embedding fonts, self-contained
              demos, email signatures, and reducing HTTP requests. Best for small files (&lt; 10 KB).
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

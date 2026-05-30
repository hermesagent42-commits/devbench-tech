'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Upload,
  File,
  Search,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileCode,
  Binary,
  Hash,
  ArrowUp,
  ArrowDown,
  GripHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type OffsetFormat = 'hex' | 'dec';
type GroupSize = 4 | 8 | 16;

interface HexLine {
  offset: number;
  bytes: number[];
  ascii: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0').toUpperCase();
}

function toOffset(val: number, format: OffsetFormat, padLen: number): string {
  if (format === 'hex') {
    return val.toString(16).toUpperCase().padStart(padLen, '0');
  }
  return val.toString(10).padStart(padLen, '0');
}

function byteToAscii(byte: number): string {
  if (byte >= 0x20 && byte <= 0x7e) return String.fromCharCode(byte);
  return '.';
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parseHexInput(input: string): number[] {
  const cleaned = input.replace(/[^0-9a-fA-F]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      bytes.push(parseInt(cleaned.substring(i, i + 2), 16));
    }
  }
  return bytes;
}

// ── Parse raw bytes into display lines ─────────────────────────────────────

function parseBytes(
  bytes: Uint8Array,
  bytesPerLine: number,
  groupSize: number
): HexLine[] {
  const lines: HexLine[] = [];
  const len = bytes.length;
  for (let offset = 0; offset < len; offset += bytesPerLine) {
    const slice = bytes.slice(offset, offset + bytesPerLine);
    const byteArr: number[] = Array.from(slice);
    const ascii = byteArr.map(byteToAscii).join('');
    lines.push({ offset, bytes: byteArr, ascii });
  }
  return lines;
}

// ── Find byte sequence in the data ─────────────────────────────────────────

function findSequence(haystack: Uint8Array, needle: number[], startFrom: number = 0): number[] {
  const results: number[] = [];
  let idx = startFrom;
  while (idx <= haystack.length - needle.length) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[idx + j] !== needle[j]) { match = false; break; }
    }
    if (match) { results.push(idx); idx += 1; }
    else { idx++; }
  }
  return results;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HexViewerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);
  const [bytesPerLine, setBytesPerLine] = useState<number>(16);
  const [groupSize, setGroupSize] = useState<GroupSize>(8);
  const [offsetFormat, setOffsetFormat] = useState<OffsetFormat>('hex');
  const [showAscii, setShowAscii] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchHits, setSearchHits] = useState<number[]>([]);
  const [currentHitIndex, setCurrentHitIndex] = useState(-1);
  const [searchError, setSearchError] = useState('');

  // Parsed lines
  const lines = useMemo(() => {
    if (!rawBytes) return [];
    return parseBytes(rawBytes, bytesPerLine, groupSize);
  }, [rawBytes, bytesPerLine, groupSize]);

  const totalLines = lines.length;
  const offsetPadLen = useMemo(() => {
    if (!rawBytes || rawBytes.length === 0) return 4;
    if (offsetFormat === 'hex') {
      return Math.max(4, (rawBytes.length - 1).toString(16).length);
    }
    return Math.max(4, (rawBytes.length - 1).toString(10).length);
  }, [rawBytes, offsetFormat]);

  // ── File loading ─────────────────────────────────────────────────────────

  const loadFile = useCallback((file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large (max 50 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      setFileName(file.name);
      setFileSize(file.size);
      setRawBytes(bytes);
      setSearchHits([]);
      setCurrentHitIndex(-1);
      setSearchInput('');
      setSearchError('');
      toast.success(`Loaded ${file.name} (${formatBytes(file.size)})`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [loadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const clearFile = useCallback(() => {
    setFileName(null);
    setFileSize(0);
    setRawBytes(null);
    setSearchHits([]);
    setCurrentHitIndex(-1);
    setSearchInput('');
    setSearchError('');
  }, []);

  // ── Search ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback(() => {
    if (!rawBytes) return;
    const needle = parseHexInput(searchInput);
    if (needle.length === 0) {
      setSearchError('Enter hex bytes to search (e.g. "FF D8 FF")');
      setSearchHits([]);
      setCurrentHitIndex(-1);
      return;
    }
    setSearchError('');
    const hits = findSequence(rawBytes, needle);
    setSearchHits(hits);
    setCurrentHitIndex(hits.length > 0 ? 0 : -1);
    if (hits.length === 0) {
      toast('No matches found', { icon: '🔍' });
    } else {
      toast.success(`${hits.length} match${hits.length > 1 ? 'es' : ''} found`);
    }
  }, [rawBytes, searchInput]);

  const navigateSearch = useCallback((direction: 'prev' | 'next') => {
    if (searchHits.length === 0) return;
    let next = direction === 'next' ? currentHitIndex + 1 : currentHitIndex - 1;
    if (next >= searchHits.length) next = 0;
    if (next < 0) next = searchHits.length - 1;
    setCurrentHitIndex(next);
  }, [searchHits, currentHitIndex]);

  // Scroll to current search hit
  const currentHitOffset = currentHitIndex >= 0 ? searchHits[currentHitIndex] : null;
  const currentHitLine = useMemo(() => {
    if (currentHitOffset === null || !rawBytes) return null;
    return Math.floor(currentHitOffset / bytesPerLine);
  }, [currentHitOffset, bytesPerLine, rawBytes]);

  useEffect(() => {
    if (currentHitLine !== null && displayRef.current) {
      const lineEl = displayRef.current.querySelector(`[data-line="${currentHitLine}"]`);
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentHitLine]);

  // ── Copy / Export ────────────────────────────────────────────────────────

  const hexDumpText = useMemo(() => {
    if (!rawBytes) return '';
    return lines
      .map(line => {
        const offsetStr = toOffset(line.offset, offsetFormat, offsetPadLen);
        let hexPart = '';
        for (let i = 0; i < line.bytes.length; i++) {
          if (i > 0 && i % groupSize === 0) hexPart += '  ';
          else if (i > 0) hexPart += ' ';
          hexPart += toHex(line.bytes[i]);
        }
        const ascii = showAscii ? `  |${line.ascii}|` : '';
        return `${offsetStr}  ${hexPart}${ascii}`;
      })
      .join('\n');
  }, [lines, offsetFormat, offsetPadLen, groupSize, showAscii, rawBytes]);

  const copyHexDump = useCallback(() => {
    if (!hexDumpText) return;
    navigator.clipboard.writeText(hexDumpText).then(() => {
      toast.success('Hex dump copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, [hexDumpText]);

  const exportHexDump = useCallback(() => {
    if (!hexDumpText || !fileName) return;
    const blob = new Blob([hexDumpText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.hexdump.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Hex dump downloaded');
  }, [hexDumpText, fileName]);

  const copyRawHex = useCallback(() => {
    if (!rawBytes) return;
    const hex = Array.from(rawBytes).map(toHex).join('');
    navigator.clipboard.writeText(hex).then(() => {
      toast.success('Raw hex copied');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, [rawBytes]);

  // ── Highlighter ──────────────────────────────────────────────────────────

  const highlightSearchBytes = useMemo(() => {
    if (currentHitOffset === null || searchHits.length === 0) return new Set<number>();
    const needle = parseHexInput(searchInput);
    const set = new Set<number>();
    for (let i = 0; i < needle.length; i++) {
      set.add(currentHitOffset + i);
    }
    return set;
  }, [currentHitOffset, searchHits, searchInput]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!rawBytes) return null;
    const unique = new Set(rawBytes).size;
    const printable = Array.from(rawBytes).filter(b => b >= 0x20 && b <= 0x7e).length;
    const nullBytes = Array.from(rawBytes).filter(b => b === 0x00).length;
    const ffBytes = Array.from(rawBytes).filter(b => b === 0xFF).length;
    return { unique, printable, nullBytes, ffBytes };
  }, [rawBytes]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Hex Viewer"
      description="Inspect binary files with a hex dump viewer. Drop any file to see its raw bytes in hex and ASCII — like xxd or hexdump, right in your browser."
      controls={
        rawBytes && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              <File className="w-3.5 h-3.5 inline mr-1" />
              {fileName}
            </span>
            <span className="text-slate-500">{formatBytes(fileSize)}</span>
            <span className="text-slate-500">{rawBytes.length.toLocaleString()} bytes</span>
          </div>
        )
      }
    >
      {/* ── File Input ────────────────────────────────────────────────── */}
      {!rawBytes && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-16 text-center cursor-pointer
            transition-all duration-200
            ${isDragOver
              ? 'border-brand-400 bg-brand-400/5 scale-[1.02]'
              : 'border-slate-600/50 bg-surface-light hover:border-slate-500 hover:bg-surface-lighter'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragOver ? 'text-brand-400' : 'text-slate-500'}`} />
          <h3 className="text-lg font-semibold text-white mb-2">
            {isDragOver ? 'Drop to inspect' : 'Drop a file here'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            or click to browse — any file type, up to 50 MB
          </p>
          <div className="flex items-center justify-center gap-6 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            <span>.bin</span>
            <span>.png</span>
            <span>.wasm</span>
            <span>.exe</span>
            <span>.dat</span>
            <span>.zip</span>
            <span>…</span>
          </div>
        </div>
      )}

      {/* ── Main Viewer ───────────────────────────────────────────────── */}
      {rawBytes && (
        <div className="space-y-4">
          {/* ── Toolbar ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-surface-light border border-slate-700/50">
            {/* Bytes per line */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Per line</span>
              <select
                value={bytesPerLine}
                onChange={e => setBytesPerLine(Number(e.target.value))}
                className="bg-surface-lighter text-slate-300 text-xs rounded px-2 py-1 border border-slate-600/50 focus:border-brand-400 outline-none"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
              </select>
            </div>

            <div className="w-px h-5 bg-slate-600/50" />

            {/* Group size */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Group</span>
              <select
                value={groupSize}
                onChange={e => setGroupSize(Number(e.target.value) as GroupSize)}
                className="bg-surface-lighter text-slate-300 text-xs rounded px-2 py-1 border border-slate-600/50 focus:border-brand-400 outline-none"
              >
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
              </select>
            </div>

            <div className="w-px h-5 bg-slate-600/50" />

            {/* Offset format */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Offset</span>
              <button
                onClick={() => setOffsetFormat(f => f === 'hex' ? 'dec' : 'hex')}
                className="text-xs px-2 py-1 rounded bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-colors font-mono"
              >
                {offsetFormat === 'hex' ? '0xHEX' : 'DEC'}
              </button>
            </div>

            <div className="w-px h-5 bg-slate-600/50" />

            {/* ASCII toggle */}
            <button
              onClick={() => setShowAscii(s => !s)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-colors"
              title={showAscii ? 'Hide ASCII column' : 'Show ASCII column'}
            >
              {showAscii ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              ASCII
            </button>

            <div className="flex-1" />

            {/* Search area */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="FF D8 FF…"
                  className="w-36 bg-surface-lighter text-slate-300 text-xs rounded px-2.5 py-1.5 border border-slate-600/50 focus:border-brand-400 outline-none font-mono placeholder:text-slate-600"
                />
              </div>
              <button
                onClick={handleSearch}
                className="p-1.5 rounded text-slate-400 hover:text-brand-400 hover:bg-brand-400/10 transition-colors"
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              {searchHits.length > 0 && (
                <>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentHitIndex + 1}/{searchHits.length}
                  </span>
                  <button
                    onClick={() => navigateSearch('prev')}
                    className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    title="Previous match"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigateSearch('next')}
                    className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    title="Next match"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-slate-600/50" />

            {/* Action buttons */}
            <button
              onClick={copyHexDump}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={exportHexDump}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={copyRawHex}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-colors font-mono"
              title="Copy raw hex string"
            >
              <Binary className="w-3.5 h-3.5" />
              Raw
            </button>
            <button
              onClick={clearFile}
              className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors"
              title="Close file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {searchError && (
            <p className="text-xs text-amber-400">{searchError}</p>
          )}

          {/* ── Hex Dump Display ──────────────────────────────────────── */}
          <div className="card overflow-hidden p-0">
            {/* Column headers */}
            <div className="flex items-center px-4 py-2 bg-[#0d1117] border-b border-slate-700/50 text-[10px] text-slate-500 uppercase tracking-wider font-mono select-none">
              <span className="w-[4.5rem] flex-shrink-0 text-right pr-4">
                {offsetFormat === 'hex' ? 'OFFSET' : 'OFFSET '}
              </span>
              <span className="flex-1 flex items-center gap-1">
                <Binary className="w-3 h-3" />
                HEX BYTES
              </span>
              {showAscii && (
                <span className="w-20 flex-shrink-0 text-left pl-4 border-l border-slate-700/50">
                  ASCII
                </span>
              )}
            </div>

            {/* Scrollable hex lines */}
            <div
              ref={displayRef}
              className="max-h-[520px] overflow-y-auto bg-[#0a0e14] font-mono text-sm leading-relaxed"
            >
              {lines.map((line, lineIdx) => {
                const isCurrentSearchLine = currentHitLine === lineIdx;
                return (
                  <div
                    key={lineIdx}
                    data-line={lineIdx}
                    className={`
                      flex items-start px-4 py-[1px] transition-colors
                      ${isCurrentSearchLine
                        ? 'bg-amber-400/10 border-l-2 border-amber-400'
                        : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                      }
                      ${lineIdx % 2 === 0 ? 'bg-[#0d1117]/50' : ''}
                    `}
                  >
                    {/* Offset */}
                    <span className="w-[4.5rem] flex-shrink-0 text-right pr-4 select-none">
                      <span className="text-slate-500">
                        {offsetFormat === 'hex' && '0x'}
                      </span>
                      <span className="text-slate-400">
                        {toOffset(line.offset, offsetFormat, offsetPadLen)}
                      </span>
                    </span>

                    {/* Hex bytes */}
                    <span className="flex-1 flex flex-wrap gap-0">
                      {line.bytes.map((byte, byteIdx) => {
                        const globalOffset = line.offset + byteIdx;
                        const isSearchByte = highlightSearchBytes.has(globalOffset);
                        const isPrintable = byte >= 0x20 && byte <= 0x7e;
                        const isNull = byte === 0x00;
                        const isFF = byte === 0xFF;

                        return (
                          <span key={byteIdx} className="inline-flex">
                            {byteIdx > 0 && byteIdx % groupSize === 0 && (
                              <span className="w-3 flex-shrink-0" />
                            )}
                            {byteIdx > 0 && byteIdx % groupSize !== 0 && (
                              <span className="w-1 flex-shrink-0" />
                            )}
                            <span
                              className={`
                                inline-block w-5 text-center rounded-sm
                                ${isSearchByte
                                  ? 'bg-amber-400/30 text-amber-200 font-bold'
                                  : isNull
                                    ? 'text-slate-600'
                                    : isFF
                                      ? 'text-slate-500'
                                      : isPrintable
                                        ? 'text-emerald-300'
                                        : 'text-slate-400'
                                }
                              `}
                            >
                              {toHex(byte)}
                            </span>
                          </span>
                        );
                      })}
                      {/* Pad incomplete last line */}
                      {line.bytes.length < bytesPerLine &&
                        Array.from({ length: bytesPerLine - line.bytes.length }).map((_, i) => (
                          <span key={`pad-${i}`} className="inline-flex">
                            {(line.bytes.length + i) > 0 && (line.bytes.length + i) % groupSize === 0 && (
                              <span className="w-3 flex-shrink-0" />
                            )}
                            {(line.bytes.length + i) > 0 && (line.bytes.length + i) % groupSize !== 0 && (
                              <span className="w-1 flex-shrink-0" />
                            )}
                            <span className="inline-block w-5 text-center text-slate-700">··</span>
                          </span>
                        ))
                      }
                    </span>

                    {/* ASCII */}
                    {showAscii && (
                      <span className="w-20 flex-shrink-0 text-left pl-4 border-l border-slate-700/30">
                        {line.ascii.split('').map((ch, i) => {
                          const globalOffset = line.offset + i;
                          const isSearchByte = highlightSearchBytes.has(globalOffset);
                          const isDot = ch === '.';
                          return (
                            <span
                              key={i}
                              className={`
                                ${isSearchByte
                                  ? 'bg-amber-400/30 text-amber-200 font-bold'
                                  : isDot
                                    ? 'text-slate-600'
                                    : 'text-slate-200'
                                }
                              `}
                            >
                              {ch}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
              {lines.length === 0 && (
                <div className="p-16 text-center text-slate-500 text-sm">
                  No data to display
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="flex items-center gap-4 px-4 py-2 bg-[#0d1117] border-t border-slate-700/50 text-[10px] text-slate-500 font-mono">
              <span>{totalLines} lines</span>
              <span>{rawBytes ? Array.from(rawBytes.slice(0, Math.min(bytesPerLine, rawBytes.length))).map(toHex).join(' ').substring(0, 60) : ''}{rawBytes && rawBytes.length > bytesPerLine ? '…' : ''}</span>
            </div>
          </div>

          {/* ── File Statistics ───────────────────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card flex flex-col items-center py-3">
                <span className="text-2xl font-mono font-bold text-brand-400">{stats.unique}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Unique Bytes</span>
              </div>
              <div className="card flex flex-col items-center py-3">
                <span className="text-2xl font-mono font-bold text-emerald-400">{stats.printable.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Printable</span>
              </div>
              <div className="card flex flex-col items-center py-3">
                <span className="text-2xl font-mono font-bold text-slate-400">{stats.nullBytes.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Null (0x00)</span>
              </div>
              <div className="card flex flex-col items-center py-3">
                <span className="text-2xl font-mono font-bold text-slate-400">{stats.ffBytes.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">0xFF Bytes</span>
              </div>
            </div>
          )}

          {/* ── How it works ──────────────────────────────────────────── */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
            <div className="text-slate-400 text-sm space-y-2">
              <p>
                The <strong className="text-slate-300">Hex Viewer</strong> uses the browser&apos;s{' '}
                <code className="text-brand-400">FileReader.readAsArrayBuffer()</code> API to read binary files
                entirely client-side. The raw bytes are parsed into <code className="text-brand-400">Uint8Array</code>{' '}
                and rendered as a traditional hex dump — just like <code className="text-brand-400">xxd</code> or{' '}
                <code className="text-brand-400">hexdump</code>.
              </p>
              <p>
                <strong className="text-slate-300">Visual cues:</strong> Printable ASCII bytes (0x20–0x7E) appear in{' '}
                <span className="text-emerald-300">green</span>, null bytes in dim gray, and 0xFF bytes in medium gray.
                Search matches are highlighted in <span className="text-amber-200">amber</span> with smooth scroll navigation.
              </p>
              <p>
                <strong className="text-slate-300">Use cases:</strong> Inspect file headers, debug binary formats,
                analyze malware samples, verify data structures, reverse-engineer proprietary formats, or
                examine raw network payloads — all without leaving the browser.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                All processing happens locally in your browser. No data is uploaded to any server.
                Max file size: 50 MB. Supports any file type — images, executables, archives, fonts, WASM binaries, and more.
              </p>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

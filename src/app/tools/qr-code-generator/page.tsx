'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw, Trash2, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── QR Code Encoder (zero-dependency, pure TypeScript) ───────── */

// GF(256) arithmetic tables
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gfPolyMul(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      out[i + j] ^= gfMul(a[i], b[j]);
  return out as Uint8Array;
}

// RS generator polynomials by EC codeword count (precomputed)
function rsGeneratorPoly(nsym: number): Uint8Array {
  let g: Uint8Array = new Uint8Array(1) as Uint8Array;
  g[0] = 1;
  for (let i = 0; i < nsym; i++) {
    const poly = new Uint8Array(2) as Uint8Array;
    poly[0] = 1;
    poly[1] = EXP[i];
    g = gfPolyMul(g, poly);
  }
  return g;
}

function rsEncode(data: Uint8Array, nsym: number): Uint8Array {
  const gen = rsGeneratorPoly(nsym);
  const res = new Uint8Array(data.length + nsym);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  res.set(data);
  return res;
}

// Version info: [total codewords, EC codewords per block, group1 blocks, group1 data codewords, group2 blocks, group2 data codewords]
// Indexed: VERSION_INFO[version][ecLevel]
const VERSION_INFO: [number, number, number, number, number, number][][] = [
  // version 1
  [[26,7,1,26,0,0],[26,10,1,26,0,0],[26,13,1,26,0,0],[26,17,1,26,0,0]],
  // version 2
  [[44,10,1,44,0,0],[44,16,1,44,0,0],[44,22,1,44,0,0],[44,28,1,44,0,0]],
  // version 3
  [[70,15,1,70,0,0],[70,26,1,70,0,0],[70,18,2,35,0,0],[70,22,2,35,0,0]],
  // version 4
  [[100,20,1,100,0,0],[100,18,2,50,0,0],[100,26,2,50,0,0],[100,16,4,25,0,0]],
  // version 5
  [[134,26,1,134,0,0],[134,24,2,67,0,0],[134,18,2,33,2,34],[134,22,2,33,2,34]],
  // version 6
  [[172,18,2,86,0,0],[172,16,4,43,0,0],[172,24,4,43,0,0],[172,28,4,43,0,0]],
  // version 7
  [[196,20,2,98,0,0],[196,18,4,49,0,0],[196,18,2,32,4,33],[196,26,4,39,1,40]],
  // version 8
  [[242,24,2,121,0,0],[242,22,2,60,2,61],[242,22,4,40,2,41],[242,26,4,40,2,41]],
  // version 9
  [[292,30,2,146,0,0],[292,22,3,58,2,59],[292,20,4,36,4,37],[292,24,4,36,4,37]],
  // version 10
  [[346,18,2,86,2,87],[346,26,4,69,1,70],[346,24,6,43,2,44],[346,28,6,43,2,44]],
];

// Alignment pattern centers by version (version >= 2)
const ALIGNMENT_CENTERS: number[][] = [
  [], // version 1
  [6,18], // 2
  [6,22], // 3
  [6,26], // 4
  [6,30], // 5
  [6,34], // 6
  [6,22,38], // 7
  [6,24,42], // 8
  [6,26,46], // 9
  [6,28,50], // 10
];

const EC_LEVELS = ['L', 'M', 'Q', 'H'] as const;
type ECLevel = typeof EC_LEVELS[number];

// Format info bits (EC level + mask pattern)
const FORMAT_INFO: number[] = [
  0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0,
  0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976,
  0x1689, 0x13BE, 0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B,
  0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183, 0x2EDA, 0x2BED,
];

function getFormatInfo(ecLevel: ECLevel, mask: number): number {
  return FORMAT_INFO[EC_LEVELS.indexOf(ecLevel) * 8 + mask];
}

// Mask pattern functions
const MASK_FUNCTIONS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function maskPenalty(matrix: number[][]): number {
  const n = matrix.length;
  let penalty = 0;

  // Adjacent modules in same row (>=5)
  for (let r = 0; r < n; r++) {
    let run = 0;
    for (let c = 0; c < n; c++) {
      if (c > 0 && matrix[r][c] === matrix[r][c - 1]) run++;
      else {
        if (run >= 5) penalty += run - 2;
        run = 1;
      }
    }
    if (run >= 5) penalty += run - 2;
  }

  // Adjacent modules in same column (>=5)
  for (let c = 0; c < n; c++) {
    let run = 0;
    for (let r = 0; r < n; r++) {
      if (r > 0 && matrix[r][c] === matrix[r - 1][c]) run++;
      else {
        if (run >= 5) penalty += run - 2;
        run = 1;
      }
    }
    if (run >= 5) penalty += run - 2;
  }

  // 2x2 blocks
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++)
      if (matrix[r][c] === matrix[r][c + 1] &&
          matrix[r][c] === matrix[r + 1][c] &&
          matrix[r][c] === matrix[r + 1][c + 1])
        penalty += 3;

  // Finder-like patterns (1:1:3:1:1 ratio)
  const finderLike = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n - 10; c++) {
      let match = true;
      for (let k = 0; k < 11; k++)
        if (matrix[r][c + k] !== finderLike[k]) { match = false; break; }
      if (match) penalty += 40;
      match = true;
      for (let k = 0; k < 11; k++)
        if (matrix[c + k]?.[r] !== finderLike[k]) { match = false; break; }
      if (match) penalty += 40;
    }

  // Dark/light ratio
  let darkCount = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      darkCount += matrix[r][c];
  const ratio = Math.abs(darkCount / (n * n) * 100 - 50);
  penalty += Math.floor(ratio / 5) * 10;

  return penalty;
}

function buildEmptyMatrix(version: number): number[][] {
  const n = version * 4 + 17;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));

  // Finder patterns (3 corners)
  function placeFinder(r: number, c: number) {
    for (let dr = 0; dr < 7; dr++)
      for (let dc = 0; dc < 7; dc++)
        matrix[r + dr][c + dc] = (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)) ? 1 : 0;
  }
  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    matrix[6][i] = matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  matrix[n - 8][8] = 1;

  // Alignment patterns (version >= 2)
  if (version >= 2) {
    const centers = ALIGNMENT_CENTERS[version - 1];
    for (const cr of centers)
      for (const cc of centers) {
        // Skip if overlaps with finder pattern
        if ((cr < 9 && cc < 9) || (cr < 9 && cc > n - 9) || (cr > n - 9 && cc < 9)) continue;
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++)
            matrix[cr + dr][cc + dc] =
              (dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0)) ? 1 : 0;
      }
  }

  // Reserve format info areas (set to -2 to avoid data placement)
  for (let i = 0; i < 9; i++) {
    if (matrix[i][8] === -1) matrix[i][8] = -2;
    if (matrix[8][i] === -1) matrix[8][i] = -2;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[n - 1 - i][8] === -1) matrix[n - 1 - i][8] = -2;
    if (matrix[8][n - 1 - i] === -1) matrix[8][n - 1 - i] = -2;
  }

  // Reserve version info areas (versions >= 7)
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        if (matrix[i][n - 9 + j] === -1) matrix[i][n - 9 + j] = -2;
        if (matrix[n - 9 + j][i] === -1) matrix[n - 9 + j][i] = -2;
      }
  }

  return matrix;
}

function qrEncode(text: string, version: number, ecLevel: ECLevel): number[][] | null {
  const ecIdx = EC_LEVELS.indexOf(ecLevel);
  const info = VERSION_INFO[version - 1][ecIdx];
  const totalCodewords = info[0];
  const ecPerBlock = info[1];

  // Calculate data capacity bits
  const dataCodewords = totalCodewords - ecPerBlock * (info[2] + (info[4] || 0));

  // Encode data (byte mode)
  const dataBytes = new TextEncoder().encode(text);
  const headerBits = 4 + 8 + (version <= 9 ? 8 : 16);
  const maxLength = Math.min(dataCodewords * 8 - headerBits, dataBytes.length * 8);

  if (maxLength < 1) return null;

  const bits: number[] = [];
  // Mode indicator: 0100 (byte mode)
  bits.push(0, 1, 0, 0);
  // Character count
  const countBits = version <= 9 ? 8 : 16;
  const charCount = Math.min(dataBytes.length, Math.floor((dataCodewords * 8 - headerBits) / 8));
  for (let i = countBits - 1; i >= 0; i--) bits.push((charCount >> i) & 1);
  // Data bytes
  const effectiveBytes = dataBytes.slice(0, charCount);
  for (let bi = 0; bi < effectiveBytes.length; bi++) {
    const byte = effectiveBytes[bi];
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  // Terminator
  const termLen = Math.min(4, dataCodewords * 8 - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);
  // Pad to byte
  while (bits.length % 8) bits.push(0);
  // Pad bytes
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < dataCodewords * 8) {
    for (let i = 7; i >= 0; i--) bits.push((padBytes[pi] >> i) & 1);
    pi = (pi + 1) % 2;
  }

  // Convert bits to bytes
  const dataCodes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < dataCodes.length; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i * 8 + j];
    dataCodes[i] = val;
  }

  // Split into blocks and generate EC
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let g = 0; g < 2; g++) {
    const numBlocks = g === 0 ? info[2] : (info[4] || 0);
    const dataPerBlock = g === 0 ? info[3] : (info[5] || 0);
    for (let i = 0; i < numBlocks; i++) {
      const block = dataCodes.slice(offset, offset + dataPerBlock);
      offset += dataPerBlock;
      const encoded = rsEncode(block, ecPerBlock);
      blocks.push(block);
      ecBlocks.push(encoded.slice(dataPerBlock));
    }
  }

  // Interleave data
  const allData: number[] = [];
  let maxBlockLen = 0;
  for (let bi = 0; bi < blocks.length; bi++) maxBlockLen = Math.max(maxBlockLen, blocks[bi].length);
  for (let i = 0; i < maxBlockLen; i++)
    for (let bi = 0; bi < blocks.length; bi++) if (i < blocks[bi].length) allData.push(blocks[bi][i]);
  for (let i = 0; i < ecPerBlock; i++)
    for (let ei = 0; ei < ecBlocks.length; ei++) allData.push(ecBlocks[ei][i]);

  // Build matrix
  const n = version * 4 + 17;
  const matrix = buildEmptyMatrix(version);

  // Place data bits
  let bitIdx = 0;
  let col = n - 1;
  let goingUp = true;

  while (col >= 0) {
    const cols = col === 6 ? [col - 1] : [col, col - 1];
    for (const c of cols) {
      if (c < 0) continue;
      const rows = goingUp
        ? Array.from({ length: n }, (_, i) => n - 1 - i)
        : Array.from({ length: n }, (_, i) => i);
      for (const r of rows) {
        if (matrix[r][c] === -1) {
          matrix[r][c] = bitIdx < allData.length ? allData[bitIdx] : 0;
          bitIdx++;
        }
      }
    }
    col -= 2;
    goingUp = !goingUp;
    if (col === 6) col--; // Skip vertical timing
  }

  // Try all masks
  let bestMatrix: number[][] | null = null;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const masked = matrix.map(row => [...row]);
    const maskFn = MASK_FUNCTIONS[mask];
    // Apply mask to data modules (not reserved areas)
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (masked[r][c] >= 0 && maskFn(r, c))
          masked[r][c] ^= 1;

    // Place format info
    const formatData = getFormatInfo(ecLevel, mask);
    const formatBits: number[] = [];
    for (let i = 14; i >= 0; i--) formatBits.push((formatData >> i) & 1);

    // Place format bits
    const formatPositions: [number, number][] = [
      [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
      [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
      [n-1,8],[n-2,8],[n-3,8],[n-4,8],[n-5,8],[n-6,8],[n-7,8],[n-8,8],
      [8,n-7],[8,n-6],[8,n-5],[8,n-4],[8,n-3],[8,n-2],[8,n-1],
    ];
    for (let i = 0; i < formatBits.length; i++) {
      const [r, c] = formatPositions[i];
      if (r < n && c < n && masked[r] !== undefined) masked[r][c] = formatBits[i];
    }

    const penalty = maskPenalty(masked);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = masked;
    }
  }

  return bestMatrix;
}

/* ───────── React Component ───────── */

const QR_COLORS = {
  dark: '#0f172a',  // slate-900
  light: '#ffffff',
};

export default function QrCodeGeneratorPage() {
  const [text, setText] = useState('');
  const [version, setVersion] = useState(3);
  const [ecLevel, setEcLevel] = useState<ECLevel>('M');
  const [qrMatrix, setQrMatrix] = useState<number[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moduleColor, setModuleColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(() => {
    setError(null);
    if (!text.trim()) {
      setQrMatrix(null);
      return;
    }

    const matrix = qrEncode(text.trim(), version, ecLevel);
    if (!matrix) {
      // Try higher version
      for (let v = version + 1; v <= 10; v++) {
        const retry = qrEncode(text.trim(), v, ecLevel);
        if (retry) {
          setVersion(v);
          setQrMatrix(retry);
          return;
        }
      }
      setError('Text too long for QR code. Try shorter text or lower error correction level.');
      setQrMatrix(null);
      return;
    }
    setQrMatrix(matrix);
  }, [text, version, ecLevel]);

  // Debounced auto-generate
  useEffect(() => {
    if (!text.trim()) {
      setQrMatrix(null);
      setError(null);
      return;
    }
    const timer = setTimeout(generate, 300);
    return () => clearTimeout(timer);
  }, [text, version, ecLevel, generate]);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !qrMatrix) return;

    const n = qrMatrix.length;
    const size = Math.min(320, n * 12);
    const scale = size / n;
    const border = scale * 4;

    canvas.width = size + border * 2;
    canvas.height = size + border * 2;
    const ctx = canvas.getContext('2d')!;

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw quiet zone + modules
    ctx.fillStyle = moduleColor;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qrMatrix[r][c] === 1) {
          ctx.fillRect(
            border + c * scale,
            border + r * scale,
            scale,
            scale,
          );
        }
      }
    }
  }, [qrMatrix, moduleColor, bgColor]);

  const clearAll = useCallback(() => {
    setText('');
    setQrMatrix(null);
    setError(null);
    setVersion(3);
    setEcLevel('M');
  }, []);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !qrMatrix) return;
    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded!');
  }, [qrMatrix]);

  const copyToClipboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !qrMatrix) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]).then(
        () => toast.success('QR code copied to clipboard!'),
        () => toast.error('Failed to copy QR code')
      );
    }, 'image/png');
  }, [qrMatrix]);

  const versionLabel = useMemo(() => {
    return `${version} (${version * 4 + 17}×${version * 4 + 17})`;
  }, [version]);

  return (
    <ToolLayout
      title="QR Code Generator"
      description="Generate QR codes from text, URLs, or any data — entirely client-side, zero dependencies."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Input */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-3">
              Text or URL to encode
            </label>
            <textarea
              className="input-field w-full h-32 resize-y font-mono text-sm"
              placeholder="https://example.com or any text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">
                {text.length} character{text.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearAll}
                className="text-slate-500 hover:text-red-400 transition-colors text-sm flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card space-y-4">
            <h3 className="text-white font-semibold text-sm">Options</h3>

            {/* Version */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Version (size)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={version}
                  onChange={(e) => setVersion(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 font-mono w-28 text-right">
                  {versionLabel}
                </span>
              </div>
            </div>

            {/* Error Correction */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Error Correction
              </label>
              <div className="flex gap-1 p-1 rounded-lg bg-surface-lighter inline-flex">
                {EC_LEVELS.map((ec) => (
                  <button
                    key={ec}
                    onClick={() => setEcLevel(ec)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      ecLevel === ec
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ec === 'L' ? 'Low (7%)' : ec === 'M' ? 'Medium (15%)' : ec === 'Q' ? 'Quartile (25%)' : 'High (30%)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Module color</label>
                <input
                  type="color"
                  value={moduleColor}
                  onChange={(e) => setModuleColor(e.target.value)}
                  className="w-full h-9 rounded-md cursor-pointer border border-slate-700 bg-surface"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Background</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-9 rounded-md cursor-pointer border border-slate-700 bg-surface"
                />
              </div>
            </div>

            {/* Regenerate button */}
            <button
              onClick={generate}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              disabled={!text.trim()}
            >
              <RefreshCw className="w-4 h-4" />
              Generate QR Code
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-3">
          <div className="card h-full flex flex-col items-center justify-center">
            {qrMatrix ? (
              <>
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={downloadPNG}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Image
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {versionLabel} • EC: {ecLevel} • {qrMatrix.length}×{qrMatrix.length} modules
                </p>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-10 h-10 text-brand-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Enter text to generate a QR code
                </h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  QR codes are generated entirely in your browser — your data never leaves your device.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw, Barcode, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Types ────────────────────────────────────────────────────── */

type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPCA';

interface FormatInfo {
  name: string;
  description: string;
  maxChars: string;
  allowedChars: string;
  example: string;
}

const FORMAT_INFO: Record<BarcodeFormat, FormatInfo> = {
  CODE128: {
    name: 'Code 128',
    description: 'High-density alphanumeric barcode. Supports all 128 ASCII characters.',
    maxChars: '80',
    allowedChars: 'All ASCII (A-Z, a-z, 0-9, symbols, control chars)',
    example: 'HELLO-128',
  },
  CODE39: {
    name: 'Code 39',
    description: 'Widely used in automotive and defense industries.',
    maxChars: '43',
    allowedChars: 'A-Z, 0-9, space, - . $ / + %',
    example: 'CODE39',
  },
  EAN13: {
    name: 'EAN-13',
    description: 'International retail barcode. Must be 12 digits (13th is check digit).',
    maxChars: '12',
    allowedChars: '0-9 (exactly 12 digits)',
    example: '590123412345',
  },
  UPCA: {
    name: 'UPC-A',
    description: 'Universal Product Code used in North America. 11 digits (12th is check digit).',
    maxChars: '11',
    allowedChars: '0-9 (exactly 11 digits)',
    example: '042100005264',
  },
};

/* ─── Barcode Encoders ─────────────────────────────────────────── */

const EAN_LEFT_A: Record<string, string> = {
  '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011',
  '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011',
};
const EAN_LEFT_B: Record<string, string> = {
  '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001', '4': '0011101',
  '5': '0111001', '6': '0000101', '7': '0010001', '8': '0001001', '9': '0010111',
};
const EAN_RIGHT: Record<string, string> = {
  '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010', '4': '1011100',
  '5': '1001110', '6': '1010000', '7': '1000100', '8': '1001000', '9': '1110100',
};

const EAN_PARITY: Record<string, string[]> = {
  '0': ['A','A','A','A','A','A'], '1': ['A','A','B','A','B','B'], '2': ['A','A','B','B','A','B'],
  '3': ['A','A','B','B','B','A'], '4': ['A','B','A','A','B','B'], '5': ['A','B','B','A','A','B'],
  '6': ['A','B','B','B','A','A'], '7': ['A','B','A','B','A','B'], '8': ['A','B','A','B','B','A'],
  '9': ['A','B','B','A','B','A'],
};

function ean13CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

function encodeEAN13(data: string): string {
  data = data.replace(/\D/g, '');
  if (data.length === 12) data += ean13CheckDigit(data);
  if (data.length !== 13 || !/^\d{13}$/.test(data)) return '';
  const parity = EAN_PARITY[data[0]];
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    bits += parity[i - 1] === 'A' ? EAN_LEFT_A[data[i]] : EAN_LEFT_B[data[i]];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) {
    bits += EAN_RIGHT[data[i]];
  }
  bits += '101';
  return bits;
}

function encodeUPCA(data: string): string {
  data = data.replace(/\D/g, '');
  if (data.length === 11) data += ean13CheckDigit('0' + data);
  if (data.length !== 12 || !/^\d{12}$/.test(data)) return '';
  const digits = data;
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += EAN_LEFT_A[digits[i]];
  bits += '01010';
  for (let i = 6; i < 12; i++) bits += EAN_RIGHT[digits[i]];
  bits += '101';
  return bits;
}

const CODE39_TABLE: Record<string, string> = {
  '0':'101001101101','1':'110100101011','2':'101100101011','3':'110110010101',
  '4':'101001101011','5':'110100110101','6':'101100110101','7':'101001011011',
  '8':'110100101101','9':'101100101101','A':'110101001011','B':'101101001011',
  'C':'110110100101','D':'101011001011','E':'110101100101','F':'101101100101',
  'G':'101010011011','H':'110101001101','I':'101101001101','J':'101011001101',
  'K':'110101010011','L':'101101010011','M':'110110101001','N':'101011010011',
  'O':'110101101001','P':'101101101001','Q':'101010110011','R':'110101011001',
  'S':'101101011001','T':'101011011001','U':'110010101011','V':'100110101011',
  'W':'110011010101','X':'100101101011','Y':'110010110101','Z':'100110110101',
  '-':'100101011011','.':'110010101101',' ':'100110101101','$':'100100100101',
  '/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101',
};

function encodeCode39(data: string): string {
  const upper = data.toUpperCase();
  const valid = upper.replace(/[^A-Z0-9 .\-$/+%]/g, '');
  if (valid.length === 0) return '';
  const bits = valid.split('').map(c => CODE39_TABLE[c] || '').join('');
  const pattern = CODE39_TABLE['*'];
  return pattern + '0' + bits + '0' + pattern;
}

/* ─── Code 128 Encoder ─────────────────────────────────────────── */

const CODE128_PATTERNS: string[] = (() => {
  const raw = '11011001100 11001101100 11001100110 10010011000 10010001100 ' +
    '10001001100 10011001000 10011000100 10001100100 11001001000 11001000100 ' +
    '11000100100 10110011100 10011011100 10011001110 10111001100 10011101100 ' +
    '10011100110 11001110010 11001011100 11001001110 11011100100 11001110100 ' +
    '11101101110 11101001100 11100101100 11100100110 11101100100 11100110100 ' +
    '11100110010 11011011000 11011000110 11000110110 10100011000 10001011000 ' +
    '10001000110 10110001000 10001101000 10001100010 11010001000 11000101000 ' +
    '11000100010 10110111000 10110001110 10001101110 10111011000 10111000110 ' +
    '10001110110 11101110110 11010001110 11000101110 11011101000 11011100010 ' +
    '11011101110 11101011000 11101000110 11100010110 11101101000 11101100010 ' +
    '11100011010 11101111010 11001000010 11110001010 10100110000 10100001100 ' +
    '10010110000 10010000110 10000101100 10000100110 10110010000 10110000100 ' +
    '10011010000 10011000010 10000110100 10000110010 11000010010 11001010000 ' +
    '11110111010 11000010100 10001111010 10100111100 10010111100 10010011110 ' +
    '10111100100 10011110100 10011110010 11110100100 11110010100 11110010010 ' +
    '11011011110 11011110110 11110110110 10101111000 10100011110 10001011110 ' +
    '10111101000 10111100010 11110101000 11110100010 10111011110 10111101110 ' +
    '11101011110 11110101110 11010000100 11010010000 11010011100 1100011101011';
  return raw.trim().split(/\s+/);
})();

function patternToWidths(pattern: string): number[] {
  const widths: number[] = [];
  let w = 0;
  let last = pattern[0];
  for (let j = 0; j < pattern.length; j++) {
    if (pattern[j] === last) {
      w++;
    } else {
      widths.push(w);
      w = 1;
      last = pattern[j];
    }
  }
  widths.push(w);
  return widths;
}

function widthsToBits(widths: number[]): string {
  let bits = '';
  for (let i = 0; i < widths.length; i++) {
    bits += (i % 2 === 0 ? '1' : '0').repeat(widths[i]);
  }
  return bits;
}

function encodeCode128(data: string): string {
  if (data.length === 0) return '';
  const allDigits = /^\d{2,}$/.test(data);
  const codes: number[] = [];
  let i = 0;

  if (allDigits && data.length % 2 === 0) {
    codes.push(105);
    while (i < data.length) {
      codes.push(parseInt(data.substring(i, i + 2)));
      i += 2;
    }
  } else {
    codes.push(104);
    while (i < data.length) {
      const ch = data.charCodeAt(i);
      if (ch < 32 || ch > 126) return '';
      codes.push(ch - 32);
      i++;
    }
  }

  let checksum = codes[0];
  for (let j = 1; j < codes.length; j++) {
    checksum += codes[j] * j;
  }
  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(106);

  return codes.map(c => widthsToBits(patternToWidths(CODE128_PATTERNS[c] || '11011001100'))).join('');
}

/* ─── Canvas Renderer ──────────────────────────────────────────── */

function renderBarcode(bits: string, text: string): string {
  const canvas = document.createElement('canvas');
  const moduleW = 2;
  const barHeight = 150;
  const quietZone = 20;
  const textHeight = 36;
  const totalWidth = bits.length * moduleW + quietZone * 2;

  canvas.width = totalWidth;
  canvas.height = barHeight + textHeight + 12;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const topY = 8;
  for (let i = 0; i < bits.length; i++) {
    ctx.fillStyle = bits[i] === '1' ? '#000000' : '#ffffff';
    ctx.fillRect(quietZone + i * moduleW, topY, moduleW, barHeight);
  }

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(text, totalWidth / 2, barHeight + 24);

  return canvas.toDataURL('image/png');
}

/* ─── Main Component ──────────────────────────────────────────── */

export default function BarcodeGeneratorPage() {
  const [format, setFormat] = useState<BarcodeFormat>('CODE128');
  const [input, setInput] = useState('HELLO-128');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encodedText, setEncodedText] = useState('');

  const generate = useCallback(() => {
    setError(null);
    let bits = '';
    let displayText = '';

    switch (format) {
      case 'CODE128': {
        bits = encodeCode128(input);
        displayText = input || '';
        if (!bits) {
          setError('Invalid Code 128 input. Must be printable ASCII (characters 32-126).');
          return;
        }
        break;
      }
      case 'CODE39': {
        const clean = input.toUpperCase();
        if (!/^[A-Z0-9 .\-$/+%]*$/.test(clean)) {
          setError('Code 39 only supports: A-Z, 0-9, space, - . $ / + %');
          return;
        }
        bits = encodeCode39(clean);
        displayText = '*' + clean.replace(/[^A-Z0-9 .\-$/+%]/g, '') + '*';
        if (!bits) {
          setError('Please enter at least one valid Code 39 character.');
          return;
        }
        break;
      }
      case 'EAN13': {
        const digits = input.replace(/\D/g, '');
        if (digits.length !== 12 && digits.length !== 13) {
          setError('EAN-13 requires exactly 12 digits. The 13th check digit is computed automatically.');
          return;
        }
        const full13 = digits.length === 12 ? digits + ean13CheckDigit(digits) : digits;
        bits = encodeEAN13(digits);
        displayText = full13;
        if (!bits) {
          setError('Invalid EAN-13 input. Must be 12-13 digits.');
          return;
        }
        break;
      }
      case 'UPCA': {
        const digits = input.replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 12) {
          setError('UPC-A requires exactly 11 digits. The 12th check digit is computed automatically.');
          return;
        }
        const full12 = digits.length === 11 ? digits + ean13CheckDigit('0' + digits) : digits;
        bits = encodeUPCA(digits);
        displayText = full12;
        if (!bits) {
          setError('Invalid UPC-A input. Must be 11-12 digits.');
          return;
        }
        break;
      }
    }

    if (bits) {
      const dataUrl = renderBarcode(bits, displayText);
      setBarcodeDataUrl(dataUrl);
      setEncodedText(displayText);
    }
  }, [format, input]);

  const handleFormatChange = useCallback((newFormat: BarcodeFormat) => {
    setFormat(newFormat);
    setInput(FORMAT_INFO[newFormat].example);
    setBarcodeDataUrl(null);
    setError(null);
  }, []);

  const downloadBarcode = useCallback(() => {
    if (!barcodeDataUrl) return;
    const a = document.createElement('a');
    a.href = barcodeDataUrl;
    a.download = 'barcode-' + (encodedText || 'output') + '.png';
    a.click();
    toast.success('Barcode downloaded!');
  }, [barcodeDataUrl, encodedText]);

  const copyBarcode = useCallback(() => {
    if (!barcodeDataUrl) return;
    fetch(barcodeDataUrl)
      .then(res => res.blob())
      .then(blob => {
        return navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      })
      .then(() => toast.success('Barcode copied to clipboard!'))
      .catch(() => {
        navigator.clipboard.writeText(encodedText).then(
          () => toast.success('Barcode text copied! (image copy not supported)'),
          () => toast.error('Failed to copy'),
        );
      });
  }, [barcodeDataUrl, encodedText]);

  return (
    <ToolLayout
      title="Barcode Generator"
      description="Generate professional barcodes in multiple formats — Code 128, Code 39, EAN-13, and UPC-A. Pure client-side, zero dependencies."
    >
      {/* Format Selector */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Barcode Format</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(FORMAT_INFO) as BarcodeFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors border ' +
                (format === f
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-surface border-slate-700/50 text-slate-300 hover:border-slate-600')}
            >
              {FORMAT_INFO[f].name}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-400 space-y-1 bg-slate-800/50 rounded-lg p-3">
          <p>{FORMAT_INFO[format].description}</p>
          <p>
            <span className="text-slate-500">Allowed:</span>{' '}
            <code className="text-brand-400">{FORMAT_INFO[format].allowedChars}</code>
          </p>
          <p>
            <span className="text-slate-500">Max length:</span>{' '}
            {FORMAT_INFO[format].maxChars}
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Barcode Data</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder={'Enter ' + FORMAT_INFO[format].name + ' data...'}
            className="flex-1 bg-surface rounded-lg px-4 py-3 text-slate-200 border border-slate-700/50 focus:border-brand-500 focus:outline-none font-mono text-sm"
          />
          <button onClick={generate} className="btn-primary flex items-center gap-2 px-6 shrink-0">
            <Barcode className="w-4 h-4" />
            Generate
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Output */}
      {barcodeDataUrl && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Generated Barcode</h2>
            <div className="flex items-center gap-2">
              <button onClick={copyBarcode} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button onClick={downloadBarcode} className="btn-primary flex items-center gap-1.5 text-sm">
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-8 flex items-center justify-center">
            <img
              src={barcodeDataUrl}
              alt={'Barcode: ' + encodedText}
              className="max-w-full h-auto"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              Format: <span className="text-brand-400">{FORMAT_INFO[format].name}</span>
            </span>
            <span>
              Data: <code className="text-brand-400 font-mono">{encodedText}</code>
            </span>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

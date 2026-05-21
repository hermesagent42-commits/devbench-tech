'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Upload, FileText, Hash, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

const ALGORITHMS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

interface AlgorithmInfo {
  bits: number;
  description: string;
}

const ALGO_INFO: Record<Algorithm, AlgorithmInfo> = {
  'MD5': { bits: 128, description: 'Legacy hash, fast but cryptographically broken. Use for checksums only.' },
  'SHA-1': { bits: 160, description: 'Deprecated for security use. Still common in git and legacy systems.' },
  'SHA-256': { bits: 256, description: 'Industry standard. Used in TLS, Bitcoin, JWT, and certificates.' },
  'SHA-384': { bits: 384, description: 'SHA-512 truncated. Stronger but less common than SHA-256.' },
  'SHA-512': { bits: 512, description: 'Maximum strength. Used for high-security applications and password hashing.' },
};

// MD5 implementation (pure JS — Web Crypto doesn't support MD5)
// Based on RFC 1321
function md5(string: string): string {
  function md5Cycle(x: number[], k: number[]): void {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, 0xd76aa478);
    d = ff(d, a, b, c, k[1], 12, 0xe8c7b756);
    c = ff(c, d, a, b, k[2], 17, 0x242070db);
    b = ff(b, c, d, a, k[3], 22, 0xc1bdceee);
    a = ff(a, b, c, d, k[4], 7, 0xf57c0faf);
    d = ff(d, a, b, c, k[5], 12, 0x4787c62a);
    c = ff(c, d, a, b, k[6], 17, 0xa8304613);
    b = ff(b, c, d, a, k[7], 22, 0xfd469501);
    a = ff(a, b, c, d, k[8], 7, 0x698098d8);
    d = ff(d, a, b, c, k[9], 12, 0x8b44f7af);
    c = ff(c, d, a, b, k[10], 17, 0xffff5bb1);
    b = ff(b, c, d, a, k[11], 22, 0x895cd7be);
    a = ff(a, b, c, d, k[12], 7, 0x6b901122);
    d = ff(d, a, b, c, k[13], 12, 0xfd987193);
    c = ff(c, d, a, b, k[14], 17, 0xa679438e);
    b = ff(b, c, d, a, k[15], 22, 0x49b40821);
    a = gg(a, b, c, d, k[1], 5, 0xf61e2562);
    d = gg(d, a, b, c, k[6], 9, 0xc040b340);
    c = gg(c, d, a, b, k[11], 14, 0x265e5a51);
    b = gg(b, c, d, a, k[0], 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, k[5], 5, 0xd62f105d);
    d = gg(d, a, b, c, k[10], 9, 0x02441453);
    c = gg(c, d, a, b, k[15], 14, 0xd8a1e681);
    b = gg(b, c, d, a, k[4], 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, k[9], 5, 0x21e1cde6);
    d = gg(d, a, b, c, k[14], 9, 0xc33707d6);
    c = gg(c, d, a, b, k[3], 14, 0xf4d50d87);
    b = gg(b, c, d, a, k[8], 20, 0x455a14ed);
    a = gg(a, b, c, d, k[13], 5, 0xa9e3e905);
    d = gg(d, a, b, c, k[2], 9, 0xfcefa3f8);
    c = gg(c, d, a, b, k[7], 14, 0x676f02d9);
    b = gg(b, c, d, a, k[12], 20, 0x8d2a4c8a);
    a = hh(a, b, c, d, k[5], 4, 0xfffa3942);
    d = hh(d, a, b, c, k[8], 11, 0x8771f681);
    c = hh(c, d, a, b, k[11], 16, 0x6d9d6122);
    b = hh(b, c, d, a, k[14], 23, 0xfde5380c);
    a = hh(a, b, c, d, k[1], 4, 0xa4beea44);
    d = hh(d, a, b, c, k[4], 11, 0x4bdecfa9);
    c = hh(c, d, a, b, k[7], 16, 0xf6bb4b60);
    b = hh(b, c, d, a, k[10], 23, 0xbebfbc70);
    a = hh(a, b, c, d, k[13], 4, 0x289b7ec6);
    d = hh(d, a, b, c, k[0], 11, 0xeaa127fa);
    c = hh(c, d, a, b, k[3], 16, 0xd4ef3085);
    b = hh(b, c, d, a, k[6], 23, 0x04881d05);
    a = hh(a, b, c, d, k[9], 4, 0xd9d4d039);
    d = hh(d, a, b, c, k[12], 11, 0xe6db99e5);
    c = hh(c, d, a, b, k[15], 16, 0x1fa27cf8);
    b = hh(b, c, d, a, k[2], 23, 0xc4ac5665);
    a = ii(a, b, c, d, k[0], 6, 0xf4292244);
    d = ii(d, a, b, c, k[7], 10, 0x432aff97);
    c = ii(c, d, a, b, k[14], 15, 0xab9423a7);
    b = ii(b, c, d, a, k[5], 21, 0xfc93a039);
    a = ii(a, b, c, d, k[12], 6, 0x655b59c3);
    d = ii(d, a, b, c, k[3], 10, 0x8f0ccc92);
    c = ii(c, d, a, b, k[10], 15, 0xffeff47d);
    b = ii(b, c, d, a, k[1], 21, 0x85845dd1);
    a = ii(a, b, c, d, k[8], 6, 0x6fa87e4f);
    d = ii(d, a, b, c, k[15], 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, k[6], 15, 0xa3014314);
    b = ii(b, c, d, a, k[13], 21, 0x4e0811a1);
    a = ii(a, b, c, d, k[4], 6, 0xf7537e82);
    d = ii(d, a, b, c, k[11], 10, 0xbd3af235);
    c = ii(c, d, a, b, k[2], 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, k[9], 21, 0xeb86d391);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, _x: number, s: number, t: number): number {
    return add32(bitRotateLeft(add32(add32(a, q), add32(_x, t)), s), b);
  }

  function ff(a: number, b: number, c: number, d: number, _x: number, s: number, t: number): number {
    return cmn((b & c) | ((~b) & d), a, b, _x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, _x: number, s: number, t: number): number {
    return cmn((b & d) | (c & (~d)), a, b, _x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, _x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, _x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, _x: number, s: number, t: number): number {
    return cmn(c ^ (b | (~d)), a, b, _x, s, t);
  }

  function add32(a: number, b: number): number {
    return (a + b) & 0xFFFFFFFF;
  }

  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function str2binl(str: string): number[] {
    const bin: number[] = [];
    const mask = (1 << 8) - 1;
    for (let i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
    }
    return bin;
  }

  function binl2hex(binarray: number[]): string {
    const hexTab = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) +
             hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
    }
    return str;
  }

  function coreMd5(x: number[], len: number): number[] {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;
      const k = x.slice(i, i + 16);
      const state: number[] = [];
      state[0] = a; state[1] = b; state[2] = c; state[3] = d;
      md5Cycle(state, k);
      a = state[0]; b = state[1]; c = state[2]; d = state[3];
    }
    return [a, b, c, d];
  }

  const bin = str2binl(string);
  const digest = coreMd5(bin, string.length * 8);
  return binl2hex(digest);
}

async function shaHash(input: string, algorithm: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const algoName = algorithm.replace('-', '-'); // Keep as-is, just normalize
  const hashBuffer = await crypto.subtle.digest(algoName, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function HashGeneratorPage() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const computeHash = useCallback(async (text: string, algo: Algorithm) => {
    if (!text) {
      setOutput('');
      return;
    }
    setIsHashing(true);
    try {
      let result: string;
      if (algo === 'MD5') {
        result = md5(text);
      } else {
        result = await shaHash(text, algo);
      }
      setOutput(result);
    } catch (err) {
      setOutput('Error computing hash');
    } finally {
      setIsHashing(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    computeHash(value, algorithm);
  }, [algorithm, computeHash]);

  const handleAlgorithmChange = useCallback((newAlgo: Algorithm) => {
    setAlgorithm(newAlgo);
    computeHash(input, newAlgo);
  }, [input, computeHash]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setFileName(null);
    setInputMode('text');
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Hash copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setInputMode('file');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setInput(content);
      computeHash(content, algorithm);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  }, [algorithm, computeHash]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setInputMode('file');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setInput(content);
      computeHash(content, algorithm);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  }, [algorithm, computeHash]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const currentAlgoInfo = ALGO_INFO[algorithm];

  return (
    <ToolLayout
      title="Hash Generator"
      description="Generate MD5, SHA-1, SHA-256, SHA-384 & SHA-512 hashes from text or files — entirely client-side."
    >
      {/* Algorithm Selector */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-3">Algorithm</h2>
        <div className="flex flex-wrap gap-2">
          {ALGORITHMS.map((algo) => (
            <button
              key={algo}
              onClick={() => handleAlgorithmChange(algo)}
              className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all ${
                algorithm === algo
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 shadow-sm shadow-brand-500/10'
                  : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {algo}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-slate-700/50">
            <Hash className="w-3 h-3" />
            {currentAlgoInfo.bits} bits
          </span>
          <span>{currentAlgoInfo.description}</span>
        </div>
      </div>

      {/* Input */}
      <div
        className="card mb-6"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <label className="text-white font-semibold text-sm">Input</label>
            <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setInputMode('text')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => {
                  setInputMode('file');
                  fileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-700/50 ${
                  inputMode === 'file'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                File
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {input && (
              <>
                <span className="text-xs text-slate-500 font-mono">{input.length.toLocaleString()} chars</span>
                <button
                  onClick={handleClear}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {inputMode === 'file' && fileName ? (
          <div
            className="bg-surface rounded-lg border border-slate-700/50 p-4 flex items-center gap-3 cursor-pointer hover:border-slate-600 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-5 h-5 text-brand-400" />
            <div>
              <p className="text-white text-sm font-medium">{fileName}</p>
              <p className="text-xs text-slate-500">{input.length.toLocaleString()} characters read</p>
            </div>
            <button className="ml-auto text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Change file
            </button>
          </div>
        ) : (
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              inputMode === 'text'
                ? "Enter text to hash...\n\nOr drag & drop a file here."
                : "Drop a file here or click to select..."
            }
            className="input-field w-full h-40 resize-y font-mono text-xs"
            spellCheck={false}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />

        {inputMode === 'text' && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-slate-500 hover:text-brand-400 transition-colors flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Or upload a file
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-400" />
            {algorithm} Hash
          </h2>
          {output && (
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          )}
        </div>

        {isHashing && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-6 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Computing hash...</span>
            </div>
          </div>
        )}

        {!isHashing && output && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-4">
            <p className="font-mono text-sm text-brand-300 break-all select-all">{output}</p>
          </div>
        )}

        {!isHashing && !output && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-8 text-center">
            <Hash className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Enter text or upload a file above to generate a hash.
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

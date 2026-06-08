'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Shield, Lock, Unlock, RefreshCw, FileCheck, Key } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────

type Operation = 'hash' | 'hmac' | 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'random';
type Algorithm = 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-1';
type AESMode = 'AES-GCM' | 'AES-CBC' | 'AES-CTR';

// ── Helpers ────────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAESKey(rawKey: Uint8Array, algo: AESMode): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(32);
  keyBytes.set(rawKey.slice(0, 32));
  return crypto.subtle.importKey(
    'raw', keyBytes,
    { name: algo, length: 256 },
    false,
    algo === 'AES-GCM' ? ['encrypt', 'decrypt'] : ['encrypt', 'decrypt']
  );
}

// ── Operations ─────────────────────────────────────────────────────────

async function doHash(algo: Algorithm, input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest(algo, data);
  return bufToHex(hash);
}

async function doHMAC(algo: string, input: string, keyStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyStr);
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: algo },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return bufToHex(sig);
}

async function doAESEncrypt(algo: AESMode, plaintext: string, keyStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(keyStr);
  const key = await deriveAESKey(rawKey, algo);

  if (algo === 'AES-GCM') {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return bufToBase64(combined.buffer);
  }

  if (algo === 'AES-CBC') {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encoder.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return bufToBase64(combined.buffer);
  }

  // AES-CTR
  const counter = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter, length: 64 },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(counter.length + encrypted.byteLength);
  combined.set(counter);
  combined.set(new Uint8Array(encrypted), counter.length);
  return bufToBase64(combined.buffer);
}

async function doAESDecrypt(algo: AESMode, cipherB64: string, keyStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const rawKey = encoder.encode(keyStr);
  const key = await deriveAESKey(rawKey, algo);
  const combined = base64ToBuf(cipherB64);

  if (algo === 'AES-GCM') {
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return decoder.decode(decrypted);
  }

  if (algo === 'AES-CBC') {
    const iv = combined.slice(0, 16);
    const ciphertext = combined.slice(16);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext);
    return decoder.decode(decrypted);
  }

  // AES-CTR
  const counter = combined.slice(0, 16);
  const ciphertext = combined.slice(16);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter, length: 64 },
    key, ciphertext
  );
  return decoder.decode(decrypted);
}

async function doSign(algo: string, input: string, keyStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyStr);
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: algo },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return bufToBase64(sig);
}

async function doVerify(algo: string, input: string, sigB64: string, keyStr: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyStr);
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: algo },
    false, ['verify']
  );
  const sig = base64ToBuf(sigB64);
  return crypto.subtle.verify('HMAC', key, sig.buffer as ArrayBuffer, encoder.encode(input));
}

function doRandom(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bufToHex(bytes.buffer);
}

// ── Main Component ─────────────────────────────────────────────────────

export default function WebCryptoPlaygroundPage() {
  const [operation, setOperation] = useState<Operation>('hash');
  const [input, setInput] = useState('Hello, Web Crypto API!');
  const [key, setKey] = useState('my-secret-key-2024');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const [hashAlgo, setHashAlgo] = useState<Algorithm>('SHA-256');
  const [aesMode, setAESMode] = useState<AESMode>('AES-GCM');
  const [randomLen, setRandomLen] = useState(32);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const [encryptedOutput, setEncryptedOutput] = useState('');
  const [signatureOutput, setSignatureOutput] = useState('');

  const runOperation = useCallback(async () => {
    setRunning(true);
    setError(null);
    setVerificationResult(null);
    try {
      switch (operation) {
        case 'hash': {
          const result = await doHash(hashAlgo, input);
          setOutput(result);
          break;
        }
        case 'hmac': {
          const result = await doHMAC(hashAlgo, input, key);
          setOutput(result);
          break;
        }
        case 'encrypt': {
          const result = await doAESEncrypt(aesMode, input, key);
          setOutput(result);
          setEncryptedOutput(result);
          break;
        }
        case 'decrypt': {
          const result = await doAESDecrypt(aesMode, input, key);
          setOutput(result);
          break;
        }
        case 'sign': {
          const result = await doSign(hashAlgo, input, key);
          setOutput(result);
          setSignatureOutput(result);
          break;
        }
        case 'verify': {
          const sigToUse = signatureOutput || input;
          const verified = await doVerify(hashAlgo, input, sigToUse, key);
          setVerificationResult(verified);
          setOutput(verified ? 'Signature VALID - data is authentic and untampered.' : 'Signature INVALID - data may have been modified or key is wrong.');
          break;
        }
        case 'random': {
          const result = doRandom(randomLen);
          setOutput(result);
          break;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setOutput('');
    } finally {
      setRunning(false);
    }
  }, [operation, input, key, hashAlgo, aesMode, randomLen, signatureOutput]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Output copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const operations: { id: Operation; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'hash', label: 'Hash', icon: <Shield className="w-4 h-4" />, desc: 'SHA-1 / SHA-256 / 384 / 512' },
    { id: 'hmac', label: 'HMAC', icon: <FileCheck className="w-4 h-4" />, desc: 'Keyed-hash authentication' },
    { id: 'encrypt', label: 'Encrypt', icon: <Lock className="w-4 h-4" />, desc: 'AES-GCM / AES-CBC / AES-CTR' },
    { id: 'decrypt', label: 'Decrypt', icon: <Unlock className="w-4 h-4" />, desc: 'Decrypt AES ciphertext' },
    { id: 'sign', label: 'Sign', icon: <Key className="w-4 h-4" />, desc: 'HMAC signature' },
    { id: 'verify', label: 'Verify', icon: <FileCheck className="w-4 h-4" />, desc: 'Verify a signature' },
    { id: 'random', label: 'Random', icon: <RefreshCw className="w-4 h-4" />, desc: 'CSPRNG bytes' },
  ];

  const needsKey = ['hmac', 'encrypt', 'decrypt', 'sign', 'verify'].includes(operation);

  return (
    <ToolLayout
      title="Web Crypto Playground"
      description="Explore the browser's native SubtleCrypto API. Hash, encrypt, decrypt, sign, verify, and generate random bytes - all client-side with zero dependencies."
    >
      {/* Operation tabs */}
      <div className="card mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {operations.map((op) => (
            <button
              key={op.id}
              onClick={() => {
                setOperation(op.id);
                setError(null);
                setOutput('');
                setVerificationResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                operation === op.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
              }`}
              title={op.desc}
            >
              {op.icon}
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Options bar */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-4">
              {['hash', 'sign', 'verify', 'hmac'].includes(operation) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Algorithm</span>
                  <select
                    value={hashAlgo}
                    onChange={(e) => setHashAlgo(e.target.value as Algorithm)}
                    className="bg-surface border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500/50"
                  >
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-384">SHA-384</option>
                    <option value="SHA-512">SHA-512</option>
                    <option value="SHA-1">SHA-1</option>
                  </select>
                </div>
              )}
              {['encrypt', 'decrypt'].includes(operation) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode</span>
                  <select
                    value={aesMode}
                    onChange={(e) => setAESMode(e.target.value as AESMode)}
                    className="bg-surface border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500/50"
                  >
                    <option value="AES-GCM">AES-GCM (auth)</option>
                    <option value="AES-CBC">AES-CBC</option>
                    <option value="AES-CTR">AES-CTR</option>
                  </select>
                </div>
              )}
              {operation === 'random' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bytes</span>
                  <input
                    type="number"
                    value={randomLen}
                    onChange={(e) => setRandomLen(Math.max(1, Math.min(256, parseInt(e.target.value) || 32)))}
                    className="bg-surface border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono w-20 focus:outline-none focus:border-brand-500/50"
                    min={1}
                    max={256}
                  />
                </div>
              )}
              <div className="flex-1" />
              <button
                onClick={runOperation}
                disabled={running}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                {running ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {operation === 'verify' ? 'Verify' : operation === 'random' ? 'Generate' : 'Run'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="card">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {operation === 'decrypt' ? 'Ciphertext (Base64)' :
               operation === 'verify' ? 'Input Data' :
               operation === 'random' ? 'Click Generate to create random bytes' : 'Input'}
            </label>
            {operation === 'random' ? (
              <div className="input-field bg-surface rounded-lg border border-slate-600/50 p-4 min-h-[100px]">
                {output ? (
                  <span className="font-mono text-sm text-green-400 break-all">{output}</span>
                ) : (
                  <span className="text-slate-500 text-sm">Click Generate to create cryptographically random bytes</span>
                )}
              </div>
            ) : (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  operation === 'encrypt' ? 'Plaintext to encrypt...' :
                  operation === 'decrypt' ? 'Paste Base64 ciphertext...' :
                  operation === 'sign' ? 'Data to sign...' :
                  operation === 'verify' ? 'Data to verify...' :
                  'Enter text...'
                }
                className="input-field w-full resize-y min-h-[100px] font-mono text-sm"
                rows={4}
                spellCheck={false}
              />
            )}
            {operation === 'decrypt' && encryptedOutput && (
              <button
                onClick={() => setInput(encryptedOutput)}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Use last encrypted output
              </button>
            )}
            {operation === 'verify' && signatureOutput && (
              <button
                onClick={() => setInput(signatureOutput)}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Use last signature
              </button>
            )}
          </div>

          {/* Key */}
          {needsKey && (
            <div className="card">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {['encrypt', 'decrypt'].includes(operation) ? 'Encryption Key' : 'Secret Key'}
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your secret key..."
                className="input-field w-full font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Key is padded/truncated to 256 bits for AES. For real applications, use PBKDF2 or a proper KDF.
              </p>
            </div>
          )}
        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          <div className="card min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Output</h3>
              {output && (
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                <p className="text-red-400 text-sm font-mono break-all">{error}</p>
              </div>
            )}
            {verificationResult !== null && (
              <div className={`border rounded-lg p-3 mb-3 ${verificationResult ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <p className={`text-sm font-semibold ${verificationResult ? 'text-green-400' : 'text-red-400'}`}>
                  {verificationResult ? 'Valid Signature' : 'Invalid Signature'}
                </p>
                <p className={`text-xs mt-1 ${verificationResult ? 'text-green-500' : 'text-red-500'}`}>{output}</p>
              </div>
            )}
            {output && verificationResult === null && (
              <div className="bg-surface rounded-lg border border-slate-700/50 p-3 flex-1">
                <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">{output}</pre>
              </div>
            )}
            {!output && !error && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 text-sm text-center">
                  {operation === 'random' ? 'Click Generate' : 'Configure input and click Run'}
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="card bg-surface-lighter border border-slate-700/30">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">About Web Crypto</h3>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p><code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-[10px]">crypto.subtle</code> provides low-level cryptographic operations directly in the browser.</p>
              <p><strong className="text-slate-300">Hashing:</strong> SHA-family one-way digests.</p>
              <p><strong className="text-slate-300">HMAC:</strong> Authenticate messages with a shared secret.</p>
              <p><strong className="text-slate-300">AES-GCM:</strong> Authenticated encryption (recommended).</p>
              <p><strong className="text-slate-300">CSPRNG:</strong> <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-[10px]">getRandomValues()</code> for truly random data.</p>
              <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-700/40">All operations run locally. No data is sent over the network.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign → Verify bridge */}
      {operation === 'sign' && signatureOutput && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-slate-300">Signature stored</span>
              <span className="text-xs text-slate-500">- switch to Verify tab</span>
            </div>
            <button
              onClick={() => { setOperation('verify'); setInput(signatureOutput); }}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Verify now
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setOperation('hash');
              setInput('The quick brown fox jumps over the lazy dog');
              setTimeout(() => runOperation(), 50);
            }}
            className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 text-xs text-slate-300 hover:text-brand-300 transition-all"
          >
            Hash a pangram
          </button>
          <button
            onClick={() => {
              setOperation('random');
              setRandomLen(32);
              setTimeout(() => runOperation(), 50);
            }}
            className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 text-xs text-slate-300 hover:text-brand-300 transition-all"
          >
            Generate 32 bytes
          </button>
          <button
            onClick={() => {
              setOperation('hmac');
              setInput('Hello, World!');
              setKey('super-secret');
              setTimeout(() => runOperation(), 50);
            }}
            className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 text-xs text-slate-300 hover:text-brand-300 transition-all"
          >
            HMAC a message
          </button>
          <button
            onClick={() => {
              setOperation('encrypt');
              setAESMode('AES-GCM');
              setInput('Sensitive data here');
              setKey('encryption-key-42');
              setTimeout(() => runOperation(), 50);
            }}
            className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 text-xs text-slate-300 hover:text-brand-300 transition-all"
          >
            Encrypt with AES-GCM
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}

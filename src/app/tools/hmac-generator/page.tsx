'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Key, Check, Lock, Info } from 'lucide-react';
import toast from 'react-hot-toast';

type Algorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
type OutputFormat = 'hex' | 'base64';

const ALGORITHMS: Algorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'hex', label: 'Hex' },
  { value: 'base64', label: 'Base64' },
];

interface UseCase {
  name: string;
  icon: string;
  algorithm: Algorithm;
  description: string;
  exampleKey: string;
  exampleMessage: string;
  headerExample?: string;
}

const USE_CASES: UseCase[] = [
  {
    name: 'Stripe Webhooks',
    icon: 'ST',
    algorithm: 'SHA-256',
    description:
      'Stripe signs webhook payloads with HMAC-SHA256 using your signing secret.',
    exampleKey: 'whsec_your_stripe_signing_secret',
    exampleMessage: '{"id":"evt_1ABCDEF","type":"payment_intent.succeeded"}',
    headerExample:
      'Compare with Stripe-Signature header: t=...,v1=<your hash>',
  },
  {
    name: 'GitHub Webhooks',
    icon: 'GH',
    algorithm: 'SHA-256',
    description:
      'GitHub signs payloads with HMAC-SHA256 (x-hub-signature-256).',
    exampleKey: 'your_github_webhook_secret',
    exampleMessage: '{"ref":"refs/heads/main","commits":[]}',
    headerExample:
      'x-hub-signature-256: sha256=<your hash>',
  },
  {
    name: 'Shopify Webhooks',
    icon: 'SP',
    algorithm: 'SHA-256',
    description:
      'Shopify uses HMAC-SHA256 to sign webhook payloads.',
    exampleKey: 'shpss_your_shopify_secret',
    exampleMessage: '{"id":12345,"note":"Order #1001"}',
    headerExample:
      'X-Shopify-Hmac-SHA256: <your base64 hash>',
  },
  {
    name: 'Slack Signing',
    icon: 'SK',
    algorithm: 'SHA-256',
    description:
      'Slack signs requests with HMAC-SHA256 (v0 format).',
    exampleKey: 'your_slack_signing_secret',
    exampleMessage: 'v0:1234567890:{"type":"url_verification"}',
    headerExample:
      'X-Slack-Signature: v0=<your hash>',
  },
  {
    name: 'AWS SigV4',
    icon: 'AW',
    algorithm: 'SHA-256',
    description:
      'AWS Signature V4 uses HMAC extensively for request signing.',
    exampleKey: 'AWS4wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    exampleMessage: 'AWS4-HMAC-SHA256\n20150830T123600Z\n...',
  },
  {
    name: 'OAuth 1.0',
    icon: 'OA',
    algorithm: 'SHA-1',
    description:
      'OAuth 1.0a uses HMAC-SHA1 for request signatures.',
    exampleKey: 'consumer_secret&token_secret',
    exampleMessage:
      'POST&https%3A%2F%2Fapi.twitter.com%2F1.1%2Fstatuses%2Fupdate.json&...',
  },
  {
    name: 'JWT HS256',
    icon: 'JW',
    algorithm: 'SHA-256',
    description:
      'JWT tokens signed with HS256 use HMAC-SHA256.',
    exampleKey: 'your-256-bit-secret',
    exampleMessage: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
  },
];

async function computeHmac(
  key: string,
  message: string,
  algorithm: Algorithm,
  format: OutputFormat,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);

  if (format === 'hex') {
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export default function HmacGeneratorPage() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256');
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<OutputFormat>('hex');
  const [copied, setCopied] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeUseCase, setActiveUseCase] = useState<string | null>(null);

  const handleCompute = useCallback(
    async (k: string, msg: string, algo: Algorithm, fmt: OutputFormat) => {
      if (!k || !msg) {
        setOutput('');
        return;
      }
      setIsComputing(true);
      try {
        const result = await computeHmac(k, msg, algo, fmt);
        setOutput(result);
      } catch (err) {
        setOutput('');
        toast.error('Error computing HMAC');
      } finally {
        setIsComputing(false);
      }
    },
    [],
  );

  const handleKeyChange = useCallback(
    (value: string) => {
      setKey(value);
      handleCompute(value, message, algorithm, format);
    },
    [message, algorithm, format, handleCompute],
  );

  const handleMessageChange = useCallback(
    (value: string) => {
      setMessage(value);
      handleCompute(key, value, algorithm, format);
    },
    [key, algorithm, format, handleCompute],
  );

  const handleAlgorithmChange = useCallback(
    (algo: Algorithm) => {
      setAlgorithm(algo);
      handleCompute(key, message, algo, format);
    },
    [key, message, format, handleCompute],
  );

  const handleFormatChange = useCallback(
    (fmt: OutputFormat) => {
      setFormat(fmt);
      handleCompute(key, message, algorithm, fmt);
    },
    [key, message, algorithm, handleCompute],
  );

  const handleClear = useCallback(() => {
    setKey('');
    setMessage('');
    setOutput('');
    setActiveUseCase(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('HMAC copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleUseCase = useCallback(
    (uc: UseCase) => {
      setActiveUseCase(uc.name);
      setKey(uc.exampleKey);
      setMessage(uc.exampleMessage);
      setAlgorithm(uc.algorithm);
      handleCompute(uc.exampleKey, uc.exampleMessage, uc.algorithm, format);
    },
    [format, handleCompute],
  );

  return (
    <ToolLayout
      title="HMAC Generator"
      description="Generate HMAC signatures for API authentication, webhook verification, JWT signing, and request integrity — fully client-side using the Web Crypto API."
    >
      {/* Algorithm + Format Selector */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-400" />
              Hash Algorithm
            </h2>
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
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm mb-3">Output Format</h2>
            <div className="flex gap-2">
              {OUTPUT_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  onClick={() => handleFormatChange(fmt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all ${
                    format === fmt.value
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 shadow-sm shadow-brand-500/10'
                      : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Input */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-white font-semibold text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-yellow-400" />
            Secret Key
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showKey ? 'Hide' : 'Show'} key
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="Enter your secret key..."
            className="input-field w-full font-mono text-xs pr-10"
            spellCheck={false}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Key className="w-4 h-4 text-slate-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          The secret key stays entirely in your browser — never sent anywhere.
        </p>
      </div>

      {/* Message Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-white font-semibold text-sm">Message / Payload</label>
          <div className="flex items-center gap-2">
            {message && (
              <span className="text-xs text-slate-500 font-mono">
                {message.length.toLocaleString()} chars
              </span>
            )}
          </div>
        </div>
        <textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Enter the message or payload to sign..."
          className="input-field w-full h-36 resize-y font-mono text-xs"
          spellCheck={false}
        />
      </div>

      {/* Output */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            HMAC-{algorithm} ({format === 'hex' ? 'Hex' : 'Base64'})
          </h2>
          <div className="flex items-center gap-2">
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
            {key && message && (
              <button
                onClick={handleClear}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isComputing && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-6 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Computing HMAC...</span>
            </div>
          </div>
        )}

        {!isComputing && output && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-4">
            <p className="font-mono text-sm text-green-300 break-all select-all">
              {output}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {output.length} characters &bull; {algorithm} &bull; {format === 'hex' ? 'Hex' : 'Base64'} encoding
            </p>
          </div>
        )}

        {!isComputing && !output && (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-8 text-center">
            <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Enter a secret key and message above to generate an HMAC signature.
            </p>
          </div>
        )}
      </div>

      {/* Use Cases */}
      <div className="card">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-400" />
          Common Use Cases
          <span className="text-xs text-slate-500 font-normal ml-2">
            (click to load example)
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {USE_CASES.map((uc) => (
            <button
              key={uc.name}
              onClick={() => handleUseCase(uc)}
              className={`text-left p-4 rounded-lg border transition-all ${
                activeUseCase === uc.name
                  ? 'bg-brand-500/10 border-brand-500/40'
                  : 'bg-surface border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono text-brand-400">{uc.icon}</span>
                <span className="text-white text-sm font-semibold">{uc.name}</span>
                <span className="ml-auto text-xs font-mono text-slate-500">
                  HMAC-{uc.algorithm}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {uc.description}
              </p>
              {uc.headerExample && (
                <p className="mt-2 text-xs font-mono text-slate-600 bg-slate-900/50 rounded px-2 py-1 truncate">
                  {uc.headerExample}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}

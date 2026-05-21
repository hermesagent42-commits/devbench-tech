'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface JwtPart {
  raw: string;
  decoded: unknown;
  error?: string;
}

function parseJwt(token: string): { header: JwtPart; payload: JwtPart; signature: string } | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const decodePart = (part: string): JwtPart => {
    try {
      // Base64Url decode
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      const json = JSON.parse(decoded);
      return { raw: part, decoded: json };
    } catch (e) {
      return { raw: part, decoded: null, error: (e as Error).message };
    }
  };

  return {
    header: decodePart(parts[0]),
    payload: decodePart(parts[1]),
    signature: parts[2],
  };
}

function formatJson(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  return JSON.stringify(obj, null, 2);
}

function jsonToHtml(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'token-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'token-key';
          } else {
            cls = 'token-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'token-boolean';
        } else if (/null/.test(match)) {
          cls = 'token-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 0) return `expires in ${Math.abs(diff)}s`;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function JwtDebuggerPage() {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<ReturnType<typeof parseJwt> | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [collapseHeader, setCollapseHeader] = useState(false);
  const [collapsePayload, setCollapsePayload] = useState(false);

  const handleInput = useCallback((value: string) => {
    setToken(value);
    if (value.trim()) {
      setDecoded(parseJwt(value));
    } else {
      setDecoded(null);
    }
  }, []);

  const clearAll = useCallback(() => {
    setToken('');
    setDecoded(null);
  }, []);

  const copyPart = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Failed to copy')
    );
  }, []);

  const expirationInfo = useMemo(() => {
    if (!decoded?.payload.decoded || typeof decoded.payload.decoded !== 'object') return null;
    const p = decoded.payload.decoded as Record<string, unknown>;
    const exp = p.exp as number | undefined;
    const iat = p.iat as number | undefined;
    const nbf = p.nbf as number | undefined;

    if (!exp && !iat && !nbf) return null;

    const now = Math.floor(Date.now() / 1000);

    return { exp, iat, nbf, now };
  }, [decoded]);

  return (
    <ToolLayout
      title="JWT Debugger"
      description="Decode, inspect, and verify JSON Web Tokens — entirely client-side."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-white font-semibold text-sm">
            Paste your JWT token
          </label>
          {token && (
            <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <textarea
          value={token}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          className="input-field w-full h-28 resize-y font-mono text-xs"
          spellCheck={false}
        />
        {token.trim() && !decoded && (
          <p className="text-amber-400 text-sm mt-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Invalid JWT format. A JWT must have three dot-separated parts: header.payload.signature
          </p>
        )}
      </div>

      {decoded && (
        <>
          {/* Token Structure Overview */}
          <div className="card mb-6">
            <h2 className="text-white font-semibold text-lg mb-4">Token Structure</h2>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 cursor-pointer hover:bg-red-500/30 transition-colors"
                onClick={() => copyPart(token.split('.')[0], 'Header')}
                title="Click to copy"
              >
                {token.split('.')[0].substring(0, 20)}...
              </span>
              <span className="text-slate-500">.</span>
              <span
                className="px-3 py-1.5 rounded bg-fuchsia-500/20 text-fuchsia-400 cursor-pointer hover:bg-fuchsia-500/30 transition-colors"
                onClick={() => copyPart(token.split('.')[1], 'Payload')}
                title="Click to copy"
              >
                {token.split('.')[1]?.substring(0, 20)}...
              </span>
              <span className="text-slate-500">.</span>
              <span
                className="px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 cursor-pointer hover:bg-blue-500/30 transition-colors"
                onClick={() => copyPart(token.split('.')[2], 'Signature')}
                title="Click to copy"
              >
                {token.split('.')[2]?.substring(0, 20)}...
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <h2 className="text-white font-semibold text-base">Header</h2>
                <span className="text-xs text-slate-500">(algorithm &amp; token type)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyPart(formatJson(decoded.header.decoded), 'Header JSON')}
                  className="text-slate-500 hover:text-brand-400 transition-colors"
                  title="Copy header JSON"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCollapseHeader(!collapseHeader)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title={collapseHeader ? 'Expand' : 'Collapse'}
                >
                  {collapseHeader ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {decoded.header.error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                Decode error: {decoded.header.error}
              </div>
            ) : !collapseHeader ? (
              <pre
                className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: jsonToHtml(formatJson(decoded.header.decoded)),
                }}
              />
            ) : (
              <p className="text-slate-500 text-sm py-2">Collapsed — {formatJson(decoded.header.decoded).split('\n').length} lines</p>
            )}
          </div>

          {/* Payload */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                <h2 className="text-white font-semibold text-base">Payload</h2>
                <span className="text-xs text-slate-500">(claims &amp; data)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyPart(formatJson(decoded.payload.decoded), 'Payload JSON')}
                  className="text-slate-500 hover:text-brand-400 transition-colors"
                  title="Copy payload JSON"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCollapsePayload(!collapsePayload)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title={collapsePayload ? 'Expand' : 'Collapse'}
                >
                  {collapsePayload ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {decoded.payload.error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                Decode error: {decoded.payload.error}
              </div>
            ) : !collapsePayload ? (
              <pre
                className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: jsonToHtml(formatJson(decoded.payload.decoded)),
                }}
              />
            ) : (
              <p className="text-slate-500 text-sm py-2">Collapsed — {formatJson(decoded.payload.decoded).split('\n').length} lines</p>
            )}
          </div>

          {/* Signature */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <h2 className="text-white font-semibold text-base">Signature</h2>
                <span className="text-xs text-slate-500">(verification)</span>
              </div>
              <button
                onClick={() => copyPart(decoded.signature, 'Signature')}
                className="text-slate-500 hover:text-brand-400 transition-colors"
                title="Copy signature"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-surface rounded-lg p-4 border border-slate-700/50">
              <p className="font-mono text-xs text-blue-400 break-all">
                {showSecret ? decoded.signature : '••••••••••••••••••••••••••••••••••••••••••••••'}
              </p>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors mt-2 flex items-center gap-1"
              >
                {showSecret ? (
                  <><EyeOff className="w-3.5 h-3.5" /> Hide signature</>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /> Show signature</>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-2">
                ⚠️ The signature cannot be verified client-side without the secret key. Use this debugger only to inspect token contents.
              </p>
            </div>
          </div>

          {/* Expiration & Time Claims */}
          {expirationInfo && (
            <div className="card mb-6">
              <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" />
                Time Claims
              </h2>
              <div className="space-y-3 text-sm">
                {expirationInfo.iat && (
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-slate-700/50">
                    <span className="text-slate-500 font-mono w-8">iat</span>
                    <span className="text-slate-300">Issued At</span>
                    <span className="text-slate-400 font-mono">{new Date(expirationInfo.iat * 1000).toLocaleString()}</span>
                    <span className="text-slate-500 text-xs">({timeAgo(expirationInfo.iat)})</span>
                  </div>
                )}
                {expirationInfo.nbf && (
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-slate-700/50">
                    <span className="text-slate-500 font-mono w-8">nbf</span>
                    <span className="text-slate-300">Not Before</span>
                    <span className="text-slate-400 font-mono">{new Date(expirationInfo.nbf * 1000).toLocaleString()}</span>
                  </div>
                )}
                {expirationInfo.exp && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${expirationInfo.exp < expirationInfo.now ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                    <span className={`font-mono w-8 ${expirationInfo.exp < expirationInfo.now ? 'text-red-400' : 'text-green-400'}`}>exp</span>
                    <span className={expirationInfo.exp < expirationInfo.now ? 'text-red-300' : 'text-green-300'}>
                      {expirationInfo.exp < expirationInfo.now ? 'Expired' : 'Expires'}
                    </span>
                    <span className={`font-mono ${expirationInfo.exp < expirationInfo.now ? 'text-red-400' : 'text-green-400'}`}>
                      {new Date(expirationInfo.exp * 1000).toLocaleString()}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${expirationInfo.exp < expirationInfo.now ? 'text-red-400' : 'text-green-400'}`}>
                      {expirationInfo.exp < expirationInfo.now ? (
                        <><AlertTriangle className="w-3.5 h-3.5" /> Expired {timeAgo(expirationInfo.exp)}</>
                      ) : (
                        <><CheckCircle className="w-3.5 h-3.5" /> Valid ({expirationInfo.exp - expirationInfo.now}s remaining)</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw Token Info */}
          <div className="card">
            <h2 className="text-white font-semibold text-lg mb-4">Token Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <span className="text-slate-500">Total length</span>
                <p className="text-white font-mono mt-1">{token.length} characters</p>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <span className="text-slate-500">Algorithm</span>
                <p className="text-white font-mono mt-1">
                  {decoded.header.decoded !== null && typeof decoded.header.decoded === 'object'
                    ? String((decoded.header.decoded as Record<string, unknown>).alg || 'none')
                    : 'unknown'}
                </p>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <span className="text-slate-500">Token type</span>
                <p className="text-white font-mono mt-1">
                  {decoded.header.decoded !== null && typeof decoded.header.decoded === 'object'
                    ? String((decoded.header.decoded as Record<string, unknown>).typ || 'JWT')
                    : 'JWT'}
                </p>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <span className="text-slate-500">Claims count</span>
                <p className="text-white font-mono mt-1">
                  {decoded.payload.decoded !== null && typeof decoded.payload.decoded === 'object'
                    ? Object.keys(decoded.payload.decoded as object).length
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!decoded && !token && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Paste a JWT to get started</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Paste any JWT token above to decode and inspect its header, payload, and signature. Everything runs locally — your tokens never leave your browser.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}

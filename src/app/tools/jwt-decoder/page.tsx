'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Eye, EyeOff, AlertTriangle, CheckCircle2, Clock, User, Key, Hash, Shield, Globe, Layers, RefreshCw, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface JwtParts {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
}

interface ClaimInfo {
  key: string;
  value: string;
  description: string;
  icon: string;
}

interface DecodeResult {
  parts: JwtParts;
  errors: string[];
  warnings: string[];
  colorCount: number;
}

// ── Base64URL decode ───────────────────────────────────────────────────────

function base64UrlDecode(str: string): string {
  try {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad
    while (base64.length % 4 !== 0) base64 += '=';
    // Decode
    const raw = atob(base64);
    // Convert to UTF-8 string
    return decodeURIComponent(
      raw
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    throw new Error('Invalid base64url encoding');
  }
}

// ── Known claims ───────────────────────────────────────────────────────────

const REGISTERED_CLAIMS: Record<string, { label: string; icon: string }> = {
  iss: { label: 'Issuer — who issued the token', icon: '🏭' },
  sub: { label: 'Subject — who the token is about (user ID)', icon: '👤' },
  aud: { label: 'Audience — who the token is intended for', icon: '🎯' },
  exp: { label: 'Expiration time (Unix timestamp)', icon: '⏰' },
  nbf: { label: 'Not before (Unix timestamp)', icon: '🕐' },
  iat: { label: 'Issued at (Unix timestamp)', icon: '📅' },
  jti: { label: 'JWT ID — unique token identifier', icon: '🪪' },
};

const HEADER_CLAIMS: Record<string, { label: string; icon: string }> = {
  alg: { label: 'Algorithm', icon: '🔐' },
  typ: { label: 'Type (usually "JWT")', icon: '📋' },
  kid: { label: 'Key ID', icon: '🔑' },
  cty: { label: 'Content type', icon: '📄' },
};

// ── Format timestamps ──────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  
  const dateStr = d.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  let relative: string;
  if (absDiff < 60000) relative = 'just now';
  else if (absDiff < 3600000) relative = `${Math.round(absDiff / 60000)} min ${diff > 0 ? 'from now' : 'ago'}`;
  else if (absDiff < 86400000) relative = `${Math.round(absDiff / 3600000)} hr ${diff > 0 ? 'from now' : 'ago'}`;
  else relative = `${Math.round(absDiff / 86400000)} days ${diff > 0 ? 'from now' : 'ago'}`;

  return `${dateStr} (${relative})`;
}

// ── Decode JWT ─────────────────────────────────────────────────────────────

function decodeJwt(raw: string): DecodeResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw.trim()) {
    return { parts: { header: null, payload: null, signature: '' }, errors, warnings, colorCount: 0 };
  }

  // Clean up: remove any surrounding whitespace, quotes
  const token = raw.trim().replace(/^["']|["']$/g, '');

  // Check if it starts with "Bearer "
  const cleaned = token.startsWith('Bearer ') ? token.slice(7) : token;

  const parts = cleaned.split('.');

  if (parts.length !== 3) {
    if (parts.length < 3) {
      errors.push('Invalid JWT: expected 3 parts separated by dots (header.payload.signature)');
    } else {
      errors.push('Invalid JWT: too many segments — JWT should have exactly 3 dot-separated parts');
    }
    return { parts: { header: null, payload: null, signature: '' }, errors, warnings, colorCount: 0 };
  }

  const [headerB64, payloadB64, signature] = parts;

  // Decode header
  let header: Record<string, unknown> | null = null;
  try {
    const decoded = JSON.parse(base64UrlDecode(headerB64));
    if (typeof decoded !== 'object' || decoded === null) {
      errors.push('Header is not a valid JSON object');
    } else {
      header = decoded;
    }
  } catch {
    errors.push('Failed to decode JWT header — invalid Base64URL or JSON');
  }

  // Decode payload
  let payload: Record<string, unknown> | null = null;
  try {
    const decoded = JSON.parse(base64UrlDecode(payloadB64));
    if (typeof decoded !== 'object' || decoded === null) {
      errors.push('Payload is not a valid JSON object');
    } else {
      payload = decoded;
    }
  } catch {
    errors.push('Failed to decode JWT payload — invalid Base64URL or JSON');
  }

  // Check claims
  if (payload) {
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp !== undefined) {
      if (typeof payload.exp === 'number') {
        if (now > payload.exp) {
          errors.push(`Token expired ${formatTimestamp(payload.exp as number)}`);
        }
      } else {
        warnings.push('exp claim is not a number — expected a Unix timestamp');
      }
    }

    if (payload.nbf !== undefined) {
      if (typeof payload.nbf === 'number') {
        if (now < payload.nbf) {
          errors.push(`Token not yet valid until ${formatTimestamp(payload.nbf as number)}`);
        }
      } else {
        warnings.push('nbf claim is not a number — expected a Unix timestamp');
      }
    }

    if (payload.iat !== undefined && typeof payload.iat !== 'number') {
      warnings.push('iat claim is not a number — expected a Unix timestamp');
    }
  }

  // Warn about none algorithm
  if (header && header.alg === 'none') {
    warnings.push('⚠️ Algorithm is "none" — this token has no cryptographic protection. Never use in production!');
  }

  const colorCount = (header ? Object.keys(header).length : 0) + (payload ? Object.keys(payload).length : 0);

  return { parts: { header, payload, signature }, errors, warnings, colorCount };
}

// ── Sort claims: registered first, then custom ─────────────────────────────

function sortClaims(claims: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(claims);
  const registered = entries.filter(([k]) => k in REGISTERED_CLAIMS);
  const custom = entries.filter(([k]) => !(k in REGISTERED_CLAIMS));
  // Sort registered in standard order
  const order = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'];
  registered.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  custom.sort((a, b) => a[0].localeCompare(b[0]));
  return [...registered, ...custom];
}

// ── Samples ────────────────────────────────────────────────────────────────

const SAMPLES = [
  {
    label: 'Typical access token',
    jwt: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIEpvaG5zb24iLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3MTY1MDAwMDAsImV4cCI6MjUxNjUwMDAwMCwicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl0sInBlcm1pc3Npb25zIjpbInJlYWQ6dXNlcnMiLCJ3cml0ZTp1c2VycyJdfQ.signature-placeholder-base64url-encoded',
  },
  {
    label: 'Expired token',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsIm5hbWUiOiJCb2IiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.hB1gKz3gZ4QqR8sW4qH9vL0mN2pX5tY7wA8bC3dE6fI',
  },
  {
    label: 'OAuth ID token (OpenID)',
    jwt: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkYzEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIxMjM0NTY3ODkwLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiMTIzNDU2Nzg5MC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjEwMDAwMDAwMDAwMDAwMDAwMDAwMCIsImVtYWlsIjoiYWxpY2VAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGljZSBKb2huc29uIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL3Bob3RvIiwiaWF0IjoxNzE2NTAwMDAwLCJleHAiOjI1MTY1MDAwMDB9.signature-placeholder',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function JwtDecoderPage() {
  const [rawJwt, setRawJwt] = useState('');
  const [result, setResult] = useState<DecodeResult>({
    parts: { header: null, payload: null, signature: '' },
    errors: [],
    warnings: [],
    colorCount: 0,
  });
  const [showRaw, setShowRaw] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'header' | 'payload' | null>(null);

  const handleDecode = useCallback((input: string) => {
    setRawJwt(input);
    if (!input.trim()) {
      setResult({
        parts: { header: null, payload: null, signature: '' },
        errors: [],
        warnings: [],
        colorCount: 0,
      });
      return;
    }
    const decoded = decodeJwt(input);
    setResult(decoded);
  }, []);

  const handleClear = useCallback(() => {
    setRawJwt('');
    setResult({
      parts: { header: null, payload: null, signature: '' },
      errors: [],
      warnings: [],
      colorCount: 0,
    });
    setExpandedSection(null);
  }, []);

  const copyJson = useCallback((obj: Record<string, unknown> | null) => {
    if (!obj) return;
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, []);

  const copyClaim = useCallback((value: unknown) => {
    navigator.clipboard.writeText(String(value)).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, []);

  const copyToken = useCallback(() => {
    navigator.clipboard.writeText(rawJwt).then(
      () => toast.success('Token copied!'),
      () => toast.error('Copy failed')
    );
  }, [rawJwt]);

  const { parts, errors, warnings } = result;
  const hasDecoded = parts.header !== null || parts.payload !== null;

  return (
    <ToolLayout
      title="JWT Decoder"
      description="Paste a JSON Web Token to decode and inspect its header, payload, and signature. View claims, check expiration, and identify the algorithm — 100% client-side, no token data ever leaves your browser."
    >
      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Paste a JWT token
        </label>
        <div className="flex gap-2">
          <textarea
            value={rawJwt}
            onChange={(e) => handleDecode(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            rows={3}
            className="flex-1 px-4 py-2.5 bg-slate-800/70 text-slate-200 text-sm rounded-lg border border-slate-700 
                       focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                       placeholder-slate-500 transition-colors font-mono resize-y"
          />
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 
                       hover:border-slate-600 transition-colors text-sm self-start"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Samples */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => handleDecode(s.jwt)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50 
                         hover:text-brand-400 hover:border-brand-500/40 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Errors & Warnings */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          {warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Decoded View */}
      {hasDecoded && errors.length === 0 && (
        <>
          {/* Color-coded visual breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Token Structure
            </h3>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/50 font-mono text-sm break-all leading-relaxed">
              {rawJwt.split('.').map((part, i) => {
                const colors = ['text-pink-400', 'text-violet-400', 'text-sky-400'];
                const labels = ['HEADER', 'PAYLOAD', 'SIGNATURE'];
                const bgColors = ['bg-pink-500/10', 'bg-violet-500/10', 'bg-sky-500/10'];
                return (
                  <span key={i}>
                    {i > 0 && <span className="text-slate-600">.</span>}
                    <span className={`${colors[i]} ${bgColors[i]} px-1 rounded`} title={labels[i]}>
                      {part.length > 60 ? part.slice(0, 60) + '…' + part.slice(-10) : part}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5 text-pink-400"><span className="w-2 h-2 rounded-full bg-pink-500" /> Header</span>
              <span className="flex items-center gap-1.5 text-violet-400"><span className="w-2 h-2 rounded-full bg-violet-500" /> Payload</span>
              <span className="flex items-center gap-1.5 text-sky-400"><span className="w-2 h-2 rounded-full bg-sky-500" /> Signature</span>
            </div>
          </div>

          {/* Header Section */}
          {parts.header && (
            <div className="mb-6 border border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'header' ? null : 'header')}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Key className="w-4 h-4 text-pink-400" />
                  </span>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-slate-200">Header</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Algorithm &amp; token metadata</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyJson(parts.header); }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Copy header JSON"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-500 text-xs">{Object.keys(parts.header).length} fields</span>
                </div>
              </button>

              <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
                {/* Algorithm badge */}
                {parts.header.alg !== undefined && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      String(parts.header.alg) === 'none' 
                        ? 'bg-red-500/20 text-red-400' 
                        : String(parts.header.alg) === 'HS256' || String(parts.header.alg) === 'HS384' || String(parts.header.alg) === 'HS512'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {String(parts.header.alg)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {String(parts.header.alg) === 'none' && '⚠️ No signature verification'}
                      {String(parts.header.alg).startsWith('HS') && 'HMAC symmetric (shared secret)'}
                      {String(parts.header.alg).startsWith('RS') && 'RSA asymmetric (public/private key)'}
                      {String(parts.header.alg).startsWith('ES') && 'ECDSA elliptic curve'}
                      {String(parts.header.alg).startsWith('PS') && 'RSA-PSS (probabilistic signature)'}
                      {String(parts.header.alg).startsWith('Ed') && 'EdDSA (Edwards curve)'}
                    </span>
                  </div>
                )}

                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(parts.header).map(([key, value]) => (
                      <tr key={key} className="border-b border-slate-700/30 last:border-0 group">
                        <td className="py-2 pr-4 w-24">
                          <span className="text-xs font-semibold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded font-mono">
                            {key}
                          </span>
                          {HEADER_CLAIMS[key] && (
                            <span className="block text-[10px] text-slate-500 mt-0.5">{HEADER_CLAIMS[key].label}</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <code className="text-slate-300 font-mono text-xs break-all">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : String(value)}
                            </code>
                            <button
                              onClick={() => copyClaim(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value))}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-all"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payload Section */}
          {parts.payload && (
            <div className="mb-6 border border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'payload' ? null : 'payload')}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-violet-400" />
                  </span>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-slate-200">Payload</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Claims &amp; user data</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyJson(parts.payload); }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Copy payload JSON"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-500 text-xs">{Object.keys(parts.payload).length} claims</span>
                </div>
              </button>

              <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
                <table className="w-full text-sm">
                  <tbody>
                    {sortClaims(parts.payload).map(([key, value]) => {
                      const isRegistered = key in REGISTERED_CLAIMS;
                      const isTimestamp = (key === 'exp' || key === 'nbf' || key === 'iat') && typeof value === 'number';
                      const isExpired = key === 'exp' && typeof value === 'number' && Math.floor(Date.now() / 1000) > value;
                      const isNotYetValid = key === 'nbf' && typeof value === 'number' && Math.floor(Date.now() / 1000) < value;
                      const hasIssue = isExpired || isNotYetValid;

                      return (
                        <tr key={key} className="border-b border-slate-700/30 last:border-0 group">
                          <td className="py-2.5 pr-4 w-28">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded font-mono ${
                              isRegistered 
                                ? hasIssue
                                  ? 'text-red-400 bg-red-500/10'
                                  : 'text-violet-400 bg-violet-500/10'
                                : 'text-slate-400 bg-slate-700/50'
                            }`}>
                              {key}
                            </span>
                            {isRegistered && REGISTERED_CLAIMS[key] && (
                              <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                                {REGISTERED_CLAIMS[key].icon} {REGISTERED_CLAIMS[key].label}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <code className={`font-mono text-xs break-all ${
                                  hasIssue ? 'text-red-300' : 'text-slate-300'
                                }`}>
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </code>
                                <button
                                  onClick={() => copyClaim(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value))}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-all"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              {isTimestamp && (
                                <span className={`text-xs flex items-center gap-1.5 ${
                                  hasIssue ? 'text-red-400' : 'text-slate-500'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(value as number)}
                                  {isExpired && <AlertTriangle className="w-3 h-3" />}
                                  {isNotYetValid && <AlertTriangle className="w-3 h-3" />}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="mb-6 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sky-400" />
                </span>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-slate-200">Signature</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cryptographic signature — verified server-side</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <code className="text-xs text-sky-400 font-mono break-all bg-slate-900/50 rounded-lg p-3 block">
                {parts.signature.length > 100 
                  ? parts.signature.slice(0, 80) + '…' + parts.signature.slice(-20) 
                  : parts.signature}
              </code>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                The signature is Base64URL-encoded and can only be verified with the correct secret or public key.
              </p>
            </div>
          </div>

          {/* Raw JSON toggle */}
          <div className="mb-6">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
            </button>
            {showRaw && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {parts.header && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Header (raw)</span>
                      <button onClick={() => copyJson(parts.header)} className="text-xs text-slate-500 hover:text-pink-400 transition-colors flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(parts.header, null, 2)}
                    </pre>
                  </div>
                )}
                {parts.payload && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Payload (raw)</span>
                      <button onClick={() => copyJson(parts.payload)} className="text-xs text-slate-500 hover:text-violet-400 transition-colors flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(parts.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!rawJwt.trim() && (
        <div className="text-center py-16">
          <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            Paste a JWT token above or click a sample to decode.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Everything happens client-side — your tokens never leave this browser.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}

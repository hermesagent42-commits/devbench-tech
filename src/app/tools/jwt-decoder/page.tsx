'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Eye, EyeOff, Key, FileText, Clock, AlertTriangle, CheckCircle2, XCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
}

interface ClaimInfo {
  claim: string;
  value: unknown;
  description: string;
}

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: 'Issuer — who created and signed this token',
  sub: 'Subject — the principal this token is about (usually user ID)',
  aud: 'Audience — the intended recipient(s) of this token',
  exp: 'Expiration time — token is invalid after this (UNIX timestamp)',
  nbf: 'Not before — token is invalid before this (UNIX timestamp)',
  iat: 'Issued at — when this token was created (UNIX timestamp)',
  jti: 'JWT ID — unique identifier for this token (prevents replay attacks)',
  typ: 'Type — typically "JWT"',
  alg: 'Algorithm — the signing algorithm (e.g., HS256, RS256)',
  kid: 'Key ID — which key was used to sign',
  cty: 'Content type — for nested JWTs',
};

function base64UrlDecode(str: string): string {
  // Replace URL-safe chars and pad
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

function parseJwt(token: string): { error: string } | JwtParts {
  const trimmed = token.trim();
  if (!trimmed) return { error: 'No token provided' };

  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { error: `Expected 3 parts (header.payload.signature), got ${parts.length}` };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];

    return {
      header,
      payload,
      signature,
      headerRaw: JSON.stringify(header, null, 2),
      payloadRaw: JSON.stringify(payload, null, 2),
    };
  } catch {
    return { error: 'Invalid token — base64 decoding or JSON parsing failed' };
  }
}

function formatClaimValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isExpired(exp: number): boolean {
  return Date.now() > exp * 1000;
}

function isNotBefore(nbf: number): boolean {
  return Date.now() < nbf * 1000;
}

function timeUntil(timestamp: number): string {
  const diff = timestamp * 1000 - Date.now();
  const abs = Math.abs(diff);
  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function JwtDecoderPage() {
  const [input, setInput] = useState('');
  const [masked, setMasked] = useState(true);

  const parsed = useMemo(() => parseJwt(input), [input]);

  const clear = useCallback(() => setInput(''), []);

  const copyText = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${label}`),
      () => toast.error('Copy failed')
    );
  }, []);

  const claims: ClaimInfo[] = useMemo(() => {
    if ('error' in parsed) return [];
    const payload = parsed.payload;
    return Object.entries(payload).map(([claim, value]) => ({
      claim,
      value,
      description: CLAIM_DESCRIPTIONS[claim] || '',
    }));
  }, [parsed]);

  const expClaim = ('error' in parsed ? null : parsed.payload.exp) as number | undefined;
  const nbfClaim = ('error' in parsed ? null : parsed.payload.nbf) as number | undefined;
  const iatClaim = ('error' in parsed ? null : parsed.payload.iat) as number | undefined;

  const headerJson = 'error' in parsed ? '' : parsed.headerRaw;
  const payloadJson = 'error' in parsed ? '' : parsed.payloadRaw;

  // Mask the token in the UI
  const displayInput = masked && input.includes('.')
    ? (() => {
        const parts = input.trim().split('.');
        if (parts.length === 3) {
          const mask = (s: string) => s.slice(0, 6) + '...' + s.slice(-4);
          return mask(parts[0]) + '.' + mask(parts[1]) + '.' + parts[2].slice(0, 8) + '...';
        }
        return input;
      })()
    : input;

  return (
    <ToolLayout
      title="JWT Decoder"
      description="Decode and inspect JWT tokens — view header, payload, claims, expiration status, and copy decoded JSON. 100% client-side."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-400" />
            JWT Token
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMasked(!masked)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-surface transition-colors"
              title={masked ? 'Show token' : 'Hide token'}
            >
              {masked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={clear} className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-surface transition-colors" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <textarea
          value={displayInput}
          onChange={(e) => {
            if (masked && input) {
              // If in masked mode, clear to re-enter
              setMasked(false);
              setInput('');
            } else {
              setInput(e.target.value);
            }
          }}
          onFocus={() => { if (masked && input) { setMasked(false); } }}
          placeholder="Paste your JWT token here...
e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          className="input-field w-full h-28 resize-y font-mono text-sm"
          spellCheck={false}
        />

        {/* Quick paste examples */}
        {!input && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setInput('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FcM6J5gq4YF0qP0oA6g9wR7sE')}
              className="px-2.5 py-1 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
            >
              Example JWT (HS256)
            </button>
            <button
              onClick={() => setInput('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXRoLmV4YW1wbGUuY29tIiwic3ViIjoiYXV0aDB8MTIzNDUiLCJhdWQiOiJhcGkuZXhhbXBsZS5jb20iLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTUxNjIzOTAyMiwibmJmIjoxNTE2MjM5MDIyLCJqdGkiOiJ1bmlxdWUtaWQiLCJuYW1lIjoiSm9obiBEb2UiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIiwiYWRtaW4iXX0.ZmFrZS1zaWduYXR1cmUtZm9yLWRpc3BsYXktcHVycG9zZXM')}
              className="px-2.5 py-1 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
            >
              Example JWT (RS256, many claims)
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {'error' in parsed && input && (
        <div className="card border-red-500/30 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">{parsed.error}</span>
          </div>
        </div>
      )}

      {/* Decoded content */}
      {'error' in parsed === false && input && (
        <div className="space-y-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {expClaim !== undefined && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                isExpired(expClaim)
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-green-500/15 text-green-400 border border-green-500/30'
              }`}>
                {isExpired(expClaim) ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isExpired(expClaim) ? `Expired ${timeUntil(expClaim)} ago` : `Expires in ${timeUntil(expClaim)}`}
              </div>
            )}
            {nbfClaim !== undefined && isNotBefore(nbfClaim) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Not valid until {new Date(nbfClaim * 1000).toLocaleString()}
              </div>
            )}
            {expClaim === undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Shield className="w-3.5 h-3.5" />
                No expiration (non-expiring token)
              </div>
            )}
            {iatClaim !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30">
                <Clock className="w-3.5 h-3.5" />
                Issued {new Date(iatClaim * 1000).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Visual breakdown */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Token Structure
            </h3>

            {/* Header section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-mono font-bold">HEADER</span>
                  <span className="text-xs text-slate-500">Algorithm &amp; Token Type</span>
                </div>
                <button
                  onClick={() => copyText(headerJson, 'header')}
                  className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                  title="Copy header JSON"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 font-mono text-sm text-slate-300 overflow-x-auto">
                <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(headerJson, 'json') }} />
              </pre>
            </div>

            {/* Payload section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-mono font-bold">PAYLOAD</span>
                  <span className="text-xs text-slate-500">Claims &amp; Data</span>
                </div>
                <button
                  onClick={() => copyText(payloadJson, 'payload')}
                  className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                  title="Copy payload JSON"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 font-mono text-sm text-slate-300 overflow-x-auto">
                <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(payloadJson, 'json') }} />
              </pre>
            </div>

            {/* Signature section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono font-bold">SIGNATURE</span>
                  <span className="text-xs text-slate-500">Verification Signature (base64url)</span>
                </div>
                <button
                  onClick={() => copyText(parsed.signature, 'signature')}
                  className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                  title="Copy signature"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 font-mono text-xs text-slate-500 overflow-x-auto break-all">
                {parsed.signature}
              </pre>
            </div>
          </div>

          {/* Claims table */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4">Claims</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Claim</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(({ claim, value, description }) => {
                    const isExpClaim = claim === 'exp' && typeof value === 'number';
                    const isNbfClaim = claim === 'nbf' && typeof value === 'number';
                    const isIatClaim = claim === 'iat' && typeof value === 'number';
                    const isTimestamp = isExpClaim || isNbfClaim || isIatClaim;

                    return (
                      <tr key={claim} className="border-b border-slate-700/30 hover:bg-surface-light/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <code className="text-brand-300 font-mono text-xs bg-brand-500/10 px-1.5 py-0.5 rounded">
                            {claim}
                          </code>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-mono text-xs break-all">
                              {formatClaimValue(value)}
                            </span>
                            <button
                              onClick={() => copyText(formatClaimValue(value), claim)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all flex-shrink-0"
                              title={`Copy ${claim}`}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {isTimestamp && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {new Date((value as number) * 1000).toLocaleString()}
                              {isExpClaim && isExpired(value as number) && (
                                <span className="text-red-400 ml-1">(EXPIRED)</span>
                              )}
                              {isNbfClaim && isNotBefore(value as number) && (
                                <span className="text-yellow-400 ml-1">(NOT YET VALID)</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs hidden sm:table-cell">
                          {description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!input && (
        <div className="card text-center py-12">
          <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-400 font-medium mb-2">Decode JWT Tokens</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Paste a JWT token above to decode its header, payload, and claims. View expiration status, timestamps, and copy any section — all done locally in your browser.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-400" />
          About JWT
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">Structure</h4>
            <p>JWTs have three parts: <code className="text-brand-400">header</code> (algorithm), <code className="text-brand-400">payload</code> (claims), and <code className="text-brand-400">signature</code> (verification). Each is base64url-encoded and separated by dots.</p>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">Security</h4>
            <p>Decoding is public — anyone can read the payload. The signature <em>verifies</em> the token has not been tampered with. Always verify JWTs on your server using the secret or public key.</p>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">Common Claims</h4>
            <p><code className="text-brand-400">exp</code> (expiration), <code className="text-brand-400">iat</code> (issued at), <code className="text-brand-400">sub</code> (subject), <code className="text-brand-400">iss</code> (issuer), <code className="text-brand-400">aud</code> (audience), and <code className="text-brand-400">jti</code> (JWT ID).</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// Simple JSON syntax highlighting (no dependencies)
function syntaxHighlight(json: string, _lang: string): string {
  if (!json) return '';
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-sky-400'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-slate-400';
          } else {
            cls = 'text-emerald-400';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-orange-400';
        } else if (/null/.test(match)) {
          cls = 'text-slate-500';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

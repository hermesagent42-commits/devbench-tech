'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, AlertTriangle, CheckCircle2, Clock, Shield, EyeOff, Eye, ChevronDown, ChevronRight, Key, FileJson, Hash, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface JwtPart {
  raw: string;
  decoded: Record<string, unknown>;
  valid: boolean;
  error?: string;
}

interface TokenInfo {
  header: JwtPart;
  payload: JwtPart;
  signature: string;
  valid: boolean;
  expired: boolean;
  notBefore: boolean;
  issuedAt: Date | null;
  expiresAt: Date | null;
  notBeforeAt: Date | null;
  errors: string[];
}

function base64UrlDecode(str: string): string {
  // Normalize base64url to base64
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad
  while (str.length % 4) {
    str += '=';
  }
  try {
    const decoded = atob(str);
    // Handle UTF-8
    try {
      return decodeURIComponent(
        decoded
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return decoded;
    }
  } catch {
    throw new Error('Invalid base64 encoding');
  }
}

function parsePart(raw: string, label: string): JwtPart {
  try {
    const json = base64UrlDecode(raw);
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        raw,
        decoded: {},
        valid: false,
        error: `${label} must be a JSON object`,
      };
    }
    return { raw, decoded: parsed as Record<string, unknown>, valid: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return {
      raw,
      decoded: {},
      valid: false,
      error: `${label}: ${msg}`,
    };
  }
}

function parseJwt(token: string): TokenInfo | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('.');
  const errors: string[] = [];

  if (parts.length !== 3) {
    errors.push(`JWT must have exactly 3 parts separated by dots (found ${parts.length})`);
    const header = parts[0] ? parsePart(parts[0], 'Header') : { raw: '', decoded: {}, valid: false, error: 'Missing header' };
    const payload = parts[1] ? parsePart(parts[1], 'Payload') : { raw: '', decoded: {}, valid: false, error: 'Missing payload' };
    return {
      header,
      payload,
      signature: parts[2] || '',
      valid: false,
      expired: false,
      notBefore: false,
      issuedAt: null,
      expiresAt: null,
      notBeforeAt: null,
      errors,
    };
  }

  const header = parsePart(parts[0], 'Header');
  const payload = parsePart(parts[1], 'Payload');
  const signature = parts[2];

  if (!header.valid && header.error) errors.push(header.error);
  if (!payload.valid && payload.error) errors.push(payload.error);

  // Check expiry
  let expired = false;
  let expiresAt: Date | null = null;
  let notBefore = false;
  let notBeforeAt: Date | null = null;
  let issuedAt: Date | null = null;

  if (payload.valid && payload.decoded) {
    const now = Math.floor(Date.now() / 1000);

    if (payload.decoded.exp !== undefined) {
      const exp = Number(payload.decoded.exp);
      if (!isNaN(exp)) {
        expiresAt = new Date(exp * 1000);
        if (now > exp) {
          expired = true;
          errors.push('Token has expired');
        }
      }
    }

    if (payload.decoded.nbf !== undefined) {
      const nbf = Number(payload.decoded.nbf);
      if (!isNaN(nbf)) {
        notBeforeAt = new Date(nbf * 1000);
        if (now < nbf) {
          notBefore = true;
          errors.push('Token is not yet valid (nbf)');
        }
      }
    }

    if (payload.decoded.iat !== undefined) {
      const iat = Number(payload.decoded.iat);
      if (!isNaN(iat)) {
        issuedAt = new Date(iat * 1000);
      }
    }
  }

  const valid = errors.length === 0;

  return {
    header,
    payload,
    signature,
    valid,
    expired,
    notBefore,
    issuedAt,
    expiresAt,
    notBeforeAt,
    errors,
  };
}

function toTitleCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
  typ: 'Type',
  alg: 'Algorithm',
  kid: 'Key ID',
  cty: 'Content Type',
  name: 'Full Name',
  given_name: 'Given Name',
  family_name: 'Family Name',
  middle_name: 'Middle Name',
  nickname: 'Nickname',
  preferred_username: 'Preferred Username',
  profile: 'Profile URL',
  picture: 'Picture URL',
  website: 'Website',
  email: 'Email',
  email_verified: 'Email Verified',
  gender: 'Gender',
  birthdate: 'Birthdate',
  zoneinfo: 'Timezone',
  locale: 'Locale',
  phone_number: 'Phone Number',
  phone_number_verified: 'Phone Verified',
  address: 'Address',
  updated_at: 'Updated At',
};

// Sample JWTs
const SAMPLES = [
  {
    label: 'HS256 Token (expired)',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMabt_sD4DnK3n7lF4VgPJ2g',
  },
  {
    label: 'RS256 Token (valid)',
    token:
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFiYzEyMyJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c2VyXzQyIiwiYXVkIjpbImFwaS5leGFtcGxlLmNvbSIsIm1vYmlsZSJdLCJpYXQiOjE3NDgzMjAwMDAsImV4cCI6MjA2Mzg4ODAwMCwibmJmIjoxNzQ4MzIwMDAwLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicm9sZXMiOlsiYWRtaW4iLCJlZGl0b3IiXX0.fake_signature_for_demo_purposes_only',
  },
  {
    label: 'None Algorithm (insecure)',
    token:
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
  },
];

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function formatRelative(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${Math.round(abs)}s`;
  if (abs < 3600) return `${Math.round(abs / 60)}m`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h`;
  if (abs < 2592000) return `${Math.round(abs / 86400)}d`;
  return `${Math.round(abs / 2592000)}mo`;
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null) return <span className="text-slate-500">null</span>;
  if (data === undefined) return <span className="text-slate-500">undefined</span>;
  if (typeof data === 'boolean')
    return <span className="text-amber-400">{data ? 'true' : 'false'}</span>;
  if (typeof data === 'number')
    return <span className="text-emerald-400">{data}</span>;
  if (typeof data === 'string')
    return <span className="text-brand-400">&ldquo;{data.length > 60 ? `${data.slice(0, 60)}...` : data}&rdquo;</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-500">[]</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-slate-400 hover:text-slate-200 mr-1 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <span className="text-slate-400">[</span>
        {collapsed ? (
          <span className="text-slate-500 italic ml-1">{data.length} items</span>
        ) : (
          <span className="ml-3 block">
            {data.map((item, i) => (
              <div key={i}>
                <JsonTree data={item} depth={depth + 1} />
                {i < data.length - 1 && <span className="text-slate-500">,</span>}
              </div>
            ))}
          </span>
        )}
        <span className="text-slate-400">]</span>
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-slate-500">{'{}'}</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-slate-400 hover:text-slate-200 mr-1 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <span className="text-slate-400">{'{'}</span>
        {collapsed ? (
          <span className="text-slate-500 italic ml-1">{entries.length} keys</span>
        ) : (
          <span className="ml-3 block">
            {entries.map(([key, value], i) => (
              <div key={key}>
                <span className="text-sky-400">&ldquo;{key}&rdquo;</span>
                <span className="text-slate-500">: </span>
                <JsonTree data={value} depth={depth + 1} />
                {i < entries.length - 1 && <span className="text-slate-500">,</span>}
              </div>
            ))}
          </span>
        )}
        <span className="text-slate-400">{'}'}</span>
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

function JsonView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  return (
    <div className="space-y-1.5 font-mono text-sm">
      {entries.map(([key, value]) => {
        const label = CLAIM_LABELS[key];
        const isTimestamp = ['exp', 'nbf', 'iat', 'updated_at'].includes(key) && typeof value === 'number';

        return (
          <div key={key} className="flex items-start gap-2 group">
            <span className="text-sky-400 shrink-0">{key}</span>
            <span className="text-slate-500">:</span>
            <div className="min-w-0">
              {typeof value === 'string' ? (
                <span className="text-brand-400 break-all">{value}</span>
              ) : typeof value === 'number' ? (
                <span className="text-emerald-400">{value}</span>
              ) : typeof value === 'boolean' ? (
                <span className="text-amber-400">{value ? 'true' : 'false'}</span>
              ) : (
                <JsonTree data={value} />
              )}
              {label && (
                <span className="text-slate-600 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  — {label}
                </span>
              )}
              {isTimestamp && (
                <span className="text-slate-500 text-xs ml-2">
                  → {new Date(value * 1000).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JwtDebuggerPage() {
  const [token, setToken] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  const info = useMemo(() => parseJwt(token), [token]);

  const loadSample = useCallback((s: string) => {
    setToken(s);
  }, []);

  const clear = useCallback(() => {
    setToken('');
  }, []);

  const copyPart = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${label}!`),
      () => toast.error('Copy failed')
    );
  }, []);

  const copyJson = useCallback((obj: Record<string, unknown>, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(
      () => toast.success(`Copied ${label}!`),
      () => toast.error('Copy failed')
    );
  }, []);

  return (
    <ToolLayout
      title="JWT Debugger"
      description="Decode, inspect, and validate JSON Web Tokens (JWT). Paste any JWT to see the header, payload, claims, and validity — 100% client-side."
    >
      {/* Samples */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => loadSample(s.token)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-300 hover:bg-surface-light hover:border-brand-500/50 hover:text-brand-400 transition-all"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Token input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-400" />
            Encoded JWT
          </h2>
          <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your JWT token here...&#10;e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
          className="input-field w-full h-28 resize-y font-mono text-sm"
          spellCheck={false}
        />
      </div>

      {info && (
        <>
          {/* Status banner */}
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
              info.valid
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            {info.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <div className={`font-semibold text-sm ${info.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                {info.valid ? 'Token Valid' : 'Token Has Issues'}
              </div>
              {info.errors.length > 0 && (
                <ul className="text-xs text-red-300 mt-1 space-y-0.5">
                  {info.errors.map((e, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-red-400">•</span> {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Token parts grid */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Header */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-sky-400" />
                  Header
                  <span className="text-slate-500 font-normal text-xs">(algorithm &amp; token type)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPart(info.header.raw, 'header (raw)')}
                    className="text-slate-400 hover:text-brand-400 transition-colors text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Raw
                  </button>
                  {info.header.valid && (
                    <button
                      onClick={() => copyJson(info.header.decoded, 'header (JSON)')}
                      className="text-slate-400 hover:text-brand-400 transition-colors text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> JSON
                    </button>
                  )}
                </div>
              </div>
              {info.header.valid ? (
                <div className="bg-surface rounded-lg p-4 border border-slate-700/50">
                  <JsonView data={info.header.decoded} />
                </div>
              ) : (
                <div className="bg-surface rounded-lg p-4 border border-red-500/30 text-red-400 text-sm">
                  {info.header.error || 'Invalid header'}
                </div>
              )}
              <div className="mt-2">
                <span className="text-slate-500 text-[10px] font-mono break-all select-all">
                  {info.header.raw || '(empty)'}
                </span>
              </div>
            </div>

            {/* Payload */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  Payload
                  <span className="text-slate-500 font-normal text-xs">(claims &amp; data)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPart(info.payload.raw, 'payload (raw)')}
                    className="text-slate-400 hover:text-brand-400 transition-colors text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Raw
                  </button>
                  {info.payload.valid && (
                    <button
                      onClick={() => copyJson(info.payload.decoded, 'payload (JSON)')}
                      className="text-slate-400 hover:text-brand-400 transition-colors text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> JSON
                    </button>
                  )}
                </div>
              </div>
              {info.payload.valid ? (
                <div className="bg-surface rounded-lg p-4 border border-slate-700/50">
                  <JsonView data={info.payload.decoded} />
                </div>
              ) : (
                <div className="bg-surface rounded-lg p-4 border border-red-500/30 text-red-400 text-sm">
                  {info.payload.error || 'Invalid payload'}
                </div>
              )}
              <div className="mt-2">
                <span className="text-slate-500 text-[10px] font-mono break-all select-all">
                  {info.payload.raw || '(empty)'}
                </span>
              </div>
            </div>

            {/* Signature */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-400" />
                  Signature
                  <span className="text-slate-500 font-normal text-xs">(verification not performed client-side)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSignature(!showSignature)}
                    className="text-slate-400 hover:text-slate-200 transition-colors text-xs flex items-center gap-1"
                  >
                    {showSignature ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showSignature ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => copyPart(info.signature, 'signature')}
                    className="text-slate-400 hover:text-brand-400 transition-colors text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-slate-700/50">
                {showSignature ? (
                  <span className="font-mono text-xs text-amber-400 break-all select-all">
                    {info.signature || '(none)'}
                  </span>
                ) : (
                  <span className="font-mono text-xs text-slate-600">
                    {info.signature
                      ? `${info.signature.slice(0, 20)}...${info.signature.slice(-10)}`
                      : '(none)'}
                  </span>
                )}
              </div>
              {!info.signature && (
                <p className="text-xs text-amber-400 mt-2">
                  No signature present. This token uses the &ldquo;none&rdquo; algorithm — do not trust it!
                </p>
              )}
            </div>
          </div>

          {/* Timeline */}
          {(info.issuedAt || info.expiresAt || info.notBeforeAt) && (
            <div className="card mb-6">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-brand-400" />
                Timeline
              </h2>
              <div className="space-y-3">
                {info.issuedAt && (
                  <div className="flex items-center justify-between py-2 px-3 rounded bg-surface border border-slate-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span className="text-slate-300">Issued At (iat)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-200 text-sm font-mono">{formatDate(info.issuedAt)}</div>
                      <div className="text-slate-500 text-xs">
                        {formatRelative((Date.now() - info.issuedAt.getTime()) / 1000)} ago
                      </div>
                    </div>
                  </div>
                )}
                {info.notBeforeAt && (
                  <div className={`flex items-center justify-between py-2 px-3 rounded border transition-colors ${
                    info.notBefore ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-slate-700/50'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      {info.notBefore ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-slate-300">Not Before (nbf)</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${info.notBefore ? 'text-red-400' : 'text-slate-200'}`}>
                        {formatDate(info.notBeforeAt)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {info.notBefore ? (
                          <span className="text-red-400">
                            Not yet valid — wait {formatRelative((info.notBeforeAt.getTime() - Date.now()) / 1000)}
                          </span>
                        ) : (
                          `${formatRelative((Date.now() - info.notBeforeAt.getTime()) / 1000)} ago`
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {info.expiresAt && (
                  <div className={`flex items-center justify-between py-2 px-3 rounded border transition-colors ${
                    info.expired ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-slate-700/50'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      {info.expired ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-slate-300">Expires (exp)</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${info.expired ? 'text-red-400' : 'text-slate-200'}`}>
                        {formatDate(info.expiresAt)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {info.expired ? (
                          <span className="text-red-400">
                            Expired {formatRelative((Date.now() - info.expiresAt.getTime()) / 1000)} ago
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {formatRelative((info.expiresAt.getTime() - Date.now()) / 1000)} remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* About JWT */}
          <div className="mt-8 p-5 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-white font-medium text-sm mb-3">About JWTs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-400">
              <div>
                <p>
                  A JSON Web Token (JWT) is a compact, URL-safe way to transmit claims
                  between parties. Each token has three parts separated by dots:
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li><code className="text-sky-400 bg-slate-800 px-1.5 py-0.5 rounded">Header</code> — algorithm &amp; token type</li>
                  <li><code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">Payload</code> — the claims/assertions</li>
                  <li><code className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">Signature</code> — cryptographic proof</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-300">Security Note</p>
                <p className="mt-1 text-xs">
                  This tool decodes and inspects JWTs entirely in your browser — the token
                  never leaves your machine. However, signature verification requires the
                  secret key or public key, which this tool does not have. Always verify
                  signatures server-side before trusting claims.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!info && token.trim() === '' && (
        <div className="card text-center py-16">
          <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">
            Paste a JWT above or select a sample to decode and inspect it
          </p>
        </div>
      )}
    </ToolLayout>
  );
}

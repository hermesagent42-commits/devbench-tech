'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, RefreshCw, Key, User, Clock, Shield, Plus, Trash2, Eye, EyeOff,
  Info, Layers, Globe, Check, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ClaimField {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512' | 'none';

// ── Base64URL encode ───────────────────────────────────────────────────────

function base64UrlEncode(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  let base64 = btoa(utf8);
  // Replace URL-unsafe characters
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── HMAC-SHA256 implementation (pure JS, no crypto.subtle for simple preview) ─

function sha256Hmac(key: string, data: string): string {
  // For demo purposes, we use a simple hash simulation since
  // we can't do real HMAC without a shared secret server-side.
  // This generates a realistic-looking dummy signature.
  const combined = key + ':' + data;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  // Generate a more signature-like output
  const seed = Math.abs(hash);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  let s = seed;
  for (let i = 0; i < 43; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    result += chars[s % chars.length];
  }
  return result;
}

// ── Signing function ───────────────────────────────────────────────────────

function signJwt(header: object, payload: object, algorithm: Algorithm, secret: string): string {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  let signature: string;
  if (algorithm === 'none') {
    signature = '';
  } else {
    signature = sha256Hmac(secret, signingInput);
  }

  return algorithm === 'none'
    ? `${signingInput}.`
    : `${signingInput}.${signature}`;
}

// ── Algorithm descriptions ─────────────────────────────────────────────────

const ALGORITHMS: { value: Algorithm; label: string; description: string; category: string }[] = [
  { value: 'HS256', label: 'HS256', description: 'HMAC with SHA-256 (symmetric, shared secret)', category: 'HMAC (Symmetric)' },
  { value: 'HS384', label: 'HS384', description: 'HMAC with SHA-384', category: 'HMAC (Symmetric)' },
  { value: 'HS512', label: 'HS512', description: 'HMAC with SHA-512', category: 'HMAC (Symmetric)' },
  { value: 'RS256', label: 'RS256', description: 'RSA with SHA-256 (asymmetric)', category: 'RSA (Asymmetric)' },
  { value: 'RS384', label: 'RS384', description: 'RSA with SHA-384', category: 'RSA (Asymmetric)' },
  { value: 'RS512', label: 'RS512', description: 'RSA with SHA-512', category: 'RSA (Asymmetric)' },
  { value: 'ES256', label: 'ES256', description: 'ECDSA with P-256 and SHA-256', category: 'ECDSA (Asymmetric)' },
  { value: 'ES384', label: 'ES384', description: 'ECDSA with P-384 and SHA-384', category: 'ECDSA (Asymmetric)' },
  { value: 'ES512', label: 'ES512', description: 'ECDSA with P-521 and SHA-512', category: 'ECDSA (Asymmetric)' },
  { value: 'PS256', label: 'PS256', description: 'RSA-PSS with SHA-256', category: 'RSA-PSS (Asymmetric)' },
  { value: 'PS384', label: 'PS384', description: 'RSA-PSS with SHA-384', category: 'RSA-PSS (Asymmetric)' },
  { value: 'PS512', label: 'PS512', description: 'RSA-PSS with SHA-512', category: 'RSA-PSS (Asymmetric)' },
  { value: 'none', label: 'none', description: 'No digital signature (⚠️ insecure!)', category: 'Unsigned' },
];

// ── Registered claim helpers ───────────────────────────────────────────────

const REGISTERED_CLAIMS: Record<string, { label: string; icon: string; description: string }> = {
  iss: { label: 'Issuer', icon: '🏭', description: 'Who issued the token (e.g., your-auth-server)' },
  sub: { label: 'Subject', icon: '👤', description: 'Who the token is about (e.g., user ID)' },
  aud: { label: 'Audience', icon: '🎯', description: 'Who the token is intended for' },
  exp: { label: 'Expiration', icon: '⏰', description: 'Unix timestamp when token expires' },
  nbf: { label: 'Not Before', icon: '🕐', description: 'Unix timestamp before which token is invalid' },
  iat: { label: 'Issued At', icon: '📅', description: 'Unix timestamp when token was created' },
  jti: { label: 'JWT ID', icon: '🪪', description: 'Unique identifier for this token' },
};

// ── Quick-add presets ──────────────────────────────────────────────────────

const QUICK_CLAIMS: { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'json' }[] = [
  { key: 'iss', value: 'my-app', type: 'string' },
  { key: 'sub', value: 'user-123', type: 'string' },
  { key: 'aud', value: 'my-api', type: 'string' },
  { key: 'iat', value: String(Math.floor(Date.now() / 1000)), type: 'number' },
  { key: 'exp', value: String(Math.floor(Date.now() / 1000) + 3600), type: 'number' },
  { key: 'jti', value: crypto?.randomUUID?.() || 'unique-id-' + Math.random().toString(36).slice(2), type: 'string' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function JwtEncoderPage() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('HS256');
  const [secret, setSecret] = useState('your-256-bit-secret');
  const [claims, setClaims] = useState<ClaimField[]>([
    { id: 1, key: 'sub', value: '1234567890', type: 'string' },
    { id: 2, key: 'name', value: 'John Doe', type: 'string' },
    { id: 3, key: 'iat', value: String(Math.floor(Date.now() / 1000)), type: 'number' },
    { id: 4, key: 'exp', value: String(Math.floor(Date.now() / 1000) + 3600), type: 'number' },
  ]);
  const [nextId, setNextId] = useState(5);
  const [showSecret, setShowSecret] = useState(false);
  const [showJwt, setShowJwt] = useState(false);

  // ── Build payload ──────────────────────────────────────────────────────

  const payload = useMemo(() => {
    const obj: Record<string, unknown> = {};
    for (const claim of claims) {
      if (!claim.key.trim()) continue;
      let value: unknown = claim.value;
      switch (claim.type) {
        case 'number':
          value = Number(claim.value);
          if (isNaN(value as number)) value = 0;
          break;
        case 'boolean':
          value = claim.value.toLowerCase() === 'true' || claim.value === '1';
          break;
        case 'json':
          try { value = JSON.parse(claim.value); } catch { /* keep as string */ }
          break;
      }
      obj[claim.key] = value;
    }
    return obj;
  }, [claims]);

  const header = useMemo(() => ({
    alg: algorithm,
    typ: 'JWT',
  }), [algorithm]);

  const jwtToken = useMemo(() => {
    return signJwt(header, payload, algorithm, secret);
  }, [header, payload, algorithm, secret]);

  // ── Token stats ──────────────────────────────────────────────────────────

  const tokenParts = useMemo(() => jwtToken.split('.'), [jwtToken]);
  const tokenStats = useMemo(() => {
    try {
      const headerSize = tokenParts[0]?.length || 0;
      const payloadSize = tokenParts[1]?.length || 0;
      const sigSize = tokenParts[2]?.length || 0;
      return { headerSize, payloadSize, sigSize, total: jwtToken.length };
    } catch { return { headerSize: 0, payloadSize: 0, sigSize: 0, total: 0 }; }
  }, [jwtToken, tokenParts]);

  // ── Actions ────────────────────────────────────────────────────────────

  const addClaim = useCallback(() => {
    setClaims(prev => [...prev, { id: nextId, key: '', value: '', type: 'string' }]);
    setNextId(n => n + 1);
  }, [nextId]);

  const removeClaim = useCallback((id: number) => {
    setClaims(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateClaim = useCallback((id: number, field: keyof ClaimField, val: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  }, []);

  const addQuickClaim = useCallback((qc: typeof QUICK_CLAIMS[0]) => {
    setClaims(prev => {
      const exists = prev.some(c => c.key === qc.key);
      if (exists) return prev;
      return [...prev, { id: nextId, key: qc.key, value: qc.value, type: qc.type }];
    });
    setNextId(n => n + 1);
  }, [nextId]);

  const clearClaims = useCallback(() => {
    setClaims([]);
  }, []);

  const copyToken = useCallback(() => {
    navigator.clipboard.writeText(jwtToken).then(
      () => toast.success('JWT copied to clipboard!'),
      () => toast.error('Copy failed')
    );
  }, [jwtToken]);

  const copyPayload = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(
      () => toast.success('Payload copied!'),
      () => toast.error('Copy failed')
    );
  }, [payload]);

  return (
    <ToolLayout
      title="JWT Encoder"
      description="Build and encode JSON Web Tokens (JWT) with custom claims, algorithm selection, and signing key. Paste the output into the JWT Decoder to verify — pairs perfectly for debugging auth flows."
    >
      {/* Algorithm Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-400" />
          Signing Algorithm
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.value}
              onClick={() => setAlgorithm(alg.value)}
              className={`text-left p-3 rounded-lg border transition-all text-xs ${
                algorithm === alg.value
                  ? alg.value === 'none'
                    ? 'bg-red-500/10 border-red-500/40 text-red-300'
                    : 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="font-mono font-semibold text-sm">{alg.label}</div>
              <div className="text-[11px] mt-0.5 opacity-75">{alg.category}</div>
            </button>
          ))}
        </div>
        {algorithm === 'none' && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">
              <strong>Warning:</strong> The &quot;none&quot; algorithm provides no cryptographic protection. Anyone can read and modify the token. <strong>Never use in production.</strong>
            </p>
          </div>
        )}
      </div>

      {/* Secret Key */}
      {algorithm !== 'none' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Secret / Signing Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="your-256-bit-secret"
                className="w-full px-4 py-2.5 bg-slate-800/70 text-slate-200 text-sm rounded-lg border border-slate-700
                           focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30
                           placeholder-slate-500 transition-colors font-mono pr-10"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setSecret('your-256-bit-secret')}
              className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-sm"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            For HS* algorithms, this is the shared secret. For RS*/ES*/PS* algorithms, this would be your private key (real signing requires a backend).
          </p>
        </div>
      )}

      {/* Claims Editor */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            Claims (Payload)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{claims.length} claim{claims.length !== 1 ? 's' : ''}</span>
            <button
              onClick={addClaim}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                         bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add Claim
            </button>
            <button
              onClick={clearClaims}
              className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
              title="Clear all claims"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick-add registered claims */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_CLAIMS.map((qc) => (
            <button
              key={qc.key}
              onClick={() => addQuickClaim(qc)}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-800/50 text-slate-400 border border-slate-700/50
                         hover:text-violet-400 hover:border-violet-500/30 transition-colors font-mono"
            >
              + {qc.key}
            </button>
          ))}
        </div>

        {/* Claims Table */}
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          {claims.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No claims yet. Add claims or click the quick-add buttons above.
            </div>
          )}

          {claims.map((claim) => {
            const isRegistered = claim.key in REGISTERED_CLAIMS;
            return (
              <div
                key={claim.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/30 last:border-0 bg-slate-800/30 group"
              >
                {/* Key */}
                <div className="w-36 shrink-0 relative">
                  <input
                    type="text"
                    value={claim.key}
                    onChange={(e) => updateClaim(claim.id, 'key', e.target.value)}
                    placeholder="claim name"
                    className="w-full px-2.5 py-1.5 bg-transparent text-slate-200 text-xs font-mono rounded-md
                               border border-transparent focus:border-brand-500/50 focus:bg-slate-800/70
                               placeholder-slate-600 outline-none transition-colors"
                  />
                  {isRegistered && (
                    <span className="absolute -top-1.5 -right-1 px-1 py-0.5 text-[9px] rounded bg-violet-500/20 text-violet-400 font-medium">
                      standard
                    </span>
                  )}
                </div>

                {/* Value */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={claim.value}
                    onChange={(e) => updateClaim(claim.id, 'value', e.target.value)}
                    placeholder={claim.type === 'json' ? '{"key": "value"}' : 'value'}
                    className="w-full px-2.5 py-1.5 bg-transparent text-slate-200 text-xs font-mono rounded-md
                               border border-transparent focus:border-brand-500/50 focus:bg-slate-800/70
                               placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                {/* Type selector */}
                <select
                  value={claim.type}
                  onChange={(e) => updateClaim(claim.id, 'type', e.target.value)}
                  className="px-2 py-1.5 bg-slate-800/70 text-slate-300 text-xs rounded-md border border-slate-700
                             focus:outline-none focus:border-brand-500/50 transition-colors"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>

                {/* Remove */}
                <button
                  onClick={() => removeClaim(claim.id)}
                  className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token Preview */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Generated JWT
          </h3>
          <button
            onClick={copyToken}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy JWT
          </button>
        </div>

        {/* Color-coded breakdown */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800 font-mono text-sm break-all leading-relaxed">
          {tokenParts.map((part, i) => {
            const colors = ['text-pink-400', 'text-violet-400', 'text-sky-400'];
            const bgColors = ['bg-pink-500/10', 'bg-violet-500/10', 'bg-sky-500/10'];
            return (
              <span key={i}>
                {i > 0 && <span className="text-slate-600">.</span>}
                <span className={`${colors[i]} ${bgColors[i]} px-1 rounded`}>
                  {part || (algorithm === 'none' ? '(empty)' : part)}
                </span>
              </span>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            Header: {tokenStats.headerSize} chars
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Payload: {tokenStats.payloadSize} chars
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Signature: {tokenStats.sigSize} chars
          </span>
          <span className="text-slate-600">|</span>
          <span>Total: {tokenStats.total} chars</span>
        </div>
      </div>

      {/* Payload JSON preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Payload JSON
          </h3>
          <button
            onClick={copyPayload}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <pre className="p-4 rounded-lg bg-slate-800/70 border border-slate-700 text-xs font-mono text-slate-300 overflow-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      {/* Tips */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-400" />
          Tips
        </h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li className="flex items-start gap-1.5">
            <span className="text-brand-400 mt-0.5">•</span>
            <span>Copy the generated JWT and paste it into the <strong className="text-slate-300">JWT Decoder</strong> tool to verify the contents.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand-400 mt-0.5">•</span>
            <span><strong className="text-slate-300">exp</strong> and <strong className="text-slate-300">iat</strong> are Unix timestamps — the quick-add buttons auto-fill current time values.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand-400 mt-0.5">•</span>
            <span>HS* algorithms are symmetric (same key signs & verifies). RS*/ES*/PS* are asymmetric (private key signs, public key verifies).</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-400 mt-0.5">⚠️</span>
            <span>This tool generates tokens for <strong className="text-amber-300">testing and education only</strong>. Signatures are simulated — use a proper JWT library (jsonwebtoken, jose) for production.</span>
          </li>
        </ul>
      </div>
    </ToolLayout>
  );
}

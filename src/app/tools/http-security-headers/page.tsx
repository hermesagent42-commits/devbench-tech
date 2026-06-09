'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Globe, Info, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface HeaderCheck {
  name: string;
  value: string | null;
  status: 'good' | 'warning' | 'missing';
  message: string;
  recommendation: string;
  weight: number;
}

interface ScanResult {
  url: string;
  timestamp: number;
  headers: HeaderCheck[];
  rawHeaders: Record<string, string>;
  score: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const PRESETS = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Cloudflare', url: 'https://www.cloudflare.com' },
  { label: 'Mozilla', url: 'https://www.mozilla.org' },
  { label: 'Google', url: 'https://www.google.com' },
  { label: 'npm', url: 'https://www.npmjs.com' },
  { label: 'Vercel', url: 'https://vercel.com' },
];

// ── Analysis engine ────────────────────────────────────────────────────────

function analyzeHeaders(responseHeaders: Record<string, string>): { headers: HeaderCheck[]; score: number; maxScore: number } {
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(responseHeaders)) {
    lowerHeaders[k.toLowerCase()] = v;
  }

  const checks: HeaderCheck[] = [
    {
      name: 'Content-Security-Policy', value: lowerHeaders['content-security-policy'] || null,
      status: 'missing', message: '', recommendation: 'Add a CSP header to prevent XSS, data injection, and other code injection attacks.', weight: 10,
    },
    {
      name: 'Strict-Transport-Security', value: lowerHeaders['strict-transport-security'] || null,
      status: 'missing', message: '', recommendation: 'Add HSTS header to enforce HTTPS. Recommended: max-age=31536000; includeSubDomains', weight: 9,
    },
    {
      name: 'X-Content-Type-Options', value: lowerHeaders['x-content-type-options'] || null,
      status: 'missing', message: '', recommendation: 'Set to "nosniff" to prevent MIME type sniffing.', weight: 7,
    },
    {
      name: 'X-Frame-Options', value: lowerHeaders['x-frame-options'] || null,
      status: 'missing', message: '', recommendation: 'Set to "DENY" or "SAMEORIGIN" to prevent clickjacking.', weight: 7,
    },
    {
      name: 'Referrer-Policy', value: lowerHeaders['referrer-policy'] || null,
      status: 'missing', message: '', recommendation: 'Set to "strict-origin-when-cross-origin" to control referrer leakage.', weight: 6,
    },
    {
      name: 'Permissions-Policy', value: lowerHeaders['permissions-policy'] || null,
      status: 'missing', message: '', recommendation: 'Define a Permissions-Policy to restrict browser features (camera, microphone, geolocation).', weight: 5,
    },
    {
      name: 'Cross-Origin-Resource-Policy', value: lowerHeaders['cross-origin-resource-policy'] || null,
      status: 'missing', message: '', recommendation: 'Set to "same-origin" to control which origins can load your resources.', weight: 5,
    },
    {
      name: 'Cross-Origin-Opener-Policy', value: lowerHeaders['cross-origin-opener-policy'] || null,
      status: 'missing', message: '', recommendation: 'Set to "same-origin" for process isolation against Spectre-like attacks.', weight: 5,
    },
    {
      name: 'Cross-Origin-Embedder-Policy', value: lowerHeaders['cross-origin-embedder-policy'] || null,
      status: 'missing', message: '', recommendation: 'Set to "require-corp" to enable cross-origin isolation (needed for SharedArrayBuffer).', weight: 3,
    },
    {
      name: 'Cache-Control', value: lowerHeaders['cache-control'] || null,
      status: 'missing', message: '', recommendation: 'Set appropriate Cache-Control directives. Sensitive pages should use "no-store".', weight: 4,
    },
    {
      name: 'Server', value: lowerHeaders['server'] || null,
      status: 'missing', message: '', recommendation: 'Remove or obfuscate the Server header to avoid leaking server software/version.', weight: 3,
    },
    {
      name: 'X-Powered-By', value: lowerHeaders['x-powered-by'] || null,
      status: 'missing', message: '', recommendation: 'Remove the X-Powered-By header to avoid leaking technology stack information.', weight: 3,
    },
    {
      name: 'Clear-Site-Data', value: lowerHeaders['clear-site-data'] || null,
      status: 'missing', message: '', recommendation: 'Add on logout endpoints: Clear-Site-Data: "cache", "cookies", "storage".', weight: 2,
    },
  ];

  for (const check of checks) {
    const val = check.value;
    if (val === null) {
      check.status = 'missing';
      check.message = 'Header not present';
    } else if (check.name === 'Content-Security-Policy') {
      if (val.includes("'unsafe-inline'") || val.includes("'unsafe-eval'") || val.includes('*')) {
        check.status = 'warning';
        check.message = 'CSP present but contains unsafe directives (unsafe-inline, unsafe-eval, or wildcard sources)';
        check.recommendation = 'Avoid unsafe-inline, unsafe-eval, and wildcard (*) sources. Use nonces or hashes.';
      } else if (val.includes('default-src') || val.includes('script-src')) {
        check.status = 'good';
        check.message = 'CSP present with safe directives';
      } else {
        check.status = 'warning';
        check.message = 'CSP present but may be incomplete (no default-src or script-src)';
      }
    } else if (check.name === 'Strict-Transport-Security') {
      if (val.toLowerCase().includes('max-age=')) {
        const match = val.match(/max-age=(\d+)/i);
        const age = match ? parseInt(match[1]) : 0;
        if (age >= 31536000 && val.toLowerCase().includes('includesubdomains')) {
          check.status = 'good';
          check.message = `HSTS configured with ${(age / 31536000).toFixed(1)} year max-age and includeSubDomains`;
        } else if (age >= 31536000) {
          check.status = 'good';
          check.message = `HSTS configured with ${(age / 31536000).toFixed(1)} year max-age (consider includeSubDomains)`;
          check.recommendation = 'Add includeSubDomains to protect all subdomains.';
        } else if (age > 0) {
          check.status = 'warning';
          check.message = `HSTS max-age is only ${age} seconds (< 1 year recommended)`;
          check.recommendation = 'Increase max-age to at least 31536000 (1 year) and add includeSubDomains.';
        } else {
          check.status = 'warning';
          check.message = 'HSTS max-age is 0 (disables HSTS)';
        }
      } else {
        check.status = 'warning';
        check.message = 'HSTS header present but missing valid max-age directive';
      }
    } else if (check.name === 'X-Content-Type-Options') {
      if (val.toLowerCase() === 'nosniff') {
        check.status = 'good';
        check.message = 'Correctly set to "nosniff"';
      } else {
        check.status = 'warning';
        check.message = `Present as "${val}" (should be "nosniff")`;
      }
    } else if (check.name === 'X-Frame-Options') {
      const v = val.toUpperCase();
      if (v === 'DENY' || v === 'SAMEORIGIN') {
        check.status = 'good';
        check.message = `Set to "${val}" — clickjacking protection active`;
      } else {
        check.status = 'warning';
        check.message = `Present as "${val}" (should be DENY or SAMEORIGIN)`;
      }
    } else if (check.name === 'Referrer-Policy') {
      const v = val.toLowerCase();
      if (v.includes('strict-origin') || v === 'no-referrer' || v === 'same-origin') {
        check.status = 'good';
        check.message = `Set to "${val}" — referrer properly restricted`;
      } else if (v === 'unsafe-url') {
        check.status = 'warning';
        check.message = 'Set to "unsafe-url" — full referrer leaked on all requests';
        check.recommendation = 'Change to "strict-origin-when-cross-origin" to protect user privacy.';
      } else {
        check.status = 'good';
        check.message = `Set to "${val}"`;
      }
    } else if (check.name === 'Permissions-Policy') {
      check.status = 'good';
      check.message = 'Permissions-Policy header present';
    } else if (check.name === 'Server' || check.name === 'X-Powered-By') {
      check.status = 'warning';
      check.message = `Header reveals "${val}" — information disclosure risk`;
      check.recommendation = 'Remove this header in production to avoid leaking software/version info.';
    } else {
      check.status = 'good';
      check.message = `Set to "${val}"`;
    }
  }

  let score = 0;
  let maxScore = 0;
  for (const check of checks) {
    maxScore += check.weight;
    if (check.status === 'good') score += check.weight;
    else if (check.status === 'warning') score += check.weight * 0.4;
  }

  return { headers: checks, score, maxScore };
}

function getGrade(pct: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400';
    case 'B': return 'text-green-400';
    case 'C': return 'text-amber-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function getGradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'B': return 'bg-green-500/10 border-green-500/30';
    case 'C': return 'bg-amber-500/10 border-amber-500/30';
    case 'D': return 'bg-orange-500/10 border-orange-500/30';
    case 'F': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-surface-light border-slate-700/50';
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HttpSecurityHeadersPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualHeaders, setManualHeaders] = useState('');
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((name: string) => {
    setExpandedChecks(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const scanUrl = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(targetUrl, { method: 'HEAD', mode: 'cors' });
      const rawHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => { rawHeaders[key] = value; });
      const analysis = analyzeHeaders(rawHeaders);
      const pct = analysis.maxScore > 0 ? Math.round((analysis.score / analysis.maxScore) * 100) : 0;
      setResult({
        url: targetUrl, timestamp: Date.now(), headers: analysis.headers,
        rawHeaders, score: analysis.score, maxScore: analysis.maxScore, grade: getGrade(pct),
      });
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('CORS blocked or network unreachable. Try a preset URL, or switch to Manual Headers mode to paste headers directly.');
      } else {
        setError(`Scan failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = useCallback(() => {
    if (!url.trim()) { setError('Please enter a URL'); return; }
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) { target = 'https://' + target; setUrl(target); }
    scanUrl(target);
  }, [url, scanUrl]);

  const handlePreset = useCallback((presetUrl: string) => {
    setUrl(presetUrl);
    scanUrl(presetUrl);
  }, [scanUrl]);

  const handleManualScan = useCallback(() => {
    setError(null);
    setResult(null);
    if (!manualHeaders.trim()) { setError('Please paste HTTP response headers'); return; }
    const rawHeaders: Record<string, string> = {};
    const lines = manualHeaders.trim().split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        rawHeaders[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
      }
    }
    if (Object.keys(rawHeaders).length === 0) { setError('Could not parse headers. Format: "Header-Name: value" (one per line)'); return; }
    const analysis = analyzeHeaders(rawHeaders);
    const pct = analysis.maxScore > 0 ? Math.round((analysis.score / analysis.maxScore) * 100) : 0;
    setResult({
      url: '(Manual Headers)', timestamp: Date.now(), headers: analysis.headers,
      rawHeaders, score: analysis.score, maxScore: analysis.maxScore, grade: getGrade(pct),
    });
  }, [manualHeaders]);

  const copyReport = useCallback(() => {
    if (!result) return;
    const lines = [
      `Security Headers Report: ${result.url}`,
      `Score: ${result.score}/${result.maxScore} — Grade: ${result.grade}`,
      `Generated: ${new Date(result.timestamp).toISOString()}`,
      '',
      ...result.headers.map(h => {
        const icon = h.status === 'good' ? '[PASS]' : h.status === 'warning' ? '[WARN]' : '[MISS]';
        return `${icon} ${h.name}: ${h.value || '(missing)'} — ${h.message}`;
      }),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(
      () => toast.success('Report copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [result]);

  const scorePct = result ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <ToolLayout
      title="HTTP Security Headers Scanner"
      description="Scan a website's security headers — CSP, HSTS, X-Frame-Options, Referrer-Policy, and more. Get a security grade and actionable recommendations. Also supports manual header pasting for headers you already have."
    >
      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setManualMode(false); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!manualMode ? 'bg-brand-500 text-white' : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300'}`}
        >
          <Globe className="w-4 h-4 inline mr-1.5" /> Scan URL
        </button>
        <button
          onClick={() => { setManualMode(true); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${manualMode ? 'bg-brand-500 text-white' : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300'}`}
        >
          <Copy className="w-4 h-4 inline mr-1.5" /> Manual Headers
        </button>
      </div>

      {!manualMode ? (
        <>
          <div className="card mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text" value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-slate-700/50 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              <button
                onClick={handleScan} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" /> {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {PRESETS.map(p => (
              <button
                key={p.url} onClick={() => handlePreset(p.url)} disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300 hover:border-slate-600 disabled:opacity-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">
              Paste raw HTTP response headers, one per line: <code className="text-brand-400">Header-Name: value</code>
            </span>
          </div>
          <textarea
            value={manualHeaders}
            onChange={e => setManualHeaders(e.target.value)}
            placeholder={`Content-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nX-Frame-Options: DENY\nReferrer-Policy: strict-origin-when-cross-origin`}
            rows={8}
            className="w-full px-4 py-3 bg-surface-light border border-slate-700/50 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y"
          />
          <button onClick={handleManualScan}
            className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            <Play className="w-4 h-4" /> Analyze Headers
          </button>
        </div>
      )}

      {!manualMode && (
        <div className="flex items-start gap-2 mb-6 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80">
            URL scanning uses browser fetch (subject to CORS). Some sites may block cross-origin requests. Use the preset URLs or switch to Manual Headers mode.
          </p>
        </div>
      )}

      {error && (
        <div className="card mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className={`card mb-6 ${getGradeBg(result.grade)}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{result.url}</h3>
                <p className="text-xs text-slate-400">Scanned {new Date(result.timestamp).toLocaleTimeString()}</p>
              </div>
              <button onClick={copyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-surface-lighter transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Report
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={scorePct >= 90 ? '#34d399' : scorePct >= 75 ? '#4ade80' : scorePct >= 55 ? '#fbbf24' : scorePct >= 35 ? '#fb923c' : '#f87171'}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${scorePct * 2.64} 264`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black ${getGradeColor(result.grade)}`}>{result.grade}</span>
                  <span className="text-xs text-slate-500">{scorePct}%</span>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{result.score}<span className="text-sm font-normal text-slate-500"> / {result.maxScore}</span></div>
                <div className="text-xs text-slate-400 mt-1">
                  {result.headers.filter(h => h.status === 'good').length} good · {result.headers.filter(h => h.status === 'warning').length} warnings · {result.headers.filter(h => h.status === 'missing').length} missing
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {result.headers.map(check => (
              <div key={check.name}
                className={`card border transition-colors ${check.status === 'good' ? 'border-emerald-500/20 bg-emerald-500/5' : check.status === 'warning' ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-700/30 bg-surface-light'}`}
              >
                <button onClick={() => toggleExpand(check.name)} className="w-full text-left p-4 flex items-center gap-3">
                  {check.status === 'good' ? <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    : check.status === 'warning' ? <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    : <ShieldX className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{check.name}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${check.status === 'good' ? 'bg-emerald-500/20 text-emerald-400' : check.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {check.status}
                      </span>
                      <span className="text-[10px] text-slate-600">weight: {check.weight}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{check.message}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedChecks.has(check.name) ? 'rotate-180' : ''}`} />
                </button>
                {expandedChecks.has(check.name) && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 mx-4">
                    {check.value && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase text-slate-600 mb-1">Current Value</div>
                        <code className="block p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 break-all">{check.value}</code>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase text-slate-600 mb-1">Recommendation</div>
                      <p className="text-xs text-slate-400">{check.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <details className="card mt-6 group">
            <summary className="cursor-pointer p-4 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors">
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              Raw Response Headers ({Object.keys(result.rawHeaders).length})
            </summary>
            <div className="px-4 pb-4 space-y-1">
              {Object.entries(result.rawHeaders).map(([key, value]) => (
                <div key={key} className="flex gap-3 text-xs font-mono py-1 border-b border-slate-800 last:border-0">
                  <span className="text-brand-400 w-56 flex-shrink-0">{key}:</span>
                  <span className="text-slate-400 break-all">{value}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      {!result && !loading && !error && (
        <div className="card text-center py-16">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Scan Security Headers</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Enter a URL to scan its HTTP security headers, or switch to Manual Headers mode to paste headers directly.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}

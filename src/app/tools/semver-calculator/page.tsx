'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, GitBranch, ArrowUp, ArrowDown, CheckCircle2, XCircle, AlertTriangle, Tag, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Semver 2.0.0 parsing & validation ──────────────────────────────────────

interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string[];
  raw: string;
}

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function parseSemver(version: string): Semver | null {
  const match = version.trim().match(SEMVER_RE);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
    raw: version.trim(),
  };
}

function compareSemver(a: Semver, b: Semver): number {
  // Compare major.minor.patch
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // If one has prerelease and the other doesn't, the one without is greater
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;

  // Compare prerelease identifiers
  const len = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    const aId = a.prerelease[i];
    const bId = b.prerelease[i];
    const aNum = parseInt(aId, 10);
    const bNum = parseInt(bId, 10);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else if (!isNaN(aNum)) {
      return -1; // numeric < string
    } else if (!isNaN(bNum)) {
      return 1; // string > numeric
    } else {
      if (aId < bId) return -1;
      if (aId > bId) return 1;
    }
  }

  return a.prerelease.length - b.prerelease.length;
}

function bumpVersion(v: Semver, type: string, prereleaseLabel?: string): Semver {
  const label = prereleaseLabel || 'alpha';
  switch (type) {
    case 'major':
      return { ...v, major: v.major + 1, minor: 0, patch: 0, prerelease: [], build: [], raw: '' };
    case 'minor':
      return { ...v, minor: v.minor + 1, patch: 0, prerelease: [], build: [], raw: '' };
    case 'patch':
      return { ...v, patch: v.patch + 1, prerelease: [], build: [], raw: '' };
    case 'premajor':
      return { ...v, major: v.major + 1, minor: 0, patch: 0, prerelease: [label, '0'], build: [], raw: '' };
    case 'preminor':
      return { ...v, minor: v.minor + 1, patch: 0, prerelease: [label, '0'], build: [], raw: '' };
    case 'prepatch':
      return { ...v, patch: v.patch + 1, prerelease: [label, '0'], build: [], raw: '' };
    case 'prerelease': {
      if (v.prerelease.length === 0) {
        return { ...v, patch: v.patch + 1, prerelease: [label, '0'], build: [], raw: '' };
      }
      const last = v.prerelease[v.prerelease.length - 1];
      const lastNum = parseInt(last, 10);
      const next = !isNaN(lastNum) ? String(lastNum + 1) : (v.prerelease.length === 1 ? `${last}.0` : '0');
      const rest = v.prerelease.slice(0, -1);
      return { ...v, prerelease: [...rest, next], build: [], raw: '' };
    }
    default:
      return { ...v, raw: '' };
  }
}

function stringifySemver(v: Semver): string {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease.length > 0) s += '-' + v.prerelease.join('.');
  if (v.build.length > 0) s += '+' + v.build.join('.');
  return s;
}

function isPrerelease(v: Semver): boolean {
  return v.prerelease.length > 0;
}

function isStable(v: Semver): boolean {
  return v.major > 0 && v.prerelease.length === 0;
}

// ── Comparison helpers ──────────────────────────────────────────────────────

function compareStrings(a: string, b: string): { result: '>' | '<' | '='; diff: string } {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) return { result: '=', diff: 'Invalid version(s)' };
  const cmp = compareSemver(parsedA, parsedB);
  if (cmp > 0) return { result: '>', diff: `${a} is greater than ${b}` };
  if (cmp < 0) return { result: '<', diff: `${a} is less than ${b}` };
  return { result: '=', diff: `${a} equals ${b}` };
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function SemverCalculatorPage() {
  const [version, setVersion] = useState('1.2.3');
  const [compareWith, setCompareWith] = useState('2.0.0');
  const [prereleaseLabel, setPrereleaseLabel] = useState('alpha');
  const [showComparison, setShowComparison] = useState(false);

  const parsed = useMemo(() => parseSemver(version), [version]);
  const parsedCompare = useMemo(() => parseSemver(compareWith), [compareWith]);

  const comparisonResult = useMemo(
    () => (showComparison ? compareStrings(version, compareWith) : null),
    [version, compareWith, showComparison],
  );

  const handleBump = useCallback(
    (type: string) => {
      if (!parsed) {
        toast.error('Enter a valid semver version first');
        return;
      }
      const bumped = bumpVersion(parsed, type, prereleaseLabel);
      setVersion(stringifySemver(bumped));
      toast.success(`Bumped to ${type}`);
    },
    [parsed, prereleaseLabel],
  );

  const copyVersion = useCallback(() => {
    navigator.clipboard.writeText(version).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [version]);

  const presets = ['0.1.0', '1.0.0', '1.2.3', '2.1.0-beta.1', '1.0.0-alpha.1+build.123', '3.0.0-rc.2'];

  return (
    <ToolLayout
      title="Semver Calculator"
      description="Validate, compare, and bump semantic versions per the semver 2.0.0 spec. Understand prereleases, build metadata, and version precedence."
    >
      <div className="space-y-8">
        {/* ── Version Input ── */}
        <div className="card p-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            <Tag className="w-4 h-4 inline mr-1.5" />
            Version
          </label>
          <div className="flex gap-3">
            <input
              className="input-field flex-1 font-mono text-lg"
              placeholder="e.g. 1.2.3-alpha.1+build.42"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            <button onClick={copyVersion} className="btn-secondary flex items-center gap-1.5">
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mt-3">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setVersion(p);
                  // Also set compareWith to next major for quick demo
                  const pp = parseSemver(p);
                  if (pp) {
                    const nextMajor = stringifySemver({ ...pp, major: pp.major + 1, minor: 0, patch: 0, prerelease: [], build: [] });
                    setCompareWith(nextMajor);
                  }
                }}
                className="px-2.5 py-1 text-xs font-mono rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-brand-400 transition-colors border border-slate-700/50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Validation status */}
          <div className="mt-4">
            {parsed ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Valid semver 2.0.0</span>
                {isPrerelease(parsed) && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    prerelease
                  </span>
                )}
                {isStable(parsed) && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    stable
                  </span>
                )}
                {parsed.major === 0 && parsed.prerelease.length === 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    initial dev
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Invalid semver format</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Parsed Breakdown ── */}
        {parsed && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Version Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                <div className="text-2xl font-bold text-brand-400 font-mono">{parsed.major}</div>
                <div className="text-xs text-slate-500 mt-1">Major</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                <div className="text-2xl font-bold text-green-400 font-mono">{parsed.minor}</div>
                <div className="text-xs text-slate-500 mt-1">Minor</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                <div className="text-2xl font-bold text-amber-400 font-mono">{parsed.patch}</div>
                <div className="text-xs text-slate-500 mt-1">Patch</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                <div className="text-lg font-bold text-purple-400 font-mono truncate">
                  {parsed.prerelease.length > 0 ? parsed.prerelease.join('.') : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-1">Prerelease</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
                <div className="text-lg font-bold text-slate-400 font-mono truncate">
                  {parsed.build.length > 0 ? parsed.build.join('.') : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-1">Build</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bump Controls ── */}
        {parsed && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Bump Version</h2>

            {/* Release bumps */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => handleBump('major')}
                className="btn-secondary flex flex-col items-center gap-1 py-4 hover:border-red-500/50 hover:bg-red-500/5"
              >
                <ArrowUp className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold">Major</span>
                <span className="text-xs text-slate-500 font-mono">{stringifySemver(bumpVersion(parsed, 'major'))}</span>
              </button>
              <button
                onClick={() => handleBump('minor')}
                className="btn-secondary flex flex-col items-center gap-1 py-4 hover:border-green-500/50 hover:bg-green-500/5"
              >
                <ArrowUp className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold">Minor</span>
                <span className="text-xs text-slate-500 font-mono">{stringifySemver(bumpVersion(parsed, 'minor'))}</span>
              </button>
              <button
                onClick={() => handleBump('patch')}
                className="btn-secondary flex flex-col items-center gap-1 py-4 hover:border-amber-500/50 hover:bg-amber-500/5"
              >
                <ArrowUp className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold">Patch</span>
                <span className="text-xs text-slate-500 font-mono">{stringifySemver(bumpVersion(parsed, 'patch'))}</span>
              </button>
            </div>

            {/* Prerelease bumps */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-500">Prerelease label:</span>
              <input
                className="input-field w-24 text-sm font-mono"
                value={prereleaseLabel}
                onChange={(e) => setPrereleaseLabel(e.target.value || 'alpha')}
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => handleBump('premajor')}
                className="btn-secondary flex flex-col items-center gap-1 py-3 hover:border-purple-500/50 hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold">Pre-major</span>
                <span className="text-xs text-slate-500 font-mono">
                  {stringifySemver(bumpVersion(parsed, 'premajor', prereleaseLabel))}
                </span>
              </button>
              <button
                onClick={() => handleBump('preminor')}
                className="btn-secondary flex flex-col items-center gap-1 py-3 hover:border-purple-500/50 hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold">Pre-minor</span>
                <span className="text-xs text-slate-500 font-mono">
                  {stringifySemver(bumpVersion(parsed, 'preminor', prereleaseLabel))}
                </span>
              </button>
              <button
                onClick={() => handleBump('prepatch')}
                className="btn-secondary flex flex-col items-center gap-1 py-3 hover:border-purple-500/50 hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold">Pre-patch</span>
                <span className="text-xs text-slate-500 font-mono">
                  {stringifySemver(bumpVersion(parsed, 'prepatch', prereleaseLabel))}
                </span>
              </button>
              <button
                onClick={() => handleBump('prerelease')}
                className="btn-secondary flex flex-col items-center gap-1 py-3 hover:border-purple-500/50 hover:bg-purple-500/5"
              >
                <span className="text-sm font-semibold">Prerelease</span>
                <span className="text-xs text-slate-500 font-mono">
                  {stringifySemver(bumpVersion(parsed, 'prerelease', prereleaseLabel))}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Version Comparison ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Compare Versions</h2>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5" />
              {showComparison ? 'Hide' : 'Compare'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">Version A</label>
              <input
                className="input-field w-full font-mono text-sm"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="pt-5 text-slate-500 font-bold text-lg">
              {comparisonResult ? (
                comparisonResult.result === '>' ? (
                  <ArrowUp className="w-5 h-5 text-red-400" />
                ) : comparisonResult.result === '<' ? (
                  <ArrowDown className="w-5 h-5 text-green-400" />
                ) : (
                  <span className="text-slate-400">=</span>
                )
              ) : (
                <span className="text-slate-600">vs</span>
              )}
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">Version B</label>
              <input
                className="input-field w-full font-mono text-sm"
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
              />
            </div>
          </div>

          {comparisonResult && (
            <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2">
                {comparisonResult.result === '>' && <ArrowUp className="w-4 h-4 text-red-400" />}
                {comparisonResult.result === '<' && <ArrowDown className="w-4 h-4 text-green-400" />}
                {comparisonResult.result === '=' && <span className="text-slate-400 font-bold">=</span>}
                <span className="text-sm text-slate-300">{comparisonResult.diff}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Semver Quick Reference ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-red-400">MAJOR</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Increment when you make incompatible API changes. Resets minor and patch to 0.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-sm font-semibold text-green-400">MINOR</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Increment when you add backward-compatible functionality. Resets patch to 0.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-sm font-semibold text-amber-400">PATCH</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Increment when you make backward-compatible bug fixes. Does not reset anything.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-300 leading-relaxed">
              <strong>Prerelease tags</strong> have lower precedence than the associated normal version. A version with a prerelease tag (e.g., 1.0.0-alpha) is always less than the normal version (1.0.0). Build metadata (after +) is ignored when determining version precedence.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

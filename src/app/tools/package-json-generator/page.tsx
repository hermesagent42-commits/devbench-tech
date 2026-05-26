'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, FileJson, Plus, Trash2, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── Types ───────── */

interface Script {
  name: string;
  command: string;
}

interface Dependency {
  name: string;
  version: string;
}

type LicenseType = 'MIT' | 'ISC' | 'Apache-2.0' | 'GPL-3.0' | 'BSD-2-Clause' | 'BSD-3-Clause' | 'Unlicense' | '';

/* ───────── Common templates ───────── */

const COMMON_SCRIPTS: { name: string; command: string }[] = [
  { name: 'start', command: 'node index.js' },
  { name: 'build', command: '' },
  { name: 'test', command: 'echo "Error: no test specified" && exit 1' },
];

const COMMON_DEPENDENCIES: { name: string; version: string }[] = [
  { name: 'express', version: '^4.18.2' },
  { name: 'react', version: '^18.2.0' },
  { name: 'next', version: '^14.0.0' },
  { name: 'typescript', version: '^5.3.0' },
  { name: 'lodash', version: '^4.17.21' },
  { name: 'prisma', version: '^5.7.0' },
  { name: 'tailwindcss', version: '^3.4.0' },
  { name: 'vitest', version: '^1.0.0' },
  { name: 'zod', version: '^3.22.0' },
  { name: 'axios', version: '^1.6.0' },
];

const KEYWORD_SUGGESTIONS = ['react', 'nextjs', 'typescript', 'api', 'cli', 'tool', 'library', 'utils', 'frontend', 'backend', 'fullstack', 'css', 'animation', 'testing'];

/* ───────── Validation Helpers ───────── */

function isValidPackageName(name: string): boolean {
  if (!name) return false;
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

function isValidVersion(version: string): boolean {
  if (!version) return false;
  return /^[\^~]?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version) || version === 'latest' || version === '*';
}

function isNotEmpty(val: string): boolean {
  return val.trim().length > 0;
}

/* ───────── Component ───────── */

export default function PackageJsonGenerator() {
  // Basic info
  const [pkgName, setPkgName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [entryPoint, setEntryPoint] = useState('index.js');
  const [license, setLicense] = useState<LicenseType>('MIT');
  const [author, setAuthor] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Scripts
  const [scripts, setScripts] = useState<Script[]>(COMMON_SCRIPTS.map(s => ({ ...s })));

  // Dependencies
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [devDependencies, setDevDependencies] = useState<Dependency[]>([]);
  const [depInput, setDepInput] = useState('');
  const [depVersion, setDepVersion] = useState('');

  // Module type
  const [moduleType, setModuleType] = useState<'commonjs' | 'module'>('module');

  const addScript = useCallback(() => {
    setScripts(prev => [...prev, { name: '', command: '' }]);
  }, []);

  const updateScript = useCallback((index: number, field: 'name' | 'command', value: string) => {
    setScripts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const removeScript = useCallback((index: number) => {
    setScripts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addDependency = useCallback((isDev: boolean) => {
    const name = depInput.trim();
    const ver = depVersion.trim() || 'latest';
    if (!name) return;
    if (!isValidPackageName(name)) { toast.error('Invalid package name'); return; }
    const target = isDev ? setDevDependencies : setDependencies;
    target(prev => {
      if (prev.some(d => d.name === name)) {
        toast.error('Dependency already listed');
        return prev;
      }
      return [...prev, { name, version: ver }].sort((a, b) => a.name.localeCompare(b.name));
    });
    setDepInput('');
    setDepVersion('');
  }, [depInput, depVersion]);

  const removeDependency = useCallback((name: string, isDev: boolean) => {
    const target = isDev ? setDevDependencies : setDependencies;
    target(prev => prev.filter(d => d.name !== name));
  }, []);

  const quickAddDep = useCallback((dep: Dependency, isDev: boolean) => {
    const target = isDev ? setDevDependencies : setDependencies;
    target(prev => {
      if (prev.some(d => d.name === dep.name)) return prev;
      return [...prev, dep].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  // Generate package.json
  const packageJson = useMemo(() => {
    const pkg: Record<string, unknown> = {};

    if (pkgName) pkg.name = pkgName;
    pkg.version = version || '1.0.0';
    if (description) pkg.description = description;
    if (entryPoint) pkg.main = entryPoint;
    if (isPrivate) pkg.private = true;

    // Deps
    if (dependencies.length > 0) {
      const deps: Record<string, string> = {};
      dependencies.forEach(d => { deps[d.name] = d.version || 'latest'; });
      pkg.dependencies = deps;
    }
    if (devDependencies.length > 0) {
      const devDeps: Record<string, string> = {};
      devDependencies.forEach(d => { devDeps[d.name] = d.version || 'latest'; });
      pkg.devDependencies = devDeps;
    }

    // Scripts
    const validScripts = scripts.filter(s => s.name.trim() && s.command.trim());
    if (validScripts.length > 0) {
      const sc: Record<string, string> = {};
      validScripts.forEach(s => { sc[s.name.trim()] = s.command.trim(); });
      pkg.scripts = sc;
    }

    if (author) pkg.author = author;
    if (license) pkg.license = license;
    if (keywords.length > 0) pkg.keywords = keywords;
    if (moduleType) pkg.type = moduleType;

    return JSON.stringify(pkg, null, 2);
  }, [pkgName, version, description, entryPoint, isPrivate, dependencies, devDependencies, scripts, author, license, keywords, moduleType]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(packageJson);
    toast.success('package.json copied!');
  }, [packageJson]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([packageJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'package.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('package.json downloaded!');
  }, [packageJson]);

  const clearAll = useCallback(() => {
    setPkgName('');
    setVersion('1.0.0');
    setDescription('');
    setEntryPoint('index.js');
    setLicense('MIT');
    setAuthor('');
    setKeywords([]);
    setKeywordInput('');
    setIsPrivate(false);
    setScripts(COMMON_SCRIPTS.map(s => ({ ...s })));
    setDependencies([]);
    setDevDependencies([]);
    setDepInput('');
    setDepVersion('');
    setModuleType('module');
  }, []);

  // Validation
  const nameError = pkgName && !isValidPackageName(pkgName) ? 'Invalid package name (lowercase, hyphens, dots allowed)' : undefined;

  const inputClass = 'w-full rounded-lg bg-slate-800 border border-slate-600/60 text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';
  const btnClass = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors';
  const btnPrimaryClass = `${btnClass} bg-brand-600 hover:bg-brand-500 text-white`;
  const btnGhostClass = `${btnClass} text-slate-400 hover:text-white hover:bg-slate-700/50`;
  const btnDangerClass = `${btnClass} text-red-400 hover:text-red-300 hover:bg-red-500/10`;

  return (
    <ToolLayout
      title="Package.json Generator"
      description="Generate a valid package.json for your Node.js project — fill in the form and get production-ready JSON."
      controls={
        <>
          <button onClick={copyToClipboard} className={btnPrimaryClass}><Copy className="w-3.5 h-3.5" /> Copy JSON</button>
          <button onClick={downloadJson} className={btnGhostClass}><Download className="w-3.5 h-3.5" /> Download</button>
          <button onClick={clearAll} className={btnGhostClass}><RefreshCw className="w-3.5 h-3.5" /> Reset</button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-400" />
              Basic Info
            </h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Package Name *</label>
                <input
                  className={inputClass + (nameError ? ' border-red-500/50' : '')}
                  placeholder="my-awesome-package"
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                />
                {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Version</label>
                  <input className={inputClass} value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" />
                </div>
                <div>
                  <label className={labelClass}>Module Type</label>
                  <select className={inputClass + ' cursor-pointer'} value={moduleType} onChange={e => setModuleType(e.target.value as 'commonjs' | 'module')}>
                    <option value="module">ESM (module)</option>
                    <option value="commonjs">CJS (commonjs)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of your package" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Entry Point</label>
                  <input className={inputClass} value={entryPoint} onChange={e => setEntryPoint(e.target.value)} placeholder="index.js" />
                </div>
                <div>
                  <label className={labelClass}>License</label>
                  <select className={inputClass + ' cursor-pointer'} value={license} onChange={e => setLicense(e.target.value as LicenseType)}>
                    <option value="">None</option>
                    <option value="MIT">MIT</option>
                    <option value="ISC">ISC</option>
                    <option value="Apache-2.0">Apache-2.0</option>
                    <option value="GPL-3.0">GPL-3.0</option>
                    <option value="BSD-2-Clause">BSD-2-Clause</option>
                    <option value="BSD-3-Clause">BSD-3-Clause</option>
                    <option value="Unlicense">Unlicense</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Author</label>
                  <input className={inputClass} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your Name" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={e => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-brand-500 focus:ring-brand-500/30"
                    />
                    <span className="text-xs text-slate-400">Private package</span>
                  </label>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className={labelClass}>Keywords</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass + ' flex-1'}
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }}}
                    placeholder="Type and press Enter"
                  />
                  <button onClick={addKeyword} className={btnPrimaryClass}>Add</button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywords.map(kw => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/10 text-brand-400 text-xs rounded-full">
                        {kw}
                        <button onClick={() => setKeywords(prev => prev.filter(k => k !== kw))} className="hover:text-red-400 transition-colors">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {KEYWORD_SUGGESTIONS.filter(k => !keywords.includes(k)).slice(0, 8).map(kw => (
                    <button key={kw} onClick={() => setKeywords(prev => [...prev, kw])} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 hover:text-brand-400 text-xs rounded-full border border-slate-600/30 hover:border-brand-500/30 transition-colors">
                      + {kw}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scripts */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-brand-400" />
              Scripts
            </h3>
            <div className="space-y-2">
              {scripts.map((script, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputClass + ' flex-[2]'}
                    placeholder="script name"
                    value={script.name}
                    onChange={e => updateScript(i, 'name', e.target.value)}
                  />
                  <input
                    className={inputClass + ' flex-[5] font-mono text-xs'}
                    placeholder="command"
                    value={script.command}
                    onChange={e => updateScript(i, 'command', e.target.value)}
                  />
                  <button onClick={() => removeScript(i)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addScript} className={`${btnGhostClass} w-full justify-center mt-2`}>
                <Plus className="w-3.5 h-3.5" /> Add Script
              </button>
            </div>
          </div>

          {/* Dependencies */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Dependencies</h3>
            <div className="flex gap-2 mb-3">
              <input className={inputClass + ' flex-1'} placeholder="package name" value={depInput} onChange={e => setDepInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDependency(false); }}} />
              <input className={inputClass + ' w-28'} placeholder="^1.0.0" value={depVersion} onChange={e => setDepVersion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDependency(false); }}} />
              <button onClick={() => addDependency(false)} className={btnPrimaryClass}><Plus className="w-3 h-3" /></button>
            </div>

            {/* Quick add common deps */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_DEPENDENCIES.filter(d => !dependencies.some(x => x.name === d.name)).map(dep => (
                <button key={dep.name} onClick={() => quickAddDep(dep, false)} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 hover:text-brand-400 text-xs rounded-full border border-slate-600/30 hover:border-brand-500/30 transition-colors">
                  + {dep.name}
                </button>
              ))}
            </div>

            {dependencies.length > 0 && (
              <div className="space-y-1 mb-4">
                {dependencies.map(dep => (
                  <div key={dep.name} className="flex items-center justify-between px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700/50 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-xs">{dep.name}</span>
                      <span className="text-slate-500 text-xs">{dep.version}</span>
                    </div>
                    <button onClick={() => removeDependency(dep.name, false)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-xs font-medium text-slate-500 mb-2">Dev Dependencies</h4>
            <div className="flex gap-2 mb-3">
              <input className={inputClass + ' flex-1'} placeholder="package name" value={depInput} onChange={e => setDepInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDependency(true); }}} />
              <input className={inputClass + ' w-28'} placeholder="^1.0.0" value={depVersion} onChange={e => setDepVersion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDependency(true); }}} />
              <button onClick={() => addDependency(true)} className={btnPrimaryClass}><Plus className="w-3 h-3" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_DEPENDENCIES.filter(d => !devDependencies.some(x => x.name === d.name) && !dependencies.some(x => x.name === d.name)).map(dep => (
                <button key={dep.name} onClick={() => quickAddDep(dep, true)} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 hover:text-brand-400 text-xs rounded-full border border-slate-600/30 hover:border-brand-500/30 transition-colors">
                  + {dep.name}
                </button>
              ))}
            </div>
            {devDependencies.length > 0 && (
              <div className="space-y-1">
                {devDependencies.map(dep => (
                  <div key={dep.name} className="flex items-center justify-between px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700/50 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-xs">{dep.name}</span>
                      <span className="text-slate-500 text-xs">{dep.version}</span>
                    </div>
                    <button onClick={() => removeDependency(dep.name, true)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileJson className="w-4 h-4 text-brand-400" />
                Preview
              </h3>
              <span className="text-xs text-slate-500">{packageJson.split('\n').length} lines</span>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-auto max-h-[70vh] border border-slate-800">
              <code>{packageJson}</code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

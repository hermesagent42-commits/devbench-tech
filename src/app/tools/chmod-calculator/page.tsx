'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, RefreshCw, Info, Eye, Shield, Users, User, Terminal, FileText, Folder, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Permission = 'r' | 'w' | 'x';
type Entity = 'owner' | 'group' | 'other';
type Special = 'setuid' | 'setgid' | 'sticky';

interface EntityPerms {
  read: boolean;
  write: boolean;
  execute: boolean;
}

interface Permissions {
  owner: EntityPerms;
  group: EntityPerms;
  other: EntityPerms;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

// ── Presets ────────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  description: string;
  octal: string;
  symbolic: string;
  permissions: Permissions;
}

const PRESETS: Preset[] = [
  {
    name: '777 – Open',
    description: 'Read, write, execute for everyone. Use with extreme caution.',
    octal: '777',
    symbolic: 'rwxrwxrwx',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: true, execute: true }, other: { read: true, write: true, execute: true }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '755 – Standard Executable',
    description: 'Owner: full access. Group/others: read + execute. Default for /usr/bin.',
    octal: '755',
    symbolic: 'rwxr-xr-x',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: false, execute: true }, other: { read: true, write: false, execute: true }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '644 – Standard File',
    description: 'Owner: read/write. Group/others: read-only. Default for config files.',
    octal: '644',
    symbolic: 'rw-r--r--',
    permissions: { owner: { read: true, write: true, execute: false }, group: { read: true, write: false, execute: false }, other: { read: true, write: false, execute: false }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '700 – Private',
    description: 'Owner: full access. Group/others: no access. For private scripts.',
    octal: '700',
    symbolic: 'rwx------',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: false, write: false, execute: false }, other: { read: false, write: false, execute: false }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '600 – Private File',
    description: 'Owner: read/write. No one else. For SSH keys, sensitive config.',
    octal: '600',
    symbolic: 'rw-------',
    permissions: { owner: { read: true, write: true, execute: false }, group: { read: false, write: false, execute: false }, other: { read: false, write: false, execute: false }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '400 – Read-Only',
    description: 'Owner: read-only. No one else. For certificates, trusted files.',
    octal: '400',
    symbolic: 'r--------',
    permissions: { owner: { read: true, write: false, execute: false }, group: { read: false, write: false, execute: false }, other: { read: false, write: false, execute: false }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '750 – Semi-Private',
    description: 'Owner: full, Group: read+execute. Common for shared scripts.',
    octal: '750',
    symbolic: 'rwxr-x---',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: false, execute: true }, other: { read: false, write: false, execute: false }, setuid: false, setgid: false, sticky: false },
  },
  {
    name: '1777 – Sticky /tmp',
    description: 'Like 777 but with sticky bit — only owners can delete files. Used for /tmp.',
    octal: '1777',
    symbolic: 'rwxrwxrwt',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: true, execute: true }, other: { read: true, write: true, execute: true }, setuid: false, setgid: false, sticky: true },
  },
  {
    name: '4755 – Setuid',
    description: 'Executes as the file owner. Used for /usr/bin/passwd, sudo.',
    octal: '4755',
    symbolic: 'rwsr-xr-x',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: false, execute: true }, other: { read: true, write: false, execute: true }, setuid: true, setgid: false, sticky: false },
  },
  {
    name: '2775 – Setgid Dir',
    description: 'New files inherit group. For shared project directories.',
    octal: '2775',
    symbolic: 'rwxrwsr-x',
    permissions: { owner: { read: true, write: true, execute: true }, group: { read: true, write: true, execute: true }, other: { read: true, write: false, execute: true }, setuid: false, setgid: true, sticky: false },
  },
];

// ── Permission reference ───────────────────────────────────────────────────

const PERM_REFERENCE: { permission: string; file: string; directory: string }[] = [
  { permission: 'r (read)', file: 'View file contents (cat, less)', directory: 'List directory contents (ls)' },
  { permission: 'w (write)', file: 'Modify file contents', directory: 'Create/delete/rename files inside' },
  { permission: 'x (execute)', file: 'Run as a program/script', directory: 'Enter directory (cd), access files inside' },
];

const SPECIAL_REFERENCE: { bit: string; octal: string; symbolic: string; description: string }[] = [
  { bit: 'Setuid', octal: '4000', symbolic: 's in owner execute (rws)', description: 'File runs with the permissions of the file owner, not the user who launched it (e.g., /usr/bin/passwd). Ignored on directories.' },
  { bit: 'Setgid', octal: '2000', symbolic: 's in group execute (rws)', description: 'File runs with the group of the file. On directories: new files inherit the directory group instead of the user\'s primary group.' },
  { bit: 'Sticky', octal: '1000', symbolic: 't in other execute (rwt)', description: 'Only the file owner (or root) can delete or rename files within the directory (e.g., /tmp). Ignored on files.' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function entityToOctal(perm: EntityPerms): number {
  let val = 0;
  if (perm.read) val += 4;
  if (perm.write) val += 2;
  if (perm.execute) val += 1;
  return val;
}

function computeOctal(perms: Permissions): string {
  const owner = entityToOctal(perms.owner);
  const group = entityToOctal(perms.group);
  const other = entityToOctal(perms.other);
  
  let special = 0;
  if (perms.setuid) special += 4;
  if (perms.setgid) special += 2;
  if (perms.sticky) special += 1;
  
  if (special > 0) {
    return `${special}${owner}${group}${other}`;
  }
  return `${owner}${group}${other}`;
}

function octalDigitToPerms(digit: number): EntityPerms {
  return {
    read: (digit & 4) !== 0,
    write: (digit & 2) !== 0,
    execute: (digit & 1) !== 0,
  };
}

function computeSymbolic(perms: Permissions): string {
  const e = (p: EntityPerms) => {
    const r = p.read ? 'r' : '-';
    const w = p.write ? 'w' : '-';
    let x = '-';
    if (p.execute) x = 'x';
    return r + w + x;
  };

  let owner = e(perms.owner);
  let group = e(perms.group);
  let other = e(perms.other);

  // Apply special bits to symbolic representation
  if (perms.setuid) {
    owner = owner.substring(0, 2) + (perms.owner.execute ? 's' : 'S');
  }
  if (perms.setgid) {
    group = group.substring(0, 2) + (perms.group.execute ? 's' : 'S');
  }
  if (perms.sticky) {
    other = other.substring(0, 2) + (perms.other.execute ? 't' : 'T');
  }

  return owner + group + other;
}

function parseOctal(octal: string): Permissions | null {
  const cleaned = octal.replace(/^0/, '').trim();
  if (!/^[0-7]{3,4}$/.test(cleaned)) return null;
  
  let special = 0;
  let o, g, t;
  if (cleaned.length === 4) {
    special = parseInt(cleaned[0], 10);
    o = parseInt(cleaned[1], 10);
    g = parseInt(cleaned[2], 10);
    t = parseInt(cleaned[3], 10);
  } else {
    o = parseInt(cleaned[0], 10);
    g = parseInt(cleaned[1], 10);
    t = parseInt(cleaned[2], 10);
  }

  return {
    owner: octalDigitToPerms(o),
    group: octalDigitToPerms(g),
    other: octalDigitToPerms(t),
    setuid: (special & 4) !== 0,
    setgid: (special & 2) !== 0,
    sticky: (special & 1) !== 0,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChmodCalculatorPage() {
  const [permissions, setPermissions] = useState<Permissions>({
    owner: { read: true, write: true, execute: false },
    group: { read: true, write: false, execute: false },
    other: { read: true, write: false, execute: false },
    setuid: false,
    setgid: false,
    sticky: false,
  });
  const [octalInput, setOctalInput] = useState('644');
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);

  const octal = useMemo(() => computeOctal(permissions), [permissions]);
  const symbolic = useMemo(() => computeSymbolic(permissions), [permissions]);
  const chmodCommand = useMemo(() => `chmod ${octal} <file>`, [octal]);

  const togglePerm = useCallback((entity: Entity, perm: Permission) => {
    setPermissions(prev => {
      const current = { ...prev[entity] };
      if (perm === 'r') current.read = !current.read;
      else if (perm === 'w') current.write = !current.write;
      else if (perm === 'x') current.execute = !current.execute;
      return { ...prev, [entity]: current };
    });
    setParseError('');
  }, []);

  const toggleSpecial = useCallback((special: Special) => {
    setPermissions(prev => ({ ...prev, [special]: !prev[special] }));
    setParseError('');
  }, []);

  const handleOctalInput = useCallback((value: string) => {
    setOctalInput(value);
    if (!value.trim()) {
      setParseError('');
      return;
    }
    const parsed = parseOctal(value);
    if (parsed) {
      setPermissions(parsed);
      setParseError('');
    } else {
      setParseError('Invalid octal. Use 3-4 digits (0–7).');
    }
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setPermissions(preset.permissions);
    setOctalInput(preset.octal);
    setParseError('');
  }, []);

  const resetAll = useCallback(() => {
    setPermissions({
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
      setuid: false,
      setgid: false,
      sticky: false,
    });
    setOctalInput('000');
    setParseError('');
  }, []);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // ── Permission checkbox helper ──────────────────────────────────────────
  
  const PermCheckbox = ({ entity, perm, label, active, disabled }: { entity: Entity; perm: Permission; label: string; active: boolean; disabled?: boolean }) => {
    const isSpecial = (entity === 'owner' && perm === 'x' && permissions.setuid) ||
      (entity === 'group' && perm === 'x' && permissions.setgid) ||
      (entity === 'other' && perm === 'x' && permissions.sticky);
    
    return (
      <button
        onClick={() => togglePerm(entity, perm)}
        disabled={disabled}
        className={`w-10 h-10 rounded-lg border text-sm font-bold font-mono transition-all duration-150 ${
          active
            ? 'bg-brand-500/20 border-brand-400 text-brand-300 shadow-sm shadow-brand-500/20'
            : 'bg-slate-800/50 border-slate-600/50 text-slate-500 hover:border-slate-500 hover:text-slate-400'
        } ${isSpecial ? 'ring-2 ring-amber-500/50' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        title={label}
      >
        {active ? perm.toUpperCase() : '-'}
      </button>
    );
  };

  return (
    <ToolLayout
      title="Chmod Calculator"
      description="Interactive Linux file permission calculator. Toggle permissions, enter octal values, get the exact chmod command — no memorization needed."
    >
      <div className="space-y-8">
        {/* ─── Octal & Symbolic Display ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Octal */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">Octal Notation</div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold font-mono text-brand-300 tracking-[0.15em]">{octal}</span>
              <button
                onClick={() => copyToClipboard(octal, 'octal')}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                title="Copy octal"
              >
                {copied === 'octal' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Symbolic */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">Symbolic Notation</div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold font-mono text-brand-300 tracking-[0.15em]">{symbolic}</span>
              <button
                onClick={() => copyToClipboard(symbolic, 'symbolic')}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                title="Copy symbolic"
              >
                {copied === 'symbolic' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Chmod Command ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-700/50">
          <Terminal className="w-5 h-5 text-brand-400 shrink-0" />
          <code className="flex-1 text-sm font-mono text-slate-200">{chmodCommand}</code>
          <button
            onClick={() => copyToClipboard(chmodCommand, 'command')}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm font-medium hover:bg-brand-500/30 transition-colors flex items-center gap-1.5"
          >
            {copied === 'command' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === 'command' ? 'Copied' : 'Copy Command'}
          </button>
        </div>

        {/* ─── Permission Toggles ───────────────────────────────────────── */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              Permission Toggles
            </h3>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-3 mb-2">
            <div />
            <div className="text-center text-xs font-semibold text-slate-400">
              <div className="flex items-center justify-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Owner
              </div>
            </div>
            <div className="text-center text-xs font-semibold text-slate-400">
              <div className="flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Group
              </div>
            </div>
            <div className="text-center text-xs font-semibold text-slate-400">
              <div className="flex items-center justify-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Other
              </div>
            </div>
          </div>

          {/* Read */}
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-3 mb-3 items-center">
            <span className="text-sm font-mono text-slate-300 text-right pr-4">Read (4)</span>
            <div className="flex justify-center"><PermCheckbox entity="owner" perm="r" label="Owner Read" active={permissions.owner.read} /></div>
            <div className="flex justify-center"><PermCheckbox entity="group" perm="r" label="Group Read" active={permissions.group.read} /></div>
            <div className="flex justify-center"><PermCheckbox entity="other" perm="r" label="Other Read" active={permissions.other.read} /></div>
          </div>

          {/* Write */}
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-3 mb-3 items-center">
            <span className="text-sm font-mono text-slate-300 text-right pr-4">Write (2)</span>
            <div className="flex justify-center"><PermCheckbox entity="owner" perm="w" label="Owner Write" active={permissions.owner.write} /></div>
            <div className="flex justify-center"><PermCheckbox entity="group" perm="w" label="Group Write" active={permissions.group.write} /></div>
            <div className="flex justify-center"><PermCheckbox entity="other" perm="w" label="Other Write" active={permissions.other.write} /></div>
          </div>

          {/* Execute */}
          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-3 mb-4 items-center">
            <span className="text-sm font-mono text-slate-300 text-right pr-4">Execute (1)</span>
            <div className="flex justify-center"><PermCheckbox entity="owner" perm="x" label="Owner Execute" active={permissions.owner.execute} /></div>
            <div className="flex justify-center"><PermCheckbox entity="group" perm="x" label="Group Execute" active={permissions.group.execute} /></div>
            <div className="flex justify-center"><PermCheckbox entity="other" perm="x" label="Other Execute" active={permissions.other.execute} /></div>
          </div>

          {/* Special bits */}
          <div className="border-t border-slate-700/50 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Special Bits</span>
              <span className="text-xs text-slate-500">— set leading digit</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleSpecial('setuid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition-all ${
                  permissions.setuid
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/50 border-slate-600/30 text-slate-500 hover:border-slate-500'
                }`}
              >
                Setuid (4000)
              </button>
              <button
                onClick={() => toggleSpecial('setgid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition-all ${
                  permissions.setgid
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/50 border-slate-600/30 text-slate-500 hover:border-slate-500'
                }`}
              >
                Setgid (2000)
              </button>
              <button
                onClick={() => toggleSpecial('sticky')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition-all ${
                  permissions.sticky
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/50 border-slate-600/30 text-slate-500 hover:border-slate-500'
                }`}
              >
                Sticky (1000)
              </button>
            </div>
          </div>
        </div>

        {/* ─── Octal Input ──────────────────────────────────────────────── */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand-400" />
            Enter Octal Value
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={octalInput}
              onChange={(e) => handleOctalInput(e.target.value)}
              placeholder="e.g. 755, 644, 1777"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 font-mono text-lg placeholder:text-slate-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50"
            />
            <button
              onClick={() => copyToClipboard(octal, 'octal-input')}
              className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          {parseError && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              {parseError}
            </p>
          )}
        </div>

        {/* ─── Presets ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              Common Presets
            </h3>
            <button
              onClick={() => setShowReference(!showReference)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <Info className="w-3 h-3" />
              {showReference ? 'Hide Reference' : 'Show Reference'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.octal}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  octal === preset.octal
                    ? 'bg-brand-500/10 border-brand-500/40'
                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{preset.name}</span>
                  <span className="text-xs font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">{preset.symbolic}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Reference Tables ─────────────────────────────────────────── */}
        {showReference && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            {/* Permission meanings */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                What Each Permission Means
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Permission</th>
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">On Files</th>
                      <th className="text-left py-2 text-slate-400 font-medium">On Directories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERM_REFERENCE.map((row) => (
                      <tr key={row.permission} className="border-b border-slate-700/30">
                        <td className="py-2.5 pr-4 font-mono text-slate-200">{row.permission}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{row.file}</td>
                        <td className="py-2.5 text-slate-400">{row.directory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Special bits reference */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Special Permission Bits
              </h3>
              <div className="space-y-4">
                {SPECIAL_REFERENCE.map((row) => (
                  <div key={row.bit} className="border-b border-slate-700/30 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-amber-300 font-semibold">{row.bit}</span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">{row.octal}</span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">{row.symbolic}</span>
                    </div>
                    <p className="text-xs text-slate-400">{row.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick cheatsheet */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Quick Octal Reference
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(n => {
                  const p = octalDigitToPerms(n);
                  const s = (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-');
                  return (
                    <div key={n} className="text-center p-2 rounded-lg bg-slate-900/50 border border-slate-700/30">
                      <div className="text-lg font-mono font-bold text-brand-300">{n}</div>
                      <div className="text-xs font-mono text-slate-400">{s}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                r=4, w=2, x=1. Add them up: rwx = 4+2+1 = 7, rw- = 4+2 = 6, r-x = 4+1 = 5, r-- = 4.
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

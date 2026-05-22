'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Shield, User, Users, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface PermRow {
  entity: 'owner' | 'group' | 'other';
  label: string;
  icon: typeof User;
}

const PERM_ROWS: PermRow[] = [
  { entity: 'owner', label: 'Owner', icon: User },
  { entity: 'group', label: 'Group', icon: Users },
  { entity: 'other', label: 'Other', icon: Globe },
];

const PERM_BITS = ['read', 'write', 'execute'] as const;
type PermBit = typeof PERM_BITS[number];

const PERM_LABELS: Record<PermBit, { label: string; char: string }> = {
  read: { label: 'Read', char: 'r' },
  write: { label: 'Write', char: 'w' },
  execute: { label: 'Execute', char: 'x' },
};

const PERM_VALUES: Record<PermBit, number> = {
  read: 4,
  write: 2,
  execute: 1,
};

// Common presets
const PRESETS: { name: string; octal: string; desc: string }[] = [
  { name: '777', octal: '777', desc: 'Full access — everyone can read, write, execute' },
  { name: '755', octal: '755', desc: 'Standard for directories & scripts — owner full, group/other read+execute' },
  { name: '644', octal: '644', desc: 'Standard for files — owner read+write, group/other read-only' },
  { name: '700', octal: '700', desc: 'Private — only owner can read, write, execute' },
  { name: '600', octal: '600', desc: 'Private file — only owner can read and write' },
  { name: '400', octal: '400', desc: 'Read-only for owner — no one can modify' },
  { name: '750', octal: '750', desc: 'Owner full, group read+execute, other none' },
  { name: '640', octal: '640', desc: 'Owner read+write, group read-only, other none' },
];

export default function ChmodCalculatorPage() {
  const [perms, setPerms] = useState<Record<string, Record<PermBit, boolean>>>({
    owner: { read: true, write: true, execute: true },
    group: { read: true, write: false, execute: true },
    other: { read: true, write: false, execute: true },
  });

  const toggle = useCallback((entity: string, bit: PermBit) => {
    setPerms((prev) => ({
      ...prev,
      [entity]: {
        ...prev[entity],
        [bit]: !prev[entity][bit],
      },
    }));
  }, []);

  const applyPreset = useCallback((octal: string) => {
    const digits = octal.split('').map(Number);
    const set: Record<string, Record<PermBit, boolean>> = {};
    ['owner', 'group', 'other'].forEach((entity, i) => {
      const val = digits[i];
      set[entity] = {
        read: !!(val & 4),
        write: !!(val & 2),
        execute: !!(val & 1),
      };
    });
    setPerms(set);
  }, []);

  // Computed values
  const info = useMemo(() => {
    const octalParts = ['owner', 'group', 'other'].map((entity) => {
      let val = 0;
      if (perms[entity].read) val += 4;
      if (perms[entity].write) val += 2;
      if (perms[entity].execute) val += 1;
      return val;
    });

    const octal = octalParts.join('');
    const symbolic = ['owner', 'group', 'other'].map((entity) => {
      const p = perms[entity];
      return (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-');
    }).join('');

    const command = `chmod ${octal} <file>`;

    // Special modes
    const allExec = PERM_ROWS.every((r) => perms[r.entity].execute);
    const allRead = PERM_ROWS.every((r) => perms[r.entity].read);
    const isWorldWritable = perms.other.write;
    const isSetuidLike = perms.owner.execute && !perms.group.execute && !perms.other.execute;

    return { octal, symbolic, command, octalParts, allExec, allRead, isWorldWritable, isSetuidLike };
  }, [perms]);

  const copyAll = useCallback(() => {
    const cmds = [
      `chmod ${info.octal} <file>`,
      `# Octal:  ${info.octal}`,
      `# Symbolic: ${info.symbolic}`,
    ].join('\n');
    navigator.clipboard.writeText(cmds).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [info]);

  const copyOctal = useCallback(() => {
    navigator.clipboard.writeText(info.octal).then(
      () => toast.success('Octal copied!'),
      () => toast.error('Copy failed')
    );
  }, [info.octal]);

  const copyCommand = useCallback(() => {
    navigator.clipboard.writeText(info.command).then(
      () => toast.success('Command copied!'),
      () => toast.error('Copy failed')
    );
  }, [info.command]);

  return (
    <ToolLayout
      title="Unix Permissions Calculator"
      description="Visually build chmod permissions with checkboxes. See octal, symbolic, and chmod command output in real-time."
    >
      {/* Main grid: checkboxes + output */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Permission checkboxes */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/50">
                    <th className="text-left py-2 pr-4 font-medium">Entity</th>
                    {PERM_BITS.map((bit) => (
                      <th key={bit} className="text-center py-2 px-3 font-medium">
                        {PERM_LABELS[bit].label}
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {PERM_LABELS[bit].char}
                        </span>
                      </th>
                    ))}
                    <th className="text-center py-2 pl-3 font-medium">Octal</th>
                    <th className="text-center py-2 pl-3 font-medium font-mono">Symbolic</th>
                  </tr>
                </thead>
                <tbody>
                  {PERM_ROWS.map((row) => {
                    const Icon = row.icon;
                    return (
                      <tr key={row.entity} className="border-b border-slate-700/30">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-brand-400" />
                            <span className="text-white font-medium">{row.label}</span>
                          </div>
                        </td>
                        {PERM_BITS.map((bit) => (
                          <td key={bit} className="text-center py-3 px-3">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perms[row.entity][bit]}
                                onChange={() => toggle(row.entity, bit)}
                                className="w-5 h-5 rounded accent-brand-500"
                              />
                            </label>
                          </td>
                        ))}
                        <td className="text-center py-3 pl-3">
                          <span className="text-white font-mono font-bold text-lg">
                            {info.octalParts[PERM_ROWS.indexOf(row)]}
                          </span>
                        </td>
                        <td className="text-center py-3 pl-3">
                          <span className="font-mono text-slate-300 text-xs">
                            {info.symbolic.slice(PERM_ROWS.indexOf(row) * 3, PERM_ROWS.indexOf(row) * 3 + 3)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Output panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Octal */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Octal Notation</h3>
              <button onClick={copyOctal} className="text-slate-500 hover:text-brand-400 transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-4xl font-mono font-bold text-brand-400 tracking-wider">{info.octal}</div>
          </div>

          {/* Symbolic */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Symbolic Notation</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(info.symbolic).then(() => toast.success('Copied!'));
                }}
                className="text-slate-500 hover:text-brand-400 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-2xl font-mono text-slate-300 tracking-widest">{info.symbolic}</div>
          </div>

          {/* chmod command */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">chmod Command</h3>
              <button onClick={copyCommand} className="text-slate-500 hover:text-brand-400 transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <code className="block bg-surface rounded-lg px-3 py-2 font-mono text-sm text-green-400 border border-slate-700/50">
              {info.command}
            </code>
            <button onClick={copyAll} className="mt-3 btn-secondary flex items-center gap-1.5 text-xs w-full justify-center">
              <Copy className="w-3 h-3" />
              Copy All
            </button>
          </div>

          {/* Warnings */}
          {info.isWorldWritable && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                <strong>Security risk:</strong> World-writable — anyone can modify the file
              </p>
            </div>
          )}
          {info.octal === '777' && (
            <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <p className="text-yellow-400 text-xs flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                <strong>777 is almost never a good idea.</strong> Consider 755 for directories, 644 for files.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="mt-8">
        <h3 className="text-white font-medium text-sm mb-3">Common Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.octal}
              onClick={() => applyPreset(preset.octal)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                info.octal === preset.octal
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-slate-700/50 bg-surface hover:border-slate-600/50'
              }`}
            >
              <div className="font-mono text-white font-bold text-lg">{preset.octal}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">Understanding Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <p className="text-slate-300 font-medium mb-1">Read (4)</p>
            <p>View file contents, list directory contents</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Write (2)</p>
            <p>Modify/delete file, create/delete files in directory</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Execute (1)</p>
            <p>Run as program/script, enter directory (cd)</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

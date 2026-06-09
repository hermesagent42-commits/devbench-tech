'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, FileText, Shield, Scale, Users, Lock, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface License {
  id: string;
  name: string;
  fullName: string;
  category: 'permissive' | 'copyleft' | 'weak-copyleft' | 'public-domain' | 'source-available';
  description: string;
  canUseCommercially: boolean;
  canModify: boolean;
  canDistribute: boolean;
  canSublicense: boolean;
  canPatentUse: boolean;
  canPrivateUse: boolean;
  mustIncludeCopyright: boolean;
  mustIncludeLicense: boolean;
  mustStateChanges: boolean;
  mustDiscloseSource: boolean;
  mustUseSameLicense: boolean;
  mustIncludeOriginal: boolean;
  cannotHoldLiable: boolean;
  cannotUseTrademark: boolean;
  url: string;
  text: string;
}

const LICENSES: License[] = [
  {
    id: 'mit',
    name: 'MIT',
    fullName: 'MIT License',
    category: 'permissive',
    description: 'Short, simple, and permissive. Allows almost anything as long as the license notice is preserved. The most popular open-source license on GitHub.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: false, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: false, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/MIT',
    text: `MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },
  {
    id: 'apache-2.0',
    name: 'Apache 2.0',
    fullName: 'Apache License 2.0',
    category: 'permissive',
    description: 'Permissive with explicit patent grant. Good choice for projects where you want to protect contributors from patent litigation. Used by Kubernetes, TensorFlow, and Android.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: true, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: true, cannotHoldLiable: true, cannotUseTrademark: true,
    url: 'https://opensource.org/licenses/Apache-2.0',
    text: `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      ... (full text at https://www.apache.org/licenses/LICENSE-2.0) ...`,
  },
  {
    id: 'gpl-3.0',
    name: 'GPL 3.0',
    fullName: 'GNU General Public License v3.0',
    category: 'copyleft',
    description: 'Strong copyleft — any derivative work must also be GPL. Ensures software freedom propagates. Used by Linux, Git, and WordPress.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: false,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: true, mustDiscloseSource: true, mustUseSameLicense: true,
    mustIncludeOriginal: true, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/GPL-3.0',
    text: `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

  ... (full text at https://www.gnu.org/licenses/gpl-3.0.txt) ...`,
  },
  {
    id: 'lgpl-3.0',
    name: 'LGPL 3.0',
    fullName: 'GNU Lesser General Public License v3.0',
    category: 'weak-copyleft',
    description: 'Weak copyleft for libraries. Allows linking from non-GPL software. Good for libraries that want adoption while protecting the library itself.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: false,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: true, mustDiscloseSource: true, mustUseSameLicense: true,
    mustIncludeOriginal: true, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/LGPL-3.0',
    text: `The GNU Lesser General Public License v3.0 — full text at https://www.gnu.org/licenses/lgpl-3.0.txt`,
  },
  {
    id: 'bsd-2-clause',
    name: 'BSD 2-Clause',
    fullName: 'BSD 2-Clause "Simplified" License',
    category: 'permissive',
    description: 'Like MIT but with an explicit non-endorsement clause. Very short, used by Go, Redis, and Nginx.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: false, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: false, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/BSD-2-Clause',
    text: `BSD 2-Clause License

Copyright (c) [year], [fullname]

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES...`,
  },
  {
    id: 'isc',
    name: 'ISC',
    fullName: 'ISC License',
    category: 'permissive',
    description: 'Functionally equivalent to MIT but with simpler language. Used by Node.js and OpenBSD. Good choice if you want the shortest possible permissive license.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: false, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: false, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/ISC',
    text: `ISC License

Copyright (c) [year] [fullname]

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  },
  {
    id: 'mpl-2.0',
    name: 'MPL 2.0',
    fullName: 'Mozilla Public License 2.0',
    category: 'weak-copyleft',
    description: 'File-level copyleft — modified files must stay MPL, but can link to proprietary code. Good balance between GPL and permissive. Used by Firefox and Thunderbird.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: true, cannotHoldLiable: true, cannotUseTrademark: true,
    url: 'https://opensource.org/licenses/MPL-2.0',
    text: `Mozilla Public License Version 2.0 — full text at https://www.mozilla.org/en-US/MPL/2.0/`,
  },
  {
    id: 'unlicense',
    name: 'Unlicense',
    fullName: 'The Unlicense',
    category: 'public-domain',
    description: 'Dedicate your work to the public domain. No restrictions whatsoever. Use when you want to say "do whatever you want."',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: false, mustIncludeLicense: false,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: false, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://unlicense.org/',
    text: `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.`,
  },
  {
    id: 'agpl-3.0',
    name: 'AGPL 3.0',
    fullName: 'GNU Affero General Public License v3.0',
    category: 'copyleft',
    description: 'Like GPL but also covers network use (SaaS). If you modify AGPL code and run it on a server, you must release your changes. Used by MongoDB (before SSPL) and Grafana.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: false,
    canPatentUse: true, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: true, mustDiscloseSource: true, mustUseSameLicense: true,
    mustIncludeOriginal: true, cannotHoldLiable: true, cannotUseTrademark: false,
    url: 'https://opensource.org/licenses/AGPL-3.0',
    text: `GNU AFFERO GENERAL PUBLIC LICENSE Version 3 — full text at https://www.gnu.org/licenses/agpl-3.0.txt`,
  },
  {
    id: 'bsd-3-clause',
    name: 'BSD 3-Clause',
    fullName: 'BSD 3-Clause "New" License',
    category: 'permissive',
    description: 'Like BSD 2-Clause but with a non-endorsement clause preventing use of contributor names in promotion. Used by React, Django, and Rails.',
    canUseCommercially: true, canModify: true, canDistribute: true, canSublicense: true,
    canPatentUse: false, canPrivateUse: true, mustIncludeCopyright: true, mustIncludeLicense: true,
    mustStateChanges: false, mustDiscloseSource: false, mustUseSameLicense: false,
    mustIncludeOriginal: false, cannotHoldLiable: true, cannotUseTrademark: true,
    url: 'https://opensource.org/licenses/BSD-3-Clause',
    text: `BSD 3-Clause License — full text at https://opensource.org/licenses/BSD-3-Clause`,
  },
];

const CATEGORY_LABELS: Record<License['category'], { label: string; color: string; icon: typeof Shield }> = {
  'permissive': { label: 'Permissive', color: 'text-emerald-400', icon: Shield },
  'copyleft': { label: 'Copyleft', color: 'text-orange-400', icon: Lock },
  'weak-copyleft': { label: 'Weak Copyleft', color: 'text-amber-400', icon: Lock },
  'public-domain': { label: 'Public Domain', color: 'text-purple-400', icon: Users },
  'source-available': { label: 'Source Available', color: 'text-blue-400', icon: FileText },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function LicenseSelectorPage() {
  const [search, setSearch] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<string | null>('mit');
  const [comparison, setComparison] = useState<string[]>([]);

  const filteredLicenses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return LICENSES;
    return LICENSES.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.fullName.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.category.includes(q)
    );
  }, [search]);

  const currentLicense = useMemo(
    () => LICENSES.find(l => l.id === selectedLicense) || null,
    [selectedLicense]
  );

  const compareLicenses = useMemo(
    () => LICENSES.filter(l => comparison.includes(l.id)),
    [comparison]
  );

  const toggleComparison = useCallback((id: string) => {
    setComparison(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }, []);

  const copyLicenseText = useCallback((license: License) => {
    navigator.clipboard.writeText(license.text).then(
      () => toast.success(`${license.name} license copied!`),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const downloadLicense = useCallback((license: License) => {
    const blob = new Blob([license.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LICENSE';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('LICENSE file downloaded!');
  }, []);

  return (
    <ToolLayout
      title="License Selector"
      description="Compare open-source licenses and find the right one for your project. See permissions, conditions, and limitations at a glance — MIT, Apache 2.0, GPL, BSD, and more."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: License list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search licenses..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div className="space-y-1.5">
            {filteredLicenses.map(license => {
              const cat = CATEGORY_LABELS[license.category];
              return (
                <button
                  key={license.id}
                  onClick={() => setSelectedLicense(license.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all border ${
                    selectedLicense === license.id
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-surface-light border-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{license.name}</span>
                    <span className={`text-[10px] font-medium ${cat.color}`}>{cat.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{license.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {currentLicense && (
            <>
              {/* Header */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{currentLicense.fullName}</h2>
                    <span className={`text-sm font-medium ${CATEGORY_LABELS[currentLicense.category].color}`}>
                      {CATEGORY_LABELS[currentLicense.category].label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLicenseText(currentLicense)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button
                      onClick={() => downloadLicense(currentLicense)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{currentLicense.description}</p>
              </div>

              {/* Permissions / Conditions / Limitations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Permissions */}
                <div className="card">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Permissions
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'canUseCommercially', label: 'Commercial use' },
                      { key: 'canModify', label: 'Modification' },
                      { key: 'canDistribute', label: 'Distribution' },
                      { key: 'canSublicense', label: 'Sublicensing' },
                      { key: 'canPatentUse', label: 'Patent use' },
                      { key: 'canPrivateUse', label: 'Private use' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-emerald-400'
                          : 'text-slate-600'
                        }>
                          {currentLicense[item.key as keyof License] ? '✓' : '✗'}
                        </span>
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-slate-300'
                          : 'text-slate-600'
                        }>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="card">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Conditions
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'mustIncludeCopyright', label: 'Include copyright' },
                      { key: 'mustIncludeLicense', label: 'Include license' },
                      { key: 'mustStateChanges', label: 'State changes' },
                      { key: 'mustDiscloseSource', label: 'Disclose source' },
                      { key: 'mustUseSameLicense', label: 'Same license' },
                      { key: 'mustIncludeOriginal', label: 'Include original' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-amber-400'
                          : 'text-slate-600'
                        }>
                          {currentLicense[item.key as keyof License] ? '✓' : '✗'}
                        </span>
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-slate-300'
                          : 'text-slate-600'
                        }>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limitations */}
                <div className="card">
                  <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Limitations
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'cannotHoldLiable', label: 'Liability' },
                      { key: 'cannotUseTrademark', label: 'Trademark use' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-red-400'
                          : 'text-slate-600'
                        }>
                          {currentLicense[item.key as keyof License] ? '✓' : '✗'}
                        </span>
                        <span className={currentLicense[item.key as keyof License]
                          ? 'text-slate-300'
                          : 'text-slate-600'
                        }>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* License text preview */}
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">License Text</h3>
                <pre className="bg-surface-light rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {currentLicense.text}
                </pre>
              </div>

              {/* Quick recommendation */}
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">Quick Guide</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-emerald-400 font-semibold mb-1">🟢 I want maximum adoption</p>
                    <p>MIT or Apache 2.0 — permissive, no strings attached. The industry default for open-source libraries.</p>
                  </div>
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-orange-400 font-semibold mb-1">🟠 I want derivative works to stay open</p>
                    <p>GPL 3.0 — strong copyleft. Anyone who modifies and distributes your code must also open-source their changes.</p>
                  </div>
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-amber-400 font-semibold mb-1">🟡 I&apos;m building a library</p>
                    <p>LGPL 3.0 or MPL 2.0 — weak copyleft. Allows linking from proprietary software while protecting the library itself.</p>
                  </div>
                  <div className="bg-surface-light rounded-lg p-3">
                    <p className="text-purple-400 font-semibold mb-1">🟣 I don&apos;t care at all</p>
                    <p>Unlicense — public domain. No restrictions, no attribution required. Truly &quot;do whatever you want.&quot;</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!currentLicense && (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select a license to view details</p>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

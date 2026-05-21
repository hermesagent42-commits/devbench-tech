'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UuidGeneratorPage() {
  const [uuid, setUuid] = useState('');
  const [count, setCount] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(5);
  const [batchUuids, setBatchUuids] = useState<string[]>([]);

  const generateNew = useCallback(() => {
    const newUuid = crypto.randomUUID();
    setUuid(newUuid);
    setCount((c) => c + 1);
    setLastGenerated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    generateNew();
  }, [generateNew]);

  const copyUuid = useCallback(() => {
    if (!uuid) return;
    navigator.clipboard.writeText(uuid).then(
      () => toast.success('UUID copied!'),
      () => toast.error('Failed to copy')
    );
  }, [uuid]);

  const generateBatch = useCallback(() => {
    const count = Math.min(100, Math.max(1, batchCount));
    const uuids = Array.from({ length: count }, () => crypto.randomUUID());
    setBatchUuids(uuids);
    setCount((c) => c + count);
    setLastGenerated(new Date().toLocaleTimeString());
  }, [batchCount]);

  const copyBatch = useCallback(() => {
    if (batchUuids.length === 0) return;
    navigator.clipboard.writeText(batchUuids.join('\n')).then(
      () => toast.success(`${batchUuids.length} UUIDs copied!`),
      () => toast.error('Failed to copy')
    );
  }, [batchUuids]);

  return (
    <ToolLayout
      title="UUID Generator"
      description="Generate cryptographically random UUID v4 identifiers — single or batch."
    >
      {/* Single UUID */}
      <div className="card mb-8">
        <h2 className="text-white font-semibold text-lg mb-4">Single UUID</h2>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-surface rounded-lg px-4 py-3 font-mono text-sm text-brand-400 break-all border border-slate-700/50">
            {uuid || 'Generating...'}
          </div>
          <button onClick={copyUuid} className="btn-secondary flex items-center gap-1.5 text-sm shrink-0">
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <button onClick={generateNew} className="btn-primary flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Generate New
          </button>
          <span>
            <Hash className="w-3.5 h-3.5 inline mr-1" />
            Generated: {count}
          </span>
          {lastGenerated && (
            <span className="text-slate-500">
              Last: {lastGenerated}
            </span>
          )}
        </div>
      </div>

      {/* Batch Generation */}
      <div className="card">
        <h2 className="text-white font-semibold text-lg mb-4">Batch Generate</h2>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-slate-300 shrink-0">Count (1–100):</label>
          <input
            type="number"
            min={1}
            max={100}
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="input-field w-24 text-center"
          />
          <button onClick={generateBatch} className="btn-primary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            Generate
          </button>
          {batchUuids.length > 0 && (
            <button onClick={copyBatch} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Copy className="w-4 h-4" />
              Copy All
            </button>
          )}
        </div>

        {batchUuids.length > 0 && (
          <div className="bg-surface rounded-lg p-4 border border-slate-700/50 max-h-60 overflow-y-auto">
            {batchUuids.map((id, i) => (
              <div key={i} className="font-mono text-sm text-brand-400 py-0.5">
                {id}
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

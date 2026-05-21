'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToolLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  controls?: ReactNode;
}

export function ToolLayout({ title, description, children, controls }: ToolLayoutProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-brand-400 text-sm transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </Link>
        <h1 className="section-title">{title}</h1>
        <p className="section-subtitle">{description}</p>
      </div>

      {/* Optional controls bar */}
      {controls && (
        <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
          {controls}
        </div>
      )}

      {/* Tool content */}
      {children}
    </div>
  );
}

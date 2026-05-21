import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Key, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'JWT Debugger',
  description: 'Decode and inspect JWT tokens. Coming soon!',
};

export default function JwtDebuggerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-brand-400 text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tools
      </Link>

      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
        <Key className="w-8 h-8 text-brand-400" />
      </div>

      <h1 className="section-title">JWT Debugger</h1>
      <p className="section-subtitle mt-2 mb-8">
        Decode, inspect, and verify JSON Web Tokens directly in your browser.
      </p>

      <div className="card inline-block">
        <div className="flex items-center gap-3 text-amber-400">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">Coming Soon</span>
        </div>
        <p className="text-slate-400 text-sm mt-3">
          We&apos;re working on a JWT debugger with header/payload inspection,
          signature verification hints, and expiration checking. Stay tuned!
        </p>
      </div>
    </div>
  );
}

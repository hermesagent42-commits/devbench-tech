import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Palette, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Color Converter',
  description: 'Convert colors between HEX, RGB, HSL, and more. Coming soon!',
};

export default function ColorConverterPage() {
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
        <Palette className="w-8 h-8 text-brand-400" />
      </div>

      <h1 className="section-title">Color Converter</h1>
      <p className="section-subtitle mt-2 mb-8">
        Convert colors between HEX, RGB, HSL, HSV, and more formats.
      </p>

      <div className="card inline-block">
        <div className="flex items-center gap-3 text-amber-400">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">Coming Soon</span>
        </div>
        <p className="text-slate-400 text-sm mt-3">
          We&apos;re building a powerful color conversion tool with live preview,
          color picker, and palette generation. Stay tuned!
        </p>
      </div>
    </div>
  );
}

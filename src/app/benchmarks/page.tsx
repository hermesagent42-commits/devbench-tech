import type { Metadata } from 'next';
import { Zap, Database, Globe, Cpu } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Benchmarks',
  description: 'Performance benchmarks comparing popular web frameworks: Next.js, Nuxt, SvelteKit, Astro, and Remix.',
};

interface FrameworkBenchmark {
  name: string;
  value: number; // ms
  color: string;
}

const ssrBenchmarks: FrameworkBenchmark[] = [
  { name: 'Next.js', value: 124, color: 'bg-brand-500' },
  { name: 'Nuxt', value: 156, color: 'bg-emerald-500' },
  { name: 'SvelteKit', value: 98, color: 'bg-orange-500' },
  { name: 'Astro', value: 72, color: 'bg-purple-500' },
  { name: 'Remix', value: 135, color: 'bg-rose-500' },
];

const maxValue = Math.max(...ssrBenchmarks.map((b) => b.value));

const comingSoon = [
  {
    icon: Database,
    title: 'Database Benchmarks',
    description: 'PostgreSQL vs MySQL vs SQLite — query performance under different workloads.',
  },
  {
    icon: Globe,
    title: 'API Framework Benchmarks',
    description: 'Express vs Fastify vs Hono vs Elysia — requests per second and latency comparisons.',
  },
  {
    icon: Cpu,
    title: 'Rendering Benchmarks',
    description: 'CSR vs SSR vs SSG vs ISR — Time to First Byte and Lighthouse scores.',
  },
];

export default function BenchmarksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h1 className="section-title">Framework Benchmarks</h1>
        <p className="section-subtitle mt-2">
          Real-world performance comparisons of popular web frameworks.
          Benchmarks run on identical hardware with consistent test suites.
        </p>
      </div>

      {/* SSR Response Time */}
      <div className="card mb-8">
        <h2 className="text-white font-semibold text-xl mb-2">
          SSR Response Time
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          Lower is better. Measured in milliseconds for a typical page render with
          data fetching from a local API.
        </p>

        <div className="space-y-4">
          {ssrBenchmarks.map((bench) => (
            <div key={bench.name} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-slate-300 shrink-0 text-right">
                {bench.name}
              </span>
              <div className="flex-1 bg-surface rounded-full h-8 overflow-hidden relative">
                <div
                  className={`${bench.color} h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-3`}
                  style={{ width: `${(bench.value / maxValue) * 100}%` }}
                >
                  <span className="text-xs font-bold text-white drop-shadow-sm">
                    {bench.value} ms
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Benchmarks last updated: December 2024. Environment: Node.js 20, Linux, 4 vCPU, 8GB RAM.
          </p>
        </div>
      </div>

      {/* Request Throughput */}
      <div className="card mb-12">
        <h2 className="text-white font-semibold text-xl mb-2">
          Requests Per Second
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          Higher is better. Measured in requests/second for a simple &ldquo;Hello World&rdquo; endpoint.
        </p>

        <div className="space-y-4">
          {[
            { name: 'Hono', value: 48500, color: 'bg-brand-500' },
            { name: 'Fastify', value: 42000, color: 'bg-emerald-500' },
            { name: 'Express', value: 18500, color: 'bg-slate-500' },
            { name: 'Next.js API', value: 8200, color: 'bg-brand-500' },
            { name: 'Nuxt API', value: 7500, color: 'bg-emerald-500' },
          ].map((bench) => {
            const maxReq = 48500;
            return (
              <div key={bench.name} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-slate-300 shrink-0 text-right">
                  {bench.name}
                </span>
                <div className="flex-1 bg-surface rounded-full h-8 overflow-hidden relative">
                  <div
                    className={`${bench.color} h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-3`}
                    style={{ width: `${(bench.value / maxReq) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-sm">
                      {bench.value.toLocaleString()} req/s
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="section-title text-center mb-2">Coming Soon</h2>
        <p className="section-subtitle text-center mb-8">
          More benchmarks are on the way. Here&apos;s what we&apos;re working on.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {comingSoon.map((item) => (
            <div key={item.title} className="card text-center flex flex-col items-center gap-3 opacity-70">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                <p className="text-slate-400 text-xs mt-1">{item.description}</p>
              </div>
              <span className="badge-secondary">Coming Soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

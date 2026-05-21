import type { Metadata } from 'next';
import Link from 'next/link';
import { Github, Heart, Shield, Zap, Globe, Lock, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About DevBench',
  description: 'Learn about DevBench — free, open-source developer tools built with privacy in mind.',
};

const values = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'No tracking, no analytics, no data collection. All tools run entirely in your browser.',
  },
  {
    icon: Zap,
    title: 'Blazing Fast',
    description: 'Built with Next.js and optimized for performance. Tools respond instantly.',
  },
  {
    icon: Globe,
    title: 'Free Forever',
    description: 'No paywalls, no premium tiers, no ads. Just free tools for everyone.',
  },
  {
    icon: Code,
    title: 'Open Source',
    description: 'Every line of code is public. Contribute, fork, or self-host however you like.',
  },
  {
    icon: Lock,
    title: 'Client-Side Only',
    description: 'All computation happens in your browser. Your data never leaves your machine.',
  },
  {
    icon: Heart,
    title: 'Community Driven',
    description: 'Built by developers, for developers. Feature requests and contributions welcome.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="section-title">About DevBench</h1>
        <p className="section-subtitle mt-2 max-w-2xl mx-auto">
          A curated collection of free, fast, and private developer tools.
          Built for the community, by the community.
        </p>
      </div>

      {/* Mission */}
      <div className="card mb-12">
        <h2 className="text-white font-semibold text-xl mb-4">Our Mission</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-slate-300 leading-relaxed">
            DevBench was born from a simple frustration: finding good developer tools
            online often means wading through ads, signing up for accounts, or worrying
            about where your data ends up.
          </p>
          <p className="text-slate-300 leading-relaxed mt-4">
            We believe developer tools should be <strong className="text-white">free</strong>,
            {' '}<strong className="text-white">fast</strong>, and{' '}
            <strong className="text-white">private</strong>. Every tool on DevBench
            runs entirely in your browser using client-side JavaScript. Your JSON payloads,
            Base64 strings, regex patterns, and UUIDs never touch our servers — because
            there are no servers to touch.
          </p>
          <p className="text-slate-300 leading-relaxed mt-4">
            Whether you&apos;re formatting JSON responses, testing regular expressions,
            or comparing framework benchmarks, DevBench is here to help — no strings attached.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-12">
        <h2 className="text-white font-semibold text-xl mb-6 text-center">
          What We Stand For
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((value) => (
            <div key={value.title} className="card text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <value.icon className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-white font-semibold">{value.title}</h3>
              <p className="text-slate-400 text-sm">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Source CTA */}
      <div className="card text-center">
        <h2 className="text-white font-semibold text-xl mb-3">Open Source</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
          DevBench is fully open source under the MIT license. Check out the code,
          report issues, or contribute new tools and features.
        </p>
        <a
          href="https://github.com/nousresearch/devbench"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Github className="w-5 h-5" />
          View on GitHub
        </a>
      </div>

      {/* Footer note */}
      <div className="text-center mt-12">
        <p className="text-slate-500 text-sm">
          Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" /> by the
          DevBench team. &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

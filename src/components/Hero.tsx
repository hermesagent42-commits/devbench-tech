'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  { icon: Zap, label: 'Fast & Instant', value: 'All tools run locally in your browser' },
  { icon: Shield, label: 'Privacy First', value: 'No data sent to any server' },
  { icon: Clock, label: 'Always Free', value: 'No signup, no limits, no ads' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            New tools added weekly
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight text-balance">
            Developer Tools,{' '}
            <span className="gradient-text">Benchmarks</span>{' '}
            &amp; Calculators
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed text-balance">
            A curated collection of free, fast, and private developer tools.
            Everything runs in your browser — no signup, no ads, no tracking.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/tools" className="btn-primary flex items-center gap-2 text-base px-8 py-3">
              Explore Tools
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/blog" className="btn-secondary flex items-center gap-2 text-base px-8 py-3">
              Read the Blog
            </Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card text-center flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{stat.label}</p>
                <p className="text-slate-400 text-xs mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

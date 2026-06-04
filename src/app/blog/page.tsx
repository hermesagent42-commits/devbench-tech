import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/data/blog-posts';
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Blog — Developer Tools, Benchmarks & Web Platform Insights',
  description:
    'Deep technical articles about browser APIs, CSS features, JavaScript patterns, performance optimization, and web platform innovations.',
  openGraph: {
    title: 'DevBench Blog — Web Platform Deep Dives',
    description:
      'Deep technical articles about browser APIs, CSS features, JavaScript patterns, and more.',
  },
};

export default function BlogPage() {
  const posts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'DevBench Blog',
          description:
            'Deep technical articles about browser APIs, CSS features, JavaScript patterns, performance optimization, and web platform innovations.',
          url: 'https://devbench-roan.vercel.app/blog/',
          blogPost: posts.map((post) => ({
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: { '@type': 'Person', name: post.author },
            url: `https://devbench-roan.vercel.app/blog/${post.slug}/`,
          })),
        }}
      />
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            DevBench Blog
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Deep technical articles about browser APIs, CSS features, JavaScript patterns,
            performance optimization, and web platform innovations. Written for developers
            who want to understand the <em>why</em>, not just the <em>how</em>.
          </p>
        </div>

        <div className="space-y-10">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="card group hover:border-brand-500/30 transition-colors duration-200"
            >
              <Link href={`/blog/${post.slug}/`} className="block p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readingTime}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 group-hover:text-brand-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-slate-400 mb-4 leading-relaxed">{post.description}</p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-medium border border-brand-500/20"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-brand-400 text-sm font-medium group-hover:gap-2 transition-all">
                  Read article
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </article>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No articles yet. Check back soon!</p>
          </div>
        )}
      </div>
    </>
  );
}

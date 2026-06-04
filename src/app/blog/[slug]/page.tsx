import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts } from '@/data/blog-posts';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          author: { '@type': 'Person', name: post.author },
          url: `https://devbench-roan.vercel.app/blog/${post.slug}/`,
        }}
      />
      <article className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-slate-400 mb-6">{post.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readingTime}
            </span>
            <span className="text-slate-600">by {post.author}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-medium border border-brand-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Article content */}
        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Footer */}
        <hr className="border-slate-800 my-12" />
        <div className="text-center">
          <Link
            href="/blog/"
            className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            More articles
          </Link>
        </div>
      </article>
    </>
  );
}

import Link from 'next/link';
import { Calendar, Tag, ArrowRight } from 'lucide-react';

interface BlogCardProps {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
  tags?: string[];
}

export function BlogCard({ title, date, excerpt, slug, tags = [] }: BlogCardProps) {
  return (
    <Link href={`/blog/${slug}/`} className="block h-full">
      <article className="card-interactive h-full flex flex-col">
        <h3 className="text-white font-semibold text-lg mb-3 leading-snug">
          {title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {date}
          </span>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed flex-1">
          {excerpt}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((tag) => (
              <span key={tag} className="badge-secondary flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-brand-400 text-sm font-medium">
          Read more
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </article>
    </Link>
  );
}

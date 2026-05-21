import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tags?: string[];
  index?: number;
}

export function ToolCard({
  title,
  description,
  href,
  icon: Icon,
  tags = [],
}: ToolCardProps) {
  return (
    <Link href={href} className="block h-full group">
      <div className="card-interactive h-full flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed flex-1">
          {description}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((tag) => (
              <span key={tag} className="badge-secondary">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-brand-400 text-sm font-medium">
          Open tool
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

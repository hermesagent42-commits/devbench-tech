'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Play, Pause, Search, Code, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── Animation Presets ───────── */

interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  keyframes: string;
  animationCSS: string;
  tailwindClass?: string;
  demoElement: 'box' | 'text' | 'circle' | 'badge';
  color: string;
}

const CATEGORIES = [
  'All',
  'Entrance',
  'Attention',
  'Exit',
  'Loading',
  'Hover',
  'Background',
] as const;

const PRESETS: AnimationPreset[] = [
  // ── Entrance ──
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'Entrance',
    description: 'Smooth opacity fade from transparent to visible',
    keyframes: `@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}`,
    animationCSS: 'animation: fadeIn 0.6s ease-out;',
    tailwindClass: 'animate-fade-in',
    demoElement: 'box',
    color: '#6366f1',
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    category: 'Entrance',
    description: 'Slide up from below while fading in',
    keyframes: `@keyframes slideUp {\n  from {\n    opacity: 0;\n    transform: translateY(30px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}`,
    animationCSS: 'animation: slideUp 0.5s ease-out;',
    tailwindClass: 'animate-slide-up',
    demoElement: 'box',
    color: '#8b5cf6',
  },
  {
    id: 'slide-down',
    name: 'Slide Down',
    category: 'Entrance',
    description: 'Slide down from above while fading in',
    keyframes: `@keyframes slideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-20px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}`,
    animationCSS: 'animation: slideDown 0.5s ease-out;',
    demoElement: 'box',
    color: '#a78bfa',
  },
  {
    id: 'slide-left',
    name: 'Slide Left',
    category: 'Entrance',
    description: 'Slide in from the right side',
    keyframes: `@keyframes slideLeft {\n  from {\n    opacity: 0;\n    transform: translateX(40px);\n  }\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}`,
    animationCSS: 'animation: slideLeft 0.5s ease-out;',
    demoElement: 'box',
    color: '#7c3aed',
  },
  {
    id: 'slide-right',
    name: 'Slide Right',
    category: 'Entrance',
    description: 'Slide in from the left side',
    keyframes: `@keyframes slideRight {\n  from {\n    opacity: 0;\n    transform: translateX(-40px);\n  }\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}`,
    animationCSS: 'animation: slideRight 0.5s ease-out;',
    demoElement: 'box',
    color: '#6d28d9',
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'Entrance',
    description: 'Scale up and fade in from center',
    keyframes: `@keyframes zoomIn {\n  from {\n    opacity: 0;\n    transform: scale(0.5);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}`,
    animationCSS: 'animation: zoomIn 0.4s ease-out;',
    demoElement: 'box',
    color: '#ec4899',
  },
  {
    id: 'flip-in',
    name: 'Flip In',
    category: 'Entrance',
    description: '3D flip entrance from the top',
    keyframes: `@keyframes flipIn {\n  from {\n    opacity: 0;\n    transform: perspective(600px) rotateX(-60deg);\n  }\n  to {\n    opacity: 1;\n    transform: perspective(600px) rotateX(0);\n  }\n}`,
    animationCSS: 'animation: flipIn 0.6s ease-out;',
    demoElement: 'box',
    color: '#f43f5e',
  },
  {
    id: 'drop-in',
    name: 'Drop In',
    category: 'Entrance',
    description: 'Bouncy drop from above',
    keyframes: `@keyframes dropIn {\n  0% {\n    opacity: 0;\n    transform: translateY(-100%);\n  }\n  60% {\n    transform: translateY(10px);\n  }\n  80% {\n    transform: translateY(-5px);\n  }\n  100% {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}`,
    animationCSS: 'animation: dropIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55);',
    demoElement: 'box',
    color: '#f59e0b',
  },

  // ── Attention ──
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'Attention',
    description: 'Throbbing scale pulse (great for CTA buttons)',
    keyframes: `@keyframes pulse {\n  0%, 100% {\n    transform: scale(1);\n  }\n  50% {\n    transform: scale(1.05);\n  }\n}`,
    animationCSS: 'animation: pulse 2s ease-in-out infinite;',
    tailwindClass: 'animate-pulse',
    demoElement: 'badge',
    color: '#3b82f6',
  },
  {
    id: 'bounce',
    name: 'Bounce',
    category: 'Attention',
    description: 'Classic bouncing motion',
    keyframes: `@keyframes bounce {\n  0%, 100% {\n    transform: translateY(0);\n    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);\n  }\n  50% {\n    transform: translateY(-25%);\n    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n  }\n}`,
    animationCSS: 'animation: bounce 1s ease-in-out infinite;',
    tailwindClass: 'animate-bounce',
    demoElement: 'circle',
    color: '#14b8a6',
  },
  {
    id: 'shake',
    name: 'Shake',
    category: 'Attention',
    description: 'Horizontal shake (error/warning indicator)',
    keyframes: `@keyframes shake {\n  0%, 100% { transform: translateX(0); }\n  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }\n  20%, 40%, 60%, 80% { transform: translateX(4px); }\n}`,
    animationCSS: 'animation: shake 0.6s ease-in-out;',
    demoElement: 'box',
    color: '#ef4444',
  },
  {
    id: 'wiggle',
    name: 'Wiggle',
    category: 'Attention',
    description: 'Rotating wiggle to draw attention',
    keyframes: `@keyframes wiggle {\n  0%, 100% { transform: rotate(-3deg); }\n  50% { transform: rotate(3deg); }\n}`,
    animationCSS: 'animation: wiggle 0.4s ease-in-out infinite;',
    demoElement: 'box',
    color: '#f97316',
  },
  {
    id: 'glow',
    name: 'Glow',
    category: 'Attention',
    description: 'Pulsing box-shadow glow effect',
    keyframes: `@keyframes glow {\n  0%, 100% {\n    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);\n  }\n  50% {\n    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4);\n  }\n}`,
    animationCSS: 'animation: glow 2s ease-in-out infinite;',
    demoElement: 'box',
    color: '#3b82f6',
  },
  {
    id: 'tada',
    name: 'Tada',
    category: 'Attention',
    description: 'Energetic entrance with shake + scale',
    keyframes: `@keyframes tada {\n  0% { transform: scale(1) rotate(0); }\n  10%, 20% { transform: scale(0.9) rotate(-3deg); }\n  30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }\n  40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }\n  100% { transform: scale(1) rotate(0); }\n}`,
    animationCSS: 'animation: tada 1s ease-in-out;',
    demoElement: 'badge',
    color: '#eab308',
  },
  {
    id: 'jello',
    name: 'Jello',
    category: 'Attention',
    description: 'Rubbery wobble effect',
    keyframes: `@keyframes jello {\n  0%, 100% { transform: scale3d(1, 1, 1); }\n  30% { transform: scale3d(1.25, 0.75, 1); }\n  40% { transform: scale3d(0.75, 1.25, 1); }\n  50% { transform: scale3d(1.15, 0.85, 1); }\n  65% { transform: scale3d(0.95, 1.05, 1); }\n  75% { transform: scale3d(1.05, 0.95, 1); }\n}`,
    animationCSS: 'animation: jello 1s ease-in-out;',
    demoElement: 'box',
    color: '#22c55e',
  },

  // ── Exit ──
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'Exit',
    description: 'Smooth fade to transparent',
    keyframes: `@keyframes fadeOut {\n  from { opacity: 1; }\n  to { opacity: 0; }\n}`,
    animationCSS: 'animation: fadeOut 0.5s ease-in forwards;',
    demoElement: 'box',
    color: '#94a3b8',
  },
  {
    id: 'slide-out-up',
    name: 'Slide Out Up',
    category: 'Exit',
    description: 'Slide out upward and fade',
    keyframes: `@keyframes slideOutUp {\n  from {\n    opacity: 1;\n    transform: translateY(0);\n  }\n  to {\n    opacity: 0;\n    transform: translateY(-30px);\n  }\n}`,
    animationCSS: 'animation: slideOutUp 0.4s ease-in forwards;',
    demoElement: 'box',
    color: '#64748b',
  },
  {
    id: 'slide-out-down',
    name: 'Slide Out Down',
    category: 'Exit',
    description: 'Slide out downward and fade',
    keyframes: `@keyframes slideOutDown {\n  from {\n    opacity: 1;\n    transform: translateY(0);\n  }\n  to {\n    opacity: 0;\n    transform: translateY(30px);\n  }\n}`,
    animationCSS: 'animation: slideOutDown 0.4s ease-in forwards;',
    demoElement: 'box',
    color: '#475569',
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    category: 'Exit',
    description: 'Scale down and fade out',
    keyframes: `@keyframes zoomOut {\n  from {\n    opacity: 1;\n    transform: scale(1);\n  }\n  to {\n    opacity: 0;\n    transform: scale(0.3);\n  }\n}`,
    animationCSS: 'animation: zoomOut 0.4s ease-in forwards;',
    demoElement: 'box',
    color: '#dc2626',
  },

  // ── Loading ──
  {
    id: 'spin',
    name: 'Spin',
    category: 'Loading',
    description: 'Continuous rotation (great for spinners)',
    keyframes: `@keyframes spin {\n  from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }\n}`,
    animationCSS: 'animation: spin 1s linear infinite;',
    tailwindClass: 'animate-spin',
    demoElement: 'circle',
    color: '#06b6d4',
  },
  {
    id: 'ping',
    name: 'Ping',
    category: 'Loading',
    description: 'Radiating ripple (notification dot)',
    keyframes: `@keyframes ping {\n  75%, 100% {\n    transform: scale(2);\n    opacity: 0;\n  }\n}`,
    animationCSS: 'animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;',
    tailwindClass: 'animate-ping',
    demoElement: 'circle',
    color: '#0ea5e9',
  },
  {
    id: 'pulse-dot',
    name: 'Pulse Dot',
    category: 'Loading',
    description: 'Opacity pulse (typing indicator style)',
    keyframes: `@keyframes pulseDot {\n  0%, 100% { opacity: 0.3; }\n  50% { opacity: 1; }\n}`,
    animationCSS: 'animation: pulseDot 1.4s ease-in-out infinite;\n&:nth-child(2) { animation-delay: 0.2s; }\n&:nth-child(3) { animation-delay: 0.4s; }',
    demoElement: 'circle',
    color: '#8b5cf6',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'Loading',
    description: 'Shimmer loading placeholder',
    keyframes: `@keyframes skeleton {\n  0% { background-position: -200% 0; }\n  100% { background-position: 200% 0; }\n}`,
    animationCSS: 'animation: skeleton 1.5s ease-in-out infinite;\nbackground: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);\nbackground-size: 200% 100%;',
    demoElement: 'box',
    color: '#334155',
  },
  {
    id: 'progress-bar',
    name: 'Progress Bar',
    category: 'Loading',
    description: 'Animated indeterminate progress bar',
    keyframes: `@keyframes progressBar {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(400%); }\n}`,
    animationCSS: 'animation: progressBar 1.5s ease-in-out infinite;',
    demoElement: 'box',
    color: '#10b981',
  },

  // ── Hover ──
  {
    id: 'hover-grow',
    name: 'Hover Grow',
    category: 'Hover',
    description: 'Scale up on hover',
    keyframes: '',
    animationCSS: 'transition: transform 0.2s ease;\n&:hover { transform: scale(1.05); }',
    demoElement: 'box',
    color: '#3b82f6',
  },
  {
    id: 'hover-lift',
    name: 'Hover Lift',
    category: 'Hover',
    description: 'Lift with shadow on hover (card effect)',
    keyframes: '',
    animationCSS: 'transition: transform 0.2s ease, box-shadow 0.2s ease;\n&:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);\n}',
    demoElement: 'box',
    color: '#6366f1',
  },
  {
    id: 'hover-underline',
    name: 'Hover Underline',
    category: 'Hover',
    description: 'Animated underline from left to right',
    keyframes: '',
    animationCSS: 'position: relative;\n&::after {\n  content: "";\n  position: absolute;\n  bottom: -2px;\n  left: 0;\n  width: 100%;\n  height: 2px;\n  background: currentColor;\n  transform: scaleX(0);\n  transform-origin: left;\n  transition: transform 0.3s ease;\n}\n&:hover::after {\n  transform: scaleX(1);\n}',
    demoElement: 'text',
    color: '#14b8a6',
  },
  {
    id: 'hover-rotate',
    name: 'Hover Rotate',
    category: 'Hover',
    description: 'Gentle rotation on hover',
    keyframes: '',
    animationCSS: 'transition: transform 0.3s ease;\n&:hover { transform: rotate(5deg); }',
    demoElement: 'box',
    color: '#f59e0b',
  },

  // ── Background ──
  {
    id: 'gradient-shift',
    name: 'Gradient Shift',
    category: 'Background',
    description: 'Animated gradient background sweep',
    keyframes: `@keyframes gradientShift {\n  0% { background-position: 0% 50%; }\n  50% { background-position: 100% 50%; }\n  100% { background-position: 0% 50%; }\n}`,
    animationCSS: 'animation: gradientShift 3s ease infinite;\nbackground: linear-gradient(270deg, #6366f1, #ec4899, #f59e0b);\nbackground-size: 200% 200%;',
    demoElement: 'box',
    color: '#ec4899',
  },
  {
    id: 'marquee',
    name: 'Marquee',
    category: 'Background',
    description: 'Infinite horizontal scroll (ticker tape)',
    keyframes: `@keyframes marquee {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(-50%); }\n}`,
    animationCSS: 'animation: marquee 15s linear infinite;',
    demoElement: 'text',
    color: '#22c55e',
  },
  {
    id: 'floating',
    name: 'Floating',
    category: 'Background',
    description: 'Gentle floating up and down',
    keyframes: `@keyframes floating {\n  0%, 100% { transform: translateY(0px); }\n  50% { transform: translateY(-10px); }\n}`,
    animationCSS: 'animation: floating 3s ease-in-out infinite;',
    demoElement: 'circle',
    color: '#06b6d4',
  },
  {
    id: 'pulse-ring',
    name: 'Pulse Ring',
    category: 'Background',
    description: 'Expanding ring (sonar/radar effect)',
    keyframes: `@keyframes pulseRing {\n  0% {\n    transform: scale(0.8);\n    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);\n  }\n  70% {\n    transform: scale(1);\n    box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);\n  }\n  100% {\n    transform: scale(0.8);\n    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);\n  }\n}`,
    animationCSS: 'animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\nborder-radius: 50%;',
    demoElement: 'circle',
    color: '#3b82f6',
  },
];

/* ───────── Demo Element Component ───────── */

function DemoElement({ preset, playing }: { preset: AnimationPreset; playing: boolean }) {
  const baseStyle: React.CSSProperties = {
    borderRadius: preset.demoElement === 'circle' ? '50%' : preset.demoElement === 'badge' ? '12px' : '8px',
    backgroundColor: preset.color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: preset.demoElement === 'text' ? 'auto' : preset.demoElement === 'circle' ? '48px' : '100%',
    height: preset.demoElement === 'circle' ? '48px' : preset.demoElement === 'badge' ? '36px' : '80px',
    minWidth: preset.demoElement === 'circle' ? '48px' : undefined,
    padding: preset.demoElement === 'badge' ? '4px 16px' : preset.demoElement === 'text' ? '4px 0' : undefined,
    color: '#fff',
    fontWeight: 600,
    fontSize: preset.demoElement === 'badge' ? '14px' : preset.demoElement === 'text' ? '16px' : undefined,
    position: 'relative' as const,
    overflow: 'hidden',
  };

  switch (preset.demoElement) {
    case 'circle':
      return <div style={baseStyle} />;
    case 'badge':
      return <div style={baseStyle}>Badge</div>;
    case 'text':
      return <div style={baseStyle}>Hover me</div>;
    default:
      return <div style={baseStyle} />;
  }
}

/* ───────── CSS class mapping for animation playback ───────── */

// Map preset IDs to their Tailwind-style arbitrary animation classes
function animationClass(id: string): string {
  const map: Record<string, string> = {
    'fade-in': '[animation:fadeIn_0.6s_ease-out_infinite]',
    'slide-up': '[animation:slideUp_0.5s_ease-out_infinite]',
    'slide-down': '[animation:slideDown_0.5s_ease-out_infinite]',
    'slide-left': '[animation:slideLeft_0.5s_ease-out_infinite]',
    'slide-right': '[animation:slideRight_0.5s_ease-out_infinite]',
    'zoom-in': '[animation:zoomIn_0.4s_ease-out_infinite]',
    'flip-in': '[animation:flipIn_0.6s_ease-out_infinite]',
    'drop-in': '[animation:dropIn_0.7s_ease-in-out_infinite]',
    'pulse': '[animation:pulse_2s_ease-in-out_infinite]',
    'bounce': '[animation:bounce_1s_ease-in-out_infinite]',
    'shake': '[animation:shake_0.6s_ease-in-out_infinite]',
    'wiggle': '[animation:wiggle_0.4s_ease-in-out_infinite]',
    'glow': '[animation:glow_2s_ease-in-out_infinite]',
    'tada': '[animation:tada_1s_ease-in-out_infinite]',
    'jello': '[animation:jello_1s_ease-in-out_infinite]',
    'fade-out': '[animation:fadeOut_0.5s_ease-in_infinite]',
    'slide-out-up': '[animation:slideOutUp_0.4s_ease-in_infinite]',
    'slide-out-down': '[animation:slideOutDown_0.4s_ease-in_infinite]',
    'zoom-out': '[animation:zoomOut_0.4s_ease-in_infinite]',
    'spin': '[animation:spin_1s_linear_infinite]',
    'ping': '[animation:ping_1s_cubic-bezier(0,0,0.2,1)_infinite]',
    'pulse-dot': '[animation:pulseDot_1.4s_ease-in-out_infinite]',
    'skeleton': '[animation:skeleton_1.5s_ease-in-out_infinite]',
    'progress-bar': '[animation:progressBar_1.5s_ease-in-out_infinite]',
    'gradient-shift': '[animation:gradientShift_3s_ease_infinite]',
    'marquee': '[animation:marquee_15s_linear_infinite]',
    'floating': '[animation:floating_3s_ease-in-out_infinite]',
    'pulse-ring': '[animation:pulseRing_2s_ease-in-out_infinite]',
  };
  return map[id] || '';
}

/* ───────── Main Component ───────── */

export default function CSSAnimationGallery() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set(PRESETS.map((p) => p.id)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inject all keyframes into a single <style> tag on mount
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'css-animation-gallery-kfs';
    styleEl.textContent = PRESETS.map((p) => (p.keyframes ? p.keyframes : '')).join('\n');
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById('css-animation-gallery-kfs');
      if (el) el.remove();
    };
  }, []);

  const filtered = useMemo(() => {
    return PRESETS.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'All' || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  const togglePlay = useCallback((id: string) => {
    setPlayingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const playAll = useCallback(() => {
    setPlayingIds(new Set(PRESETS.map((p) => p.id)));
  }, []);

  const pauseAll = useCallback(() => {
    setPlayingIds(new Set());
  }, []);

  const copyCSS = useCallback((preset: AnimationPreset) => {
    const css = [preset.keyframes, preset.animationCSS].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(css).then(() => {
      setCopiedId(preset.id);
      toast.success('CSS copied!');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const categories = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, PRESETS.filter((p) => c === 'All' || p.category === c).length])),
    []
  );

  return (
    <ToolLayout
      title="CSS Animation Gallery"
      description="Curated collection of 30+ production-ready CSS animations. Preview, customize, and copy the code."
      controls={
        <>
          <button
            onClick={playAll}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Play className="w-4 h-4" /> Play All
          </button>
          <button
            onClick={pauseAll}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Pause className="w-4 h-4" /> Pause All
          </button>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search animations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm"
            />
          </div>
        </>
      }
    >
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === cat
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'bg-surface-light text-slate-400 hover:text-white hover:bg-surface-lighter'
            }`}
          >
            {cat}
            <span className="ml-1.5 opacity-60">{categories[cat]}</span>
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((preset) => {
          const isPlaying = playingIds.has(preset.id);
          const isExpanded = expandedId === preset.id;
          const isCopied = copiedId === preset.id;

          return (
            <div
              key={preset.id}
              className={`card group transition-all ${
                isExpanded ? 'ring-2 ring-brand-500/40' : ''
              }`}
            >
              {/* Preview Area */}
              <div
                className="h-32 rounded-t-lg flex items-center justify-center p-4 relative overflow-hidden"
                style={{ backgroundColor: preset.color + '15' }}
              >
                <div className={isPlaying ? animationClass(preset.id) : undefined}>
                  <DemoElement preset={preset} playing={isPlaying} />
                </div>

                {/* Play/Pause overlay */}
                <button
                  onClick={() => togglePlay(preset.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">{preset.name}</h3>
                  <span className="badge-secondary text-[10px]">{preset.category}</span>
                </div>
                <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                  {preset.description}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => copyCSS(preset)}
                    className="btn-secondary flex items-center gap-1.5 text-xs flex-1 justify-center"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied' : 'Copy CSS'}
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Code
                  </button>
                </div>

                {/* Expanded Code View */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <pre className="text-xs text-slate-300 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                      <code>
                        {preset.keyframes ? (
                          <>
                            <span className="text-slate-500">{'/* Keyframes */'}</span>
                            {'\n'}
                            {preset.keyframes}
                            {'\n\n'}
                          </>
                        ) : null}
                        <span className="text-slate-500">{'/* Apply */'}</span>
                        {'\n'}
                        {'.element {\n  '}
                        {preset.animationCSS.split('\n').join('\n  ')}
                        {'\n}'}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No animations match your search.</p>
          <button
            onClick={() => { setSearch(''); setCategory('All'); }}
            className="btn-secondary mt-4 text-sm"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-400" />
          {PRESETS.length} animations
        </span>
        <span>{CATEGORIES.filter((c) => c !== 'All').length} categories</span>
        <span>Zero external dependencies</span>
      </div>
    </ToolLayout>
  );
}

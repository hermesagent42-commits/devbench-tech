'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

type Position = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'center';

interface AnchorStyle {
  position: Position;
  offset: number;
  useAnchorFunc: boolean;
}

function generateAnchorCSS(style: AnchorStyle): string {
  const { position, offset, useAnchorFunc } = style;
  if (useAnchorFunc) {
    const posMap: Record<string, string> = {
      top: 'top: anchor(--tooltip-anchor bottom); left: anchor(--tooltip-anchor center);',
      'top-start': 'top: anchor(--tooltip-anchor bottom); left: anchor(--tooltip-anchor start);',
      'top-end': 'top: anchor(--tooltip-anchor bottom); right: anchor(--tooltip-anchor end);',
      bottom: 'top: anchor(--tooltip-anchor top); left: anchor(--tooltip-anchor center);',
      'bottom-start': 'top: anchor(--tooltip-anchor top); left: anchor(--tooltip-anchor start);',
      'bottom-end': 'top: anchor(--tooltip-anchor top); right: anchor(--tooltip-anchor end);',
      left: 'right: anchor(--tooltip-anchor left); top: anchor(--tooltip-anchor center);',
      right: 'left: anchor(--tooltip-anchor right); top: anchor(--tooltip-anchor center);',
      center: 'top: anchor(--tooltip-anchor center); left: anchor(--tooltip-anchor center);',
    };
    return `.tooltip {
  position: absolute;
  position-anchor: --tooltip-anchor;
  ${posMap[position]}
  margin: ${offset}px;
  /* Cross-browser Baseline 2026! Chrome 125+, Safari 26+, Firefox 147+ */
}`;
  }

  const areaMap: Record<string, string> = {
    top: 'block-start center',
    'top-start': 'block-start inline-start',
    'top-end': 'block-start inline-end',
    bottom: 'block-end center',
    'bottom-start': 'block-end inline-start',
    'bottom-end': 'block-end inline-end',
    left: 'center inline-start',
    right: 'center inline-end',
    center: 'center center',
  };

  return `.anchor {
  anchor-name: --tooltip-anchor;
}

.tooltip {
  position: absolute;
  position-anchor: --tooltip-anchor;
  position-area: ${areaMap[position]};
  margin: ${offset}px;
  /* position-area is the newer, simpler syntax */
  /* Cross-browser Baseline 2026! Chrome 125+, Safari 26+, Firefox 147+ */
}`;
}

export default function CssAnchorPlaygroundPage() {
  const [style, setStyle] = useState<AnchorStyle>({
    position: 'bottom',
    offset: 8,
    useAnchorFunc: false,
  });
  const [hasNativeSupport, setHasNativeSupport] = useState(false);
  const playgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect if CSS Anchor Positioning is supported
    setHasNativeSupport(CSS.supports('position-area', 'block-start center'));
  }, []);

  const generatedCSS = generateAnchorCSS(style);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [generatedCSS]);

  const positions: { value: Position; label: string; gridArea: string }[] = [
    { value: 'top-start', label: '↖', gridArea: 'a' },
    { value: 'top', label: '↑', gridArea: 'b' },
    { value: 'top-end', label: '↗', gridArea: 'c' },
    { value: 'left', label: '←', gridArea: 'd' },
    { value: 'center', label: '⊙', gridArea: 'e' },
    { value: 'right', label: '→', gridArea: 'f' },
    { value: 'bottom-start', label: '↙', gridArea: 'g' },
    { value: 'bottom', label: '↓', gridArea: 'h' },
    { value: 'bottom-end', label: '↘', gridArea: 'i' },
  ];

  // Calculate tooltip position via JS fallback
  const getTooltipStyle = (): React.CSSProperties => {
    const container = playgroundRef.current;
    if (!container) return {};

    if (hasNativeSupport) {
      // Use native CSS Anchor Positioning
      return {};
    }

    // JS fallback for positioning
    const pos = style.position;
    const offset = style.offset + 12; // Extra for anchor size

    const transformMap: Record<string, string> = {
      top: `translate(calc(-50% + 60px), calc(-100% - ${offset}px))`,
      'top-start': `translate(0, calc(-100% - ${offset}px))`,
      'top-end': `translate(calc(-100% + 120px), calc(-100% - ${offset}px))`,
      bottom: `translate(calc(-50% + 60px), ${offset}px)`,
      'bottom-start': `translate(0, ${offset}px)`,
      'bottom-end': `translate(calc(-100% + 120px), ${offset}px)`,
      left: `translate(calc(-100% - ${offset}px), calc(-50% + 18px))`,
      right: `translate(${offset}px, calc(-50% + 18px))`,
      center: `translate(calc(-50% + 60px), calc(-50% + 18px))`,
    };

    return { transform: transformMap[pos] };
  };

  return (
    <ToolLayout
      title="CSS Anchor Positioning Playground"
      description="Interactive playground for the new CSS Anchor Positioning API — cross-browser Baseline in 2026. Position tooltips and popovers relative to any element without JavaScript."
    >
      {/* Support notice */}
      {!hasNativeSupport && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <strong>JS Fallback Active:</strong> Your browser doesn&apos;t support CSS Anchor Positioning yet.
          Try Chrome 125+, Safari 26+, or Firefox 147+ for the native experience.
          The generated CSS still works in supported browsers.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Playground */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-3 block">Visual Preview</label>

          {/* Outer container with padding for overflow visibility */}
          <div
            ref={playgroundRef}
            className="relative w-full h-[320px] rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden flex items-center justify-center"
          >
            {/* Anchor Element */}
            <div className="relative">
              <div
                className="w-[120px] h-[36px] rounded-lg bg-brand-500 text-white font-medium text-sm flex items-center justify-center cursor-pointer hover:bg-brand-400 transition-colors select-none"
                style={hasNativeSupport ? { anchorName: '--tooltip-anchor' as any } : {}}
              >
                Anchor Element
              </div>

              {/* Tooltip */}
              <div
                className={`absolute z-10 w-[120px] py-2 px-3 rounded-lg bg-slate-900 text-slate-200 text-xs font-medium border border-slate-600 shadow-xl pointer-events-none text-center transition-all duration-200 ${
                  hasNativeSupport ? 'native-anchor' : 'js-anchor'
                }`}
                style={
                  hasNativeSupport
                    ? {
                        positionAnchor: '--tooltip-anchor' as any,
                        positionArea: (() => {
                          const map: Record<string, string> = {
                            top: 'block-start center',
                            'top-start': 'block-start inline-start',
                            'top-end': 'block-start inline-end',
                            bottom: 'block-end center',
                            'bottom-start': 'block-end inline-start',
                            'bottom-end': 'block-end inline-end',
                            left: 'center inline-start',
                            right: 'center inline-end',
                            center: 'center center',
                          };
                          return map[style.position];
                        })(),
                        margin: `${style.offset}px`,
                      }
                    : getTooltipStyle()
                }
              >
                Tooltip / Popover
                <div
                  className={`absolute w-2 h-2 bg-slate-900 border border-slate-600 rotate-45 ${
                    style.position.startsWith('top') ? '-bottom-1' :
                    style.position.startsWith('bottom') ? '-top-1' :
                    style.position === 'left' ? '-right-1' :
                    style.position === 'right' ? '-left-1' :
                    'hidden'
                  }`}
                  style={
                    style.position.startsWith('top') ? { borderTop: 'none', borderLeft: 'none', left: '50%', transform: 'translateX(-50%) rotate(45deg)' } :
                    style.position.startsWith('bottom') ? { borderBottom: 'none', borderRight: 'none', left: '50%', transform: 'translateX(-50%) rotate(45deg)' } :
                    style.position === 'left' ? { borderLeft: 'none', borderBottom: 'none', top: '50%', transform: 'translateY(-50%) rotate(45deg)' } :
                    style.position === 'right' ? { borderRight: 'none', borderTop: 'none', top: '50%', transform: 'translateY(-50%) rotate(45deg)' } :
                    {}
                  }
                />
              </div>
            </div>

            {/* Grid lines for visual reference */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-slate-700/40" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-slate-700/40" />
            </div>
          </div>

          {/* 3x3 Position Grid */}
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-300 mb-2 block">Position (3×3 Grid via position-area)</label>
            <div className="grid grid-cols-3 gap-1">
              {positions.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => setStyle((s) => ({ ...s, position: pos.value }))}
                  className={`py-2 text-sm font-mono rounded-md transition-all ${
                    style.position === pos.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-surface-light text-slate-400 hover:text-slate-200 hover:bg-surface-lighter'
                  }`}
                  title={pos.value}
                >
                  {pos.label} {pos.value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controls + CSS */}
        <div className="flex flex-col gap-6">
          {/* Mode Toggle */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Positioning Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStyle((s) => ({ ...s, useAnchorFunc: false }))}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  !style.useAnchorFunc
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200'
                }`}
              >
                position-area (new)
              </button>
              <button
                onClick={() => setStyle((s) => ({ ...s, useAnchorFunc: true }))}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  style.useAnchorFunc
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200'
                }`}
              >
                anchor() function
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {!style.useAnchorFunc
                ? 'position-area uses natural-language grid positioning (recommended)'
                : 'anchor() function for precise numeric placement'}
            </p>
          </div>

          {/* Offset Slider */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <GripHorizontal className="w-4 h-4" />
              Margin Offset: {style.offset}px
            </label>
            <input
              type="range"
              min="0"
              max="32"
              value={style.offset}
              onChange={(e) => setStyle((s) => ({ ...s, offset: Number(e.target.value) }))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0px</span>
              <span>32px</span>
            </div>
          </div>

          {/* Generated CSS */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Generated CSS</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyle({ position: 'bottom', offset: 8, useAnchorFunc: false })}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={copyCSS}
                  className="btn-secondary flex items-center gap-1 text-xs py-1 px-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
            <pre className="card bg-slate-950 border-slate-700/50 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[280px] overflow-y-auto">
              {generatedCSS}
            </pre>
          </div>

          {/* Quick Info */}
          <div className="card border-brand-500/20 bg-brand-500/5">
            <h3 className="text-sm font-semibold text-brand-400 mb-2">🎉 Baseline 2026</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              CSS Anchor Positioning is now cross-browser Baseline! Chrome 125+, Safari 26+, and
              Firefox 147+ all support it. No more JavaScript for tooltip positioning — the browser
              handles it natively, with proper scroll handling and viewport awareness.
            </p>
          </div>
        </div>
      </div>

      {/* Additional native anchor positioning styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @supports (position-area: block-start center) {
            .native-anchor {
              /* Native CSS Anchor Positioning — the browser handles everything */
            }
          }
          .js-anchor {
            /* JS-powered fallback */
            top: 50%;
            left: 50%;
          }
        `,
        }}
      />
    </ToolLayout>
  );
}

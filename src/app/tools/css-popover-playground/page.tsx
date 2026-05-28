'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Play, Eye, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

type PopoverType = 'auto' | 'manual';
type PopoverPreset = 'tooltip' | 'menu' | 'dialog' | 'notification' | 'drawer' | 'custom';

interface PresetConfig {
  name: string;
  description: string;
  popoverType: PopoverType;
  triggerLabel: string;
  popoverContent: string;
  popoverStyles: string;
  backdropStyles: string;
  position: string;
}

interface PopoverConfig {
  preset: PopoverPreset;
  popoverType: PopoverType;
  triggerLabel: string;
  popoverContent: string;
  popoverStyles: string;
  backdropStyles: string;
  position: string;
}

const PRESETS: Record<PopoverPreset, PresetConfig> = {
  tooltip: {
    name: 'Tooltip',
    description: 'Hover or click to reveal contextual info',
    popoverType: 'auto',
    triggerLabel: 'ℹ️ Hover me',
    popoverContent: 'This is a tooltip with helpful info!',
    popoverStyles:
      'padding: 8px 14px;\nfont-size: 13px;\ncolor: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 8px;\nbox-shadow: 0 4px 12px rgba(0,0,0,0.4);\nmax-width: 240px;',
    backdropStyles: '/* no backdrop for tooltips */',
    position: 'top: anchor(bottom);\nleft: anchor(center);',
  },
  menu: {
    name: 'Dropdown Menu',
    description: 'Click to reveal a list of actions',
    popoverType: 'auto',
    triggerLabel: '☰ Menu',
    popoverContent:
      '<div class="menu-item">📄 New File</div>\n<div class="menu-item">📁 Open...</div>\n<div class="menu-item">💾 Save</div>\n<div class="menu-item separator"></div>\n<div class="menu-item danger">🗑 Delete</div>',
    popoverStyles:
      'padding: 4px 0;\ncolor: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 10px;\nbox-shadow: 0 8px 24px rgba(0,0,0,0.5);\nmin-width: 180px;',
    backdropStyles:
      '.menu-item {\n  padding: 8px 16px;\n  cursor: pointer;\n  font-size: 13px;\n  transition: background 0.15s;\n}\n.menu-item:hover {\n  background: #334155;\n}\n.menu-item.separator {\n  height: 1px;\n  background: #475569;\n  margin: 4px 8px;\n  padding: 0;\n}\n.menu-item.danger {\n  color: #f87171;\n}',
    position: 'top: anchor(bottom);\nleft: anchor(start);',
  },
  dialog: {
    name: 'Modal Dialog',
    description: 'Confirmation dialogs and alerts',
    popoverType: 'manual',
    triggerLabel: '🗑 Delete Item',
    popoverContent:
      '<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;">Confirm Delete</h3>\n<p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Are you sure? This action cannot be undone.</p>\n<div style="display:flex;gap:8px;justify-content:flex-end;">\n  <button class="cancel-btn" popovertarget="css-popover-demo" popoveraction="hide">Cancel</button>\n  <button style="background:#ef4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">Delete</button>\n</div>',
    popoverStyles:
      'padding: 20px;\ncolor: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 12px;\nbox-shadow: 0 16px 48px rgba(0,0,0,0.6);\nmax-width: 360px;\nwidth: 90vw;',
    backdropStyles:
      '.cancel-btn {\n  background: #334155;\n  color: #e2e8f0;\n  border: 1px solid #475569;\n  padding: 6px 14px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-size: 13px;\n}',
    position: '',
  },
  notification: {
    name: 'Toast Notification',
    description: 'Slide-in notification banners',
    popoverType: 'auto',
    triggerLabel: '🔔 Show Notification',
    popoverContent: '✅ File saved successfully!',
    popoverStyles:
      'padding: 12px 20px;\nfont-size: 14px;\ncolor: #fff;\nbackground: #059669;\nborder: none;\nborder-radius: 8px;\nbox-shadow: 0 4px 16px rgba(5,150,105,0.4);\nmax-width: 320px;',
    backdropStyles: '/* no backdrop for toasts */',
    position: 'top: anchor(bottom);\nleft: anchor(center);',
  },
  drawer: {
    name: 'Slide-Out Drawer',
    description: 'Side panel that slides in from the right',
    popoverType: 'manual',
    triggerLabel: '☰ Open Drawer',
    popoverContent:
      '<h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">Navigation</h3>\n<nav style="display:flex;flex-direction:column;gap:4px;">\n  <a href="#" style="color:#38bdf8;text-decoration:none;padding:6px 8px;border-radius:6px;">🏠 Home</a>\n  <a href="#" style="color:#e2e8f0;text-decoration:none;padding:6px 8px;border-radius:6px;">📦 Products</a>\n  <a href="#" style="color:#e2e8f0;text-decoration:none;padding:6px 8px;border-radius:6px;">📝 Blog</a>\n  <a href="#" style="color:#e2e8f0;text-decoration:none;padding:6px 8px;border-radius:6px;">✉️ Contact</a>\n</nav>\n<button style="margin-top:16px;background:#334155;color:#e2e8f0;border:1px solid #475569;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;width:100%;" popovertarget="css-popover-demo" popoveraction="hide">Close</button>',
    popoverStyles:
      'padding: 20px;\ncolor: #e2e8f0;\nbackground: #0f172a;\nborder-left: 1px solid #334155;\nborder-radius: 0;\nbox-shadow: -4px 0 24px rgba(0,0,0,0.5);\nwidth: 280px;\nheight: 100vh;\nmargin: 0;',
    backdropStyles:
      'a:hover {\n  background: #1e293b;\n}',
    position: '',
  },
  custom: {
    name: 'Custom',
    description: 'Build your own popover from scratch',
    popoverType: 'auto',
    triggerLabel: 'Click me',
    popoverContent: 'Your custom popover content!',
    popoverStyles:
      'padding: 16px;\ncolor: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 10px;\nbox-shadow: 0 8px 24px rgba(0,0,0,0.4);',
    backdropStyles: '',
    position: '',
  },
};

function generateHTML(config: PopoverConfig): string {
  const hasBackdropStyles = config.backdropStyles.trim() && config.backdropStyles.trim() !== '/* no backdrop for tooltips */' && config.backdropStyles.trim() !== '/* no backdrop for toasts */';
  const hasPositionStyles = config.position.trim();

  return `<!-- Trigger button -->
<button popovertarget="my-popover"${config.popoverType === 'manual' ? '' : ''}>
  ${config.triggerLabel}
</button>

<!-- Popover element -->
<div id="my-popover" popover${config.popoverType === 'manual' ? '="manual"' : ''}>
  ${config.popoverContent.replace(/\n/g, '\n  ')}
</div>

<style>
#my-popover {
  ${config.popoverStyles.replace(/\n/g, '\n  ')}
${hasPositionStyles ? `  /* Anchor positioning */\n  ${config.position.replace(/\n/g, '\n  ')}` : ''}
}

/* Backdrop styling */
#my-popover::backdrop {
${hasBackdropStyles ? `  background: rgba(0, 0, 0, 0.4);\n  backdrop-filter: blur(2px);` : `  /* Transparent: popover auto-dismisses on outside click */`}
}

${hasBackdropStyles ? config.backdropStyles : '/* No additional styles needed */'}
</style>`;
}

export default function CssPopoverPlaygroundPage() {
  const [config, setConfig] = useState<PopoverConfig>({
    preset: 'tooltip',
    ...PRESETS.tooltip,
  });
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [hasPopoverSupport, setHasPopoverSupport] = useState(false);
  const [hasAnchorSupport, setHasAnchorSupport] = useState(false);

  useEffect(() => {
    setHasPopoverSupport(
      typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype
    );
    setHasAnchorSupport(CSS.supports('position-area', 'block-start center'));
  }, []);

  const handlePresetChange = useCallback((preset: PopoverPreset) => {
    setConfig({
      preset,
      popoverType: PRESETS[preset].popoverType,
      triggerLabel: PRESETS[preset].triggerLabel,
      popoverContent: PRESETS[preset].popoverContent,
      popoverStyles: PRESETS[preset].popoverStyles,
      backdropStyles: PRESETS[preset].backdropStyles,
      position: PRESETS[preset].position,
    });
  }, []);

  const handleReset = useCallback(() => {
    handlePresetChange(config.preset);
  }, [config.preset, handlePresetChange]);

  const generatedHTML = generateHTML(config);
  const generatedPopoverStyles = config.popoverStyles + (config.position.trim() ? '\n/* Anchor positioning */\n' + config.position : '');
  const hasContentBackdrop =
    config.backdropStyles.trim() &&
    config.backdropStyles.trim() !== '/* no backdrop for tooltips */' &&
    config.backdropStyles.trim() !== '/* no backdrop for toasts */';

  const handleCopyHTML = useCallback(async () => {
    await navigator.clipboard.writeText(generatedHTML);
    toast.success('HTML + CSS copied!');
  }, [generatedHTML]);

  const handleCopyCSS = useCallback(async () => {
    const backdropCSS = hasContentBackdrop
      ? `\n\n#my-popover::backdrop {\n  background: rgba(0, 0, 0, 0.4);\n  backdrop-filter: blur(2px);\n}\n\n${config.backdropStyles}`
      : '\n\n#my-popover::backdrop {\n  /* Transparent: auto-dismiss on outside click */\n}';
    await navigator.clipboard.writeText(`#my-popover {\n  ${generatedPopoverStyles.replace(/\n/g, '\n  ')}\n}${backdropCSS}`);
    toast.success('CSS copied!');
  }, [generatedPopoverStyles, hasContentBackdrop, config.backdropStyles]);

  const handleTogglePopover = useCallback(() => {
    const popover = document.getElementById('css-popover-demo') as HTMLElement | null;
    if (popover) {
      if (popover.matches(':popover-open')) {
        (popover as any).hidePopover?.();
      } else {
        (popover as any).showPopover?.();
      }
    }
  }, []);

  return (
    <ToolLayout
      title="CSS Popover API Playground"
      description="Build interactive popovers with zero JavaScript — the new Baseline 2026 API. Tooltips, menus, dialogs, and more with just HTML attributes and CSS."
    >
      {/* Support banner */}
      {!hasPopoverSupport && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          ⚠️ Your browser does not support the Popover API yet. The preview below uses a polyfill fallback. For native support, use Chrome 114+, Edge 114+, or Safari 17+.
        </div>
      )}
      {hasPopoverSupport && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Native Popover API detected! All features are fully supported in your browser.
          {hasAnchorSupport && ' CSS Anchor Positioning also available.'}
        </div>
      )}

      {/* Preset selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Preset</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as PopoverPreset[]).map((key) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                config.preset === key
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'bg-surface-light text-slate-300 border border-slate-700/50 hover:border-brand-500/30'
              }`}
            >
              {PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Config panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Controls */}
        <div className="space-y-5">
          {/* Popover type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Popover Type
            </label>
            <div className="flex gap-2">
              {(['auto', 'manual'] as PopoverType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig((c) => ({ ...c, popoverType: type }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    config.popoverType === type
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-light text-slate-300 border border-slate-700/50 hover:border-brand-500/30'
                  }`}
                >
                  {type === 'auto' ? '🚫 Auto (light-dismiss)' : '🔒 Manual'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {config.popoverType === 'auto'
                ? 'Auto: closes on outside click, ESC, or other popover open. Best for tooltips, menus.'
                : 'Manual: must be closed programmatically. Best for dialogs, drawers.'}
            </p>
          </div>

          {/* Trigger label */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Trigger Button Label
            </label>
            <input
              type="text"
              value={config.triggerLabel}
              onChange={(e) =>
                setConfig((c) => ({ ...c, triggerLabel: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Popover content */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Popover Content <span className="text-slate-500">(HTML)</span>
            </label>
            <textarea
              value={config.popoverContent}
              onChange={(e) =>
                setConfig((c) => ({ ...c, popoverContent: e.target.value }))
              }
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50 resize-y"
            />
          </div>

          {/* Popover styles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Popover Styles <span className="text-slate-500">(CSS properties)</span>
            </label>
            <textarea
              value={config.popoverStyles}
              onChange={(e) =>
                setConfig((c) => ({ ...c, popoverStyles: e.target.value }))
              }
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50 resize-y"
            />
          </div>

          {/* Backdrop styles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              ::backdrop Styles <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={config.backdropStyles}
              onChange={(e) =>
                setConfig((c) => ({ ...c, backdropStyles: e.target.value }))
              }
              rows={4}
              placeholder="/* Additional styles for ::backdrop children */"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50 resize-y"
            />
            {!config.backdropStyles.trim() && (
              <p className="text-xs text-slate-500 mt-1">
                Leave empty for transparent backdrop (auto-dismiss still works).
              </p>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Live Preview</label>
            <div className="flex gap-1">
              <button
                onClick={() => setTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  tab === 'preview'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={() => setTab('code')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  tab === 'code'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> Code
              </button>
            </div>
          </div>

          {tab === 'preview' ? (
            <div
              ref={previewRef}
              className="relative rounded-xl border border-slate-700/50 bg-surface min-h-[420px] flex items-center justify-center overflow-hidden"
            >
              {/* Preview area */}
              <div style={{ position: 'relative' }}>
                <button
                  popoverTarget="css-popover-demo"
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                >
                  {config.triggerLabel}
                </button>

                <div
                  id="css-popover-demo"
                  ref={popoverRef}
                  popover={config.popoverType === 'manual' ? 'manual' : undefined}
                  style={{
                    // @ts-ignore - CSS custom properties for popover styling
                    ...Object.fromEntries(
                      config.popoverStyles.split('\n').filter(Boolean).map((line) => {
                        const [prop, ...val] = line.replace(/;$/, '').split(':');
                        return [prop.trim(), val.join(':').trim()];
                      }).filter(([key]) => key && key !== '/* no backdrop for tooltips */' && key !== '/* no backdrop for toasts */')
                    ),
                  }}
                  className="popover-demo-element"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: config.popoverContent.replace(/\\n/g, '\n') }}
                  />
                </div>
              </div>

              {/* Inline styles for the preview */}
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    [popover] {
                      margin: 0;
                    }
                    [popover]:popover-open {
                      display: block;
                    }
                    .popover-demo-element {
                      ${config.popoverStyles}
                    }
                    .popover-demo-element::backdrop {
                      ${hasContentBackdrop ? 'background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);' : 'background: transparent;'}
                    }
                    ${hasContentBackdrop ? config.backdropStyles : ''}
                    ${config.position ? `.popover-demo-element {\n  ${config.position}\n}` : ''}
                  `,
                }}
              />

              {/* Manual popover toggle button */}
              {config.popoverType === 'manual' && hasPopoverSupport && (
                <div className="absolute top-3 right-3">
                  <button
                    onClick={handleTogglePopover}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-light border border-slate-600 text-slate-300 hover:border-brand-500/40 transition-all"
                  >
                    Toggle Popover
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700/50 bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 bg-surface-light">
                <span className="text-xs font-medium text-slate-400">
                  Generated HTML + CSS
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCSS}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface border border-slate-600 text-slate-300 hover:border-brand-500/40 transition-all"
                  >
                    Copy CSS
                  </button>
                  <button
                    onClick={handleCopyHTML}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-all flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy All
                  </button>
                </div>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto whitespace-pre-wrap">
                {generatedHTML}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-light border border-slate-700/50 text-slate-300 hover:border-brand-500/30 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Reset Preset
            </button>
            <button
              onClick={handleCopyHTML}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-all flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" /> Copy Full Output
            </button>
          </div>
        </div>
      </div>

      {/* API Reference section */}
      <div className="rounded-xl border border-slate-700/50 bg-surface-light p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Popover API Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-brand-400">HTML Attributes</h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">popover</code> — Makes element a popover</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">popover=&quot;auto&quot;</code> — Light-dismiss (default)</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">popover=&quot;manual&quot;</code> — Programmatic only</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">popovertarget=&quot;id&quot;</code> — Button opens popover</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">popoveraction=&quot;hide|show|toggle&quot;</code> — Control action</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-brand-400">CSS Pseudo-Classes</h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">:popover-open</code> — When visible</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">::backdrop</code> — Overlay behind popover</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">:open</code> — Universal (details, dialog, popover)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-brand-400">JavaScript API</h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">element.showPopover()</code></li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">element.hidePopover()</code></li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">element.togglePopover()</code></li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">beforetoggle</code> event</li>
              <li><code className="text-slate-300 bg-surface px-1.5 py-0.5 rounded">toggle</code> event</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">Baseline 2026</strong> — Supported in Chrome 114+, Edge 114+, Safari 17+, Firefox 125+. No more JavaScript for tooltips, menus, or toasts!
            {' '}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Popover_API"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline"
            >
              MDN Reference →
            </a>
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

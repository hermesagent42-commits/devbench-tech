'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Code2,
  Copy,
  Check,
  Bookmark,
  Play,
  Trash2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── Presets ───────── */

interface BookmarkletPreset {
  id: string;
  name: string;
  description: string;
  icon: typeof Code2;
  code: string;
}

const PRESETS: BookmarkletPreset[] = [
  {
    id: 'dark-mode',
    name: 'Dark Mode Toggle',
    description: 'Toggle dark mode on any website',
    icon: Code2,
    code: `const s=document.documentElement.style;if(!s.getAttribute('data-bm-dark')){document.querySelectorAll('*').forEach(e=>{e.style.backgroundColor='#1a1a2e';e.style.color='#e0e0e0';e.style.borderColor='#333'});s.setAttribute('data-bm-dark','1')}else{s.removeAttribute('data-bm-dark');document.querySelectorAll('*').forEach(e=>{e.style.backgroundColor='';e.style.color='';e.style.borderColor=''})}`,
  },
  {
    id: 'outline-elements',
    name: 'Outline All Elements',
    description: 'Add colored outlines to every element',
    icon: Code2,
    code: `document.querySelectorAll('*').forEach((e,i)=>{e.style.outline='1px solid hsl('+(i*137.508)%360+',70%,60%)'});alert('Outlines added! Refresh to remove.')`,
  },
  {
    id: 'kill-sticky',
    name: 'Kill Sticky Elements',
    description: 'Remove all position:fixed/sticky elements',
    icon: Code2,
    code: `document.querySelectorAll('*').forEach(e=>{const s=getComputedStyle(e);if(s.position==='fixed'||s.position==='sticky'){e.remove()}});alert('Sticky elements removed!')`,
  },
  {
    id: 'show-passwords',
    name: 'Show Hidden Passwords',
    description: 'Reveal all masked password fields',
    icon: Code2,
    code: `document.querySelectorAll('input[type="password"]').forEach(i=>{i.type='text'});alert('Passwords revealed!')`,
  },
  {
    id: 'edit-page',
    name: 'Edit Page Content',
    description: 'Toggle designMode to edit any page',
    icon: Code2,
    code: `document.designMode=document.designMode==='on'?'off':'on';alert('Design mode: '+document.designMode)`,
  },
  {
    id: 'view-source-links',
    name: 'View All Links',
    description: 'Show all links on the page with URLs',
    icon: Code2,
    code: `const l=document.querySelectorAll('a[href]');const w=window.open('','','width=800,height=600');w.document.write('<h2>All Links ('+l.length+')</h2><ul>'+Array.from(l).map(a=>'<li><a href=\"'+a.href+'\" target=\"_blank\">'+(a.textContent.trim()||a.href)+'</a> <small>→ '+a.href+'</small></li>').join('')+'</ul>')`,
  },
  {
    id: 'remove-images',
    name: 'Remove All Images',
    description: 'Strip all images and videos from the page',
    icon: Code2,
    code: `document.querySelectorAll('img,picture,video,svg').forEach(e=>e.remove());alert('Images removed!')`,
  },
  {
    id: 'color-picker',
    name: 'Color Eyedropper',
    description: 'Pick colors from any element on the page',
    icon: Code2,
    code: `if(window._bmColorPick){document.removeEventListener('click',window._bmColorPick,true);delete window._bmColorPick;alert('Color picker disabled')}else{window._bmColorPick=(e)=>{e.preventDefault();e.stopPropagation();const c=getComputedStyle(e.target).backgroundColor;navigator.clipboard.writeText(c);alert('Color copied: '+c)};document.addEventListener('click',window._bmColorPick,true);alert('Click any element to copy its background color. Click bookmarklet again to stop.')}`,
  },
  {
    id: 'qr-current',
    name: 'QR Code for Current Page',
    description: 'Generate a QR code for the current URL',
    icon: Code2,
    code: `const u=encodeURIComponent(location.href);const w=window.open('','','width=400,height=450');w.document.write('<div style=\"text-align:center;padding:20px;font-family:system-ui\"><h2>QR Code</h2><img src=\"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+u+'\" alt=\"QR\"><p style=\"margin-top:15px;word-break:break-all\">'+location.href+'</p></div>')`,
  },
  {
    id: 'sort-tables',
    name: 'Make Tables Sortable',
    description: 'Click table headers to sort any table',
    icon: Code2,
    code: `document.querySelectorAll('table').forEach(t=>{t.querySelectorAll('th').forEach((th,c)=>{th.style.cursor='pointer';th.title='Click to sort';th.onclick=()=>{const r=Array.from(t.querySelectorAll('tbody tr'));const asc=th.getAttribute('data-sort')!=='asc';th.setAttribute('data-sort',asc?'asc':'desc');r.sort((a,b)=>{const va=a.cells[c]?.textContent?.trim()||'';const vb=b.cells[c]?.textContent?.trim()||'';const na=parseFloat(va),nb=parseFloat(vb);if(!isNaN(na)&&!isNaN(nb))return asc?na-nb:nb-na;return asc?va.localeCompare(vb):vb.localeCompare(va)});const tb=t.querySelector('tbody');r.forEach(tr=>tb?.appendChild(tr));t.querySelectorAll('th').forEach(h=>{if(h!==th)h.removeAttribute('data-sort')})}})}})`,
  },
  {
    id: 'console-inject',
    name: 'Inject Dev Utilities',
    description: 'Add $q, $log, $debounce helpers to console',
    icon: Code2,
    code: `window.$q=(s,d=document)=>Array.from(d.querySelectorAll(s));window.$log=(...a)=>{console.log(...a);return a[a.length-1]};window.$debounce=(f,d)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),d)}};alert('Dev helpers added! Try $q("*"), $log(), $debounce() in console.')`,
  },
];

/* ───────── Helpers ───────── */

function minifyJS(code: string): string {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([;,+\-*/%<>=!&|?:{}()[\]])\s*/g, '$1')
    .replace(/;\s*}/g, '}')
    .trim();
}

function buildBookmarklet(code: string): string {
  const minified = minifyJS(code);
  const wrapped = `(function(){${minified}})();`;
  return 'javascript:' + encodeURIComponent(wrapped);
}

/* ───────── Component ───────── */

export default function BookmarkletBuilderPage() {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'presets'>('editor');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const bookmarklet = useMemo(() => {
    if (!code.trim()) return '';
    return buildBookmarklet(code);
  }, [code]);

  const bookmarkletPreview = useMemo(() => {
    if (!bookmarklet) return '';
    return bookmarklet.length > 120
      ? bookmarklet.substring(0, 120) + '...'
      : bookmarklet;
  }, [bookmarklet]);

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [code]);

  const handleCopyBookmarklet = useCallback(async () => {
    if (!bookmarklet) return;
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopiedBookmarklet(true);
      toast.success('Bookmarklet URL copied!');
      setTimeout(() => setCopiedBookmarklet(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [bookmarklet]);

  const handlePresetSelect = useCallback((preset: BookmarkletPreset) => {
    setCode(preset.code);
    setSelectedPreset(preset.id);
    setActiveTab('editor');
    toast.success(`Loaded: ${preset.name}`);
  }, []);

  const handleClear = useCallback(() => {
    setCode('');
    setSelectedPreset(null);
  }, []);

  const handleMinify = useCallback(() => {
    if (!code) return;
    const minified = minifyJS(code);
    setCode(minified);
    toast.success('Code minified!');
  }, [code]);

  const lineCount = code.split(/\n/).filter(l => l.trim()).length;

  return (
    <ToolLayout
      title="Bookmarklet Builder"
      description="Write JavaScript and instantly convert it into a bookmarklet — drag to your bookmarks bar or copy the URL. Includes useful presets."
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-surface-light border border-slate-700/50">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'editor'
              ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Editor
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'presets'
              ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Presets ({PRESETS.length})
        </button>
      </div>

      {/* Presets Grid */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`text-left p-4 rounded-xl border transition-all group ${
                  isSelected
                    ? 'border-brand-500/40 bg-brand-500/5'
                    : 'border-slate-700/50 bg-surface hover:border-slate-600/50 hover:bg-surface-light'
                }`}
              >
                <h3 className={`text-sm font-semibold mb-1 ${
                  isSelected ? 'text-brand-300' : 'text-white'
                }`}>
                  {preset.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor */}
      {activeTab === 'editor' && (
        <>
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white font-semibold text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                JavaScript Code
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMinify}
                  disabled={!code.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Minify
                </button>
                <button
                  onClick={handleClear}
                  disabled={!code.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (selectedPreset) setSelectedPreset(null);
                }}
                placeholder={`// Write your bookmarklet code here...\n// Examples:\n//   alert('Hello from bookmarklet!')\n//   document.querySelectorAll('img').forEach(i => i.style.border = '5px solid red')\n//   window.open('https://example.com?url=' + encodeURIComponent(location.href))`}
                className="input-field w-full min-h-[280px] font-mono text-sm resize-y"
                spellCheck={false}
              />
              {code.trim() && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={handleCopyCode}
                    className={`p-1.5 rounded transition-all ${
                      copied
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>{lineCount} lines</span>
              <span>·</span>
              <span>{code.length} characters</span>
              <span>·</span>
              <span>Code runs in the context of the page you&apos;re visiting</span>
            </div>
          </div>

          {/* Bookmarklet output */}
          {bookmarklet && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-brand-400" />
                  Your Bookmarklet
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  {bookmarklet.length.toLocaleString()} chars
                </span>
              </div>

              {/* Drag-and-drop button */}
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/15">
                <p className="text-xs text-slate-400 mb-3">
                  Drag this button to your bookmarks bar, or copy the URL below:
                </p>
                <a
                  href={bookmarklet}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20 cursor-grab active:cursor-grabbing select-none no-underline"
                  onClick={(e) => e.preventDefault()}
                  draggable={false}
                >
                  <Play className="w-4 h-4" />
                  Run Bookmarklet
                </a>
              </div>

              {/* URL display & copy */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    readOnly
                    value={bookmarkletPreview}
                    className="input-field w-full font-mono text-xs text-slate-400 pr-10"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <button
                  onClick={handleCopyBookmarklet}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    copiedBookmarklet
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20'
                  }`}
                >
                  {copiedBookmarklet ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* How-to */}
      <div className="mt-8 card border-dashed border-slate-700/50">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          How to use bookmarklets
        </h3>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs flex items-center justify-center font-bold mt-0.5">1</span>
            <span>Write or select a preset JavaScript snippet — it runs in the context of any page you visit.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs flex items-center justify-center font-bold mt-0.5">2</span>
            <span>Drag the <strong className="text-slate-300">Run Bookmarklet</strong> button to your browser&apos;s bookmarks bar.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs flex items-center justify-center font-bold mt-0.5">3</span>
            <span>Visit any website and click the bookmarklet — your code executes immediately.</span>
          </li>
        </ol>
        <p className="mt-4 p-3 rounded-lg bg-slate-700/20 border border-slate-700/30 text-xs text-slate-500">
          <strong className="text-slate-400">Tip:</strong> Bookmarklets have full DOM and JavaScript access. Great for quick hacks, testing, and automation. All code runs entirely in your browser — no data is sent anywhere.
        </p>
      </div>
    </ToolLayout>
  );
}

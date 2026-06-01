'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Palette, SlidersHorizontal, Sun, Droplets, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';

interface OKLCH { l: number; c: number; h: number; }
interface RGB { r: number; g: number; b: number; }

function srgbTransfer(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}
function srgbTransferInv(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function oklabToLinearSrgb(l: number, a: number, b: number): [number, number, number] {
  const ll = l + 0.3963377774 * a + 0.2158037573 * b;
  const mm = l - 0.1055613458 * a - 0.0638541728 * b;
  const ss = l - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = ll * ll * ll, m3 = mm * mm * mm, s3 = ss * ss * ss;
  return [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ];
}

function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(l_), m = Math.cbrt(m_), s = Math.cbrt(s_);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklchToRgb(l: number, c: number, h: number): RGB | null {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad), b = c * Math.sin(hRad);
  const [lr, lg, lb] = oklabToLinearSrgb(l, a, b);
  return {
    r: Math.round(srgbTransfer(Math.max(0, Math.min(1, lr))) * 255),
    g: Math.round(srgbTransfer(Math.max(0, Math.min(1, lg))) * 255),
    b: Math.round(srgbTransfer(Math.max(0, Math.min(1, lb))) * 255),
  };
}

function rgbToOklch(rgb: RGB): OKLCH {
  const r = srgbTransferInv(rgb.r / 255), g = srgbTransferInv(rgb.g / 255), b = srgbTransferInv(rgb.b / 255);
  const [L, a, b2] = linearSrgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: Math.max(0, Math.min(1, L)), c: C, h: Math.round(H * 100) / 100 };
}

function rgbToHex(rgb: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return '#' + [clamp(rgb.r), clamp(rgb.g), clamp(rgb.b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return { r: parseInt(clean.substring(0,2),16), g: parseInt(clean.substring(2,4),16), b: parseInt(clean.substring(4,6),16) };
}

function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r/255, g = rgb.g/255, b = rgb.b/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const l = (max+min)/2;
  let h = 0, s = 0;
  if (max!==min) {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    if (max===r) h = ((g-b)/d+(g<b?6:0))/6;
    else if (max===g) h = ((b-r)/d+2)/6;
    else h = ((r-g)/d+4)/6;
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
}

function isInSrgbGamut(l: number, c: number, h: number): boolean {
  const hRad = (h*Math.PI)/180;
  const a = c*Math.cos(hRad), b = c*Math.sin(hRad);
  const [lr,lg,lb] = oklabToLinearSrgb(l,a,b);
  return lr>=-0.0001 && lg>=-0.0001 && lb>=-0.0001 && lr<=1.0001 && lg<=1.0001 && lb<=1.0001;
}

const PRESETS = [
  { name: 'OKLCH Blue', l:0.55, c:0.20, h:264 },
  { name: 'OKLCH Green', l:0.60, c:0.22, h:142 },
  { name: 'OKLCH Red', l:0.55, c:0.23, h:28 },
  { name: 'OKLCH Yellow', l:0.80, c:0.18, h:110 },
  { name: 'OKLCH Pink', l:0.65, c:0.20, h:350 },
  { name: 'OKLCH Cyan', l:0.70, c:0.15, h:195 },
  { name: 'OKLCH Purple', l:0.50, c:0.22, h:300 },
  { name: 'OKLCH Orange', l:0.70, c:0.18, h:55 },
];

export default function OklchColorPickerPage() {
  const [lightness, setLightness] = useState(0.65);
  const [chroma, setChroma] = useState(0.18);
  const [hue, setHue] = useState(264);
  const [hexInput, setHexInput] = useState('');

  const rgb = useMemo(() => oklchToRgb(lightness, chroma, hue), [lightness, chroma, hue]);
  const hex = useMemo(() => rgb ? rgbToHex(rgb) : '#000000', [rgb]);
  const hsl = useMemo(() => rgb ? rgbToHsl(rgb) : { h:0, s:0, l:0 }, [rgb]);
  const inGamut = useMemo(() => isInSrgbGamut(lightness, chroma, hue), [lightness, chroma, hue]);

  const maxChroma = useMemo(() => {
    let lo=0, hi=0.5;
    for (let i=0;i<30;i++) { const mid=(lo+hi)/2; if (isInSrgbGamut(lightness,mid,hue)) lo=mid; else hi=mid; }
    return lo;
  }, [lightness, hue]);

  const chromaRatio = maxChroma>0 ? chroma/maxChroma : 0;
  const displayColor = inGamut ? hex : '#58606e';
  const oklchStr = `oklch(${lightness.toFixed(3)} ${chroma.toFixed(4)} ${hue.toFixed(1)}deg)`;
  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '—';
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const copy = useCallback(async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied!`); }
    catch { toast.error('Copy failed'); }
  }, []);

  const handleHexSubmit = useCallback(() => {
    const parsed = hexToRgb(hexInput.trim());
    if (!parsed) { toast.error('Invalid hex'); return; }
    const conv = rgbToOklch(parsed);
    setLightness(conv.l); setChroma(conv.c); setHue(conv.h);
    setHexInput('');
  }, [hexInput]);

  return (
    <ToolLayout
      title="OKLCH Color Picker"
      description="Explore OKLCH — the perceptually uniform CSS color space. Adjust lightness, chroma, and hue with live preview."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden transition-colors duration-150"
            style={{ backgroundColor: displayColor }}>
            {!inGamut && (
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,180,0,0.12)_4px,rgba(255,180,0,0.12)_8px)]" />
            )}
            <div className="relative z-10 text-center">
              {inGamut ? (
                <>
                  <span className="text-2xl font-bold drop-shadow-lg" style={{ color: lightness>0.55?'#0f172a':'#fff' }}>OKLCH</span>
                  <span className="text-xs mt-1 block opacity-70 drop-shadow font-mono" style={{ color: lightness>0.55?'#0f172a':'#fff' }}>{oklchStr}</span>
                </>
              ) : (
                <div className="bg-black/25 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <p className="font-semibold text-yellow-300 text-sm">Out of sRGB Gamut</p>
                  <p className="text-xs text-slate-300 mt-1">Reduce chroma or adjust lightness</p>
                </div>
              )}
            </div>
          </div>
          {/* Gamut bar */}
          <div className="mt-3 bg-surface rounded-lg border border-slate-700/50 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>sRGB Gamut</span>
              <span className={inGamut?'text-green-400':'text-yellow-400'}>{inGamut?'✓ In gamut':'⚠ Clipped'}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-200 ${chromaRatio>1?'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500':'bg-green-500'}`}
                style={{ width: `${Math.min(100, chromaRatio*100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>gray</span><span>max chroma</span>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="lg:col-span-2 card space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300"><Sun className="w-4 h-4 text-yellow-400"/>Lightness (L)</label>
              <span className="font-mono text-sm text-brand-400">{lightness.toFixed(3)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.001" value={lightness}
              onChange={e => setLightness(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, #000, #fff)', accentColor: displayColor }} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (black)</span><span>0.5</span><span>1 (white)</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300"><Droplets className="w-4 h-4 text-cyan-400"/>Chroma (C)</label>
              <span className="font-mono text-sm text-brand-400">{chroma.toFixed(4)}</span>
            </div>
            <input type="range" min="0" max="0.4" step="0.0001" value={chroma}
              onChange={e => setChroma(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #808080, ${displayColor})`, accentColor: displayColor }} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (gray)</span><span>0.2</span><span>0.4 (vivid)</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300"><Palette className="w-4 h-4 text-pink-400"/>Hue (H)</label>
              <span className="font-mono text-sm text-brand-400">{hue.toFixed(1)}°</span>
            </div>
            <input type="range" min="0" max="360" step="0.1" value={hue}
              onChange={e => setHue(parseFloat(e.target.value))}
              className="w-full h-5 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, rgb(255,0,0),rgb(255,255,0),rgb(0,255,0),rgb(0,255,255),rgb(0,0,255),rgb(255,0,255),rgb(255,0,0))', accentColor: displayColor }} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span></div>
          </div>
        </div>
      </div>

      {/* Hex input */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-300 shrink-0">Convert from HEX:</label>
          <span className="text-slate-500 font-mono text-sm">#</span>
          <input type="text" value={hexInput}
            onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6))}
            onKeyDown={e => e.key==='Enter' && hexInput.length===6 && handleHexSubmit()}
            placeholder="3b82f6" className="input-field flex-1 font-mono text-sm" spellCheck={false} />
          <button onClick={handleHexSubmit} disabled={hexInput.length!==6}
            className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40">Convert</button>
        </div>
      </div>

      {/* Output */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-brand-400"/>Color Values</h3>
        <div className="space-y-3">
          {[{label:'OKLCH',value:oklchStr},{label:'HEX',value:hex},{label:'RGB',value:rgbStr},{label:'HSL',value:hslStr}].map(({label,value})=>(
            <div key={label} className="flex items-center justify-between bg-surface-lighter rounded-lg border border-slate-700/50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-slate-500 w-14 shrink-0">{label}</span>
                <span className="font-mono text-sm text-slate-200 truncate select-all">{value}</span>
              </div>
              <button onClick={()=>copy(value,label)}
                className="ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent transition-all">
                <Copy className="w-3 h-3"/>Copy
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4">Quick Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map(p=>{
            const prgb=oklchToRgb(p.l,p.c,p.h); const phex=prgb?rgbToHex(prgb):'#58606e';
            return (
              <button key={p.name} onClick={()=>{setLightness(p.l);setChroma(p.c);setHue(p.h);}}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 hover:-translate-y-0.5 transition-all duration-200 text-left">
                <div className="w-7 h-7 rounded-md ring-1 ring-slate-600/30 shadow-sm shrink-0" style={{backgroundColor:phex}}/>
                <div className="min-w-0"><div className="text-xs text-white truncate">{p.name}</div><div className="text-[10px] text-slate-500 font-mono truncate">C{p.c}</div></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 bg-surface rounded-xl border border-slate-700/50">
        <div className="flex items-start gap-3">
          <Gauge className="w-5 h-5 text-brand-400 mt-0.5 shrink-0"/>
          <div>
            <h4 className="text-white font-semibold text-sm mb-2">Why OKLCH?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              OKLCH is <strong className="text-slate-300">perceptually uniform</strong> — changing lightness
              produces visually equal changes across all hues. Unlike HSL where yellow and blue at the same &quot;lightness&quot;
              look wildly different, OKLCH gives designer-friendly color manipulation. Supported in all modern browsers,
              it&apos;s recommended for design systems and CSS custom properties.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Code, Eye, Cookie, Shield, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type BannerPosition = 'top' | 'bottom' | 'bottom-left' | 'bottom-right' | 'center';
type ButtonStyle = 'filled' | 'outline' | 'text';

interface BannerConfig {
  title: string;
  description: string;
  acceptText: string;
  rejectText: string;
  customizeText: string;
  position: BannerPosition;
  bannerBg: string;
  bannerText: string;
  acceptBg: string;
  acceptTextColor: string;
  rejectBg: string;
  rejectTextColor: string;
  customizeBg: string;
  customizeTextColor: string;
  borderRadius: number;
  shadowSize: number;
  showReject: boolean;
  showCustomize: boolean;
  maxWidth: number;
  padding: number;
  fontSize: number;
}

interface Preset {
  name: string;
  description: string;
  config: Partial<BannerConfig>;
  icon: React.ReactNode;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'GDPR Standard',
    description: 'EU-compliant with Accept / Reject',
    config: {
      title: 'We value your privacy',
      description: 'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptText: 'Accept All',
      rejectText: 'Reject All',
      showReject: true,
      showCustomize: true,
      position: 'bottom',
    },
    icon: <Shield className="w-4 h-4" />,
  },
  {
    name: 'CCPA / US',
    description: 'California-style "Do Not Sell" notice',
    config: {
      title: 'Your Privacy Choices',
      description: 'We use cookies and similar technologies to improve your experience. You may opt out of the sale or sharing of your personal information by clicking "Do Not Sell My Info".',
      acceptText: 'Accept',
      rejectText: 'Do Not Sell My Info',
      showReject: true,
      showCustomize: false,
      position: 'bottom',
      acceptBg: '#0ea5e9',
      rejectBg: '#475569',
    },
    icon: <Globe className="w-4 h-4" />,
  },
  {
    name: 'Minimal Banner',
    description: 'Clean banner with just an accept button',
    config: {
      title: 'This site uses cookies',
      description: 'By continuing to browse this site, you agree to our use of cookies for analytics and personalization.',
      acceptText: 'Got it',
      showReject: false,
      showCustomize: false,
      position: 'bottom',
      borderRadius: 8,
      maxWidth: 400,
      padding: 16,
    },
    icon: <Cookie className="w-4 h-4" />,
  },
  {
    name: 'Dark Corporate',
    description: 'Enterprise-friendly dark banner',
    config: {
      title: 'Cookie Preferences',
      description: 'This website uses cookies to ensure you get the best experience on our website. Learn more about our cookie policy.',
      acceptText: 'Accept Cookies',
      rejectText: 'Essential Only',
      showReject: true,
      showCustomize: true,
      position: 'bottom-right',
      bannerBg: '#1e293b',
      bannerText: '#e2e8f0',
      acceptBg: '#6366f1',
      acceptTextColor: '#ffffff',
      rejectBg: '#334155',
      rejectTextColor: '#e2e8f0',
      borderRadius: 12,
      shadowSize: 16,
    },
    icon: <Shield className="w-4 h-4" />,
  },
  {
    name: 'Floating Popup',
    description: 'Centered modal-style consent popup',
    config: {
      title: '🍪 Cookie Settings',
      description: 'We use cookies to personalize content and ads, to provide social media features and to analyze our traffic. We also share information about your use of our site with our analytics partners.',
      acceptText: 'Accept All',
      rejectText: 'Reject All',
      showReject: true,
      showCustomize: true,
      position: 'center',
      borderRadius: 16,
      maxWidth: 520,
      padding: 32,
    },
    icon: <Cookie className="w-4 h-4" />,
  },
  {
    name: 'Notification Bar',
    description: 'Thin top banner like a system notification',
    config: {
      title: '',
      description: 'This website uses cookies to improve your experience. By continuing, you agree to our use of cookies.',
      acceptText: 'Accept',
      showReject: false,
      showCustomize: false,
      position: 'top',
      borderRadius: 0,
      padding: 12,
      fontSize: 14,
      bannerBg: '#0ea5e9',
      bannerText: '#ffffff',
      acceptBg: '#ffffff',
      acceptTextColor: '#0ea5e9',
    },
    icon: <Globe className="w-4 h-4" />,
  },
];

const DEFAULT: BannerConfig = {
  title: 'We value your privacy',
  description: 'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
  acceptText: 'Accept All',
  rejectText: 'Reject All',
  customizeText: 'Customize',
  position: 'bottom',
  bannerBg: '#111827',
  bannerText: '#e5e7eb',
  acceptBg: '#6366f1',
  acceptTextColor: '#ffffff',
  rejectBg: '#374151',
  rejectTextColor: '#e5e7eb',
  customizeBg: '#1f2937',
  customizeTextColor: '#e5e7eb',
  borderRadius: 12,
  shadowSize: 8,
  showReject: true,
  showCustomize: true,
  maxWidth: 720,
  padding: 24,
  fontSize: 14,
};

const POSITIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center Modal' },
];

// ── Code Generation ─────────────────────────────────────────────────────────

function generateHTML(cfg: BannerConfig): string {
  const bg = rgbaFromHex(cfg.bannerBg, 0.95);
  const lines = [
    '<!-- Cookie Consent Banner -->',
    `<div id="cookie-consent" style="`,
    `  position: fixed;`,
    `  z-index: 9999;`,
    `  background: ${bg};`,
    `  color: ${cfg.bannerText};`,
    `  box-shadow: 0 4px ${cfg.shadowSize * 3}px rgba(0, 0, 0, 0.3);`,
    `  border-radius: ${cfg.borderRadius}px;`,
    `  padding: ${cfg.padding}px;`,
    `  max-width: ${cfg.maxWidth}px;`,
    `  width: calc(100% - ${cfg.padding * 2}px);`,
    `  font-size: ${cfg.fontSize}px;`,
    `  font-family: system-ui, -apple-system, sans-serif;`,
    `  line-height: 1.6;`,
    ...posStyles(cfg),
    `  display: flex;`,
    `  align-items: center;`,
    `  justify-content: space-between;`,
    `  gap: 16px;`,
    `  flex-wrap: wrap;`,
    `">`,
  ];

  // Text block
  lines.push(`  <div style="flex: 1; min-width: 200px;">`);
  if (cfg.title) {
    lines.push(`    <strong style="display: block; margin-bottom: 4px; font-size: ${Math.min(cfg.fontSize + 2, 20)}px;">${escapeHTML(cfg.title)}</strong>`);
  }
  lines.push(`    <span>${escapeHTML(cfg.description)}</span>`);
  lines.push(`  </div>`);

  // Buttons
  lines.push(`  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">`);
  lines.push(buttonString('accept', 'cookie-accept-btn', cfg));
  if (cfg.showCustomize) {
    lines.push(buttonString('customize', 'cookie-customize-btn', cfg));
  }
  if (cfg.showReject) {
    lines.push(buttonString('reject', 'cookie-reject-btn', cfg));
  }
  lines.push(`  </div>`);

  lines.push(`</div>`);

  // JS snippet
  lines.push('');
  lines.push('<script>');
  lines.push('(function() {');
  lines.push('  if (document.cookie.indexOf("cookie_consent=") !== -1) return;');
  lines.push(`  document.querySelector("#cookie-accept-btn").addEventListener("click", function() {`);
  lines.push(`    document.cookie = "cookie_consent=accepted; max-age=" + 60*60*24*365 + "; path=/";`);
  lines.push(`    document.getElementById("cookie-consent").remove();`);
  lines.push('  });');
  if (cfg.showReject) {
    lines.push(`  document.querySelector("#cookie-reject-btn").addEventListener("click", function() {`);
    lines.push(`    document.cookie = "cookie_consent=rejected; max-age=" + 60*60*24*365 + "; path=/";`);
    lines.push(`    document.getElementById("cookie-consent").remove();`);
    lines.push('  });');
  }
  if (cfg.showCustomize) {
    lines.push(`  document.querySelector("#cookie-customize-btn").addEventListener("click", function() {`);
    lines.push(`    // Redirect to cookie settings page or open preferences modal`);
    lines.push(`    alert("Customize your cookie preferences here.");`);
    lines.push('  });');
  }
  lines.push('})();');
  lines.push('</script>');

  return lines.join('\n');
}

function buttonString(type: 'accept' | 'reject' | 'customize', id: string, cfg: BannerConfig): string {
  const colors = {
    accept: { bg: cfg.acceptBg, text: cfg.acceptTextColor },
    reject: { bg: cfg.rejectBg, text: cfg.rejectTextColor },
    customize: { bg: cfg.customizeBg, text: cfg.customizeTextColor },
  };
  const labels: Record<string, string> = { accept: cfg.acceptText, reject: cfg.rejectText, customize: cfg.customizeText };
  const c = colors[type];
  const isOutline = type === 'reject' || type === 'customize';
  const bgStyle = isOutline
    ? `background: transparent; border: 1px solid ${c.bg};`
    : `background: ${c.bg}; border: none;`;
  return [
    `<button id="${id}" style="`,
    `  ${bgStyle}`,
    `  color: ${c.text};`,
    `  padding: 8px 20px;`,
    `  border-radius: 6px;`,
    `  cursor: pointer;`,
    `  font-size: ${cfg.fontSize}px;`,
    `  font-family: inherit;`,
    `  font-weight: 500;`,
    `  white-space: nowrap;`,
    `  transition: opacity 0.2s;`,
    `">${escapeHTML(labels[type])}</button>`,
  ].join('\n');
}

function posStyles(cfg: BannerConfig): string[] {
  switch (cfg.position) {
    case 'top':
      return [
        `  top: 0;`,
        `  left: 50%;`,
        `  transform: translateX(-50%);`,
      ];
    case 'bottom':
      return [
        `  bottom: ${cfg.padding}px;`,
        `  left: 50%;`,
        `  transform: translateX(-50%);`,
      ];
    case 'bottom-left':
      return [
        `  bottom: ${cfg.padding}px;`,
        `  left: ${cfg.padding}px;`,
      ];
    case 'bottom-right':
      return [
        `  bottom: ${cfg.padding}px;`,
        `  right: ${cfg.padding}px;`,
      ];
    case 'center':
      return [
        `  top: 50%;`,
        `  left: 50%;`,
        `  transform: translate(-50%, -50%);`,
        `  width: 90%;`,
      ];
  }
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rgbaFromHex(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Preview Component ──────────────────────────────────────────────────────

function BannerPreview({ cfg }: { cfg: BannerConfig }) {
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: 300,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1e3a 50%, #1a0a2e 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(148, 163, 184, 0.15)',
  };

  const bannerStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    background: cfg.bannerBg,
    color: cfg.bannerText,
    boxShadow: `0 4px ${cfg.shadowSize * 3}px rgba(0, 0, 0, 0.3)`,
    borderRadius: cfg.borderRadius,
    padding: cfg.padding,
    maxWidth: cfg.maxWidth,
    width: cfg.position === 'center' ? '90%' : `calc(100% - ${cfg.padding * 2}px)`,
    fontSize: cfg.fontSize,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    ...positionStyles(cfg),
  };

  const btnBase: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: cfg.fontSize,
    fontFamily: 'inherit',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    border: 'none',
    transition: 'opacity 0.2s',
  };

  // Mock content
  const mockLines = [
    { width: '60%', height: 10 },
    { width: '90%', height: 10 },
    { width: '40%', height: 10 },
    { width: '70%', height: 10 },
    { width: '50%', height: 10 },
  ];

  return (
    <div style={containerStyle}>
      {/* Mock page content */}
      <div style={{ padding: '40px 24px', opacity: 0.4 }}>
        <div style={{ width: '40%', height: 8, background: '#94a3b8', borderRadius: 4, marginBottom: 24 }} />
        {mockLines.map((line, i) => (
          <div
            key={i}
            style={{
              width: line.width,
              height: line.height,
              background: i === 0 ? '#6366f1' : '#94a3b8',
              borderRadius: 4,
              marginBottom: 12,
              opacity: i === 0 ? 0.7 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Banner */}
      <div style={bannerStyle}>
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          {cfg.title && (
            <strong style={{ display: 'block', marginBottom: 4, fontSize: Math.min(cfg.fontSize + 2, 20) }}>
              {cfg.title}
            </strong>
          )}
          <span>{cfg.description}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={{
              ...btnBase,
              background: cfg.acceptBg,
              color: cfg.acceptTextColor,
            }}
          >
            {cfg.acceptText}
          </button>
          {cfg.showCustomize && (
            <button
              style={{
                ...btnBase,
                background: 'transparent',
                color: cfg.customizeTextColor,
                border: `1px solid ${cfg.customizeBg}`,
              }}
            >
              {cfg.customizeText}
            </button>
          )}
          {cfg.showReject && (
            <button
              style={{
                ...btnBase,
                background: 'transparent',
                color: cfg.rejectTextColor,
                border: `1px solid ${cfg.rejectBg}`,
              }}
            >
              {cfg.rejectText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function positionStyles(cfg: BannerConfig): React.CSSProperties {
  switch (cfg.position) {
    case 'top':
      return { top: 0, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom':
      return { bottom: cfg.padding, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-left':
      return { bottom: cfg.padding, left: cfg.padding };
    case 'bottom-right':
      return { bottom: cfg.padding, right: cfg.padding };
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

// ── Number Input ────────────────────────────────────────────────────────────

function NumberInput({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono tabular-nums w-12 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

// ── Color Input ─────────────────────────────────────────────────────────────

function ColorInput({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-slate-600/50 cursor-pointer bg-transparent p-0.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <label className="text-xs text-slate-400 block truncate">{label}</label>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field font-mono text-xs w-24 text-right"
      />
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-slate-600'}`} />
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="text-xs text-slate-300">{label}</span>
    </label>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────

function SelectInput({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: BannerPosition) => void;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BannerPosition)}
        className="input-field w-full text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function CookieConsentGeneratorPage() {
  const [cfg, setCfg] = useState<BannerConfig>(DEFAULT);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [activePreset, setActivePreset] = useState<string>('GDPR Standard');

  const update = useCallback(<K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setActivePreset('');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setCfg((prev) => ({ ...prev, ...preset.config }));
    setActivePreset(preset.name);
    toast.success('Applied: ' + preset.name);
  }, []);

  const resetAll = useCallback(() => {
    setCfg({ ...DEFAULT });
    setActivePreset('GDPR Standard');
    toast.success('Reset to defaults');
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(generateHTML(cfg)).then(
      () => toast.success('Code copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cfg]);

  const code = useMemo(() => generateHTML(cfg), [cfg]);

  return (
    <ToolLayout
      title="Cookie Consent Banner Generator"
      description="Design GDPR/CCPA-compliant cookie consent banners with a live preview. Customize every detail then copy production-ready HTML, CSS, and JavaScript."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Presets</h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`flex items-center gap-1.5 text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    activePreset === p.name
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.icon}
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Position & Layout</h2>
            <div className="space-y-3">
              <SelectInput
                label="Banner Position"
                value={cfg.position}
                options={POSITIONS}
                onChange={(v) => update('position', v)}
              />
              <NumberInput
                label="Max Width (px)"
                value={cfg.maxWidth}
                min={280}
                max={1200}
                onChange={(v) => update('maxWidth', v)}
              />
              <NumberInput
                label="Padding (px)"
                value={cfg.padding}
                min={8}
                max={48}
                onChange={(v) => update('padding', v)}
              />
              <NumberInput
                label="Border Radius (px)"
                value={cfg.borderRadius}
                min={0}
                max={40}
                onChange={(v) => update('borderRadius', v)}
              />
              <NumberInput
                label="Shadow Size"
                value={cfg.shadowSize}
                min={0}
                max={24}
                onChange={(v) => update('shadowSize', v)}
              />
              <NumberInput
                label="Font Size (px)"
                value={cfg.fontSize}
                min={11}
                max={18}
                onChange={(v) => update('fontSize', v)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Buttons</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-400 flex-1">Accept Text</label>
                <input
                  type="text"
                  value={cfg.acceptText}
                  onChange={(e) => update('acceptText', e.target.value)}
                  className="input-field text-xs w-40"
                />
              </div>
              <Toggle label="Show Reject Button" checked={cfg.showReject} onChange={(v) => update('showReject', v)} />
              {cfg.showReject && (
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-400 flex-1">Reject Text</label>
                  <input
                    type="text"
                    value={cfg.rejectText}
                    onChange={(e) => update('rejectText', e.target.value)}
                    className="input-field text-xs w-40"
                  />
                </div>
              )}
              <Toggle label="Show Customize Button" checked={cfg.showCustomize} onChange={(v) => update('showCustomize', v)} />
              {cfg.showCustomize && (
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-400 flex-1">Customize Text</label>
                  <input
                    type="text"
                    value={cfg.customizeText}
                    onChange={(e) => update('customizeText', e.target.value)}
                    className="input-field text-xs w-40"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Colors</h2>
            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-2 font-medium">Banner</div>
              <ColorInput label="Background" value={cfg.bannerBg} onChange={(v) => update('bannerBg', v)} />
              <ColorInput label="Text" value={cfg.bannerText} onChange={(v) => update('bannerText', v)} />
              <div className="text-xs text-slate-400 mt-3 mb-2 font-medium">Accept Button</div>
              <ColorInput label="Background" value={cfg.acceptBg} onChange={(v) => update('acceptBg', v)} />
              <ColorInput label="Text" value={cfg.acceptTextColor} onChange={(v) => update('acceptTextColor', v)} />
              <div className="text-xs text-slate-400 mt-3 mb-2 font-medium">Reject Button</div>
              <ColorInput label="Border / BG" value={cfg.rejectBg} onChange={(v) => update('rejectBg', v)} />
              <ColorInput label="Text" value={cfg.rejectTextColor} onChange={(v) => update('rejectTextColor', v)} />
              <div className="text-xs text-slate-400 mt-3 mb-2 font-medium">Customize Button</div>
              <ColorInput label="Border / BG" value={cfg.customizeBg} onChange={(v) => update('customizeBg', v)} />
              <ColorInput label="Text" value={cfg.customizeTextColor} onChange={(v) => update('customizeTextColor', v)} />
            </div>
          </div>

          {/* Text Content */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Text Content</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title (leave empty to hide)</label>
                <input
                  type="text"
                  value={cfg.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea
                  value={cfg.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="input-field w-full text-xs h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview / Code */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4" />
              Code
            </button>
            <div className="flex-1" />
            <button onClick={copyCode} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5">
              <Copy className="w-4 h-4" />
              Copy Code
            </button>
            <button onClick={resetAll} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Preview / Code panel */}
          {activeTab === 'preview' ? (
            <BannerPreview cfg={cfg} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                <span className="text-xs text-slate-400 font-mono">HTML + CSS + JavaScript</span>
                <span className="text-xs text-slate-500">{code.split('\n').length} lines</span>
              </div>
              <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[600px] overflow-y-auto">
                {code}
              </pre>
            </div>
          )}

          {/* Info */}
          <div className="card bg-brand-500/5 border-brand-500/10">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">How to use this code</p>
                <p>
                  Paste the generated HTML and <code className="text-brand-400">{'<script>'}</code> tag anywhere in your page, ideally just before the closing{' '}
                  <code className="text-brand-400">{'</body>'}</code> tag. The banner uses a{' '}
                  <code className="text-brand-400">cookie_consent</code> cookie (365-day expiry) to remember the user&apos;s choice.
                  Replace the <code className="text-brand-400">alert()</code> in the customize handler with your own preferences modal.
                  All styling is inline — no external CSS needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

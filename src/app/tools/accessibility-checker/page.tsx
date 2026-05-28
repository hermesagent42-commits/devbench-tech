'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Eye, EyeOff, Contrast, List, Tags, Heading1, Link2, ImageIcon,
  Copy, AlertTriangle, CheckCircle2, XCircle, Info, RefreshCw, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'contrast' | 'blindness' | 'headings' | 'aria' | 'links' | 'alt';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'contrast', label: 'Contrast', icon: <Contrast className="w-4 h-4" /> },
  { id: 'blindness', label: 'Color Blind', icon: <EyeOff className="w-4 h-4" /> },
  { id: 'headings', label: 'Headings', icon: <Heading1 className="w-4 h-4" /> },
  { id: 'aria', label: 'ARIA Ref', icon: <Tags className="w-4 h-4" /> },
  { id: 'links', label: 'Link Text', icon: <Link2 className="w-4 h-4" /> },
  { id: 'alt', label: 'Alt Text', icon: <ImageIcon className="w-4 h-4" aria-hidden="true" /> },
];

const BLINDNESS_TYPES = [
  { id: 'protanopia', label: 'Protanopia (Red-Blind)', description: '1% of males — no red cones' },
  { id: 'deuteranopia', label: 'Deuteranopia (Green-Blind)', description: '1% of males — no green cones' },
  { id: 'tritanopia', label: 'Tritanopia (Blue-Blind)', description: '<0.01% — no blue cones' },
  { id: 'achromatopsia', label: 'Achromatopsia (Monochromacy)', description: 'Complete color blindness — grayscale' },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) {
    const short = hex.replace('#', '').match(/^([a-f\d])([a-f\d])([a-f\d])$/i);
    if (!short) return null;
    return [parseInt(short[1] + short[1], 16), parseInt(short[2] + short[2], 16), parseInt(short[3] + short[3], 16)];
  }
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return 0;
  const l1 = getLuminance(...fgRgb);
  const l2 = getLuminance(...bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function simulateColorBlindness(r: number, g: number, b: number, type: string): [number, number, number] {
  switch (type) {
    case 'protanopia': {
      const l = 0.56667 * r + 0.43333 * g;
      return [Math.round(l), Math.round(l), Math.round(b)];
    }
    case 'deuteranopia': {
      const l = 0.625 * r + 0.375 * g;
      return [Math.round(l), Math.round(l), Math.round(b)];
    }
    case 'tritanopia': {
      return [Math.round(r), Math.round(0.95 * g + 0.05 * b), Math.round(0.43333 * g + 0.56667 * b)];
    }
    case 'achromatopsia': {
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return [l, l, l];
    }
    default:
      return [r, g, b];
  }
}

const ARIA_ROLES: { category: string; roles: { name: string; description: string }[] }[] = [
  {
    category: 'Widget Roles',
    roles: [
      { name: 'button', description: 'Clickable element that triggers an action' },
      { name: 'checkbox', description: 'Checkable input, can be checked, unchecked, or mixed' },
      { name: 'combobox', description: 'Input with a popup list of options' },
      { name: 'dialog', description: 'Modal window or popup overlay' },
      { name: 'link', description: 'Interactive hyperlink reference' },
      { name: 'progressbar', description: 'Progress indicator' },
      { name: 'radio', description: 'Selectable radio button in a group' },
      { name: 'searchbox', description: 'Text input for search queries' },
      { name: 'slider', description: 'Range input with min/max values' },
      { name: 'switch', description: 'Toggle on/off control' },
      { name: 'tab', description: 'Tab selection in a tablist' },
      { name: 'textbox', description: 'Free-form text input' },
      { name: 'tooltip', description: 'Contextual help popup' },
    ],
  },
  {
    category: 'Landmark Roles',
    roles: [
      { name: 'banner', description: 'Site header, typically the <header> region' },
      { name: 'complementary', description: 'Supplementary content (sidebar)' },
      { name: 'contentinfo', description: 'Footer information about the parent document' },
      { name: 'form', description: 'Landmark for a form region' },
      { name: 'main', description: 'Main content of the document' },
      { name: 'navigation', description: 'Collection of navigational links' },
      { name: 'region', description: 'Significant, labeled section of content' },
      { name: 'search', description: 'Search functionality region' },
    ],
  },
  {
    category: 'Live Region Roles',
    roles: [
      { name: 'alert', description: 'Time-sensitive important message (assertive)' },
      { name: 'log', description: 'Sequential information like chat logs' },
      { name: 'marquee', description: 'Frequently changing content like stock tickers' },
      { name: "status", description: "Advisory info that doesn't interrupt (polite)" },
      { name: 'timer', description: 'Countdown or elapsed time display' },
    ],
  },
];

const BAD_LINK_TEXTS = [
  'click here', 'read more', 'more', 'here', 'link', 'this', 'go',
  'click', 'continue', 'learn more', 'details', 'info',
];

function assessLinkText(text: string): { score: 'good' | 'warning' | 'bad'; message: string } {
  const lower = text.toLowerCase().trim();
  if (!lower) return { score: 'bad', message: 'Link text is empty — screen readers need descriptive text' };
  if (BAD_LINK_TEXTS.includes(lower)) {
    return { score: 'bad', message: `"${text}" is a generic link — not descriptive for screen readers` };
  }
  if (lower.length < 5) {
    return { score: 'warning', message: `"${text}" is very short — may not be descriptive enough` };
  }
  if (lower.includes('click') || lower.includes('link')) {
    return { score: 'warning', message: 'Avoid using "click" or "link" in link text — describe the destination' };
  }
  return { score: 'good', message: 'Link text looks descriptive and meaningful' };
}

export default function AccessibilityCheckerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('contrast');

  const [fgColor, setFgColor] = useState('#FFFFFF');
  const [bgColor, setBgColor] = useState('#3B82F6');
  const [sampleText, setSampleText] = useState('Accessible design is good design.');

  const [blindnessColor, setBlindnessColor] = useState('#3B82F6');

  const [headingInput, setHeadingInput] = useState('');

  const [linkText, setLinkText] = useState('');
  const [linkAssessment, setLinkAssessment] = useState<ReturnType<typeof assessLinkText> | null>(null);

  const [altText, setAltText] = useState('');
  const [altContext, setAltContext] = useState('');

  const contrastRatio = useMemo(() => getContrastRatio(fgColor, bgColor), [fgColor, bgColor]);
  const aaNormal = contrastRatio >= 4.5;
  const aaLarge = contrastRatio >= 3;
  const aaaNormal = contrastRatio >= 7;
  const aaaLarge = contrastRatio >= 4.5;

  const contrastLevel = useMemo(() => {
    if (aaaNormal) return { label: 'AAA', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (aaNormal) return { label: 'AA', color: 'text-brand-400', bg: 'bg-brand-500/10' };
    if (aaLarge) return { label: 'AA Large Text Only', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    return { label: 'Fails WCAG', color: 'text-red-400', bg: 'bg-red-500/10' };
  }, [aaNormal, aaaNormal, aaLarge]);

  const swapColors = useCallback(() => {
    setFgColor(bgColor);
    setBgColor(fgColor);
  }, [fgColor, bgColor]);

  const blindnessSimulated = useMemo(() => {
    const rgb = hexToRgb(blindnessColor);
    if (!rgb) return {};
    const results: Record<string, string> = {};
    for (const bt of BLINDNESS_TYPES) {
      const [sr, sg, sb] = simulateColorBlindness(...rgb, bt.id);
      results[bt.id] = `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`;
    }
    return results;
  }, [blindnessColor]);

  const headingAnalysis = useMemo(() => {
    if (!headingInput.trim()) return null;
    const lines = headingInput.split('\n').filter(l => l.trim());
    const issues: { line: number; text: string; issue: string }[] = [];
    let prevLevel = 0;

    lines.forEach((line, i) => {
      const match = line.trim().match(/^(#{1,6})\s/);
      if (!match) {
        issues.push({ line: i + 1, text: line.trim().slice(0, 40), issue: 'Not a valid heading — headings must start with #' });
        return;
      }
      const level = match[1].length;
      if (prevLevel > 0 && level > prevLevel + 1) {
        issues.push({ line: i + 1, text: line.trim().slice(0, 40), issue: `Skipped heading level: h${prevLevel} → h${level}. Never skip heading levels.` });
      }
      if (i === 0 && level !== 1) {
        issues.push({ line: i + 1, text: line.trim().slice(0, 40), issue: 'First heading should be h1 — each page needs one top-level heading.' });
      }
      prevLevel = level;
    });

    return {
      total: lines.length,
      issues,
      hasH1: lines.some(l => l.trim().startsWith('# ')),
    };
  }, [headingInput]);

  const checkLinks = useCallback(() => {
    setLinkAssessment(assessLinkText(linkText));
  }, [linkText]);

  const altTextAnalysis = useMemo(() => {
    if (!altText.trim()) return null;
    const lower = altText.toLowerCase().trim();
    const issues: string[] = [];
    if (lower.startsWith('image of') || lower.startsWith('picture of')) {
      issues.push('Avoid starting with &quot;image of&quot; or &quot;picture of&quot; — screen readers already announce it as an image.');
    }
    if (lower.length > 150) {
      issues.push('Alt text is very long (>150 chars). Consider using aria-describedby for longer descriptions.');
    }
    if (lower.length < 5) {
      issues.push('Alt text is very short — may not be descriptive enough unless purely decorative.');
    }
    if (lower.includes('.jpg') || lower.includes('.png') || lower.includes('.gif')) {
      issues.push('Alt text contains file extension — this is not useful for screen readers.');
    }
    const isGood = issues.length === 0;
    return { issues, isGood };
  }, [altText]);

  return (
    <ToolLayout
      title="Accessibility Checker"
      description="Audit color contrast, simulate color blindness, validate heading hierarchy, check ARIA roles, review link text, and assess alt text — all in your browser."
    >
      <div className="flex flex-wrap gap-1 mb-8 p-1 rounded-lg bg-surface border border-slate-700/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-lighter'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contrast' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Contrast className="w-5 h-5 text-brand-400" />
              Color Contrast Ratio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Foreground Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="input-field font-mono text-sm flex-1"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="input-field font-mono text-sm flex-1"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            <button onClick={swapColors} className="btn-secondary flex items-center gap-1.5 text-sm mb-4">
              <RefreshCw className="w-3.5 h-3.5" />
              Swap Colors
            </button>

            <div
              className="rounded-xl p-8 mb-4 relative overflow-hidden"
              style={{ backgroundColor: bgColor }}
            >
              <p
                className="text-2xl font-bold text-center"
                style={{ color: fgColor }}
              >
                {sampleText}
              </p>
              <p
                className="text-base mt-2 opacity-80 text-center"
                style={{ color: fgColor }}
              >
                Normal text on this background
              </p>
              <p
                className="text-xs mt-1 opacity-60 text-center"
                style={{ color: fgColor }}
              >
                Small text for fine detail
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-surface-lighter p-4 border border-slate-700/50">
                <div className="text-3xl font-bold text-white">{contrastRatio.toFixed(2)}:1</div>
                <div className="text-sm text-slate-400 mt-1">Contrast Ratio</div>
              </div>
              <div className={`rounded-lg p-4 border ${aaNormal ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center gap-1.5">
                  {aaNormal ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`font-semibold text-sm ${aaNormal ? 'text-green-400' : 'text-red-400'}`}>AA Normal</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">≥ 4.5:1 for normal text</div>
              </div>
              <div className={`rounded-lg p-4 border ${aaaLarge ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center gap-1.5">
                  {aaaLarge ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`font-semibold text-sm ${aaaLarge ? 'text-green-400' : 'text-red-400'}`}>AA Large</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">≥ 3:1 for large text (18px+)</div>
              </div>
              <div className={`rounded-lg p-4 border ${aaaLarge && aaaNormal ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                <div className="flex items-center gap-1.5">
                  {aaaLarge && aaaNormal ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Info className="w-4 h-4 text-yellow-400" />}
                  <span className={`font-semibold text-sm ${aaaLarge && aaaNormal ? 'text-green-400' : 'text-yellow-400'}`}>AAA</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">≥ 7:1 for enhanced contrast</div>
              </div>
            </div>

            <div className="text-sm text-slate-400">
              <strong className="text-slate-300">Rating:</strong>{' '}
              <span className={`font-semibold ${contrastLevel.color}`}>
                {contrastLevel.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blindness' && (
        <div className="card">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-brand-400" />
            Color Blindness Simulator
          </h2>

          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-1.5 block">Pick a color to simulate</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={blindnessColor}
                onChange={(e) => setBlindnessColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
              />
              <input
                type="text"
                value={blindnessColor}
                onChange={(e) => setBlindnessColor(e.target.value)}
                className="input-field font-mono text-sm flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BLINDNESS_TYPES.map((bt) => {
              const color = blindnessSimulated[bt.id] || '#000';
              return (
                <div key={bt.id} className="rounded-xl overflow-hidden border border-slate-700/50">
                  <div
                    className="h-20"
                    style={{ backgroundColor: color }}
                  />
                  <div className="p-3 bg-surface-lighter">
                    <div className="text-sm font-semibold text-white">{bt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{bt.description}</div>
                    <div className="text-xs font-mono text-brand-400 mt-1">{color}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-500">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            These simulations approximate how colors appear to people with different types of color vision deficiency. Use these to ensure your designs work for everyone.
          </p>
        </div>
      )}

      {activeTab === 'headings' && (
        <div className="card">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Heading1 className="w-5 h-5 text-brand-400" />
            Heading Hierarchy Validator
          </h2>

          <p className="text-sm text-slate-400 mb-4">
            Paste your Markdown headings below to validate heading hierarchy. Headings should never skip levels (<code>h1 → h3</code>), and every page needs exactly one <code>h1</code>.
          </p>

          <textarea
            value={headingInput}
            onChange={(e) => setHeadingInput(e.target.value)}
            className="input-field w-full h-40 font-mono text-sm mb-4"
            placeholder={`# Main Title (h1)\n## Section (h2)\n### Sub-section (h3)\n## Another Section (h2)`}
          />

          {headingAnalysis && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  Total headings: <span className="text-white font-semibold">{headingAnalysis.total}</span>
                </span>
                <span className={headingAnalysis.hasH1 ? 'text-green-400' : 'text-red-400'}>
                  {headingAnalysis.hasH1 ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Has h1</span>
                  ) : (
                    <span className="flex items-center gap-1"><XCircle className="w-4 h-4" /> Missing h1</span>
                  )}
                </span>
                <span className={headingAnalysis.issues.length === 0 ? 'text-green-400' : 'text-yellow-400'}>
                  Issues: {headingAnalysis.issues.length}
                </span>
              </div>

              {headingAnalysis.issues.length > 0 && (
                <div className="space-y-2">
                  {headingAnalysis.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm text-red-300">Line {issue.line}: {issue.issue}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{issue.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {headingAnalysis.issues.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">Heading hierarchy looks good!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'aria' && (
        <div className="space-y-6">
          {ARIA_ROLES.map((category) => (
            <div key={category.category} className="card">
              <h2 className="text-white font-semibold text-lg mb-4">{category.category}</h2>
              <div className="space-y-3">
                {category.roles.map((role) => (
                  <div key={role.name} className="flex items-start gap-3 p-3 rounded-lg bg-surface-lighter border border-slate-700/30">
                    <code className="text-brand-400 font-mono text-sm bg-brand-500/10 px-2 py-0.5 rounded shrink-0">{role.name}</code>
                    <p className="text-sm text-slate-400">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="card">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand-400" />
            Link Text Quality Checker
          </h2>

          <p className="text-sm text-slate-400 mb-4">
            Enter link text to check if it{`'`}s descriptive enough for screen reader users. Avoid generic text like {`"`}click here{`"`} or {`"`}read more{`"`}.
          </p>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkLinks()}
              className="input-field flex-1"
              placeholder="e.g., Download our accessibility guide"
            />
            <button onClick={checkLinks} className="btn-primary flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Check
            </button>
          </div>

          {linkAssessment && (
            <div className={`p-4 rounded-lg border ${
              linkAssessment.score === 'good' ? 'bg-green-500/5 border-green-500/20' :
              linkAssessment.score === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {linkAssessment.score === 'good' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                {linkAssessment.score === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                {linkAssessment.score === 'bad' && <XCircle className="w-5 h-5 text-red-400" />}
                <span className={`font-semibold text-sm capitalize ${
                  linkAssessment.score === 'good' ? 'text-green-400' :
                  linkAssessment.score === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {linkAssessment.score}
                </span>
              </div>
              <p className="text-sm text-slate-400">{linkAssessment.message}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alt' && (
        <div className="card">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-400" aria-hidden="true" />
            Alt Text Quality Checker
          </h2>

          <p className="text-sm text-slate-400 mb-4">
            Check your alt text for common issues. Good alt text is concise, descriptive, and doesn&apos;t include &quot;image of&quot; or file extensions.
          </p>

          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Image Alt Text</label>
              <textarea
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="input-field w-full h-20 font-mono text-sm"
                placeholder="e.g., Bar chart showing Q4 revenue growth of 23% year over year"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Image Context (optional)</label>
              <input
                type="text"
                value={altContext}
                onChange={(e) => setAltContext(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="e.g., Hero banner on pricing page"
              />
            </div>
          </div>

          {altTextAnalysis && (
            <div className={`p-4 rounded-lg border ${
              altTextAnalysis.isGood ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {altTextAnalysis.isGood ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                )}
                <span className={`font-semibold text-sm ${altTextAnalysis.isGood ? 'text-green-400' : 'text-yellow-400'}`}>
                  {altTextAnalysis.isGood ? 'Looks good!' : `${altTextAnalysis.issues.length} issue(s) found`}
                </span>
              </div>
              {altTextAnalysis.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                  {issue}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg bg-surface-lighter border border-slate-700/30">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Quick Tips</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Keep it under 125 characters — screen readers may cut off longer text</li>
              <li>• Don{`'`}t start with {`"`}Image of{`"`} or {`"`}Picture of{`"`} — it{`'`}s redundant</li>
              <li>• Skip {`"`}photo.jpg{`"`} or file names — describe the content</li>
              <li>• For purely decorative images, use an empty alt attribute: <code className="text-brand-400">{`alt=""`}</code></li>
              <li>• Complex images: use <code className="text-brand-400">aria-describedby</code> for longer descriptions</li>
            </ul>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

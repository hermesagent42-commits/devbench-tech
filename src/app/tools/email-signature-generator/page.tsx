'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface SignatureData {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedin: string;
  github: string;
  twitter: string;
  photoUrl: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  layout: 'horizontal' | 'vertical' | 'compact';
  showPhoto: boolean;
  showLogo: boolean;
  showDivider: boolean;
}

type PresetTemplate = {
  name: string;
  data: Partial<SignatureData>;
};

const PRESETS: PresetTemplate[] = [
  {
    name: 'Corporate',
    data: { primaryColor: '#1a365d', accentColor: '#2b6cb0', fontFamily: 'Arial, sans-serif', layout: 'horizontal', showPhoto: true, showDivider: true },
  },
  {
    name: 'Modern Tech',
    data: { primaryColor: '#0f172a', accentColor: '#6366f1', fontFamily: 'system-ui, sans-serif', layout: 'horizontal', showPhoto: true, showLogo: true },
  },
  {
    name: 'Minimal',
    data: { primaryColor: '#374151', accentColor: '#6b7280', fontFamily: 'Georgia, serif', layout: 'compact', showPhoto: false, showDivider: false },
  },
  {
    name: 'Creative',
    data: { primaryColor: '#831843', accentColor: '#ec4899', fontFamily: 'Trebuchet MS, sans-serif', layout: 'vertical', showPhoto: true, showLogo: true, showDivider: true },
  },
  {
    name: 'SaaS Startup',
    data: { primaryColor: '#065f46', accentColor: '#10b981', fontFamily: 'Inter, system-ui, sans-serif', layout: 'horizontal', showPhoto: true, showLogo: true },
  },
];

const DEFAULT_DATA: SignatureData = {
  fullName: 'Jane Developer',
  jobTitle: 'Senior Frontend Engineer',
  company: 'Acme Technologies',
  email: 'jane@acme.tech',
  phone: '+1 (555) 123-4567',
  website: 'acme.tech',
  address: 'San Francisco, CA',
  linkedin: 'https://linkedin.com/in/janedev',
  github: 'https://github.com/janedev',
  twitter: 'https://twitter.com/janedev',
  photoUrl: '',
  logoUrl: '',
  primaryColor: '#1a365d',
  accentColor: '#2b6cb0',
  fontFamily: 'Arial, sans-serif',
  layout: 'horizontal',
  showPhoto: true,
  showLogo: false,
  showDivider: true,
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateSignatureHtml(data: SignatureData): string {
  const c = data.primaryColor;
  const a = data.accentColor;
  const font = data.fontFamily;
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&size=100&background=${a.replace('#', '')}&color=fff`;

  const photoHtml = data.showPhoto
    ? `<td style="padding-right: 20px; vertical-align: top;">
        <img src="${data.photoUrl || avatarFallback}" alt="${escapeHtml(data.fullName)}" width="100" height="100" style="border-radius: 50%; width: 100px; height: 100px; object-fit: cover; border: 2px solid ${a};" />
      </td>`
    : '';

  const nameBlock = `
      <span style="font-size: 18px; font-weight: 700; color: ${c}; display: block; margin-bottom: 2px;">${escapeHtml(data.fullName)}</span>
      <span style="font-size: 14px; color: ${a}; display: block; margin-bottom: ${data.showDivider ? '8px' : '4px'};">${escapeHtml(data.jobTitle)}${data.company ? ' at ' + escapeHtml(data.company) : ''}</span>`;

  const dividerHtml = data.showDivider
    ? `<hr style="border: none; border-top: 1px solid ${a}33; margin: 8px 0;" />`
    : '';

  const iconStyle = `style="display: inline-block; width: 18px; margin-right: 8px; color: ${a}; font-size: 14px;"`;
  const linkStyle = `style="color: ${c}; text-decoration: none; font-size: 14px;"`;
  const cellStyle = 'style="padding: 2px 0; vertical-align: middle;"';

  const contactFields: string[] = [];
  if (data.email) contactFields.push(`<tr><td ${cellStyle}><span ${iconStyle}>&#9993;</span><a href="mailto:${escapeHtml(data.email)}" ${linkStyle}>${escapeHtml(data.email)}</a></td></tr>`);
  if (data.phone) contactFields.push(`<tr><td ${cellStyle}><span ${iconStyle}>&#9742;</span><a href="tel:${escapeHtml(data.phone.replace(/\s/g, ''))}" ${linkStyle}>${escapeHtml(data.phone)}</a></td></tr>`);
  if (data.website) contactFields.push(`<tr><td ${cellStyle}><span ${iconStyle}>&#127760;</span><a href="https://${escapeHtml(data.website.replace(/^https?:\/\//, ''))}" ${linkStyle}>${escapeHtml(data.website)}</a></td></tr>`);
  if (data.address) contactFields.push(`<tr><td ${cellStyle}><span ${iconStyle}>&#128205;</span><span ${linkStyle}>${escapeHtml(data.address)}</span></td></tr>`);

  const contactBlock = contactFields.length
    ? `<table cellpadding="0" cellspacing="0" style="margin-top: 4px;">${contactFields.join('\n')}</table>`
    : '';

  const socialFields: string[] = [];
  if (data.linkedin) socialFields.push(`<a href="${escapeHtml(data.linkedin)}" style="display: inline-block; margin-right: 10px; color: ${c}; text-decoration: none; font-size: 13px;"><span style="color: ${a};">in</span> LinkedIn</a>`);
  if (data.github) socialFields.push(`<a href="${escapeHtml(data.github)}" style="display: inline-block; margin-right: 10px; color: ${c}; text-decoration: none; font-size: 13px;"><span style="color: ${a};">&#8962;</span> GitHub</a>`);
  if (data.twitter) socialFields.push(`<a href="${escapeHtml(data.twitter)}" style="display: inline-block; margin-right: 10px; color: ${c}; text-decoration: none; font-size: 13px;"><span style="color: ${a};">&#120143;</span> Twitter</a>`);

  const socialBlock = socialFields.length
    ? `<div style="margin-top: 8px; font-size: 13px;">${socialFields.join('\n')}</div>`
    : '';

  const logoHtml = data.showLogo
    ? `<td style="padding-left: 20px; vertical-align: middle;">
        <img src="${data.logoUrl || ''}" alt="${escapeHtml(data.company)}" height="40" style="max-height: 40px; width: auto;" />
      </td>`
    : '';

  const isHorizontal = data.layout === 'horizontal' || data.layout === 'compact';

  if (isHorizontal) {
    return `<table cellpadding="0" cellspacing="0" style="font-family: ${font}; max-width: 600px;">
  <tr>
    ${data.showPhoto ? photoHtml : ''}
    <td style="vertical-align: top;">
      ${nameBlock}
      ${dividerHtml}
      ${contactBlock}
      ${socialBlock}
    </td>
    ${data.showLogo ? logoHtml : ''}
  </tr>
</table>`;
  } else {
    const parts: string[] = [];
    if (data.showPhoto) parts.push(`<tr><td style="padding-bottom: 12px;"><img src="${data.photoUrl || avatarFallback}" alt="${escapeHtml(data.fullName)}" width="80" height="80" style="border-radius: 50%; width: 80px; height: 80px; object-fit: cover; border: 2px solid ${a};" /></td></tr>`);
    parts.push(`<tr><td>${nameBlock}</td></tr>`);
    if (data.showDivider) parts.push(`<tr><td>${dividerHtml}</td></tr>`);
    if (contactFields.length) parts.push(`<tr><td>${contactBlock}</td></tr>`);
    if (socialFields.length) parts.push(`<tr><td>${socialBlock}</td></tr>`);
    if (data.showLogo) parts.push(`<tr><td style="padding-top: 12px;"><img src="${data.logoUrl || ''}" alt="${escapeHtml(data.company)}" height="40" style="max-height: 40px; width: auto;" /></td></tr>`);

    return `<table cellpadding="0" cellspacing="0" style="font-family: ${font}; max-width: 450px;">
  ${parts.join('\n  ')}
</table>`;
  }
}

export default function EmailSignatureGeneratorPage() {
  const [data, setData] = useState<SignatureData>(DEFAULT_DATA);
  const [outputTab, setOutputTab] = useState<'preview' | 'html'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);

  const update = useCallback((field: keyof SignatureData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyPreset = useCallback((preset: PresetTemplate) => {
    setData((prev) => ({ ...prev, ...preset.data }));
    toast.success(`Applied "${preset.name}" template`);
  }, []);

  const reset = useCallback(() => {
    setData(DEFAULT_DATA);
    toast.success('Reset to defaults');
  }, []);

  const generatedHtml = useMemo(() => generateSignatureHtml(data), [data]);

  const copyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(generatedHtml);
    toast.success('HTML copied to clipboard');
  }, [generatedHtml]);

  const downloadHtml = useCallback(() => {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-signature.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML file downloaded');
  }, [generatedHtml]);

  const copyRichText = useCallback(() => {
    if (!previewRef.current) return;
    try {
      const htmlBlob = new Blob([generatedHtml], { type: 'text/html' });
      const textBlob = new Blob([previewRef.current.innerText], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      navigator.clipboard.write([clipboardItem]).then(() => {
        toast.success('Rich text signature copied! Paste directly into Gmail/Outlook.');
      }).catch(() => {
        navigator.clipboard.writeText(generatedHtml).then(() => {
          toast.success('HTML copied (use Insert HTML in your email client)');
        });
      });
    } catch {
      navigator.clipboard.writeText(generatedHtml);
      toast.success('HTML copied to clipboard');
    }
  }, [generatedHtml]);

  return (
    <ToolLayout
      title="Email Signature Generator"
      description="Design professional HTML email signatures — customize every detail, preview in real-time, and copy ready-to-use HTML for Gmail, Outlook, Apple Mail, and more."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-2">Templates:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1 text-xs rounded-full border border-slate-600 text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={reset}
            className="ml-auto px-3 py-1 text-xs rounded-full border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <Section title="Personal Info">
            <InputField label="Full Name" value={data.fullName} onChange={(v) => update('fullName', v)} />
            <InputField label="Job Title" value={data.jobTitle} onChange={(v) => update('jobTitle', v)} />
            <InputField label="Company" value={data.company} onChange={(v) => update('company', v)} />
          </Section>

          {/* Contact */}
          <Section title="Contact Details">
            <InputField label="Email" value={data.email} onChange={(v) => update('email', v)} type="email" />
            <InputField label="Phone" value={data.phone} onChange={(v) => update('phone', v)} />
            <InputField label="Website" value={data.website} onChange={(v) => update('website', v)} />
            <InputField label="Address" value={data.address} onChange={(v) => update('address', v)} />
          </Section>

          {/* Social */}
          <Section title="Social Links">
            <InputField label="LinkedIn URL" value={data.linkedin} onChange={(v) => update('linkedin', v)} placeholder="https://linkedin.com/in/..." />
            <InputField label="GitHub URL" value={data.github} onChange={(v) => update('github', v)} placeholder="https://github.com/..." />
            <InputField label="Twitter URL" value={data.twitter} onChange={(v) => update('twitter', v)} placeholder="https://twitter.com/..." />
          </Section>

          {/* Design */}
          <Section title="Design">
            <ColorField label="Primary Color" value={data.primaryColor} onChange={(v) => update('primaryColor', v)} />
            <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => update('accentColor', v)} />
            <SelectField
              label="Font"
              value={data.fontFamily}
              onChange={(v) => update('fontFamily', v)}
              options={[
                { value: 'Arial, sans-serif', label: 'Arial (safe)' },
                { value: 'Georgia, serif', label: 'Georgia (serif)' },
                { value: 'system-ui, sans-serif', label: 'System UI' },
                { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
                { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
                { value: 'Verdana, sans-serif', label: 'Verdana' },
                { value: "'Segoe UI', sans-serif", label: 'Segoe UI' },
              ]}
            />
            <div>
              <label className="block text-xs text-slate-400 mb-1">Layout</label>
              <div className="flex gap-2">
                {(['horizontal', 'vertical', 'compact'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => update('layout', l)}
                    className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${data.layout === l ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                  >
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Toggle label="Show Photo" checked={data.showPhoto} onChange={(v) => update('showPhoto', v)} />
              <Toggle label="Show Logo" checked={data.showLogo} onChange={(v) => update('showLogo', v)} />
              <Toggle label="Divider" checked={data.showDivider} onChange={(v) => update('showDivider', v)} />
            </div>
            {data.showPhoto && (
              <InputField label="Photo URL (optional)" value={data.photoUrl} onChange={(v) => update('photoUrl', v)} placeholder="https://example.com/photo.jpg" />
            )}
            {data.showLogo && (
              <InputField label="Logo URL (optional)" value={data.logoUrl} onChange={(v) => update('logoUrl', v)} placeholder="https://example.com/logo.png" />
            )}
          </Section>
        </div>

        {/* Right: Preview / HTML */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 mb-4">
            <button
              onClick={() => setOutputTab('preview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${outputTab === 'preview' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setOutputTab('html')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${outputTab === 'html' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              HTML Source
            </button>
          </div>

          {outputTab === 'preview' ? (
            <>
              <div className="p-6 rounded-lg bg-white border border-slate-200 mb-4 overflow-x-auto">
                <div ref={previewRef} dangerouslySetInnerHTML={{ __html: generatedHtml }} />
              </div>
              <div className="flex gap-2">
                <button onClick={copyRichText} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Copy Rich Text
                </button>
                <button onClick={copyHtml} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Copy HTML
                </button>
                <button onClick={downloadHtml} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">&quot;Copy Rich Text&quot; copies the formatted signature for direct paste into Gmail/Outlook. &quot;Copy HTML&quot; copies raw HTML for email clients with HTML insertion.</p>
            </>
          ) : (
            <>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                  <code>{generatedHtml}</code>
                </pre>
                <button
                  onClick={copyHtml}
                  className="absolute top-3 right-3 p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  title="Copy HTML"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={downloadHtml} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download .html File
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

/* ── Internal helper components ───────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 font-mono focus:border-brand-500 focus:outline-none transition-colors" />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-brand-500 focus:outline-none transition-colors">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500" />
      <span className="text-xs text-slate-400">{label}</span>
    </label>
  );
}

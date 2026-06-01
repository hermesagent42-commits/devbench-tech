'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Play, Eye, Code2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type DialogMode = 'modal' | 'non-modal';
type DialogPreset = 'confirmation' | 'form' | 'alert' | 'notification' | 'custom';

interface PresetConfig {
  name: string;
  description: string;
  triggerLabel: string;
  dialogTitle: string;
  dialogContent: string;
  dialogStyles: string;
  backdropStyles: string;
  showCloseButton: boolean;
  showForm: boolean;
  returnValue: string;
}

interface DialogConfig {
  preset: DialogPreset;
  mode: DialogMode;
  triggerLabel: string;
  dialogTitle: string;
  dialogContent: string;
  dialogStyles: string;
  backdropStyles: string;
  showCloseButton: boolean;
  showForm: boolean;
  returnValue: string;
  width: string;
  borderRadius: string;
  padding: string;
  backdropColor: string;
  backdropOpacity: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Record<DialogPreset, PresetConfig> = {
  confirmation: {
    name: 'Confirmation',
    description: 'Classic "Are you sure?" delete confirmation dialog',
    triggerLabel: '🗑 Delete Item',
    dialogTitle: 'Confirm Deletion',
    dialogContent:
      '<p style="margin: 0 0 16px 0; color: #94a3b8;">Are you sure you want to delete this item? This action <strong style="color: #f87171;">cannot be undone</strong>.</p>',
    dialogStyles:
      'color: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 12px;\npadding: 24px;\nmax-width: 420px;\nwidth: 90vw;\nbox-shadow: 0 20px 60px rgba(0,0,0,0.5);',
    backdropStyles: 'background: rgba(0,0,0,0.6);\nbackdrop-filter: blur(2px);',
    showCloseButton: true,
    showForm: false,
    returnValue: 'confirmed',
  },
  form: {
    name: 'Signup Form',
    description: 'Modal with a form — method="dialog" auto-closes and returns form data',
    triggerLabel: '📝 Sign Up',
    dialogTitle: 'Create Account',
    dialogContent:
      '<label style="display: block; margin-bottom: 12px;">\n  <span style="display: block; font-size: 13px; color: #94a3b8; margin-bottom: 4px;">Email</span>\n  <input name="email" type="email" placeholder="you@example.com" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font-size: 14px; box-sizing: border-box;" />\n</label>\n<label style="display: block; margin-bottom: 16px;">\n  <span style="display: block; font-size: 13px; color: #94a3b8; margin-bottom: 4px;">Password</span>\n  <input name="password" type="password" placeholder="••••••••" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font-size: 14px; box-sizing: border-box;" />\n</label>',
    dialogStyles:
      'color: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 12px;\npadding: 24px;\nmax-width: 400px;\nwidth: 90vw;\nbox-shadow: 0 20px 60px rgba(0,0,0,0.5);',
    backdropStyles: 'background: rgba(0,0,0,0.6);\nbackdrop-filter: blur(2px);',
    showCloseButton: true,
    showForm: true,
    returnValue: 'submitted',
  },
  alert: {
    name: 'Alert / Notice',
    description: 'Informational alert dialog with a single dismiss button',
    triggerLabel: '🔔 Show Alert',
    dialogTitle: 'Update Available',
    dialogContent:
      '<p style="margin: 0; color: #94a3b8;">A new version of the app is available. Update now to get the latest features and security patches.</p>',
    dialogStyles:
      'color: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 12px;\npadding: 24px;\nmax-width: 400px;\nwidth: 90vw;\nbox-shadow: 0 20px 60px rgba(0,0,0,0.5);',
    backdropStyles: 'background: rgba(0,0,0,0.5);',
    showCloseButton: false,
    showForm: false,
    returnValue: 'ok',
  },
  notification: {
    name: 'Notification Toast',
    description: 'A non-modal dialog used as a toast notification',
    triggerLabel: '💬 Notify',
    dialogTitle: 'Success!',
    dialogContent:
      '<p style="margin: 0; color: #4ade80;">✅ Your changes have been saved successfully.</p>',
    dialogStyles:
      'color: #e2e8f0;\nbackground: #1e293b;\nborder: 1px solid #475569;\nborder-radius: 12px;\npadding: 16px 20px;\nmax-width: 360px;\nwidth: 90vw;\nbox-shadow: 0 4px 20px rgba(0,0,0,0.4);\nanimation: slideIn 0.3s ease;\nposition: fixed;\nbottom: 20px;\nright: 20px;\ntop: auto;\nleft: auto;\nmargin: 0;',
    backdropStyles: '/* no backdrop for notifications */\nbackground: transparent;',
    showCloseButton: true,
    showForm: false,
    returnValue: 'dismissed',
  },
  custom: {
    name: 'Custom',
    description: 'Freeform canvas — style and structure the dialog your way',
    triggerLabel: '✨ Open Dialog',
    dialogTitle: 'Custom Dialog',
    dialogContent:
      '<p style="margin: 0; color: #94a3b8;">Customize every aspect — styling, backdrop, content, and behavior.</p>',
    dialogStyles:
      'color: #e2e8f0;\nbackground: linear-gradient(135deg, #1e293b, #0f172a);\nborder: 1px solid #6366f1;\nborder-radius: 16px;\npadding: 32px;\nmax-width: 500px;\nwidth: 90vw;\nbox-shadow: 0 20px 60px rgba(99,102,241,0.15);',
    backdropStyles: 'background: rgba(0,0,0,0.7);\nbackdrop-filter: blur(4px);',
    showCloseButton: true,
    showForm: false,
    returnValue: 'custom',
  },
};

// ── Code Generation ────────────────────────────────────────────────────────

function generateHTML(config: DialogConfig): string {
  const lines: string[] = [];
  lines.push('<!-- Trigger Button -->');
  lines.push(
    `<button onclick="document.getElementById('myDialog').${config.mode === 'modal' ? "showModal()" : "show()"}">`
  );
  lines.push(`  ${config.triggerLabel}`);
  lines.push('</button>');
  lines.push('');
  lines.push('<!-- Dialog -->');
  lines.push(`<dialog id="myDialog"${config.showForm ? ' method="dialog"' : ''}>`);
  lines.push(`  <h2>${config.dialogTitle}</h2>`);
  for (const line of config.dialogContent.split('\n')) {
    lines.push(`  ${line}`);
  }
  lines.push('  <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">');
  if (config.showCloseButton) {
    lines.push(
      `    <button type="button" onclick="document.getElementById('myDialog').close('${config.returnValue}')">`
    );
    lines.push('      Cancel');
    lines.push('    </button>');
  }
  if (config.showForm) {
    lines.push(
      `    <button type="submit" formmethod="dialog" value="${config.returnValue}">Submit</button>`
    );
  } else if (config.returnValue !== 'dismissed' && config.returnValue !== 'none') {
    lines.push(
      `    <button onclick="document.getElementById('myDialog').close('${config.returnValue}')">OK</button>`
    );
  }
  lines.push('  </div>');
  lines.push('</dialog>');
  return lines.join('\n');
}

function generateCSS(config: DialogConfig): string {
  const lines: string[] = [];
  lines.push('/* Dialog Styles */');
  lines.push('dialog {');
  for (const line of config.dialogStyles.split('\n')) {
    lines.push(`  ${line}`);
  }
  lines.push('}');
  lines.push('');
  lines.push('/* Backdrop Styles */');
  lines.push('dialog::backdrop {');
  for (const line of config.backdropStyles.split('\n')) {
    lines.push(`  ${line}`);
  }
  lines.push('}');
  return lines.join('\n');
}

// ── Tab type ───────────────────────────────────────────────────────────────

type Tab = 'preview' | 'html' | 'css';

// ── Component ──────────────────────────────────────────────────────────────

export default function DialogPlaygroundPage() {
  const [config, setConfig] = useState<DialogConfig>(() => {
    const p = PRESETS.confirmation;
    return {
      preset: 'confirmation',
      mode: 'modal',
      triggerLabel: p.triggerLabel,
      dialogTitle: p.dialogTitle,
      dialogContent: p.dialogContent,
      dialogStyles: p.dialogStyles,
      backdropStyles: p.backdropStyles,
      showCloseButton: p.showCloseButton,
      showForm: p.showForm,
      returnValue: p.returnValue,
      width: '420',
      borderRadius: '12',
      padding: '24',
      backdropColor: '#000000',
      backdropOpacity: '0.6',
    };
  });

  const [tab, setTab] = useState<Tab>('preview');
  const [returnedValue, setReturnedValue] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Apply config updates
  const updateConfig = useCallback((updates: Partial<DialogConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const applyPreset = useCallback(
    (preset: DialogPreset) => {
      const p = PRESETS[preset];
      updateConfig({
        preset,
        mode: preset === 'notification' ? 'non-modal' : 'modal',
        triggerLabel: p.triggerLabel,
        dialogTitle: p.dialogTitle,
        dialogContent: p.dialogContent,
        dialogStyles: p.dialogStyles,
        backdropStyles: p.backdropStyles,
        showCloseButton: p.showCloseButton,
        showForm: p.showForm,
        returnValue: p.returnValue,
      });
    },
    [updateConfig]
  );

  const openDialog = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setReturnedValue(null);
    if (config.mode === 'modal') {
      dialog.showModal();
    } else {
      dialog.show();
    }
  }, [config.mode]);

  const closeDialog = useCallback(
    (value: string) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      dialog.close(value);
    },
    []
  );

  // Listen for close events
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setReturnedValue(dialog.returnValue || 'closed');
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  // Force close any open dialog when switching to non-modal to prevent stuck backdrop
  useEffect(() => {
    return () => {
      dialogRef.current?.close();
    };
  }, []);

  const htmlCode = useMemo(() => generateHTML(config), [config]);
  const cssCode = useMemo(() => generateCSS(config), [config]);

  const handleCopyHTML = useCallback(() => {
    navigator.clipboard.writeText(htmlCode);
    toast.success('HTML copied!');
  }, [htmlCode]);

  const handleCopyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const handleReset = useCallback(() => {
    applyPreset('confirmation');
    setReturnedValue(null);
    toast.success('Reset to default');
  }, [applyPreset]);

  // Generate the dynamic dialog styles
  const dialogInlineStyle = useMemo(() => {
    const style: Record<string, string> = {};
    const parsed = config.dialogStyles.split('\n').reduce(
      (acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('//')) return acc;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return acc;
        const prop = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim().replace(/;$/, '');
        if (prop && value) acc[prop] = value;
        return acc;
      },
      {} as Record<string, string>
    );
    // Convert camelCase to kebab-case for React inline styles
    for (const [key, val] of Object.entries(parsed)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      style[kebabKey] = val;
    }
    return style;
  }, [config.dialogStyles]);

  // Build backdrop style string for the injected <style> tag
  const backdropCSS = useMemo(() => {
    return `::backdrop { ${config.backdropStyles.replace(/\n/g, ' ')} }`;
  }, [config.backdropStyles]);

  return (
    <ToolLayout
      title="Dialog Element Playground"
      description="Experiment with the HTML <dialog> element — modals, non-modals, backdrop styling, form integration, and returnValue. See CSS, HTML, and live preview side-by-side."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => updateConfig({ mode: 'modal' })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                config.mode === 'modal'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              .showModal()
            </button>
            <button
              onClick={() => updateConfig({ mode: 'non-modal' })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                config.mode === 'non-modal'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              .show()
            </button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Presets:</span>
            {(Object.keys(PRESETS) as DialogPreset[]).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  config.preset === key
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {PRESETS[key].name}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 mb-6 border-b border-slate-700">
        {([
          ['preview', Eye, 'Live Preview'],
          ['html', Code2, 'HTML'],
          ['css', Code2, 'CSS'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-5">
          {/* Trigger Button */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trigger Button Label
            </label>
            <input
              type="text"
              value={config.triggerLabel}
              onChange={(e) => updateConfig({ triggerLabel: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Dialog Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dialog Title
            </label>
            <input
              type="text"
              value={config.dialogTitle}
              onChange={(e) => updateConfig({ dialogTitle: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Dialog Content (HTML) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dialog Content <span className="text-xs text-slate-500">(HTML)</span>
            </label>
            <textarea
              value={config.dialogContent}
              onChange={(e) => updateConfig({ dialogContent: e.target.value })}
              rows={6}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-y focus:outline-none focus:border-brand-500/50"
              spellCheck={false}
            />
          </div>

          {/* Dialog Styles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dialog CSS
            </label>
            <textarea
              value={config.dialogStyles}
              onChange={(e) => updateConfig({ dialogStyles: e.target.value })}
              rows={6}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-y focus:outline-none focus:border-brand-500/50"
              spellCheck={false}
            />
          </div>

          {/* Backdrop Styles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Backdrop CSS <span className="text-xs text-slate-500">(::backdrop)</span>
            </label>
            <textarea
              value={config.backdropStyles}
              onChange={(e) => updateConfig({ backdropStyles: e.target.value })}
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-y focus:outline-none focus:border-brand-500/50"
              spellCheck={false}
            />
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showCloseButton}
                onChange={(e) => updateConfig({ showCloseButton: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800 accent-brand-500"
              />
              Show Close Button
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showForm}
                onChange={(e) => updateConfig({ showForm: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800 accent-brand-500"
              />
              Form Mode (method=&quot;dialog&quot;)
            </label>
          </div>

          {/* Return Value */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              returnValue
            </label>
            <input
              type="text"
              value={config.returnValue}
              onChange={(e) => updateConfig({ returnValue: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        {/* Right: Preview / Code */}
        <div className="space-y-4">
          {tab === 'preview' && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300">Live Preview</label>
                {returnedValue !== null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/50">
                    returnValue: &quot;{returnedValue}&quot;
                  </span>
                )}
              </div>

              <div className="relative min-h-[400px] bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                {/* Page background simulation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-slate-600 text-xs absolute top-4 left-4">
                    Simulated page background — click the button
                  </p>

                  {/* Live trigger button */}
                  <button
                    onClick={openDialog}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 inline mr-1.5" />
                    {config.triggerLabel}
                  </button>
                </div>

                {/* Live dialog element */}
                <dialog
                  ref={dialogRef}
                  style={dialogInlineStyle}
                  onClose={(e) => {
                    const dialog = e.currentTarget;
                    setReturnedValue(dialog.returnValue || 'closed');
                  }}
                >
                  <style>{`#dialog-playground-dialog::backdrop { ${config.backdropStyles.replace(/\n/g, ' ')} }`}</style>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      margin: '0 0 16px 0',
                      color: '#e2e8f0',
                    }}
                  >
                    {config.dialogTitle}
                  </h2>
                  <div
                    dangerouslySetInnerHTML={{ __html: config.dialogContent }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      marginTop: '16px',
                    }}
                  >
                    {config.showCloseButton && (
                      <button
                        type="button"
                        onClick={() => closeDialog(config.returnValue)}
                        className="px-3 py-1.5 rounded-md text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 inline mr-1" />
                        Cancel
                      </button>
                    )}
                    {config.showForm ? (
                      <button
                        type="submit"
                        formMethod="dialog"
                        value={config.returnValue}
                        className="px-3 py-1.5 rounded-md text-sm bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        Submit
                      </button>
                    ) : config.returnValue !== 'dismissed' ? (
                      <button
                        onClick={() => closeDialog(config.returnValue)}
                        className="px-3 py-1.5 rounded-md text-sm bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        OK
                      </button>
                    ) : null}
                  </div>
                </dialog>
              </div>
            </div>
          )}

          {tab === 'html' && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-orange-400" />
                  HTML Output
                </label>
                <button
                  onClick={handleCopyHTML}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="min-h-[500px] bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre">
                <code>{htmlCode}</code>
              </pre>
            </div>
          )}

          {tab === 'css' && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  CSS Output
                </label>
                <button
                  onClick={handleCopyCSS}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="min-h-[500px] bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre">
                <code>{cssCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* API Info */}
      <div className="mt-8 p-4 bg-surface-light border border-slate-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">
          💡 HTML {'<dialog>'} API Reference
        </h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li>
            • <strong>.showModal()</strong> — Opens as a modal (blocks page interaction, shows ::backdrop, traps focus)
          </li>
          <li>
            • <strong>.show()</strong> — Opens as a non-modal (page interaction still works, no ::backdrop)
          </li>
          <li>
            • <strong>.close(returnValue?)</strong> — Closes the dialog. Optional string stored in <code>.returnValue</code>
          </li>
          <li>
            • <strong>method=&quot;dialog&quot;</strong> — Form attribute: submit closes dialog instead of navigating. <code>value</code> set on submit button becomes dialog.returnValue
          </li>
          <li>
            • <strong>::backdrop</strong> — Pseudo-element for styling the overlay behind a modal dialog
          </li>
          <li>
            • <strong>close event</strong> — Fires when dialog closes. Access <code>event.target.returnValue</code> for the return value
          </li>
          <li>
            • All changes are <strong>entirely client-side</strong> — no data is sent anywhere.
          </li>
        </ul>
      </div>
    </ToolLayout>
  );
}

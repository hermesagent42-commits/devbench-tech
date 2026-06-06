'use client';

import { useState, useCallback, useRef, type FormEvent } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { CheckCircle, XCircle, AlertTriangle, Info, Copy, Eye, EyeOff, RefreshCw, Code2, Play } from 'lucide-react';
import toast from 'react-hot-toast';

type InputType = 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'date' | 'textarea';

interface FieldConfig {
  id: string;
  label: string;
  type: InputType;
  value: string;
  placeholder: string;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  min: string;
  max: string;
  pattern: string;
  patternDescription: string;
  customError: string;
}

interface ValiditySnapshot {
  valid: boolean;
  valueMissing: boolean;
  typeMismatch: boolean;
  tooShort: boolean;
  tooLong: boolean;
  patternMismatch: boolean;
  rangeUnderflow: boolean;
  rangeOverflow: boolean;
  stepMismatch: boolean;
  badInput: boolean;
  customError: boolean;
  validationMessage: string;
}

const VALIDITY_LABELS: Record<string, string> = {
  valueMissing: 'Value Missing',
  typeMismatch: 'Type Mismatch',
  tooShort: 'Too Short',
  tooLong: 'Too Long',
  patternMismatch: 'Pattern Mismatch',
  rangeUnderflow: 'Range Underflow',
  rangeOverflow: 'Range Overflow',
  stepMismatch: 'Step Mismatch',
  badInput: 'Bad Input',
  customError: 'Custom Error',
};

const VALIDITY_EXPLANATIONS: Record<string, string> = {
  valueMissing: 'The field is required but empty.',
  typeMismatch: "The value doesn't match the expected type (e.g. invalid email).",
  tooShort: 'The value is shorter than minlength.',
  tooLong: 'The value is longer than maxlength.',
  patternMismatch: "The value doesn't match the regex pattern.",
  rangeUnderflow: 'The value is less than the minimum.',
  rangeOverflow: 'The value is greater than the maximum.',
  stepMismatch: "The value doesn't match the step constraint.",
  badInput: 'The browser cannot parse the value.',
  customError: 'A custom validation error set via setCustomValidity().',
};

const PRESETS = [
  {
    label: 'Signup Form',
    description: 'Username, email, password with strength requirements',
    fields: [
      { id: 'username', label: 'Username', type: 'text' as InputType, value: '', placeholder: 'johndoe', required: true, minLength: 3, maxLength: 20, min: '', max: '', pattern: '^[a-zA-Z0-9_]+$', patternDescription: 'Alphanumeric + underscore only', customError: '' },
      { id: 'email', label: 'Email', type: 'email' as InputType, value: '', placeholder: 'john@example.com', required: true, minLength: null, maxLength: null, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
      { id: 'password', label: 'Password', type: 'password' as InputType, value: '', placeholder: 'Min 8 chars, 1 upper, 1 digit', required: true, minLength: 8, maxLength: 128, min: '', max: '', pattern: '^(?=.*[A-Z])(?=.*\\d).+$', patternDescription: 'At least one uppercase letter and one digit', customError: '' },
    ],
  },
  {
    label: 'Product Form',
    description: 'Product name, price range, URL',
    fields: [
      { id: 'product', label: 'Product Name', type: 'text' as InputType, value: '', placeholder: 'Widget Pro', required: true, minLength: 2, maxLength: 100, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
      { id: 'price', label: 'Price', type: 'number' as InputType, value: '', placeholder: '99.99', required: true, minLength: null, maxLength: null, min: '0.01', max: '99999.99', pattern: '', patternDescription: '', customError: '' },
      { id: 'url', label: 'Product URL', type: 'url' as InputType, value: '', placeholder: 'https://shop.example.com/widget', required: false, minLength: null, maxLength: null, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
    ],
  },
  {
    label: 'Contact Form',
    description: 'Name, email, phone, message',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text' as InputType, value: '', placeholder: 'Jane Smith', required: true, minLength: 2, maxLength: null, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
      { id: 'email', label: 'Email', type: 'email' as InputType, value: '', placeholder: 'jane@example.com', required: true, minLength: null, maxLength: null, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
      { id: 'phone', label: 'Phone', type: 'tel' as InputType, value: '', placeholder: '+1 (555) 000-0000', required: false, minLength: null, maxLength: null, min: '', max: '', pattern: '^\\+?[\\d\\s\\-\\(\\)]{7,15}$', patternDescription: 'Valid phone format, 7-15 digits', customError: '' },
      { id: 'message', label: 'Message', type: 'textarea' as InputType, value: '', placeholder: 'How can we help?', required: true, minLength: 10, maxLength: 1000, min: '', max: '', pattern: '', patternDescription: '', customError: '' },
    ],
  },
  {
    label: 'Custom Rules',
    description: 'Regex pattern matching, length constraints, range limits',
    fields: [
      { id: 'code', label: 'Discount Code', type: 'text' as InputType, value: '', placeholder: 'SAVE20-2026', required: true, minLength: 5, maxLength: 20, min: '', max: '', pattern: '^[A-Z]+\\d+-\\d{4}$', patternDescription: 'UPPERCASE digits-YYYY format', customError: '' },
      { id: 'quantity', label: 'Quantity', type: 'number' as InputType, value: '', placeholder: '5', required: true, minLength: null, maxLength: null, min: '1', max: '100', pattern: '', patternDescription: '', customError: '' },
      { id: 'hex', label: 'Hex Color', type: 'text' as InputType, value: '', placeholder: '#FF5733', required: false, minLength: null, maxLength: null, min: '', max: '', pattern: '^#[0-9a-fA-F]{6}$', patternDescription: 'Valid 6-digit hex color', customError: '' },
    ],
  },
];

export default function FormValidationPlayground() {
  const [fields, setFields] = useState<FieldConfig[]>(PRESETS[0].fields.map(f => ({ ...f })));
  const [validities, setValidities] = useState<Record<string, ValiditySnapshot>>({});
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [activePreset, setActivePreset] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const validateField = useCallback((field: FieldConfig) => {
    const el = inputRefs.current[field.id];
    if (!el) return;

    if (field.customError) {
      if ('setCustomValidity' in el) (el as HTMLInputElement).setCustomValidity(field.customError);
    } else {
      if ('setCustomValidity' in el) (el as HTMLInputElement).setCustomValidity('');
    }

    const v = 'validity' in el ? (el as HTMLInputElement).validity : null;
    const snapshot: ValiditySnapshot = {
      valid: 'checkValidity' in el ? (el as HTMLInputElement).checkValidity() : true,
      valueMissing: v?.valueMissing ?? false,
      typeMismatch: v?.typeMismatch ?? false,
      tooShort: v?.tooShort ?? false,
      tooLong: v?.tooLong ?? false,
      patternMismatch: v?.patternMismatch ?? false,
      rangeUnderflow: v?.rangeUnderflow ?? false,
      rangeOverflow: v?.rangeOverflow ?? false,
      stepMismatch: v?.stepMismatch ?? false,
      badInput: v?.badInput ?? false,
      customError: v?.customError ?? false,
      validationMessage: 'validationMessage' in el ? (el as HTMLInputElement).validationMessage : '',
    };
    setValidities(prev => ({ ...prev, [field.id]: snapshot }));
  }, []);

  const validateAll = useCallback(() => {
    const newAttempted: Record<string, boolean> = {};
    fields.forEach(f => {
      newAttempted[f.id] = true;
      validateField(f);
    });
    setAttempted(newAttempted);
  }, [fields, validateField]);

  const loadPreset = useCallback((index: number) => {
    const preset = PRESETS[index];
    setFields(preset.fields.map(f => ({ ...f })));
    setValidities({});
    setAttempted({});
    setShowPassword({});
    setActivePreset(index);
    setShowCode(false);
  }, []);

  const updateFieldVal = useCallback((id: string, value: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    setAttempted(prev => ({ ...prev, [id]: true }));
  }, []);

  const updateFieldConfig = useCallback((id: string, updates: Partial<FieldConfig>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    setAttempted(prev => ({ ...prev, [id]: true }));
  }, []);

  // Validate after state updates
  const handleBlur = useCallback((field: FieldConfig) => {
    setAttempted(prev => ({ ...prev, [field.id]: true }));
    setTimeout(() => validateField(field), 0);
  }, [validateField]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    validateAll();
    setTimeout(() => {
      const allValid = fields.every(f => {
        const el = inputRefs.current[f.id];
        return el && 'checkValidity' in el ? (el as HTMLInputElement).checkValidity() : true;
      });
      if (allValid && fields.every(f => inputRefs.current[f.id])) {
        toast.success('All fields are valid! Form would submit successfully.');
      }
    }, 50);
  }, [validateAll, fields]);

  const generateCode = useCallback(() => {
    const lines: string[] = ['<form novalidate>'];
    fields.forEach(f => {
      const attrs: string[] = [];
      if (f.required) attrs.push('required');
      if (f.minLength) attrs.push(`minlength="${f.minLength}"`);
      if (f.maxLength) attrs.push(`maxlength="${f.maxLength}"`);
      if (f.min) attrs.push(`min="${f.min}"`);
      if (f.max) attrs.push(`max="${f.max}"`);
      if (f.pattern) attrs.push(`pattern="${f.pattern}"`);

      if (f.type === 'textarea') {
        lines.push(`  <textarea id="${f.id}" name="${f.id}"`);
        if (attrs.length) lines.push(`    ${attrs.join('\n    ')}`);
        lines.push(`    placeholder="${f.placeholder}"></textarea>`);
      } else {
        lines.push(`  <input type="${f.type}" id="${f.id}" name="${f.id}"`);
        lines.push(`    placeholder="${f.placeholder}"`);
        if (attrs.length) lines.push(`    ${attrs.join('\n    ')}`);
        lines.push(`  />`);
      }
    });
    lines.push('  <button type="submit">Submit</button>');
    lines.push('</form>');
    return lines.join('\n');
  }, [fields]);

  const copyCode = useCallback(() => {
    const code = generateCode();
    navigator.clipboard.writeText(code).then(() => {
      toast.success('HTML copied to clipboard!');
    });
  }, [generateCode]);

  const validityKeys = ['valueMissing', 'typeMismatch', 'tooShort', 'tooLong', 'patternMismatch', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput', 'customError'];

  return (
    <ToolLayout
      title="Form Validation Playground"
      description="Explore the HTML5 Constraint Validation API — test required, pattern, min/max, type validation, and custom errors with live feedback."
    >
      {/* Preset Selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => loadPreset(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePreset === i
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-surface-light border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-3 space-y-6">
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
            {fields.map(field => {
              const validity = validities[field.id];
              const isAttempted = attempted[field.id];
              const isValid = validity?.valid;
              const showFeedback = isAttempted;

              return (
                <div key={field.id} className="space-y-1.5">
                  <label
                    htmlFor={`field-${field.id}`}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    {field.label}
                    {field.required && <span className="text-red-400 text-xs">*required</span>}
                    {showFeedback && isValid && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {showFeedback && !isValid && <XCircle className="w-4 h-4 text-red-400" />}
                  </label>

                  <div className="relative">
                    {field.type === 'textarea' ? (
                      <textarea
                        ref={(el) => { inputRefs.current[field.id] = el; }}
                        id={`field-${field.id}`}
                        value={field.value}
                        onChange={e => updateFieldVal(field.id, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        placeholder={field.placeholder}
                        required={field.required}
                        minLength={field.minLength ?? undefined}
                        maxLength={field.maxLength ?? undefined}
                        rows={3}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-mono transition-all outline-none resize-y min-h-[80px] ${
                          showFeedback && isValid
                            ? 'bg-slate-900/80 border border-emerald-500/50 text-slate-200'
                            : showFeedback && !isValid
                            ? 'bg-slate-900/80 border border-red-500/50 text-slate-200'
                            : 'bg-slate-900/80 border border-slate-700/50 text-slate-200'
                        }`}
                      />
                    ) : (
                      <input
                        ref={(el) => { inputRefs.current[field.id] = el as HTMLInputElement; }}
                        id={`field-${field.id}`}
                        type={field.type === 'password' && showPassword[field.id] ? 'text' : field.type}
                        value={field.value}
                        onChange={e => updateFieldVal(field.id, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        placeholder={field.placeholder}
                        required={field.required}
                        minLength={field.minLength ?? undefined}
                        maxLength={field.maxLength ?? undefined}
                        min={field.min || undefined}
                        max={field.max || undefined}
                        pattern={field.pattern || undefined}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-mono transition-all outline-none ${
                          showFeedback && isValid
                            ? 'bg-slate-900/80 border border-emerald-500/50 text-slate-200'
                            : showFeedback && !isValid
                            ? 'bg-slate-900/80 border border-red-500/50 text-slate-200'
                            : 'bg-slate-900/80 border border-slate-700/50 text-slate-200'
                        }${field.type === 'password' ? ' pr-10' : ''}`}
                      />
                    )}
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword[field.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {showFeedback && !isValid && validity?.validationMessage && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {validity.validationMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {field.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">required</span>}
                    {field.minLength && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">minlength={field.minLength}</span>}
                    {field.maxLength && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">maxlength={field.maxLength}</span>}
                    {field.min && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">min={field.min}</span>}
                    {field.max && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">max={field.max}</span>}
                    {field.pattern && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400/80 font-mono">pattern</span>}
                    {field.customError && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 font-mono">customError</span>}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
                <Play className="w-4 h-4" />Validate All
              </button>
              <button
                type="button"
                onClick={() => {
                  setFields(fields.map(f => ({ ...f, value: '' })));
                  setValidities({});
                  setAttempted({});
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />Reset
              </button>
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  showCode ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />HTML
              </button>
            </div>
          </form>

          {showCode && (
            <div className="rounded-xl bg-slate-900 border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700/50">
                <span className="text-xs font-medium text-slate-400">Generated HTML</span>
                <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors">
                  <Copy className="w-3 h-3" />Copy
                </button>
              </div>
              <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre">{generateCode()}</pre>
            </div>
          )}
        </div>

        {/* Validity Inspector Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" />Form Status
            </h3>
            {Object.keys(attempted).length === 0 ? (
              <p className="text-xs text-slate-500">Interact with the form to see validation results.</p>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">All fields valid</span>
              </div>
            )}
          </div>

          {fields.map(field => {
            const validity = validities[field.id];
            if (!validity) return null;
            const flags = validityKeys.filter(k => (validity as any)[k]);
            const hasIssues = flags.length > 0;

            return (
              <div key={`v-${field.id}`} className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  {validity.valid ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  {field.label}
                </h4>
                {!hasIssues ? (
                  <p className="text-xs text-slate-500">No validity flags raised.</p>
                ) : (
                  <div className="space-y-2">
                    {flags.map(flag => (
                      <div key={flag} className="rounded-lg bg-red-900/10 border border-red-500/20 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-400 font-mono">{VALIDITY_LABELS[flag]}</span>
                          <span className="text-[10px] text-slate-500">validity.{flag}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{VALIDITY_EXPLANATIONS[flag]}</p>
                      </div>
                    ))}
                  </div>
                )}
                <details className="mt-3">
                  <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">Show all validity states</summary>
                  <div className="mt-2 space-y-1">
                    {validityKeys.map(k => (
                      <div key={k} className="flex items-center justify-between text-[10px]">
                        <span className={(validity as any)[k] ? 'text-red-400' : 'text-slate-600'}>validity.{k}</span>
                        <span className={(validity as any)[k] ? 'text-red-400 font-mono' : 'text-slate-700 font-mono'}>{(validity as any)[k] ? 'true' : 'false'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}

          {/* Custom Error Panel */}
          <div className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />Custom Error
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Apply a custom <code className="text-amber-400/80 bg-slate-800 px-1 rounded">setCustomValidity()</code> error to any field.
            </p>
            <div className="space-y-2">
              {fields.map(f => (
                <div key={`custom-${f.id}`} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">{f.label}</span>
                  <input
                    type="text"
                    placeholder="Custom error message"
                    value={f.customError}
                    onChange={e => updateFieldConfig(f.id, { customError: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50 text-xs font-mono text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* API Reference */}
          <div className="rounded-xl bg-surface-light border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Constraint Validation API</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">element.checkValidity()</code> — returns <span className="text-slate-300">true/false</span></p>
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">element.reportValidity()</code> — shows browser tooltip</p>
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">element.setCustomValidity(msg)</code> — set custom error</p>
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">element.validity</code> — <span className="text-slate-300">ValidityState</span> object</p>
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">element.validationMessage</code> — current error message</p>
              <p><code className="text-brand-400/80 bg-slate-800 px-1 rounded">:valid / :invalid</code> — CSS pseudo-classes</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

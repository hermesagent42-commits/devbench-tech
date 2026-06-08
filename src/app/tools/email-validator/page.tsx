'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Mail, Check, X, AlertTriangle, Info, Shield, Zap, Search, ChevronRight, AtSign, Globe, Server, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: Issue[];
  details: DetailBlock[];
  suggestion: string | null;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface DetailBlock {
  label: string;
  value: string;
  icon: React.ReactNode;
}

// ── Data ───────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '20minutemail.com', '30minutemail.net', 'abandon.email',
  'anonbox.net', 'anonymbox.com', 'bcaoo.com', 'bisker.net', 'boxomail.live',
  'byom.de', 'cazic.com', 'cazis.com', 'chacuo.net', 'creou.com',
  'daymail.life', 'devbin.xyz', 'disbox.net', 'discard.email',
  'discardmail.com', 'dispostable.com', 'dodsi.com', 'dropsin.net',
  'easytrashmail.com', 'emailfake.com', 'emailnax.com', 'emlhub.com',
  'emlpro.com', 'emltmp.com', 'fake-mail.net', 'fakemail.net',
  'fightallspam.com', 'getnada.com', 'gmail.com.vc', 'gorillasign.com',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.org',
  'guerrillamail.net', 'guerrillamailblock.com', 'gustr.com',
  'harakirimail.com', 'hidemyass.com', 'idrrate.com', 'inboxalias.com',
  'inboxbear.com', 'inboxkitten.com', 'incognitomail.com',
  'instant-email.org', 'ip6.li', 'irish2me.com', 'jetable.org',
  'klassmaster.com', 'klzlk.com', 'kosmetikobat.com', 'linshiyou.com',
  'linshiyouxiang.net', 'lroid.com', 'mail-temp.com', 'mail.by',
  'mail.mailinator.com', 'mail0.ga', 'mail114.net', 'mail1a.de',
  'mail2paste.com', 'mail2run.com', 'mail3.dovecot.ovh', 'mail3.waw.pl',
  'mailboxy.fun', 'mailcat.biz', 'mailcatch.com', 'maildrop.cc',
  'mailexpire.com', 'mailfa.tk', 'mailguard.me', 'mailimate.com',
  'mailinater.com', 'mailinator.com', 'mailincubator.com',
  'mailismagic.com', 'mailmate.com', 'mailme.gg', 'mailmetrash.com',
  'mailnesia.com', 'mailnull.com', 'mailpox.com', 'mailsac.com',
  'mailshiv.com', 'mailslite.com', 'mailtemp.net', 'mailtemp.uk',
  'mailtempt.com', 'mailto.space', 'mailtothis.com', 'mailtrash.net',
  'mailxtr.eu', 'mintemail.com', 'moakt.com', 'mohmal.com',
  'monmail.top', 'moxkid.com', 'msft.co', 'mukudom.net',
  'mybx.site', 'mydemo.equipment', 'mytrashmail.com', 'nada.email',
  'nada.ltd', 'nepwk.com', 'nwytg.com', 'nwytg.net', 'oneoffmail.com',
  'onewaymail.com', 'oopi.org', 'opende.de', 'opposir.com',
  'parkers.tech', 'pookmail.com', 'privacy-mail.top', 'private-mail.site',
  'proxymail.eu', 'rcpt.at', 're-gister.com', 'row-keeper.com',
  'safemail.icu', 'seosla.com', 'sharklasers.com', 'shitmail.org',
  'simplemail.top', 'siteposter.net', 'spl.email', 'spoofmail.de',
  'squizzy.de', 'squizzy.eu', 'squizzy.net', 'supere.ml',
  't.woeishyang.com', 'teewars.org', 'temp-mail.io', 'temp-mail.org',
  'tempail.com', 'tempemail.net', 'tempmail.cn', 'tempmail.de',
  'tempmail.eu', 'tempmail.it', 'tempmail.ninja', 'tempmail.plus',
  'tempmail.us', 'tempmail.website', 'tempmails.org', 'temporarioemail.com.br',
  'temporary-mail.net', 'temporaryemail.net', 'temporarymail.com',
  'thraml.com', 'throwaway.email', 'tmpeml.com', 'tmpmail.org',
  'travala10.com', 'trashmail.at', 'trashmail.com', 'trashmail.de',
  'trashmail.io', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
  'trashmails.com', 'trialmail.de', 'txcct.com', 'tyldd.com',
  'uggsrock.com', 'wegwerf-email.at', 'wegwerf-email.de',
  'wegwerf-email.net', 'wegwerfadresse.de', 'wegwerfemail.com',
  'whyspam.me', 'wiihack.com', 'willhackforfood.biz', 'wuzak.com',
  'xagfy.co', 'xww.ro', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'yopmail.org', 'zeptomail.eu', 'zmail.info', 'zoho.eu',
]);

const ROLE_PREFIXES = [
  'abuse', 'admin', 'administration', 'billing', 'commercial', 'contact',
  'devnull', 'domain', 'email', 'hello', 'help', 'hostmaster', 'info',
  'inquiries', 'jobs', 'list', 'list-request', 'mail', 'marketing',
  'newsletter', 'noc', 'no-reply', 'noreply', 'noreply-', 'office',
  'operations', 'post', 'postmaster', 'press', 'privacy', 'register',
  'root', 'sales', 'security', 'service', 'spam', 'support', 'team',
  'technical', 'test', 'usenet', 'users', 'webmaster', 'www',
  'web', 'info@', 'contact@',
];

// ── Typo Map (common misspellings → correct domain) ────────────────────────

const TYPO_MAP: Record<string, string> = {
  'gmail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'hotmail.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'yahoo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoocom': 'yahoo.com',
  'outlook.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outloo.com': 'outlook.com',
  'protonmail.com': 'protonmail.com',
  'proton.com': 'protonmail.com',
  'protomail.com': 'protonmail.com',
  'icloud.com': 'icloud.com',
  'iclud.com': 'icloud.com',
  'icould.com': 'icloud.com',
  'aol.com': 'aol.com',
  'live.com': 'live.com',
  'live.cm': 'live.com',
  'fastmail.com': 'fastmail.com',
  'fastmal.com': 'fastmail.com',
  'mail.com': 'mail.com',
  'ymail.com': 'yahoo.com',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function validateEmail(email: string): ValidationResult {
  const issues: Issue[] = [];
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      score: 0,
      issues: [{ severity: 'error', message: 'Email address is empty' }],
      details: [],
      suggestion: null,
    };
  }

  // Check for basic structure
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount === 0) {
    issues.push({ severity: 'error', message: 'Missing @ symbol — an email must contain exactly one @ character' });
    return { isValid: false, score: 5, issues, details: [], suggestion: null };
  }
  if (atCount > 1) {
    issues.push({ severity: 'error', message: `Found ${atCount} @ symbols — an email must have exactly one` });
    return { isValid: false, score: 5, issues, details: [], suggestion: null };
  }

  const [localPart, domain] = trimmed.split('@');

  // Check local part
  if (!localPart) {
    issues.push({ severity: 'error', message: 'Missing local part — nothing before the @ symbol' });
    return { isValid: false, score: 10, issues, details: [], suggestion: null };
  }
  if (localPart.length > 64) {
    issues.push({ severity: 'error', message: `Local part is ${localPart.length} characters — maximum is 64` });
  }

  // Check for consecutive dots
  if (localPart.includes('..')) {
    issues.push({ severity: 'error', message: 'Local part contains consecutive dots (..) which is invalid' });
  }

  // Check starts/ends with dot
  if (localPart.startsWith('.')) {
    issues.push({ severity: 'error', message: 'Local part starts with a dot — not allowed by RFC 5321' });
  }
  if (localPart.endsWith('.')) {
    issues.push({ severity: 'error', message: 'Local part ends with a dot — not allowed by RFC 5321' });
  }

  // Check for invalid characters in local part
  const localInvalid = localPart.match(/[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]/g);
  if (localInvalid) {
    const unique = [...new Set(localInvalid)];
    issues.push({
      severity: 'error',
      message: `Invalid character${unique.length > 1 ? 's' : ''} in local part: ${unique.map(c => `'${c}'`).join(', ')}`,
    });
  }

  // Check domain
  if (!domain) {
    issues.push({ severity: 'error', message: 'Missing domain — nothing after the @ symbol' });
    return { isValid: false, score: 10, issues, details: [], suggestion: null };
  }

  // Full RFC email regex (simplified but strict)
  const rfcRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const passesRFC = rfcRegex.test(trimmed);

  if (!passesRFC) {
    issues.push({ severity: 'error', message: 'Does not match RFC 5321/5322 email format specification' });
  }

  // Domain-level checks
  if (domain.length > 255) {
    issues.push({ severity: 'error', message: `Domain is ${domain.length} characters — maximum is 255` });
  }

  if (!domain.includes('.')) {
    issues.push({ severity: 'error', message: 'Domain has no dot — missing TLD (e.g., .com, .org, .dev)' });
  }

  const tld = domain.split('.').pop()?.toLowerCase() || '';
  if (tld.length < 2) {
    issues.push({ severity: 'error', message: `TLD "${tld}" is too short — must be at least 2 characters` });
  }

  // Check for IP address as domain (valid but unusual)
  const ipRegex = /^\[?(\d{1,3}\.){3}\d{1,3}\]?$/;
  const isIP = ipRegex.test(domain.replace(/^\[/, '').replace(/\]$/, ''));
  if (isIP) {
    issues.push({ severity: 'info', message: 'Domain is an IP address — technically valid but unusual for production' });
  }

  // Check for double dots in domain
  if (domain.includes('..')) {
    issues.push({ severity: 'error', message: 'Domain contains consecutive dots (..) which is invalid' });
  }

  // Disposable email check
  if (DISPOSABLE_DOMAINS.has(domain.toLowerCase())) {
    issues.push({ severity: 'warning', message: 'Domain is a known disposable/temporary email provider' });
  }

  // Role-based check
  const localLower = localPart.toLowerCase();
  for (const prefix of ROLE_PREFIXES) {
    if (localLower === prefix || localLower.startsWith(prefix + '@')) {
      issues.push({ severity: 'info', message: `"${localPart}" is a role-based address — may be monitored by multiple people` });
      break;
    }
  }

  // Typo detection
  let suggestion: string | null = null;
  const domainLower = domain.toLowerCase();
  for (const [misspelling, correct] of Object.entries(TYPO_MAP)) {
    if (domainLower === misspelling) {
      suggestion = localPart + '@' + correct;
      issues.push({
        severity: 'warning',
        message: `Did you mean ${correct}? "${domain}" looks like a typo`,
      });
      break;
    }
  }

  // Calculate score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let score = 100;
  score -= errorCount * 20;
  score -= warningCount * 8;
  score = Math.max(0, Math.min(100, score));

  if (!trimmed) score = 0;
  if (errorCount > 0) score = Math.min(score, 50);

  const isValid = errorCount === 0;

  // Details
  const details: DetailBlock[] = [
    { label: 'Local part', value: localPart, icon: <User className="w-4 h-4" /> },
    { label: 'Domain', value: domain, icon: <Globe className="w-4 h-4" /> },
    { label: 'TLD', value: tld.toUpperCase(), icon: <Hash className="w-4 h-4" /> },
    { label: 'Total length', value: `${trimmed.length} characters`, icon: <Server className="w-4 h-4" /> },
    { label: 'RFC compliant', value: passesRFC ? 'Yes' : 'No', icon: <Shield className="w-4 h-4" /> },
    { label: 'Format', value: isIP ? 'IP-based' : 'Standard domain', icon: <AtSign className="w-4 h-4" /> },
  ];

  return { isValid, score, issues, details, suggestion };
}

// ── Score badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    score >= 70 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
    score >= 40 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
    'text-red-400 bg-red-500/10 border-red-500/30';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${color}`}>
      <Zap className="w-3.5 h-3.5" />
      {score}/100
    </div>
  );
}

// ── Severity icon ——————————————————————————————————————————————————————————

function SeverityIcon({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  switch (severity) {
    case 'error': return <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
    case 'info': return <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

const EXAMPLE_EMAILS = [
  'user@example.com',
  'invalid-email',
  'test@gmail.com',
  'user@tempmail.com',
  'admin@company.co.uk',
  'noreply@newsletter.io',
  'user@192.168.1.1',
  'user@hotmal.com',
];

export default function EmailValidatorPage() {
  const [input, setInput] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const result = useMemo(() => validateEmail(input), [input]);

  const clear = useCallback(() => setInput(''), []);

  const copyResult = useCallback(() => {
    const lines = [
      `Email Validator Results`,
      `=======================`,
      `Email:  ${input || '(empty)'}`,
      `Valid:  ${result.isValid ? 'Yes ✓' : 'No ✗'}`,
      `Score:  ${result.score}/100`,
      ``,
      ...result.details.map(d => `${d.label}: ${d.value}`),
      ``,
      ...result.issues.length > 0 ? ['Issues:', ...result.issues.map(i => `  [${i.severity.toUpperCase()}] ${i.message}`)] : [],
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Results copied!'),
      () => toast.error('Copy failed')
    );
  }, [input, result]);

  const applyExample = useCallback((email: string) => {
    setInput(email);
    setShowExamples(false);
  }, []);

  return (
    <ToolLayout
      title="Email Validator"
      description="Validate email addresses with RFC compliance checking, typo detection, disposable email warnings, role-based detection, and quality scoring — all client-side."
    >
      {/* Input area */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-400" />
            Email Address
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              Examples
            </button>
            {input && (
              <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showExamples && (
          <div className="flex flex-wrap gap-2 mb-3">
            {EXAMPLE_EMAILS.map((ex) => (
              <button
                key={ex}
                onClick={() => applyExample(ex)}
                className="px-2.5 py-1 rounded-md bg-surface-lighter border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:border-brand-500/30 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="email"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter an email address to validate..."
            className="w-full px-4 py-3 bg-transparent border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 font-mono text-sm pr-10"
          />
          {input && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {result.isValid ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <X className="w-5 h-5 text-red-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {input && (
        <>
          {/* Score & status bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-lg bg-surface border border-slate-700/50">
            <ScoreBadge score={result.score} />
            <div className="flex items-center gap-2">
              {result.isValid ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  Valid email address
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
                  <X className="w-4 h-4" />
                  Invalid — {result.issues.filter(i => i.severity === 'error').length} issue{result.issues.filter(i => i.severity === 'error').length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            {result.suggestion && (
              <button
                onClick={() => setInput(result.suggestion!)}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 text-xs font-medium hover:bg-brand-500/30 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Fix: {result.suggestion}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {result.details.map((detail) => (
              <div key={detail.label} className="card p-3 flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  {detail.icon}
                  {detail.label}
                </span>
                <span className="text-sm text-white font-mono truncate">{detail.value}</span>
              </div>
            ))}
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <div className="card mb-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Issues ({result.issues.length})
              </h3>
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 p-3 rounded-lg text-sm ${
                      issue.severity === 'error' ? 'bg-red-500/5 border border-red-500/10' :
                      issue.severity === 'warning' ? 'bg-yellow-500/5 border border-yellow-500/10' :
                      'bg-blue-500/5 border border-blue-500/10'
                    }`}
                  >
                    <SeverityIcon severity={issue.severity} />
                    <span className={
                      issue.severity === 'error' ? 'text-red-300' :
                      issue.severity === 'warning' ? 'text-yellow-300' :
                      'text-blue-300'
                    }>
                      {issue.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perfect score message */}
          {result.score === 100 && (
            <div className="card border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-emerald-300 font-semibold text-sm">Perfect score!</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">This email passes all validation checks including RFC compliance and best-practice heuristics.</p>
              </div>
            </div>
          )}

          {/* Copy results button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={copyResult}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-lighter border border-slate-700/50 text-slate-300 hover:text-white text-sm hover:border-brand-500/30 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy full results
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!input && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-brand-400" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Enter an email to validate</h3>
          <p className="text-slate-400 text-sm max-w-md">
            Get instant feedback on email validity, RFC compliance, domain health, and quality scoring.
            Paste any email address above to get started.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {EXAMPLE_EMAILS.slice(0, 4).map((ex) => (
              <button
                key={ex}
                onClick={() => applyExample(ex)}
                className="px-3 py-1.5 rounded-lg bg-surface-lighter border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:border-brand-500/30 transition-colors font-mono"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

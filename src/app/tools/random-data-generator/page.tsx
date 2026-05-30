'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Download, Trash2, User, Mail, Phone, MapPin, Building2, Briefcase, CreditCard, Hash, Calendar, FileText, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Data pools ────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Abigail', 'Michael', 'Emily', 'Sebastian', 'Ella', 'Jack', 'Avery', 'Owen', 'Scarlett', 'William',
  'Grace', 'Samuel', 'Chloe', 'Joseph', 'Victoria', 'David', 'Riley', 'Andrew', 'Aria', 'Gabriel',
  'Lily', 'Dylan', 'Zoey', 'Christopher', 'Penelope', 'Joshua', 'Layla', 'Logan', 'Nora', 'Nathan',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green',
  'Adams', 'Baker', 'Hall', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips',
];

const STREETS = [
  'Main St', 'Oak Ave', 'Elm Rd', 'Cedar Ln', 'Maple Dr', 'Pine Ct', 'Birch Way', 'Walnut Blvd',
  'Lake View Dr', 'Sunset Blvd', 'Highland Ave', 'Park Rd', 'River Rd', 'Forest Ln', 'Meadow Way',
  'Willow St', 'Cherry Ln', 'Springfield Ave', 'Washington St', 'Adams Blvd',
];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
  'San Diego', 'Dallas', 'Austin', 'San Jose', 'Seattle', 'Denver', 'Nashville', 'Portland',
  'Boston', 'Atlanta', 'Miami', 'Minneapolis', 'Salt Lake City',
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY',
];

const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'proton.me', 'icloud.com', 'example.com', 'company.org', 'startup.io'];

const COMPANIES = [
  'TechNova Solutions', 'Quantum Dynamics', 'Atlas Robotics', 'Nimbus Cloud', 'Stellar Analytics',
  'Apex Ventures', 'Vertex Systems', 'Orion Labs', 'Fusion Tech', 'Helios Data',
  'Prism Innovations', 'Nova Corp', 'Cypher Security', 'Zenith Digital', 'Synapse AI',
];

const JOB_TITLES = [
  'Software Engineer', 'Product Manager', 'UX Designer', 'Data Scientist', 'DevOps Engineer',
  'Full Stack Developer', 'Engineering Manager', 'CTO', 'QA Engineer', 'Security Analyst',
  'Frontend Developer', 'Backend Engineer', 'Systems Architect', 'Technical Lead', 'Machine Learning Engineer',
];

const CREDIT_PREFIXES: Record<string, string> = {
  'Visa': '4',
  'MasterCard': '5',
  'Amex': '34',
  'Discover': '6011',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function luhnChecksum(cardNumber: string): number {
  let sum = 0;
  let double = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return (sum * 9) % 10;
}

function formatPhone(raw: string, format: string): string {
  let digits = raw;
  if (format === '(xxx) xxx-xxxx') return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
  if (format === 'xxx-xxx-xxxx') return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
  if (format === 'xxx.xxx.xxxx') return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,10)}`;
  return digits;
}

// ── Generators ─────────────────────────────────────────────────────────────

const generators: Record<string, { label: string; icon: typeof User; generate: () => string }> = {
  fullName: {
    label: 'Full Name',
    icon: User,
    generate: () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
  },
  firstName: {
    label: 'First Name',
    icon: User,
    generate: () => pick(FIRST_NAMES),
  },
  lastName: {
    label: 'Last Name',
    icon: User,
    generate: () => pick(LAST_NAMES),
  },
  email: {
    label: 'Email Address',
    icon: Mail,
    generate: () => {
      const name = `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}${randInt(1, 999)}`;
      return `${name}@${pick(DOMAINS)}`;
    },
  },
  phone: {
    label: 'Phone Number',
    icon: Phone,
    generate: () => {
      const digits = `${randInt(200, 999)}${randInt(200, 999)}${randInt(1000, 9999)}`;
      return formatPhone(digits, '(xxx) xxx-xxxx');
    },
  },
  streetAddress: {
    label: 'Street Address',
    icon: MapPin,
    generate: () => `${randInt(10, 9999)} ${pick(STREETS)}`,
  },
  city: {
    label: 'City',
    icon: MapPin,
    generate: () => pick(CITIES),
  },
  state: {
    label: 'State',
    icon: MapPin,
    generate: () => pick(STATES),
  },
  zipCode: {
    label: 'ZIP Code',
    icon: MapPin,
    generate: () => `${randInt(10000, 99999)}`,
  },
  fullAddress: {
    label: 'Full Address',
    icon: MapPin,
    generate: () => `${randInt(10, 9999)} ${pick(STREETS)}, ${pick(CITIES)}, ${pick(STATES)} ${randInt(10000, 99999)}`,
  },
  country: {
    label: 'Country',
    icon: Globe,
    generate: () => pick(['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Spain']),
  },
  company: {
    label: 'Company Name',
    icon: Building2,
    generate: () => pick(COMPANIES),
  },
  jobTitle: {
    label: 'Job Title',
    icon: Briefcase,
    generate: () => pick(JOB_TITLES),
  },
  creditCard: {
    label: 'Credit Card',
    icon: CreditCard,
    generate: () => {
      const type = pick(['Visa', 'MasterCard', 'Amex', 'Discover']) as keyof typeof CREDIT_PREFIXES;
      const prefix = CREDIT_PREFIXES[type];
      let number = prefix;
      const len = type === 'Amex' ? 15 : 16;
      while (number.length < len - 1) {
        number += randInt(0, 9).toString();
      }
      const checkDigit = luhnChecksum(number + '0');
      number += checkDigit;
      // Format with spaces
      if (type === 'Amex') {
        return `${number.slice(0,4)} ${number.slice(4,10)} ${number.slice(10,15)}`;
      }
      return `${number.slice(0,4)} ${number.slice(4,8)} ${number.slice(8,12)} ${number.slice(12,16)}`;
    },
  },
  uuid: {
    label: 'UUID v4',
    icon: Hash,
    generate: () => crypto.randomUUID(),
  },
  hexColor: {
    label: 'Hex Color',
    icon: Hash,
    generate: () => `#${Array.from({ length: 6 }, () => randInt(0, 15).toString(16)).join('')}`,
  },
  username: {
    label: 'Username',
    icon: User,
    generate: () => {
      const patterns = [
        () => `${pick(FIRST_NAMES).toLowerCase()}${pick(LAST_NAMES).toLowerCase()}${randInt(1, 999)}`,
        () => `${pick(FIRST_NAMES).toLowerCase().slice(0, 1)}${pick(LAST_NAMES).toLowerCase()}${randInt(10, 99)}`,
        () => `${pick(['dev','coder','hacker','pro','ninja','pixel','shadow','neo'])}_${pick(FIRST_NAMES).toLowerCase()}`,
      ];
      return pick(patterns)();
    },
  },
  ipv4: {
    label: 'IPv4 Address',
    icon: Globe,
    generate: () => `${randInt(1,255)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,255)}`,
  },
  randomDate: {
    label: 'Random Date',
    icon: Calendar,
    generate: () => {
      const start = new Date(2000, 0, 1).getTime();
      const end = new Date(2030, 11, 31).getTime();
      const d = new Date(start + Math.random() * (end - start));
      return d.toISOString().split('T')[0];
    },
  },
  loremSentence: {
    label: 'Lorem Sentence',
    icon: FileText,
    generate: () => {
      const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','ut','aliquip','ex','ea','commodo','consequat'];
      const count = randInt(5, 15);
      const chosen: string[] = [];
      for (let i = 0; i < count; i++) chosen.push(pick(words));
      const s = chosen.join(' ');
      return s.charAt(0).toUpperCase() + s.slice(1) + '.';
    },
  },
  ssn: {
    label: 'SSN',
    icon: Hash,
    generate: () => `${randInt(100, 999)}-${randInt(10, 99)}-${randInt(1000, 9999)}`,
  },
};

// ── Component ──────────────────────────────────────────────────────────────

type GeneratorKey = keyof typeof generators;
const GEN_KEYS = Object.keys(generators) as GeneratorKey[];

interface RowData {
  id: number;
  values: Record<GeneratorKey, string>;
}

export default function RandomDataGeneratorPage() {
  const [selectedFields, setSelectedFields] = useState<Set<GeneratorKey>>(new Set<GeneratorKey>(['fullName', 'email', 'phone']));
  const [rowCount, setRowCount] = useState(10);
  const [rows, setRows] = useState<RowData[]>([]);

  const toggleField = useCallback((key: GeneratorKey) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFields(new Set(GEN_KEYS));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const generateData = useCallback(() => {
    const fieldList = Array.from(selectedFields) as GeneratorKey[];
    if (fieldList.length === 0) {
      toast.error('Select at least one field');
      return;
    }
    const newRows: RowData[] = [];
    for (let i = 0; i < rowCount; i++) {
      const values = {} as Record<GeneratorKey, string>;
      for (const field of fieldList) {
        values[field] = generators[field].generate();
      }
      newRows.push({ id: i + 1, values });
    }
    setRows(newRows);
    toast.success(`Generated ${rowCount} rows`);
  }, [selectedFields, rowCount]);

  const copyJSON = useCallback(() => {
    const fieldList = Array.from(selectedFields) as GeneratorKey[];
    const data = rows.map(r => {
      const obj: Record<string, string> = {};
      for (const f of fieldList) obj[generators[f].label] = r.values[f];
      return obj;
    });
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied as JSON!');
  }, [rows, selectedFields]);

  const copyCSV = useCallback(() => {
    const fieldList = Array.from(selectedFields) as GeneratorKey[];
    const headers = fieldList.map(f => generators[f].label).join(',');
    const body = rows.map(r => fieldList.map(f => `"${r.values[f].replace(/"/g, '""')}"`).join(',')).join('\n');
    navigator.clipboard.writeText(`${headers}\n${body}`);
    toast.success('Copied as CSV!');
  }, [rows, selectedFields]);

  const downloadCSV = useCallback(() => {
    const fieldList = Array.from(selectedFields) as GeneratorKey[];
    const headers = fieldList.map(f => generators[f].label).join(',');
    const body = rows.map(r => fieldList.map(f => `"${r.values[f].replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'random-data.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded CSV!');
  }, [rows, selectedFields]);

  const copyCell = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied!');
  }, []);

  const fieldList = useMemo(() => Array.from(selectedFields) as GeneratorKey[], [selectedFields]);

  // Group generators by category for the selector
  const categoryGroups = useMemo(() => {
    const groups: Record<string, GeneratorKey[]> = {
      'Personal': ['fullName', 'firstName', 'lastName', 'email', 'phone', 'username', 'ssn'],
      'Location': ['streetAddress', 'city', 'state', 'zipCode', 'fullAddress', 'country'],
      'Professional': ['company', 'jobTitle'],
      'Financial': ['creditCard'],
      'Technical': ['uuid', 'hexColor', 'ipv4'],
      'Text & Dates': ['randomDate', 'loremSentence'],
    };
    return groups;
  }, []);

  return (
    <ToolLayout
      title="Random Data Generator"
      description="Generate realistic fake data for testing, demos, and prototyping. Names, emails, addresses, credit cards, UUIDs — all generated client-side."
    >
      <div className="space-y-6">
        {/* Field Selection */}
        <div className="card p-6">
          <h2 className="text-white font-semibold text-base mb-4">Select Fields</h2>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={selectAll} className="text-xs px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              Select All
            </button>
            <button onClick={clearAll} className="text-xs px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              Clear All
            </button>
          </div>
          {Object.entries(categoryGroups).map(([category, keys]) => (
            <div key={category} className="mb-3">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">{category}</div>
              <div className="flex flex-wrap gap-2">
                {keys.map(key => {
                  const gen = generators[key];
                  const Icon = gen.icon;
                  const selected = selectedFields.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleField(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selected
                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {gen.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="card p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Row Count</label>
              <input
                type="number"
                min={1}
                max={500}
                value={rowCount}
                onChange={e => setRowCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={generateData}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate
            </button>
            {rows.length > 0 && (
              <>
                <button onClick={copyJSON} className="btn-secondary flex items-center gap-2 text-sm">
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </button>
                <button onClick={copyCSV} className="btn-secondary flex items-center gap-2 text-sm">
                  <Copy className="w-4 h-4" />
                  Copy CSV
                </button>
                <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results Table */}
        {rows.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-700">
                      #
                    </th>
                    {fieldList.map(field => (
                      <th key={field} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-700 whitespace-nowrap">
                        {generators[field].label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-700 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{row.id}</td>
                      {fieldList.map(field => (
                        <td key={field} className="px-4 py-2.5 text-slate-300 font-mono text-xs whitespace-nowrap">
                          {row.values[field]}
                        </td>
                      ))}
                      <td className="px-2 py-2.5 text-right">
                        <button
                          onClick={() => copyCell(fieldList.map(f => row.values[f]).join('\t'))}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                          title="Copy row"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-800/50 bg-slate-900/50">
              <p className="text-xs text-slate-500">{rows.length} rows &middot; {fieldList.length} columns</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {rows.length === 0 && (
          <div className="card p-12 text-center">
            <RefreshCw className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Select fields, set row count, and click Generate to create data.</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

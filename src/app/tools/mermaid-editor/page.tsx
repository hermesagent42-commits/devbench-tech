'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw, Eye, Code2, Maximize2, Minimize2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const SAMPLES: { label: string; code: string }[] = [
  {
    label: 'Flowchart',
    code: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Deploy]
    B -->|No| D[Debug]
    D --> B
    C --> E[Monitor]
    C --> F[Document]
    E --> G[Done]
    F --> G`,
  },
  {
    label: 'Sequence Diagram',
    code: `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database
    U->>A: POST /login
    A->>D: SELECT user
    D-->>A: user record
    A->>A: Verify password
    A-->>U: JWT token
    U->>A: GET /profile
    A->>D: SELECT profile
    D-->>A: profile data
    A-->>U: 200 OK + JSON`,
  },
  {
    label: 'Class Diagram',
    code: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Admin {
        +String permissions
        +banUser()
    }
    class Post {
        +String title
        +String content
        +publish()
    }
    User <|-- Admin
    User "1" --> "*" Post : creates`,
  },
  {
    label: 'State Diagram',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetchData()
    Loading --> Success : 200 OK
    Loading --> Error : 4xx/5xx
    Success --> Idle : reset()
    Error --> Loading : retry()
    Error --> Idle : reset()`,
  },
  {
    label: 'Gantt Chart',
    code: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Frontend
    Design           :a1, 2026-06-01, 7d
    Implementation   :a2, after a1, 14d
    Testing          :a3, after a2, 5d
    section Backend
    API Design       :b1, 2026-06-01, 5d
    Database Setup   :b2, after b1, 4d
    API Development  :b3, after b2, 12d
    Integration      :b4, after a3 b3, 4d`,
  },
  {
    label: 'ER Diagram',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        int id PK
        string name
        string email
        date created_at
    }
    ORDER {
        int id PK
        int customer_id FK
        string status
        decimal total
    }
    LINE-ITEM {
        int id PK
        int order_id FK
        string product
        int quantity
    }`,
  },
  {
    label: 'Gitgraph',
    code: `gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "setup CI"
    branch feature/login
    commit id: "add login page"
    commit id: "add auth API"
    checkout develop
    merge feature/login
    branch feature/dashboard
    commit id: "dashboard UI"
    commit id: "charts"
    checkout develop
    merge feature/dashboard
    checkout main
    merge develop tag: "v1.0.0"`,
  },
  {
    label: 'Pie Chart',
    code: `pie title Language Distribution
    "TypeScript" : 45
    "Python" : 25
    "Rust" : 12
    "Go" : 10
    "Other" : 8`,
  },
];

// ── SVG to data URL ──────────────────────────────────────────────────────
function svgToDataUrl(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
}

// ── Main Component ───────────────────────────────────────────────────────
export default function MermaidEditorPage() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [zoom, setZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Dynamically load mermaid
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      if ((window as any).mermaid) {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#0ea5e9',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#334155',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            background: '#0f172a',
            mainBkg: '#1e293b',
            nodeBorder: '#334155',
            clusterBkg: '#1e293b',
            clusterBorder: '#334155',
            titleColor: '#38bdf8',
            edgeLabelBackground: '#1e293b',
          },
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          sequence: { useMaxWidth: true, showSequenceNumbers: false },
          gantt: { useMaxWidth: true },
          gitGraph: { showBranches: true, showCommitLabel: true },
        });
        renderDiagram(code);
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderDiagram = useCallback(async (source: string) => {
    if (!mermaidRef.current) return;
    setError(null);

    try {
      const mermaid = (window as any).mermaid;
      if (!mermaid) return;

      const id = 'mermaid-' + Date.now();
      const { svg } = await mermaid.render(id, source);
      mermaidRef.current.innerHTML = svg;
    } catch (err: any) {
      setError(err.message || 'Failed to render diagram');
      mermaidRef.current.innerHTML = '';
    }
  }, []);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      // Debounce rendering
      const handler = setTimeout(() => {
        if (value.trim()) {
          renderDiagram(value);
        }
      }, 300);
      return () => clearTimeout(handler);
    },
    [renderDiagram]
  );

  const handleSample = useCallback(
    (sample: (typeof SAMPLES)[0]) => {
      setCode(sample.code);
      renderDiagram(sample.code);
    },
    [renderDiagram]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied!'),
      () => toast.error('Copy failed')
    );
  }, [code]);

  const handleDownloadSvg = useCallback(() => {
    if (!mermaidRef.current) return;
    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) {
      toast.error('No diagram to download');
      return;
    }
    const dataUrl = svgToDataUrl(svg);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'diagram.svg';
    a.click();
    toast.success('SVG downloaded!');
  }, []);

  const handleDownloadPng = useCallback(() => {
    if (!mermaidRef.current) return;
    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) {
      toast.error('No diagram to download');
      return;
    }

    const canvas = document.createElement('canvas');
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const dataUrl = svgToDataUrl(svg);
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'diagram.png';
      a.click();
      toast.success('PNG downloaded!');
    };
    img.src = dataUrl;
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  return (
    <ToolLayout
      title="Mermaid Live Editor"
      description="Create flowcharts, sequence diagrams, class diagrams, and more with Mermaid.js — live preview, 8 sample diagrams, export as SVG/PNG, 100% client-side."
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
        <button
          onClick={togglePreview}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 
                     border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          {showPreview ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              Hide Preview
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              Show Preview
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setZoom(Math.max(25, zoom - 25))}
            className="text-xs px-2 py-1.5 rounded bg-slate-700/50 text-slate-400 hover:text-slate-200 border border-slate-600/30"
          >
            −
          </button>
          <span className="text-xs text-slate-400 w-10 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(300, zoom + 25))}
            className="text-xs px-2 py-1.5 rounded bg-slate-700/50 text-slate-400 hover:text-slate-200 border border-slate-600/30"
          >
            +
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 
                     border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
        <button
          onClick={handleDownloadSvg}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 
                     border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          title="Download as SVG"
        >
          <Download className="w-3.5 h-3.5" />
          SVG
        </button>
        <button
          onClick={handleDownloadPng}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 
                     border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          title="Download as PNG"
        >
          <FileText className="w-3.5 h-3.5" />
          PNG
        </button>
      </div>

      {/* Sample picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => handleSample(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              code === s.code
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-brand-400 hover:border-brand-500/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Split pane */}
      <div
        className={`grid ${
          showPreview ? 'md:grid-cols-2' : 'grid-cols-1'
        } gap-4`}
      >
        {/* Code editor */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mermaid Syntax
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              const handler = setTimeout(() => {
                if (e.target.value.trim()) renderDiagram(e.target.value);
              }, 300);
              return () => clearTimeout(handler);
            }}
            className="flex-1 min-h-[400px] bg-slate-900 text-slate-200 text-sm rounded-lg p-4 border border-slate-700 
                       focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                       placeholder-slate-600 transition-colors font-mono resize-y"
            spellCheck={false}
            placeholder="flowchart TD&#10;    A[Start] --> B[End]"
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Preview
              </span>
              {error && (
                <span className="text-xs text-red-400 ml-auto">Render Error</span>
              )}
            </div>
            <div
              ref={previewRef}
              className="flex-1 min-h-[400px] bg-slate-900 rounded-lg border border-slate-700 overflow-auto p-4"
            >
              <div
                className="flex items-center justify-center"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              >
                <div ref={mermaidRef} className="w-full" />
              </div>
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono whitespace-pre-wrap">
                  {error}
                </div>
              )}
              {!error && !code.trim() && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500 text-sm">
                    Select a sample or type Mermaid syntax to see a live preview
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mermaid Syntax Quick Reference */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-400" />
          Quick Syntax Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              title: 'Flowchart',
              syntax: 'flowchart TD\n    A --> B\n    B -->|Yes| C',
            },
            {
              title: 'Sequence',
              syntax: 'A->>B: Message\nB-->>A: Response',
            },
            {
              title: 'Class Diagram',
              syntax: 'class Animal {\n  +name: String\n  +speak()\n}',
            },
            {
              title: 'State Diagram',
              syntax: 'stateDiagram-v2\n  [*] --> Active\n  Active --> [*]',
            },
            {
              title: 'ER Diagram',
              syntax: 'CUSTOMER ||--o{ ORDER\nCUSTOMER { int id PK }',
            },
            {
              title: 'Gitgraph',
              syntax: 'gitGraph\n  commit\n  branch dev\n  commit',
            },
          ].map((ref) => (
            <div
              key={ref.title}
              className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
            >
              <span className="text-xs font-semibold text-brand-400">{ref.title}</span>
              <pre className="text-xs text-slate-400 mt-1.5 font-mono leading-relaxed">
                {ref.syntax}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}

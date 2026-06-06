'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Download, Trash2, Upload, Image, Sun, Moon,
  Monitor, Columns, AlignLeft, ListOrdered, Eye,
  RefreshCw, Code, Palette, ChevronDown, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────── Syntax Tokenizer (zero-dependency) ─────────── */

interface Token {
  text: string;
  type: 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'operator' | 'type' | 'plain' | 'builtin' | 'tag' | 'attr';
}

const KEYWORDS = new Set([
  'const','let','var','function','return','if','else','for','while','do','switch','case','break','continue',
  'class','extends','new','this','super','import','export','default','from','as','typeof','instanceof',
  'try','catch','finally','throw','async','await','yield','of','in','static','get','set',
  'interface','type','enum','implements','abstract','private','public','protected','readonly',
  'true','false','null','undefined','void','never','any','unknown',
  'and','or','not','is','lambda','pass','raise','with','except','elif','def','print',
  'package','fn','impl','pub','use','mod','struct','match','mut','ref','self','where','trait','dyn',
]);

const BUILTINS = new Set([
  'console','log','warn','error','debug','alert','prompt','document','window',
  'parseInt','parseFloat','JSON','Math','Array','Object','String','Number','Boolean','Date','RegExp',
  'Map','Set','Promise','Symbol','Proxy','Reflect','Error','TypeError',
  'fetch','setTimeout','setInterval','clearTimeout','clearInterval',
  'require','module','exports','process','global','Buffer',
  'len','range','list','dict','tuple','set','str','int','float','bool','print','input','open','sorted',
]);

const TYPES = new Set([
  'string','number','boolean','void','never','any','unknown','object','symbol','bigint',
  'int','float','double','char','byte','short','long','size_t','uint8_t','int32_t','int64_t',
  'String','Number','Boolean','Void',
  'Vec','HashMap','HashSet','Option','Result','Box','Rc','Arc','Cell','RefCell',
]);

const OPERATORS = /([+\-*/%=<>!&|^~?:]+|\.{2,3}|=>|->|::|<<|>>)/;

function tokenizeCode(code: string): Token[][] {
  const lines = code.split('\n');
  const result: Token[][] = [];

  for (const line of lines) {
    const tokens: Token[] = [];
    let i = 0;
    const len = line.length;

    while (i < len) {
      // Whitespace
      if (line[i] === ' ' || line[i] === '\t') {
        let j = i;
        while (j < len && (line[j] === ' ' || line[j] === '\t')) j++;
        tokens.push({ text: line.slice(i, j), type: 'plain' });
        i = j;
        continue;
      }

      // Single-line comment //
      if (line[i] === '/' && line[i + 1] === '/') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }

      // Hash comment (#)
      if (line[i] === '#') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }

      // Multi-line comment /* ... */
      if (line[i] === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end !== -1) {
          tokens.push({ text: line.slice(i, end + 2), type: 'comment' });
          i = end + 2;
          continue;
        } else {
          tokens.push({ text: line.slice(i), type: 'comment' });
          break;
        }
      }

      // String (single/double quotes and backticks)
      if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
        const quote = line[i];
        let j = i + 1;
        let escaped = false;
        while (j < len) {
          if (escaped) { escaped = false; j++; continue; }
          if (line[j] === '\\') { escaped = true; j++; continue; }
          if (line[j] === quote) { j++; break; }
          j++;
        }
        tokens.push({ text: line.slice(i, j), type: 'string' });
        i = j;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(line[i]) || (line[i] === '.' && line[i + 1] && /[0-9]/.test(line[i + 1]))) {
        let j = i;
        if (line[j] === '0' && (line[j + 1] === 'x' || line[j + 1] === 'X')) j += 2;
        if (line[j] === '0' && (line[j + 1] === 'b' || line[j + 1] === 'B')) j += 2;
        if (line[j] === '0' && (line[j + 1] === 'o' || line[j + 1] === 'O')) j += 2;
        while (j < len && /[0-9a-fA-F.xX_ep]/.test(line[j])) j++;
        tokens.push({ text: line.slice(i, j), type: 'number' });
        i = j;
        continue;
      }

      // HTML/XML tags
      if (line[i] === '<') {
        const endTag = line.indexOf('>', i);
        if (endTag !== -1) {
          const tagContent = line.slice(i + 1, endTag);
          const spaceIdx = tagContent.indexOf(' ');
          const tagName = spaceIdx !== -1 ? tagContent.slice(0, spaceIdx) : tagContent;
          if (tagName.length > 0 && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tagName)) {
            tokens.push({ text: line[i], type: 'operator' });
            tokens.push({ text: tagName, type: 'tag' });
            if (spaceIdx !== -1) {
              tokens.push({ text: tagContent.slice(spaceIdx), type: 'plain' });
            }
            tokens.push({ text: '>', type: 'operator' });
            i = endTag + 1;
            continue;
          }
        }
      }

      // Operators
      const opMatch = line.slice(i).match(OPERATORS);
      if (opMatch && opMatch.index === 0) {
        tokens.push({ text: opMatch[0], type: 'operator' });
        i += opMatch[0].length;
        continue;
      }

      // Brackets/parens/braces/semicolons/pipes/dots/commas/colons
      if (/[{}()\[\];,.|&:?]/.test(line[i])) {
        tokens.push({ text: line[i], type: 'operator' });
        i++;
        continue;
      }

      // Words (identifiers, keywords)
      let j = i;
      while (j < len && /[a-zA-Z_$0-9]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (word.length > 0) {
        if (KEYWORDS.has(word)) {
          tokens.push({ text: word, type: 'keyword' });
        } else if (BUILTINS.has(word)) {
          tokens.push({ text: word, type: 'builtin' });
        } else if (TYPES.has(word)) {
          tokens.push({ text: word, type: 'type' });
        } else if (i > 0 && line[i - 1] === '.' || (line[j] === '(')) {
          tokens.push({ text: word, type: 'function' });
        } else {
          tokens.push({ text: word, type: 'plain' });
        }
        i = j;
        continue;
      }

      // Fallback
      tokens.push({ text: line[i], type: 'plain' });
      i++;
    }

    result.push(tokens);
  }

  return result;
}

/* ─────────── Themes ─────────── */

interface Theme {
  name: string;
  label: string;
  background: string;
  text: string;
  gutterBg: string;
  gutterText: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  operator: string;
  type: string;
  builtin: string;
  tag: string;
  attr: string;
  plain: string;
  windowDots: string[];
  windowBar: string;
  windowText: string;
  lineHighlight: string;
}

const THEMES: Theme[] = [
  {
    name: 'one-dark', label: 'One Dark',
    background: '#282c34', text: '#abb2bf',
    gutterBg: '#21252b', gutterText: '#636d83',
    keyword: '#c678dd', string: '#98c379', number: '#d19a66',
    comment: '#5c6370', function: '#61afef', operator: '#56b6c2',
    type: '#e5c07b', builtin: '#e06c75', tag: '#e06c75',
    attr: '#d19a66', plain: '#abb2bf',
    windowDots: ['#e06c75','#e5c07b','#61afef'], windowBar: '#21252b', windowText: '#abb2bf',
    lineHighlight: '#2c313a',
  },
  {
    name: 'dracula', label: 'Dracula',
    background: '#282a36', text: '#f8f8f2',
    gutterBg: '#21222c', gutterText: '#6272a4',
    keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9',
    comment: '#6272a4', function: '#50fa7b', operator: '#ff79c6',
    type: '#8be9fd', builtin: '#ffb86c', tag: '#ff79c6',
    attr: '#50fa7b', plain: '#f8f8f2',
    windowDots: ['#ff5555','#f1fa8c','#50fa7b'], windowBar: '#21222c', windowText: '#f8f8f2',
    lineHighlight: '#313340',
  },
  {
    name: 'monokai', label: 'Monokai',
    background: '#272822', text: '#f8f8f2',
    gutterBg: '#1e1f1c', gutterText: '#75715e',
    keyword: '#f92672', string: '#e6db74', number: '#ae81ff',
    comment: '#75715e', function: '#a6e22e', operator: '#f92672',
    type: '#66d9ef', builtin: '#fd971f', tag: '#f92672',
    attr: '#a6e22e', plain: '#f8f8f2',
    windowDots: ['#f92672','#e6db74','#a6e22e'], windowBar: '#1e1f1c', windowText: '#f8f8f2',
    lineHighlight: '#3e3d32',
  },
  {
    name: 'github-light', label: 'GitHub Light',
    background: '#ffffff', text: '#24292e',
    gutterBg: '#f6f8fa', gutterText: '#959da5',
    keyword: '#d73a49', string: '#032f62', number: '#005cc5',
    comment: '#6a737d', function: '#6f42c1', operator: '#d73a49',
    type: '#22863a', builtin: '#e36209', tag: '#22863a',
    attr: '#6f42c1', plain: '#24292e',
    windowDots: ['#d73a49','#e36209','#22863a'], windowBar: '#f6f8fa', windowText: '#24292e',
    lineHighlight: '#f1f8ff',
  },
  {
    name: 'nord', label: 'Nord',
    background: '#2e3440', text: '#d8dee9',
    gutterBg: '#3b4252', gutterText: '#616e88',
    keyword: '#81a1c1', string: '#a3be8c', number: '#b48ead',
    comment: '#616e88', function: '#88c0d0', operator: '#81a1c1',
    type: '#8fbcbb', builtin: '#d08770', tag: '#bf616a',
    attr: '#ebcb8b', plain: '#d8dee9',
    windowDots: ['#bf616a','#ebcb8b','#a3be8c'], windowBar: '#3b4252', windowText: '#d8dee9',
    lineHighlight: '#3b4252',
  },
  {
    name: 'solarized-dark', label: 'Solarized Dark',
    background: '#002b36', text: '#839496',
    gutterBg: '#073642', gutterText: '#586e75',
    keyword: '#859900', string: '#2aa198', number: '#d33682',
    comment: '#586e75', function: '#268bd2', operator: '#859900',
    type: '#b58900', builtin: '#cb4b16', tag: '#dc322f',
    attr: '#6c71c4', plain: '#839496',
    windowDots: ['#dc322f','#b58900','#268bd2'], windowBar: '#073642', windowText: '#839496',
    lineHighlight: '#073642',
  },
];

/* ─────────── Languages ─────────── */

const LANGUAGES: { name: string; label: string; sample: string }[] = [
  {
    name: 'javascript', label: 'JavaScript',
    sample: `function fibonacci(n) {
  // Generate the nth Fibonacci number
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

console.log(fibonacci(10)); // 55`,
  },
  {
    name: 'typescript', label: 'TypeScript',
    sample: `interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error('User not found');
  return res.json();
}`,
  },
  {
    name: 'python', label: 'Python',
    sample: `def quicksort(arr: list[int]) -> list[int]:
    """Sort an array using the quicksort algorithm."""
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3, 6, 8, 10, 1, 2, 1]))`,
  },
  {
    name: 'rust', label: 'Rust',
    sample: `use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<String, usize> {
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        *map.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    map
}

fn main() {
    let counts = word_count("hello world hello");
    println!("{:?}", counts);
}`,
  },
  {
    name: 'go', label: 'Go',
    sample: `package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    ch := make(chan string, 5)

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            ch <- fmt.Sprintf("goroutine %d done", id)
        }(i)
    }

    wg.Wait()
    close(ch)
    for msg := range ch {
        fmt.Println(msg)
    }
}`,
  },
  {
    name: 'css', label: 'CSS',
    sample: `:root {
  --primary: #3b82f6;
  --radius: 0.75rem;
}

.card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.card:hover {
  transform: translateY(-4px);
  transition: transform 0.2s ease;
}`,
  },
  {
    name: 'html', label: 'HTML',
    sample: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <h1>Welcome to DevBench</h1>
    <button id="cta">Get Started</button>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
  },
];

/* ─────────── Component ─────────── */

export default function CodeScreenshotPage() {
  const [code, setCode] = useState(LANGUAGES[0].sample);
  const [language, setLanguage] = useState('javascript');
  const [themeName, setThemeName] = useState('one-dark');
  const [fontSize, setFontSize] = useState(14);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWindow, setShowWindow] = useState(true);
  const [padding, setPadding] = useState(40);
  const [fileName, setFileName] = useState('fibonacci.js');
  const [windowTitle, setWindowTitle] = useState('Visual Studio Code');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const theme = useMemo(() => THEMES.find(t => t.name === themeName) ?? THEMES[0], [themeName]);
  const lang = useMemo(() => LANGUAGES.find(l => l.name === language) ?? LANGUAGES[0], [language]);

  const tokens = useMemo(() => tokenizeCode(code), [code]);

  /* ─────────── Render to canvas ─────────── */

  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;

    // Font setup
    const fontFamily = '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace';
    ctx.font = `${fontSize}px ${fontFamily}`;

    // Measure dimensions
    const lineHeight = fontSize * 1.6;
    const lines = tokens;
    const gutterWidth = showLineNumbers ? String(lines.length).length * (fontSize * 0.65) + padding * 0.8 : 0;

    // Find max line width
    let maxLineWidth = 0;
    for (const line of lines) {
      let lineText = '';
      for (const token of line) lineText += token.text;
      const w = ctx.measureText(lineText).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }

    const codeWidth = maxLineWidth + padding;
    const totalContentWidth = gutterWidth + codeWidth + padding;

    // Header height
    const headerHeight = showWindow ? 36 : 0;
    const titleBarHeight = showWindow && fileName ? 28 : 0;

    // Bottom padding
    const bottomPad = fontSize * 1.2;

    const canvasW = totalContentWidth;
    const canvasH = headerHeight + titleBarHeight + lines.length * lineHeight + padding + bottomPad;

    canvas.width = Math.ceil(canvasW * 2);
    canvas.height = Math.ceil(canvasH * 2);
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = theme.background;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvasW, canvasH, showWindow ? 8 : 0);
    ctx.fill();

    // Window chrome
    if (showWindow) {
      ctx.fillStyle = theme.windowBar;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, headerHeight, [8, 8, 0, 0]);
      ctx.fill();

      // Dots
      theme.windowDots.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(16 + idx * 20, headerHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Window title
      if (windowTitle) {
        ctx.fillStyle = theme.windowText;
        ctx.font = `11px -apple-system, "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(windowTitle, canvasW / 2, headerHeight / 2 + 4);
        ctx.textAlign = 'left';
      }

      // Title bar (filename)
      if (fileName) {
        ctx.fillStyle = theme.gutterBg;
        ctx.fillRect(0, headerHeight, canvasW, titleBarHeight);
        ctx.strokeStyle = theme.gutterText + '30';
        ctx.beginPath();
        ctx.moveTo(0, headerHeight + titleBarHeight);
        ctx.lineTo(canvasW, headerHeight + titleBarHeight);
        ctx.stroke();

        // Tab shape
        ctx.fillStyle = theme.background;
        ctx.beginPath();
        ctx.moveTo(padding * 0.5, headerHeight + titleBarHeight);
        ctx.lineTo(padding * 0.5, headerHeight + 4);
        ctx.lineTo(padding * 0.5 + 14, headerHeight);
        ctx.lineTo(padding * 0.5 + 14 + ctx.measureText(fileName).width + 40, headerHeight);
        ctx.lineTo(padding * 0.5 + 14 + ctx.measureText(fileName).width + 40 + 8, headerHeight + 8);

        // Tab bottom border
        ctx.lineTo(padding * 0.5 + 14 + ctx.measureText(fileName).width + 40 + 8, headerHeight + titleBarHeight);
        ctx.lineTo(padding * 0.5, headerHeight + titleBarHeight);
        ctx.fill();

        // Tab text
        ctx.fillStyle = theme.text;
        ctx.font = `11px -apple-system, "Inter", sans-serif`;
        ctx.fillText(fileName, padding * 0.5 + 20, headerHeight + titleBarHeight / 2 + 4);
      }
    }

    const topOffset = headerHeight + titleBarHeight;

    // Gutter background
    if (showLineNumbers) {
      ctx.fillStyle = theme.gutterBg;
      ctx.fillRect(0, topOffset, gutterWidth, canvasH - topOffset);
      ctx.strokeStyle = theme.gutterText + '20';
      ctx.beginPath();
      ctx.moveTo(gutterWidth - 0.5, topOffset);
      ctx.lineTo(gutterWidth - 0.5, canvasH);
      ctx.stroke();
    }

    // Draw lines
    ctx.font = `${fontSize}px ${fontFamily}`;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const y = topOffset + padding / 2 + lineIdx * lineHeight;
      const line = lines[lineIdx];

      // Line highlight (alternating subtle)
      if (lineIdx % 2 === 0 && lines.length > 1) {
        ctx.fillStyle = theme.lineHighlight;
        ctx.fillRect(0, y - lineHeight / 2 + fontSize * 0.1, canvasW, lineHeight);
      }

      // Line number
      if (showLineNumbers) {
        ctx.fillStyle = theme.gutterText;
        ctx.font = `${fontSize * 0.85}px ${fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(String(lineIdx + 1), gutterWidth - padding * 0.3, y + fontSize * 0.25);
        ctx.textAlign = 'left';
        ctx.font = `${fontSize}px ${fontFamily}`;
      }

      // Draw tokens
      let x = gutterWidth + padding * 0.5;
      for (const token of line) {
        ctx.fillStyle = theme[token.type] || theme.plain;
        ctx.fillText(token.text, x, y + fontSize * 0.25);
        x += ctx.measureText(token.text).width;
      }
    }

    // Drop shadow
    const shadowCtx = ctx;
    shadowCtx.shadowColor = 'rgba(0,0,0,0.3)';
    shadowCtx.shadowBlur = 0;
  }, [tokens, theme, fontSize, showLineNumbers, showWindow, padding, fileName, windowTitle]);

  useEffect(() => {
    renderToCanvas();
  }, [renderToCanvas]);

  /* ─────────── Actions ─────────── */

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('Image copied to clipboard!');
      }, 'image/png');
    } catch {
      toast.error('Failed to copy image');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${language}-screenshot.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Downloaded!');
  };

  const handleLanguageChange = (langName: string) => {
    setLanguage(langName);
    const langConfig = LANGUAGES.find(l => l.name === langName);
    if (langConfig) {
      setCode(langConfig.sample);
      // Update filename
      const extensions: Record<string, string> = {
        javascript: 'js', typescript: 'ts', python: 'py',
        rust: 'rs', go: 'go', css: 'css', html: 'html',
      };
      setFileName(`code.${extensions[langName] || 'txt'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      setFileName(file.name);
      // Guess language from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, string> = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', rs: 'rust', go: 'go', css: 'css', html: 'html', htm: 'html',
      };
      if (ext && extMap[ext]) setLanguage(extMap[ext]);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  /* ─────────── Render ─────────── */

  return (
    <ToolLayout
      title="Code Screenshot Generator"
      description="Beautiful code screenshot generator — syntax highlighting, themes, and PNG export. Like Carbon/ray.so, running entirely in your browser with zero dependencies."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Language selector */}
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="input-field !py-1.5 !px-3 !text-xs"
          >
            {LANGUAGES.map(l => (
              <option key={l.name} value={l.name}>{l.label}</option>
            ))}
          </select>

          {/* Theme selector */}
          <select
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            className="input-field !py-1.5 !px-3 !text-xs"
          >
            {THEMES.map(t => (
              <option key={t.name} value={t.name}>{t.label}</option>
            ))}
          </select>

          {/* Font size */}
          <select
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="input-field !py-1.5 !px-3 !text-xs !w-[70px]"
          >
            {[10, 11, 12, 13, 14, 15, 16, 18, 20].map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>

          <div className="h-5 w-px bg-slate-600/50" />

          {/* Toggles */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showLineNumbers
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'bg-surface-lighter text-slate-400 border border-slate-600/30'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Lines
          </button>

          <button
            onClick={() => setShowWindow(!showWindow)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showWindow
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'bg-surface-lighter text-slate-400 border border-slate-600/30'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Window
          </button>

          {/* Padding */}
          <select
            value={padding}
            onChange={e => setPadding(Number(e.target.value))}
            className="input-field !py-1.5 !px-3 !text-xs !w-[80px]"
          >
            {[20, 32, 40, 48, 56, 64, 80].map(p => (
              <option key={p} value={p}>Pad {p}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-slate-600/50" />

          {/* Upload */}
          <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-lighter text-slate-400 border border-slate-600/30 cursor-pointer hover:border-slate-500/50 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Upload
            <input type="file" accept=".js,.ts,.py,.rs,.go,.css,.html,.txt,.json,.md" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Download & Copy */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </button>

          <button
            onClick={handleCopyImage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
          >
            <Image className="w-3.5 h-3.5" />
            Copy
          </button>
        </div>
      }
    >
      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Code className="w-3 h-3" />
            Code
          </label>
          {/* Filename input */}
          <input
            type="text"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            className="input-field !py-1.5 !px-3 !text-xs !font-mono !w-full"
            placeholder="filename.js"
          />
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="input-field !font-mono !w-full !h-[420px] resize-none"
            spellCheck={false}
            placeholder="Paste your code here..."
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {code.split('\n').length} lines &middot; {code.length} chars
            </span>
            <button
              onClick={() => setCode('')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3 h-3" />
            Preview
          </label>
          <div
            ref={previewRef}
            className="overflow-auto rounded-lg border border-slate-700/50"
            style={{ maxHeight: '460px' }}
          >
            <canvas ref={canvasRef} className="block" />
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Renders at 2x resolution for Retina displays. Download or copy to clipboard.
          </p>
        </div>
      </div>

      {/* Themes Quick Select */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
          <Palette className="w-4 h-4" />
          Quick Theme
        </h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(t => (
            <button
              key={t.name}
              onClick={() => setThemeName(t.name)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                themeName === t.name
                  ? 'border-brand-500/50 bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/30'
                  : 'border-slate-600/30 bg-surface-lighter text-slate-400 hover:border-slate-500/50'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-slate-500/30"
                style={{
                  background: t.background,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Window title */}
      <div className="mt-6">
        <label className="text-xs font-medium text-slate-400 block mb-1.5">
          Window Title
        </label>
        <input
          type="text"
          value={windowTitle}
          onChange={e => setWindowTitle(e.target.value)}
          className="input-field !py-1.5 !max-w-xs"
          placeholder="Visual Studio Code"
        />
      </div>
    </ToolLayout>
  );
}

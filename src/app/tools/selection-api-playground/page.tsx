'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, MousePointer2, Info, Square, AlignLeft, ArrowRight, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SelectionInfo {
  text: string;
  anchorNode: string;
  focusNode: string;
  anchorOffset: number;
  focusOffset: number;
  rangeCount: number;
  type: string;
  isCollapsed: boolean;
  startOffset: number;
  endOffset: number;
  fullText: string;
}

// ── API Reference ──────────────────────────────────────────────────────────

const API_REFERENCE = [
  { method: 'window.getSelection()', description: 'Returns a Selection object representing the range of text selected by the user or the current position of the caret.' },
  { method: 'Selection.toString()', description: 'Returns the text currently selected.' },
  { method: 'Selection.anchorNode', description: 'The Node in which the selection begins.' },
  { method: 'Selection.focusNode', description: 'The Node in which the selection ends.' },
  { method: 'Selection.anchorOffset', description: 'Offset within anchorNode where selection begins.' },
  { method: 'Selection.focusOffset', description: 'Offset within focusNode where selection ends.' },
  { method: 'Selection.rangeCount', description: 'Number of ranges in the selection (always 1 in Firefox, can be more in other browsers).' },
  { method: 'Selection.type', description: "'None' (no selection), 'Caret' (collapsed), or 'Range'." },
  { method: 'Selection.isCollapsed', description: 'True if the selection is empty (cursor with no text selected).' },
  { method: 'Selection.getRangeAt(0)', description: 'Returns the first Range object of the selection.' },
  { method: 'Range.toString()', description: 'Returns the text content of the range.' },
  { method: 'Range.startOffset', description: 'Offset of the start of the range within its startContainer.' },
  { method: 'Range.endOffset', description: 'Offset of the end of the range within its endContainer.' },
  { method: 'Range.commonAncestorContainer', description: 'Deepest Node that contains both start and end of the range.' },
  { method: 'Range.cloneRange()', description: 'Creates a copy of the range.' },
  { method: 'Range.collapse(toStart)', description: 'Collapses the range to one of its boundary points.' },
  { method: 'Range.selectNode(node)', description: 'Sets the range to encompass the entire node.' },
  { method: 'Selection.selectAllChildren()', description: 'Selects all children of a specified parent Node.' },
  { method: 'Range.deleteContents()', description: 'Removes the contents of the range from the document.' },
  { method: 'Range.extractContents()', description: 'Moves contents of the range to a DocumentFragment.' },
  { method: 'Range.setStart(node, offset)', description: 'Sets the start position of the range.' },
  { method: 'Range.setEnd(node, offset)', description: 'Sets the end position of the range.' },
  { method: 'Range.surroundContents(node)', description: 'Wraps the range contents in a new parent node.' },
  { method: 'Selection.addRange(range)', description: 'Adds a Range to the selection.' },
  { method: 'Selection.removeAllRanges()', description: 'Removes all ranges from the selection.' },
  { method: 'document.createRange()', description: 'Creates a new empty Range object.' },
];

// ── Sample texts ────────────────────────────────────────────────────────────

const SAMPLE_TEXTS = [
  {
    label: 'Lorem Ipsum',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    label: 'JavaScript',
    text: 'The Selection API allows you to programmatically select and manipulate text selections in the browser. Use window.getSelection() to access the current selection, and Range objects to create and modify selections. This powers features like rich text editors, code highlighter tools, and text annotation systems.',
  },
  {
    label: 'CSS Tip',
    text: 'CSS ::selection pseudo-element controls how selected text appears. You can customize background-color, color, text-shadow, and text-decoration. Note: Only a subset of CSS properties work within ::selection — background-color, color, cursor, caret-color, outline, text-decoration, text-emphasis-color, and text-shadow.',
  },
  {
    label: 'Code Snippet',
    text: 'function debounce(func, wait) {\n  let timeout;\n  return function executedFunction(...args) {\n    const later = () => {\n      clearTimeout(timeout);\n      func(...args);\n    };\n    clearTimeout(timeout);\n    timeout = setTimeout(later, wait);\n  };\n}',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SelectionApiPlayground() {
  const [text, setText] = useState(SAMPLE_TEXTS[0].text);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [showApiRef, setShowApiRef] = useState(false);
  const [activeSample, setActiveSample] = useState(0);
  const [selectionBg, setSelectionBg] = useState('#38bdf8');
  const [selectionColor, setSelectionColor] = useState('#ffffff');
  const editableRef = useRef<HTMLDivElement>(null);

  // ── Live selection tracking ──────────────────────────────────────────────

  const updateSelectionInfo = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !editableRef.current) {
      setSelectionInfo(null);
      return;
    }

    // Only track selections within our editable area
    if (!editableRef.current.contains(sel.anchorNode) && !editableRef.current.contains(sel.focusNode)) {
      setSelectionInfo(null);
      return;
    }

    const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const fullText = editableRef.current.textContent || '';

    // Calculate offsets relative to the full text content
    let anchorOffset = 0;
    let focusOffset = 0;

    if (range && sel.anchorNode && sel.focusNode) {
      try {
        const walker = document.createTreeWalker(editableRef.current, NodeFilter.SHOW_TEXT);
        let currentOffset = 0;
        let foundAnchor = false;
        let foundFocus = false;
        let node: Text | null;

        while ((node = walker.nextNode() as Text | null)) {
          if (node === sel.anchorNode) { anchorOffset = currentOffset + sel.anchorOffset; foundAnchor = true; }
          if (node === sel.focusNode) { focusOffset = currentOffset + sel.focusOffset; foundFocus = true; }
          if (foundAnchor && foundFocus) break;
          currentOffset += node.textContent?.length || 0;
        }
      } catch {
        // Fallback: use raw offsets
        anchorOffset = sel.anchorOffset;
        focusOffset = sel.focusOffset;
      }
    }

    const start = Math.min(anchorOffset, focusOffset);
    const end = Math.max(anchorOffset, focusOffset);

    setSelectionInfo({
      text: sel.toString(),
      anchorNode: sel.anchorNode?.nodeName || 'none',
      focusNode: sel.focusNode?.nodeName || 'none',
      anchorOffset: sel.anchorOffset,
      focusOffset: sel.focusOffset,
      rangeCount: sel.rangeCount,
      type: sel.type,
      isCollapsed: sel.isCollapsed,
      startOffset: start,
      endOffset: end,
      fullText,
    });
  }, []);

  useEffect(() => {
    // Track selection changes
    document.addEventListener('selectionchange', updateSelectionInfo);

    // Initial check
    const timer = setTimeout(updateSelectionInfo, 100);

    return () => {
      document.removeEventListener('selectionchange', updateSelectionInfo);
      clearTimeout(timer);
    };
  }, [updateSelectionInfo]);

  // Also update when text content changes (e.g., sample switch)
  useEffect(() => {
    updateSelectionInfo();
  }, [text, updateSelectionInfo]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const selectAll = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    updateSelectionInfo();
    toast.success('All text selected');
  }, [updateSelectionInfo]);

  const selectWordAtCursor = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editableRef.current) return;

    const range = sel.getRangeAt(0);
    if (!editableRef.current.contains(range.startContainer)) {
      toast.error('Click inside the text area first');
      return;
    }

    // Expand to nearest word boundaries
    const textNode = range.startContainer;
    const offset = range.startOffset;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      const content = textNode.textContent;
      let start = offset;
      let end = offset;

      // Find word start (non-word boundaries)
      while (start > 0 && /\w/.test(content[start - 1])) start--;
      while (end < content.length && /\w/.test(content[end])) end++;

      if (start === end) {
        toast('No word at cursor position', { icon: 'ℹ️' });
        return;
      }

      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      sel.removeAllRanges();
      sel.addRange(range);
      updateSelectionInfo();
      toast.success(`Selected: "${content.slice(start, end)}"`);
    }
  }, [updateSelectionInfo]);

  const selectToEnd = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editableRef.current) return;

    const range = sel.getRangeAt(0).cloneRange();
    if (!editableRef.current.contains(range.startContainer)) {
      toast.error('Click inside the text area first');
      return;
    }

    // Extend to end of container
    const lastChild = editableRef.current.lastChild;
    if (lastChild) {
      range.setEndAfter(lastChild);
      sel.removeAllRanges();
      sel.addRange(range);
      updateSelectionInfo();
      toast.success('Selection extended to end');
    }
  }, [updateSelectionInfo]);

  const collapseToStart = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.collapse(true); // Collapse to start
    updateSelectionInfo();
    toast('Cursor moved to selection start', { icon: '↩️' });
  }, [updateSelectionInfo]);

  const collapseToEnd = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.collapse(false); // Collapse to end
    updateSelectionInfo();
    toast('Cursor moved to selection end', { icon: '↩️' });
  }, [updateSelectionInfo]);

  const clearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    setSelectionInfo(null);
    toast('Selection cleared');
  }, []);

  const copySelectionInfo = useCallback(() => {
    if (!selectionInfo) {
      toast.error('No selection to copy');
      return;
    }
    const info = JSON.stringify(selectionInfo, null, 2);
    navigator.clipboard.writeText(info).then(
      () => toast.success('Selection info copied'),
      () => toast.error('Copy failed'),
    );
  }, [selectionInfo]);

  const switchSample = useCallback((idx: number) => {
    setActiveSample(idx);
    setText(SAMPLE_TEXTS[idx].text);
  }, []);

  // ── Visual offset bar ────────────────────────────────────────────────────

  const renderTextWithHighlight = () => {
    if (!selectionInfo || selectionInfo.isCollapsed || selectionInfo.startOffset === selectionInfo.endOffset) {
      return text;
    }

    const before = text.slice(0, selectionInfo.startOffset);
    const selected = text.slice(selectionInfo.startOffset, selectionInfo.endOffset);
    const after = text.slice(selectionInfo.endOffset);

    return (
      <>
        {before}
        <mark className="bg-brand-500/30 text-inherit rounded-sm px-1 -mx-1 border border-brand-500/40">
          {selected}
        </mark>
        {after}
      </>
    );
  };

  // ── CSS for custom selection ─────────────────────────────────────────────

  const customSelectionCSS = `
    .selection-playground ::selection {
      background-color: ${selectionBg};
      color: ${selectionColor};
    }
    .selection-playground ::-moz-selection {
      background-color: ${selectionBg};
      color: ${selectionColor};
    }
  `;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Selection API Playground"
      description="Explore the Selection & Range APIs live. Select text to inspect properties, run programmatic selection operations, and customize the ::selection pseudo-element. Understand the building blocks of rich text editors, code highlighters, and annotation tools."
    >
      {/* Custom selection CSS */}
      <style>{customSelectionCSS}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Interactive Area */}
        <div className="flex flex-col gap-6">
          {/* Sample selector */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Sample Text
            </label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEXTS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => switchSample(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeSample === idx
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 hover:bg-surface-light border border-slate-700/50'
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable text area */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Try selecting text below
              <span className="text-slate-500 font-normal ml-2 text-xs">(also editable — type to modify)</span>
            </label>
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              className="selection-playground w-full min-h-[220px] p-4 rounded-xl bg-surface border border-slate-700/50 text-slate-200 text-sm leading-relaxed font-mono whitespace-pre-wrap focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
              onInput={(e) => {
                setText(e.currentTarget.textContent || '');
              }}
              onBlur={updateSelectionInfo}
            >
              {text}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Click to place cursor, then drag to select text. The selection is tracked live.
            </p>
          </div>

          {/* Programmatic actions */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Programmatic Actions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onClick={selectAll} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Select All
              </button>
              <button onClick={selectWordAtCursor} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <MousePointer2 className="w-3 h-3" /> Word at Cursor
              </button>
              <button onClick={selectToEnd} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <ArrowRight className="w-3 h-3" /> To End
              </button>
              <button onClick={collapseToStart} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <ChevronRight className="w-3 h-3 rotate-180" /> Collapse → Start
              </button>
              <button onClick={collapseToEnd} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <ChevronRight className="w-3 h-3" /> Collapse → End
              </button>
              <button onClick={clearSelection} className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                <Square className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* Custom selection style */}
          <div className="card border-slate-700/50 bg-surface-light p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Custom ::selection Style
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectionBg}
                    onChange={(e) => setSelectionBg(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <code className="text-xs text-slate-300">{selectionBg}</code>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectionColor}
                    onChange={(e) => setSelectionColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <code className="text-xs text-slate-300">{selectionColor}</code>
                </div>
              </div>
            </div>
            <pre className="mt-3 bg-slate-950 rounded-lg p-2 text-xs text-slate-400 font-mono overflow-x-auto">
{`::selection {
  background: ${selectionBg};
  color: ${selectionColor};
}`}
            </pre>
          </div>
        </div>

        {/* Right: Inspector Panel */}
        <div className="flex flex-col gap-6">
          {/* Selection Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Selection Inspector</label>
              {selectionInfo && (
                <button
                  onClick={copySelectionInfo}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </button>
              )}
            </div>

            {selectionInfo ? (
              <div className="card bg-slate-950 border-slate-700/50 p-4 space-y-2.5">
                <InfoRow label="Text" value={selectionInfo.text ? `"${selectionInfo.text}"` : '(none)'} highlight={!!selectionInfo.text} />
                <InfoRow label="Type" value={selectionInfo.type} />
                <InfoRow label="Collapsed" value={selectionInfo.isCollapsed ? 'true (cursor only)' : 'false (text selected)'} highlight={!selectionInfo.isCollapsed} />
                <InfoRow label="Range Count" value={String(selectionInfo.rangeCount)} />
                <hr className="border-slate-700/50" />
                <InfoRow label="Anchor Node" value={selectionInfo.anchorNode} />
                <InfoRow label="Anchor Offset" value={String(selectionInfo.anchorOffset)} />
                <InfoRow label="Focus Node" value={selectionInfo.focusNode} />
                <InfoRow label="Focus Offset" value={String(selectionInfo.focusOffset)} />
                <hr className="border-slate-700/50" />
                <InfoRow label="Start Offset" value={String(selectionInfo.startOffset)} highlight />
                <InfoRow label="End Offset" value={String(selectionInfo.endOffset)} highlight />
                <InfoRow label="Length" value={`${selectionInfo.endOffset - selectionInfo.startOffset} chars`} highlight />
                <hr className="border-slate-700/50" />
                <InfoRow label="Full Text Length" value={`${selectionInfo.fullText.length} chars`} />

                {/* Visual offset bar */}
                {selectionInfo.fullText.length > 0 && selectionInfo.endOffset > selectionInfo.startOffset && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-2">Visual Position in Text</p>
                    <div className="relative h-5 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 h-full bg-brand-500/40 rounded-full border border-brand-500/60"
                        style={{
                          left: `${(selectionInfo.startOffset / selectionInfo.fullText.length) * 100}%`,
                          width: `${((selectionInfo.endOffset - selectionInfo.startOffset) / selectionInfo.fullText.length) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                      <span>{selectionInfo.startOffset}</span>
                      <span>{selectionInfo.endOffset - selectionInfo.startOffset} chars</span>
                      <span>{selectionInfo.endOffset}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card bg-slate-950 border-slate-700/50 p-6 text-center text-slate-500 text-sm">
                <MousePointer2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>Select text in the editor to see live API properties</p>
                <p className="text-xs mt-1 text-slate-600">All Selection & Range properties update in real-time</p>
              </div>
            )}
          </div>

          {/* API Reference toggle */}
          <div>
            <button
              onClick={() => setShowApiRef(!showApiRef)}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Info className="w-4 h-4" />
              Selection & Range API Reference
              <ChevronRight className={`w-4 h-4 transition-transform ${showApiRef ? 'rotate-90' : ''}`} />
            </button>

            {showApiRef && (
              <div className="mt-3 card bg-slate-950 border-slate-700/50 p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {API_REFERENCE.map((api, idx) => (
                    <div key={idx} className="pb-2 border-b border-slate-800 last:border-0 last:pb-0">
                      <code className="text-xs text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded font-mono">
                        {api.method}
                      </code>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{api.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="card border-brand-500/20 bg-brand-500/5 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-semibold text-brand-400">Why Selection API?</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  The Selection API is the foundation of rich text editors (ProseMirror, Slate, Quill, TipTap),
                  code highlighters, annotation tools, and collaboration features. Understanding how
                  anchor/focus, ranges, and offsets work is essential for building any tool that interacts
                  with user text selections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-mono text-right truncate ${
        highlight ? 'text-brand-300 font-medium' : 'text-slate-300'
      }`}>
        {value}
      </span>
    </div>
  );
}

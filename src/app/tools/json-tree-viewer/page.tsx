'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  ChevronRight,
  ChevronDown,
  FileJson,
  Search,
  Maximize2,
  Minimize2,
  Folders,
  Trash2,
  Upload,
  EyeOff,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface TreeNode {
  key: string;
  value: JsonValue;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  depth: number;
  children?: TreeNode[];
  size?: number;
}

function buildTree(
  key: string,
  value: JsonValue,
  path: string,
  depth: number,
): TreeNode {
  if (value === null) {
    return { key, value: null, type: 'null', path, depth };
  }
  if (typeof value === 'string') {
    return { key, value, type: 'string', path, depth };
  }
  if (typeof value === 'number') {
    return { key, value, type: 'number', path, depth };
  }
  if (typeof value === 'boolean') {
    return { key, value, type: 'boolean', path, depth };
  }
  if (Array.isArray(value)) {
    const children = value.map((item, i) =>
      buildTree(`[${i}]`, item, `${path}[${i}]`, depth + 1),
    );
    return {
      key,
      value,
      type: 'array',
      path,
      depth,
      children,
      size: value.length,
    };
  }
  // object
  const children = Object.entries(value as Record<string, JsonValue>).map(
    ([k, v]) => buildTree(k, v, path ? `${path}.${k}` : k, depth + 1),
  );
  return {
    key,
    value,
    type: 'object',
    path,
    depth,
    children,
    size: children.length,
  };
}

function countNodes(node: TreeNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function maxDepth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(maxDepth));
}

function stringifyValue(val: JsonValue): string {
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return `Array(${val.length})`;
  if (typeof val === 'object') return `Object(${Object.keys(val).length})`;
  return '';
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function getTypeColor(type: TreeNode['type']): string {
  switch (type) {
    case 'string':
      return 'text-green-400';
    case 'number':
      return 'text-amber-400';
    case 'boolean':
      return 'text-purple-400';
    case 'null':
      return 'text-slate-500';
    case 'object':
      return 'text-cyan-400';
    case 'array':
      return 'text-rose-400';
  }
}

function getTypeBg(type: TreeNode['type']): string {
  switch (type) {
    case 'string':
      return 'bg-green-400/10';
    case 'number':
      return 'bg-amber-400/10';
    case 'boolean':
      return 'bg-purple-400/10';
    case 'null':
      return 'bg-slate-500/10';
    case 'object':
      return 'bg-cyan-400/10';
    case 'array':
      return 'bg-rose-400/10';
  }
}

const SAMPLE_JSON = `{
  "name": "DevBench API",
  "version": "3.2.1",
  "active": true,
  "maintainer": null,
  "stats": {
    "users": 47892,
    "tools": 74,
    "uptime": 99.97,
    "features": ["json-formatter", "base64", "regex-tester"]
  },
  "endpoints": [
    {
      "path": "/api/users",
      "method": "GET",
      "auth": true,
      "rateLimit": 100
    },
    {
      "path": "/api/tools",
      "method": "GET",
      "auth": false,
      "rateLimit": 1000
    }
  ],
  "config": {
    "cache": {
      "ttl": 300,
      "strategy": "lru"
    },
    "logging": {
      "level": "info",
      "format": "json"
    }
  }
}`;

function TreeNodeRow({
  node,
  expanded,
  onToggle,
  onCopyPath,
  onCopyValue,
  searchQuery,
  matchPath,
  collapsedNodes,
}: {
  node: TreeNode;
  expanded: boolean;
  onToggle: (path: string) => void;
  onCopyPath: (path: string) => void;
  onCopyValue: (val: JsonValue) => void;
  searchQuery: string;
  matchPath: boolean;
  collapsedNodes: Set<string>;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes.has(node.path);
  const isExpandable = node.type === 'object' || node.type === 'array';

  const highlightClass = matchPath
    ? 'bg-amber-400/10 border-l-2 border-amber-400'
    : '';

  return (
    <div className={`${highlightClass} transition-colors`}>
      <div
        className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-700/30 rounded group cursor-pointer font-mono text-sm"
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
        onClick={() => isExpandable && onToggle(node.path)}
        title={node.path || 'root'}
      >
        {/* Expand/collapse toggle */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpandable ? (
            isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </span>

        {/* Key */}
        {node.key && (
          <span className="text-slate-300 flex-shrink-0">{node.key}</span>
        )}

        {/* Colon separator for objects */}
        {node.key && node.type !== 'array' && (
          <span className="text-slate-600 mr-1">:</span>
        )}

        {/* Value or type badge */}
        {hasChildren && isCollapsed ? (
          <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeBg(node.type)} ${getTypeColor(node.type)}`}>
            {stringifyValue(node.value)}
          </span>
        ) : !hasChildren ? (
          <span className={getTypeColor(node.type)}>
            {node.type === 'string'
              ? truncate(`"${node.value as string}"`, 60)
              : stringifyValue(node.value)}
          </span>
        ) : node.type === 'array' ? (
          <span className="text-slate-500 text-xs">[{node.size}]</span>
        ) : (
          <span className="text-slate-500 text-xs">{`{${node.size}}`}</span>
        )}

        {/* Type badge */}
        <span
          className={`hidden group-hover:inline-flex text-[10px] px-1 py-0 rounded ${getTypeBg(node.type)} ${getTypeColor(node.type)} ml-1`}
        >
          {node.type}
        </span>

        {/* Actions */}
        <div className="hidden group-hover:flex items-center gap-0.5 ml-auto flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPath(node.path);
            }}
            className="p-1 hover:bg-slate-600 rounded text-slate-500 hover:text-slate-300"
            title="Copy path"
          >
            <Copy className="w-3 h-3" />
          </button>
          {!hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyValue(node.value);
              }}
              className="p-1 hover:bg-slate-600 rounded text-slate-500 hover:text-slate-300"
              title="Copy value"
            >
              <FileJson className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onCopyPath={onCopyPath}
              onCopyValue={onCopyValue}
              searchQuery={searchQuery}
              matchPath={
                searchQuery
                  ? child.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    JSON.stringify(child.value).toLowerCase().includes(searchQuery.toLowerCase())
                  : false
              }
              collapsedNodes={collapsedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeStats {
  nodeCount: number;
  maxDepth: number;
  jsonSize: string;
  rootType: string;
  keyCount: number;
}

export default function JsonTreeViewerPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAll, setExpandedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse JSON
  const parseJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      const root = buildTree('root', parsed, '$', 0);
      setTree(root);
      setError(null);
      setCollapsedNodes(new Set());
      setExpandedAll(false);
    } catch (e) {
      setError((e as Error).message);
      setTree(null);
    }
  }, []);

  // Auto-parse on input change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => parseJson(input), 300);
    return () => clearTimeout(timer);
  }, [input, parseJson]);

  const stats: TreeStats | null = useMemo(() => {
    if (!tree) return null;
    const depth = maxDepth(tree);
    const nodes = countNodes(tree);
    const size = new Blob([input]).size;
    const formatSize =
      size < 1024
        ? `${size} B`
        : size < 1024 * 1024
          ? `${(size / 1024).toFixed(1)} KB`
          : `${(size / (1024 * 1024)).toFixed(2)} MB`;
    const rootType = tree.type;
    const keyCount = tree.children?.length ?? 0;
    return { nodeCount: nodes, maxDepth: depth, jsonSize: formatSize, rootType, keyCount };
  }, [tree, input]);

  const toggleNode = useCallback((path: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    if (!tree) return;
    const all: string[] = [];
    const walk = (node: TreeNode) => {
      if (node.children && node.children.length > 0) {
        all.push(node.path);
        node.children.forEach(walk);
      }
    };
    walk(tree);
    setCollapsedNodes(new Set(all));
    setExpandedAll(false);
  }, [tree]);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
    setExpandedAll(true);
  }, []);

  const copyPath = useCallback(
    (path: string) => {
      navigator.clipboard.writeText(path);
      toast.success(`Copied: ${path}`);
    },
    [],
  );

  const copyValue = useCallback(
    (val: JsonValue) => {
      const text = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
      navigator.clipboard.writeText(text);
      toast.success('Copied value');
    },
    [],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setInput(text);
        toast.success(`Loaded: ${file.name}`);
      };
      reader.readAsText(file);
      // Reset so same file can be re-uploaded
      e.target.value = '';
    },
    [],
  );

  const clearInput = useCallback(() => {
    setInput('');
    setTree(null);
    setError(null);
    setCollapsedNodes(new Set());
  }, []);

  return (
    <ToolLayout
      title="JSON Tree Viewer"
      description="Explore deeply nested JSON with an interactive collapsible tree — search, copy paths, copy values, and upload JSON files."
      controls={
        tree ? (
          <div className="flex items-center gap-3 w-full flex-wrap">
            {stats && (
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Folders className="w-3 h-3" />
                  {stats.nodeCount} nodes
                </span>
                <span>depth {stats.maxDepth}</span>
                <span>{stats.jsonSize}</span>
                <span className={`px-1.5 py-0.5 rounded ${getTypeBg(tree.type)} ${getTypeColor(tree.type)}`}>
                  {stats.rootType}
                </span>
                <span>{stats.keyCount} top-level keys</span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={expandAll}
                className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Expand all"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={collapseAll}
                className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Collapse all"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Input section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">JSON Input</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInput(SAMPLE_JSON)}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Load sample
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <button
              onClick={clearInput}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.jsonc,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste JSON here..."
          className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-y transition-colors"
          spellCheck={false}
        />
        {error && (
          <div className="mt-2 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-400 font-mono">
            <span className="font-semibold">JSON Parse Error:</span> {error}
          </div>
        )}
      </div>

      {/* Search */}
      {tree && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys, values, or paths..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tree view */}
      {tree && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 overflow-auto max-h-[600px]">
          <TreeNodeRow
            node={tree}
            expanded={expandedAll}
            onToggle={toggleNode}
            onCopyPath={copyPath}
            onCopyValue={copyValue}
            searchQuery={searchQuery}
            matchPath={false}
            collapsedNodes={collapsedNodes}
          />
        </div>
      )}

      {!tree && !error && input.trim() === '' && (
        <div className="text-center py-16 text-slate-500">
          <FileJson className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Paste or upload JSON to explore it as a tree</p>
        </div>
      )}

      {/* Copy whole tree button */}
      {tree && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(JSON.parse(input), null, 2));
              toast.success('Formatted JSON copied');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs text-brand-400 hover:bg-brand-500/20 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy formatted JSON
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(JSON.parse(input)));
              toast.success('Minified JSON copied');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <Minimize2 className="w-3 h-3" />
            Copy minified JSON
          </button>
        </div>
      )}
    </ToolLayout>
  );
}

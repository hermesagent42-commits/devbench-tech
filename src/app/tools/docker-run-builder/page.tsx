'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, RotateCcw, Terminal, Container, Play, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PortMapping {
  host: string;
  container: string;
  protocol: 'tcp' | 'udp';
}

interface VolumeMount {
  host: string;
  container: string;
  readonly: boolean;
}

interface EnvVar {
  key: string;
  value: string;
}

interface DockerRunState {
  image: string;
  containerName: string;
  ports: PortMapping[];
  volumes: VolumeMount[];
  envVars: EnvVar[];
  restart: string;
  detached: boolean;
  interactive: boolean;
  rm: boolean;
  network: string;
  memory: string;
  cpus: string;
  command: string;
  labels: { key: string; value: string }[];
  privileged: boolean;
  user: string;
  workdir: string;
}

interface Preset {
  name: string;
  description: string;
  state: DockerRunState;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Nginx Web Server',
    description: 'Serve static files with Nginx',
    state: {
      image: 'nginx:alpine',
      containerName: 'my-nginx',
      ports: [{ host: '8080', container: '80', protocol: 'tcp' }],
      volumes: [{ host: './html', container: '/usr/share/nginx/html', readonly: false }],
      envVars: [],
      restart: 'unless-stopped',
      detached: true,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'PostgreSQL Database',
    description: 'Run a PostgreSQL 16 instance',
    state: {
      image: 'postgres:16-alpine',
      containerName: 'my-postgres',
      ports: [{ host: '5432', container: '5432', protocol: 'tcp' }],
      volumes: [{ host: './pgdata', container: '/var/lib/postgresql/data', readonly: false }],
      envVars: [
        { key: 'POSTGRES_USER', value: 'admin' },
        { key: 'POSTGRES_PASSWORD', value: 'changeme' },
        { key: 'POSTGRES_DB', value: 'myapp' },
      ],
      restart: 'unless-stopped',
      detached: true,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'Redis Cache',
    description: 'Run Redis 7 with persistence',
    state: {
      image: 'redis:7-alpine',
      containerName: 'my-redis',
      ports: [{ host: '6379', container: '6379', protocol: 'tcp' }],
      volumes: [{ host: './redis_data', container: '/data', readonly: false }],
      envVars: [],
      restart: 'unless-stopped',
      detached: true,
      interactive: false,
      rm: false,
      network: '',
      memory: '256m',
      cpus: '',
      command: 'redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'Node.js App',
    description: 'Run a Node.js application',
    state: {
      image: 'node:20-alpine',
      containerName: 'my-node-app',
      ports: [{ host: '3000', container: '3000', protocol: 'tcp' }],
      volumes: [{ host: '$(pwd)', container: '/app', readonly: false }],
      envVars: [
        { key: 'NODE_ENV', value: 'development' },
        { key: 'PORT', value: '3000' },
      ],
      restart: 'no',
      detached: true,
      interactive: false,
      rm: true,
      network: '',
      memory: '',
      cpus: '1.0',
      command: 'npm run dev',
      labels: [],
      privileged: false,
      user: '',
      workdir: '/app',
    },
  },
  {
    name: 'MySQL Database',
    description: 'Run MySQL 8.0',
    state: {
      image: 'mysql:8.0',
      containerName: 'my-mysql',
      ports: [{ host: '3306', container: '3306', protocol: 'tcp' }],
      volumes: [{ host: './mysql_data', container: '/var/lib/mysql', readonly: false }],
      envVars: [
        { key: 'MYSQL_ROOT_PASSWORD', value: 'rootpass' },
        { key: 'MYSQL_DATABASE', value: 'myapp' },
        { key: 'MYSQL_USER', value: 'user' },
        { key: 'MYSQL_PASSWORD', value: 'userpass' },
      ],
      restart: 'unless-stopped',
      detached: true,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'MongoDB',
    description: 'Run MongoDB 7',
    state: {
      image: 'mongo:7',
      containerName: 'my-mongo',
      ports: [{ host: '27017', container: '27017', protocol: 'tcp' }],
      volumes: [{ host: './mongodata', container: '/data/db', readonly: false }],
      envVars: [
        { key: 'MONGO_INITDB_ROOT_USERNAME', value: 'admin' },
        { key: 'MONGO_INITDB_ROOT_PASSWORD', value: 'changeme' },
      ],
      restart: 'unless-stopped',
      detached: true,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'Interactive Ubuntu Shell',
    description: 'Get a bash shell in Ubuntu',
    state: {
      image: 'ubuntu:22.04',
      containerName: 'ubuntu-shell',
      ports: [],
      volumes: [],
      envVars: [],
      restart: 'no',
      detached: false,
      interactive: true,
      rm: true,
      network: '',
      memory: '',
      cpus: '',
      command: 'bash',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
  {
    name: 'Empty Container',
    description: 'Start from scratch with Alpine',
    state: {
      image: 'alpine:latest',
      containerName: '',
      ports: [],
      volumes: [],
      envVars: [],
      restart: 'no',
      detached: false,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    },
  },
];

const RESTART_OPTIONS = [
  { value: 'no', label: 'No restart' },
  { value: 'always', label: 'Always' },
  { value: 'unless-stopped', label: 'Unless stopped' },
  { value: 'on-failure', label: 'On failure' },
  { value: 'on-failure:5', label: 'On failure (max 5 retries)' },
];

const NETWORK_OPTIONS = [
  { value: '', label: 'Default (bridge)' },
  { value: 'host', label: 'Host' },
  { value: 'none', label: 'None' },
  { value: 'bridge', label: 'Bridge' },
];

const POPULAR_IMAGES = [
  'alpine:latest',
  'nginx:alpine',
  'node:20-alpine',
  'python:3.12-alpine',
  'postgres:16-alpine',
  'mysql:8.0',
  'redis:7-alpine',
  'mongo:7',
  'ubuntu:22.04',
  'debian:bookworm-slim',
  'golang:1.22-alpine',
  'rust:1.78-alpine',
];

// ── Command Builder ────────────────────────────────────────────────────────

function buildDockerRunCommand(state: DockerRunState): string {
  const parts: string[] = ['docker run'];

  if (state.containerName) {
    parts.push(`--name ${escapeShell(state.containerName)}`);
  }

  if (state.detached) {
    parts.push('-d');
  }

  if (state.interactive) {
    parts.push('-it');
  }

  if (state.rm) {
    parts.push('--rm');
  }

  if (state.privileged) {
    parts.push('--privileged');
  }

  if (state.restart && state.restart !== 'no') {
    parts.push(`--restart ${state.restart}`);
  }

  if (state.network) {
    parts.push(`--network ${state.network}`);
  }

  if (state.user) {
    parts.push(`--user ${escapeShell(state.user)}`);
  }

  if (state.workdir) {
    parts.push(`--workdir ${escapeShell(state.workdir)}`);
  }

  if (state.memory) {
    parts.push(`--memory ${state.memory}`);
  }

  if (state.cpus) {
    parts.push(`--cpus ${state.cpus}`);
  }

  for (const port of state.ports) {
    if (port.host && port.container) {
      const proto = port.protocol === 'udp' ? '/udp' : '';
      parts.push(`-p ${port.host}:${port.container}${proto}`);
    }
  }

  for (const vol of state.volumes) {
    if (vol.host && vol.container) {
      const ro = vol.readonly ? ':ro' : '';
      parts.push(`-v ${escapeShell(vol.host)}:${escapeShell(vol.container)}${ro}`);
    }
  }

  for (const env of state.envVars) {
    if (env.key) {
      parts.push(`-e ${escapeShell(env.key)}=${escapeShell(env.value)}`);
    }
  }

  for (const label of state.labels) {
    if (label.key) {
      parts.push(`--label ${escapeShell(label.key)}=${escapeShell(label.value)}`);
    }
  }

  if (state.image) {
    parts.push(state.image);
  } else {
    parts.push('<IMAGE>');
  }

  if (state.command) {
    parts.push(state.command);
  }

  const joined = parts.join(' ');
  if (joined.length > 100) {
    const lines: string[] = [];
    let currentLine = '';
    for (const part of parts) {
      if (currentLine && (currentLine + ' ' + part).length > 80) {
        lines.push(currentLine + ' \\');
        currentLine = '  ' + part;
      } else {
        currentLine = currentLine ? currentLine + ' ' + part : part;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  return joined;
}

function escapeShell(str: string): string {
  if (!str) return '';
  if (/[^a-zA-Z0-9_.\/:@-]/.test(str)) {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }
  return str;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DockerRunBuilderPage() {
  const [state, setState] = useState<DockerRunState>({
    image: '',
    containerName: '',
    ports: [],
    volumes: [],
    envVars: [],
    restart: 'no',
    detached: false,
    interactive: false,
    rm: false,
    network: '',
    memory: '',
    cpus: '',
    command: '',
    labels: [],
    privileged: false,
    user: '',
    workdir: '',
  });

  const update = useCallback(<K extends keyof DockerRunState>(
    key: K,
    value: DockerRunState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setState({
      ...preset.state,
      ports: [...preset.state.ports],
      volumes: [...preset.state.volumes],
      envVars: [...preset.state.envVars],
      labels: [...preset.state.labels],
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      image: '',
      containerName: '',
      ports: [],
      volumes: [],
      envVars: [],
      restart: 'no',
      detached: false,
      interactive: false,
      rm: false,
      network: '',
      memory: '',
      cpus: '',
      command: '',
      labels: [],
      privileged: false,
      user: '',
      workdir: '',
    });
  }, []);

  const addPort = useCallback(() => {
    setState(prev => ({ ...prev, ports: [...prev.ports, { host: '', container: '', protocol: 'tcp' as const }] }));
  }, []);

  const updatePort = useCallback((idx: number, field: keyof PortMapping, value: string) => {
    setState(prev => {
      const ports = [...prev.ports];
      ports[idx] = { ...ports[idx], [field]: value };
      return { ...prev, ports };
    });
  }, []);

  const removePort = useCallback((idx: number) => {
    setState(prev => ({ ...prev, ports: prev.ports.filter((_, i) => i !== idx) }));
  }, []);

  const addVolume = useCallback(() => {
    setState(prev => ({ ...prev, volumes: [...prev.volumes, { host: '', container: '', readonly: false }] }));
  }, []);

  const updateVolume = useCallback((idx: number, field: keyof VolumeMount, value: string | boolean) => {
    setState(prev => {
      const volumes = [...prev.volumes];
      volumes[idx] = { ...volumes[idx], [field]: value };
      return { ...prev, volumes };
    });
  }, []);

  const removeVolume = useCallback((idx: number) => {
    setState(prev => ({ ...prev, volumes: prev.volumes.filter((_, i) => i !== idx) }));
  }, []);

  const addEnv = useCallback(() => {
    setState(prev => ({ ...prev, envVars: [...prev.envVars, { key: '', value: '' }] }));
  }, []);

  const updateEnv = useCallback((idx: number, field: 'key' | 'value', value: string) => {
    setState(prev => {
      const envVars = [...prev.envVars];
      envVars[idx] = { ...envVars[idx], [field]: value };
      return { ...prev, envVars };
    });
  }, []);

  const removeEnv = useCallback((idx: number) => {
    setState(prev => ({ ...prev, envVars: prev.envVars.filter((_, i) => i !== idx) }));
  }, []);

  const addLabel = useCallback(() => {
    setState(prev => ({ ...prev, labels: [...prev.labels, { key: '', value: '' }] }));
  }, []);

  const updateLabel = useCallback((idx: number, field: 'key' | 'value', value: string) => {
    setState(prev => {
      const labels = [...prev.labels];
      labels[idx] = { ...labels[idx], [field]: value };
      return { ...prev, labels };
    });
  }, []);

  const removeLabel = useCallback((idx: number) => {
    setState(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== idx) }));
  }, []);

  const command = useMemo(() => buildDockerRunCommand(state), [state]);

  const copyCommand = useCallback(() => {
    const flatCmd = command.replace(/ \\\n  /g, ' ');
    navigator.clipboard.writeText(flatCmd).then(
      () => toast.success('Docker run command copied!'),
      () => toast.error('Failed to copy')
    );
  }, [command]);

  const hasContent = state.image || state.ports.length > 0 || state.volumes.length > 0 || state.envVars.length > 0;

  return (
    <ToolLayout
      title="Docker Run Command Builder"
      description="Visually construct docker run commands. Configure ports, volumes, environment variables, restart policies, resource limits, and more — then copy the ready-to-run command."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Container className="w-4 h-4 text-brand-400" />
              Quick Start Presets
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-brand-500/20 hover:text-brand-300 border border-slate-600/50 hover:border-brand-500/30 transition-all"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Image Selection */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Image</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={state.image}
                onChange={(e) => update('image', e.target.value)}
                placeholder="e.g. nginx:alpine, node:20, python:3.12"
                className="input-field font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_IMAGES.map((img) => (
                  <button
                    key={img}
                    onClick={() => update('image', img)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                      state.image === img
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:border-slate-500'
                    }`}
                  >
                    {img}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Options */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Basic Options</h3>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Container Name (--name)</label>
              <input
                type="text"
                value={state.containerName}
                onChange={(e) => update('containerName', e.target.value)}
                placeholder="e.g. my-container"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Restart Policy (--restart)</label>
              <select
                value={state.restart}
                onChange={(e) => update('restart', e.target.value)}
                className="input-field text-sm"
              >
                {RESTART_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Network (--network)</label>
              <select
                value={state.network}
                onChange={(e) => update('network', e.target.value)}
                className="input-field text-sm"
              >
                {NETWORK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={state.detached}
                  onChange={(e) => update('detached', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300">Detached (-d)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={state.interactive}
                  onChange={(e) => update('interactive', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300">Interactive (-it)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={state.rm}
                  onChange={(e) => update('rm', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300">Auto-remove (--rm)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={state.privileged}
                  onChange={(e) => update('privileged', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300">Privileged</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">User (--user)</label>
                <input
                  type="text"
                  value={state.user}
                  onChange={(e) => update('user', e.target.value)}
                  placeholder="e.g. 1000:1000"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Working Dir (--workdir)</label>
                <input
                  type="text"
                  value={state.workdir}
                  onChange={(e) => update('workdir', e.target.value)}
                  placeholder="e.g. /app"
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Resource Limits */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Resource Limits</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Memory Limit (--memory)</label>
                <input
                  type="text"
                  value={state.memory}
                  onChange={(e) => update('memory', e.target.value)}
                  placeholder="e.g. 256m, 1g"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">CPU Limit (--cpus)</label>
                <input
                  type="text"
                  value={state.cpus}
                  onChange={(e) => update('cpus', e.target.value)}
                  placeholder="e.g. 0.5, 2.0"
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Ports */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Port Mappings (-p)</h3>
              <button onClick={addPort} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Port
              </button>
            </div>
            {state.ports.length === 0 && (
              <p className="text-xs text-slate-500 italic">No ports mapped.</p>
            )}
            {state.ports.map((port, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={port.host}
                  onChange={(e) => updatePort(idx, 'host', e.target.value)}
                  placeholder="Host port"
                  className="input-field flex-1 text-xs"
                />
                <span className="text-slate-500 text-xs">:</span>
                <input
                  type="text"
                  value={port.container}
                  onChange={(e) => updatePort(idx, 'container', e.target.value)}
                  placeholder="Container port"
                  className="input-field flex-1 text-xs"
                />
                <select
                  value={port.protocol}
                  onChange={(e) => updatePort(idx, 'protocol', e.target.value)}
                  className="input-field w-16 text-xs"
                >
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                </select>
                <button onClick={() => removePort(idx)} className="p-1 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Volumes */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Volume Mounts (-v)</h3>
              <button onClick={addVolume} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Volume
              </button>
            </div>
            {state.volumes.length === 0 && (
              <p className="text-xs text-slate-500 italic">No volumes. Data will be lost when the container is removed.</p>
            )}
            {state.volumes.map((vol, idx) => (
              <div key={idx} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={vol.host}
                  onChange={(e) => updateVolume(idx, 'host', e.target.value)}
                  placeholder="Host path"
                  className="input-field flex-1 text-xs min-w-[120px]"
                />
                <span className="text-slate-500 text-xs">:</span>
                <input
                  type="text"
                  value={vol.container}
                  onChange={(e) => updateVolume(idx, 'container', e.target.value)}
                  placeholder="Container path"
                  className="input-field flex-1 text-xs min-w-[120px]"
                />
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vol.readonly}
                    onChange={(e) => updateVolume(idx, 'readonly', e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">ro</span>
                </label>
                <button onClick={() => removeVolume(idx)} className="p-1 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Environment Variables */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Environment Variables (-e)</h3>
              <button onClick={addEnv} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Variable
              </button>
            </div>
            {state.envVars.length === 0 && (
              <p className="text-xs text-slate-500 italic">No environment variables set.</p>
            )}
            {state.envVars.map((env, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => updateEnv(idx, 'key', e.target.value)}
                  placeholder="KEY"
                  className="input-field flex-1 text-xs font-mono"
                />
                <span className="text-slate-500 text-xs">=</span>
                <input
                  type="text"
                  value={env.value}
                  onChange={(e) => updateEnv(idx, 'value', e.target.value)}
                  placeholder="value"
                  className="input-field flex-[2] text-xs font-mono"
                />
                <button onClick={() => removeEnv(idx)} className="p-1 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Labels */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Labels (--label)</h3>
              <button onClick={addLabel} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Label
              </button>
            </div>
            {state.labels.length === 0 && (
              <p className="text-xs text-slate-500 italic">No labels set.</p>
            )}
            {state.labels.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={label.key}
                  onChange={(e) => updateLabel(idx, 'key', e.target.value)}
                  placeholder="label-key"
                  className="input-field flex-1 text-xs font-mono"
                />
                <span className="text-slate-500 text-xs">=</span>
                <input
                  type="text"
                  value={label.value}
                  onChange={(e) => updateLabel(idx, 'value', e.target.value)}
                  placeholder="value"
                  className="input-field flex-[2] text-xs font-mono"
                />
                <button onClick={() => removeLabel(idx)} className="p-1 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Command */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Command Override</h3>
            <input
              type="text"
              value={state.command}
              onChange={(e) => update('command', e.target.value)}
              placeholder="e.g. bash, npm start, redis-server --appendonly yes"
              className="input-field font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Override the default CMD in the Docker image. Leave empty to use the image default.
            </p>
          </div>
        </div>

        {/* Right Panel - Command Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              Generated Command
            </h3>
            <div className="flex gap-1.5">
              <button onClick={reset} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={copyCommand}
                disabled={!hasContent}
                className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-brand-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Copy command"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-[#0f172a] border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto min-h-[200px]">
            {command.includes('\n') ? (
              command.split('\n').map((line, i) => (
                <div key={i} className="leading-6">
                  <span className="text-brand-400">{line.replace(/^\s*/, '').split(' ')[0]}</span>
                  {line.replace(/^\s*\S+/, '') && (
                    <span className="text-slate-300">{line.replace(/^\s*\S+/, '')}</span>
                  )}
                  {line.endsWith(' \\') && <span className="text-slate-500"> \</span>}
                </div>
              ))
            ) : (
              <code>{command}</code>
            )}
          </pre>

          {hasContent && (
            <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10 text-xs text-slate-400 space-y-2">
              <p className="font-medium text-brand-300">💡 Tips</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Copy and paste into your terminal to run</li>
                <li>Use <code className="text-brand-300">docker ps</code> to check running containers</li>
                <li>Use <code className="text-brand-300">docker logs {state.containerName || '<name>'}</code> to see output</li>
                <li>Use <code className="text-brand-300">docker stop {state.containerName || '<name>'}</code> to stop</li>
              </ul>
            </div>
          )}

          {!hasContent && (
            <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg">
              Select an image and configure options to generate a docker run command.
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

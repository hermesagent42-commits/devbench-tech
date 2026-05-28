'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Plus, Trash2, ChevronDown, ChevronUp, RotateCcw, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnvVar {
  key: string;
  value: string;
}

interface PortMapping {
  host: string;
  container: string;
}

interface VolumeMount {
  host: string;
  container: string;
}

interface Service {
  id: string;
  name: string;
  image: string;
  ports: PortMapping[];
  volumes: VolumeMount[];
  envVars: EnvVar[];
  dependsOn: string[];
  restart: string;
  command: string;
}

interface Preset {
  name: string;
  description: string;
  services: Service[];
}

const presets: Preset[] = [
  {
    name: 'WordPress + MySQL',
    description: 'WordPress blog with MySQL database',
    services: [
      {
        id: 'wordpress',
        name: 'wordpress',
        image: 'wordpress:latest',
        ports: [{ host: '8080', container: '80' }],
        volumes: [{ host: './wordpress', container: '/var/www/html' }],
        envVars: [
          { key: 'WORDPRESS_DB_HOST', value: 'db:3306' },
          { key: 'WORDPRESS_DB_USER', value: 'wordpress' },
          { key: 'WORDPRESS_DB_PASSWORD', value: 'wordpress' },
          { key: 'WORDPRESS_DB_NAME', value: 'wordpress' },
        ],
        dependsOn: ['db'],
        restart: 'always',
        command: '',
      },
      {
        id: 'db',
        name: 'db',
        image: 'mysql:8.0',
        ports: [{ host: '3306', container: '3306' }],
        volumes: [{ host: './db_data', container: '/var/lib/mysql' }],
        envVars: [
          { key: 'MYSQL_ROOT_PASSWORD', value: 'rootpassword' },
          { key: 'MYSQL_DATABASE', value: 'wordpress' },
          { key: 'MYSQL_USER', value: 'wordpress' },
          { key: 'MYSQL_PASSWORD', value: 'wordpress' },
        ],
        dependsOn: [],
        restart: 'always',
        command: '',
      },
    ],
  },
  {
    name: 'Node.js + PostgreSQL',
    description: 'Node.js API with PostgreSQL database',
    services: [
      {
        id: 'api',
        name: 'api',
        image: 'node:20-alpine',
        ports: [{ host: '3000', container: '3000' }],
        volumes: [{ host: './app', container: '/app' }],
        envVars: [
          { key: 'DATABASE_URL', value: 'postgresql://user:password@db:5432/app' },
          { key: 'NODE_ENV', value: 'development' },
        ],
        dependsOn: ['db'],
        restart: 'unless-stopped',
        command: 'npm run dev',
      },
      {
        id: 'db',
        name: 'db',
        image: 'postgres:16-alpine',
        ports: [{ host: '5432', container: '5432' }],
        volumes: [{ host: './pgdata', container: '/var/lib/postgresql/data' }],
        envVars: [
          { key: 'POSTGRES_USER', value: 'user' },
          { key: 'POSTGRES_PASSWORD', value: 'password' },
          { key: 'POSTGRES_DB', value: 'app' },
        ],
        dependsOn: [],
        restart: 'unless-stopped',
        command: '',
      },
    ],
  },
  {
    name: 'Nginx + App',
    description: 'Nginx reverse proxy with your web app',
    services: [
      {
        id: 'nginx',
        name: 'nginx',
        image: 'nginx:alpine',
        ports: [
          { host: '80', container: '80' },
          { host: '443', container: '443' },
        ],
        volumes: [
          { host: './nginx.conf', container: '/etc/nginx/nginx.conf' },
          { host: './certs', container: '/etc/nginx/certs' },
        ],
        envVars: [],
        dependsOn: ['app'],
        restart: 'always',
        command: '',
      },
      {
        id: 'app',
        name: 'app',
        image: 'node:20-alpine',
        ports: [{ host: '3000', container: '3000' }],
        volumes: [{ host: './app', container: '/app' }],
        envVars: [{ key: 'NODE_ENV', value: 'production' }],
        dependsOn: [],
        restart: 'always',
        command: 'node server.js',
      },
    ],
  },
  {
    name: 'Redis Cache',
    description: 'App with Redis caching layer',
    services: [
      {
        id: 'app',
        name: 'app',
        image: 'node:20-alpine',
        ports: [{ host: '3000', container: '3000' }],
        volumes: [{ host: './app', container: '/app' }],
        envVars: [
          { key: 'REDIS_URL', value: 'redis://redis:6379' },
          { key: 'NODE_ENV', value: 'production' },
        ],
        dependsOn: ['redis'],
        restart: 'always',
        command: 'node server.js',
      },
      {
        id: 'redis',
        name: 'redis',
        image: 'redis:7-alpine',
        ports: [{ host: '6379', container: '6379' }],
        volumes: [{ host: './redis_data', container: '/data' }],
        envVars: [],
        dependsOn: [],
        restart: 'always',
        command: 'redis-server --appendonly yes',
      },
    ],
  },
  {
    name: 'Empty Stack',
    description: 'Start from scratch',
    services: [],
  },
];

let nextId = 1;
function generateId(): string {
  return `svc_${nextId++}_${Date.now()}`;
}

function generateYAML(services: Service[]): string {
  if (services.length === 0) return '# No services defined yet.\n# Add services using the form below.';

  const lines: string[] = ['version: "3.8"', '', 'services:'];

  for (const svc of services) {
    lines.push(`  ${svc.name}:`);
    lines.push(`    image: ${svc.image || 'alpine:latest'}`);
    if (svc.command) {
      lines.push(`    command: "${svc.command}"`);
    }
    if (svc.restart && svc.restart !== 'no') {
      lines.push(`    restart: ${svc.restart}`);
    }
    if (svc.ports.length > 0) {
      lines.push('    ports:');
      for (const p of svc.ports) {
        if (p.host && p.container) {
          lines.push(`      - "${p.host}:${p.container}"`);
        }
      }
    }
    if (svc.volumes.length > 0) {
      lines.push('    volumes:');
      for (const v of svc.volumes) {
        if (v.host && v.container) {
          lines.push(`      - ${v.host}:${v.container}`);
        }
      }
    }
    if (svc.envVars.length > 0) {
      lines.push('    environment:');
      for (const e of svc.envVars) {
        if (e.key) {
          lines.push(`      ${e.key}: "${e.value}"`);
        }
      }
    }
    if (svc.dependsOn.length > 0) {
      lines.push('    depends_on:');
      for (const d of svc.dependsOn) {
        lines.push(`      - ${d}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

const restartOptions = [
  { value: 'no', label: 'No restart' },
  { value: 'always', label: 'Always' },
  { value: 'unless-stopped', label: 'Unless stopped' },
  { value: 'on-failure', label: 'On failure' },
];

export default function DockerComposeBuilderPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [viewYaml, setViewYaml] = useState(false);

  const addService = useCallback(() => {
    const svc: Service = {
      id: generateId(),
      name: '',
      image: '',
      ports: [],
      volumes: [],
      envVars: [],
      dependsOn: [],
      restart: 'no',
      command: '',
    };
    setServices((prev) => [...prev, svc]);
    setActiveService(svc.id);
  }, []);

  const removeService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    setActiveService((prev) => (prev === id ? null : prev));
  }, []);

  const updateService = useCallback(
    (id: string, field: keyof Service, value: unknown) => {
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const addEnvVar = useCallback((svcId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, envVars: [...s.envVars, { key: '', value: '' }] }
          : s
      )
    );
  }, []);

  const updateEnvVar = useCallback(
    (svcId: string, idx: number, field: 'key' | 'value', value: string) => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== svcId) return s;
          const newEnv = [...s.envVars];
          newEnv[idx] = { ...newEnv[idx], [field]: value };
          return { ...s, envVars: newEnv };
        })
      );
    },
    []
  );

  const removeEnvVar = useCallback((svcId: string, idx: number) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, envVars: s.envVars.filter((_, i) => i !== idx) }
          : s
      )
    );
  }, []);

  const addPort = useCallback((svcId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, ports: [...s.ports, { host: '', container: '' }] }
          : s
      )
    );
  }, []);

  const updatePort = useCallback(
    (svcId: string, idx: number, field: 'host' | 'container', value: string) => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== svcId) return s;
          const newPorts = [...s.ports];
          newPorts[idx] = { ...newPorts[idx], [field]: value };
          return { ...s, ports: newPorts };
        })
      );
    },
    []
  );

  const removePort = useCallback((svcId: string, idx: number) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, ports: s.ports.filter((_, i) => i !== idx) }
          : s
      )
    );
  }, []);

  const addVolume = useCallback((svcId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, volumes: [...s.volumes, { host: '', container: '' }] }
          : s
      )
    );
  }, []);

  const updateVolume = useCallback(
    (svcId: string, idx: number, field: 'host' | 'container', value: string) => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== svcId) return s;
          const newVols = [...s.volumes];
          newVols[idx] = { ...newVols[idx], [field]: value };
          return { ...s, volumes: newVols };
        })
      );
    },
    []
  );

  const removeVolume = useCallback((svcId: string, idx: number) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === svcId
          ? { ...s, volumes: s.volumes.filter((_, i) => i !== idx) }
          : s
      )
    );
  }, []);

  const toggleDependsOn = useCallback((svcId: string, depName: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== svcId) return s;
        const current = s.dependsOn;
        const next = current.includes(depName)
          ? current.filter((d) => d !== depName)
          : [...current, depName];
        return { ...s, dependsOn: next };
      })
    );
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    const svcs = preset.services.map((s) => ({ ...s, id: generateId() }));
    setServices(svcs);
    setActiveService(svcs.length > 0 ? svcs[0].id : null);
  }, []);

  const resetAll = useCallback(() => {
    setServices([]);
    setActiveService(null);
  }, []);

  const yaml = generateYAML(services);

  const copyYaml = useCallback(() => {
    navigator.clipboard.writeText(yaml).then(
      () => toast.success('docker-compose.yml copied!'),
      () => toast.error('Failed to copy')
    );
  }, [yaml]);

  const downloadYaml = useCallback(() => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [yaml]);

  // Get names of other services for depends_on picker
  const otherServiceNames = (currentId: string) =>
    services.filter((s) => s.id !== currentId && s.name).map((s) => s.name);

  return (
    <ToolLayout
      title="Docker Compose Builder"
      description="Visually build docker-compose.yml files. Add services, configure ports, volumes, environment variables, and dependencies — then copy or download."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Service list & YAML */}
        <div className="lg:col-span-2 space-y-4">
          {/* Presets */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Start Presets</h3>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
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

          {/* Services List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">
                Services ({services.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={addService}
                  className="text-xs px-3 py-1 rounded-md bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 border border-brand-500/30 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Service
                </button>
              </div>
            </div>

            {services.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg">
                No services yet. Choose a preset above or add one manually.
              </div>
            )}

            {services.map((svc) => (
              <div
                key={svc.id}
                className={`rounded-lg border transition-all ${
                  activeService === svc.id
                    ? 'border-brand-500/50 bg-surface-light'
                    : 'border-slate-700/50 bg-surface-light/50'
                }`}
              >
                <button
                  onClick={() =>
                    setActiveService((prev) => (prev === svc.id ? null : svc.id))
                  }
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {svc.name || 'Unnamed Service'}
                    </span>
                    {svc.image && (
                      <span className="text-xs text-slate-500">({svc.image})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(svc.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {activeService === svc.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {activeService === svc.id && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-700/50 pt-3">
                    {/* Name & Image */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          Service Name
                        </label>
                        <input
                          type="text"
                          value={svc.name}
                          onChange={(e) =>
                            updateService(svc.id, 'name', e.target.value)
                          }
                          placeholder="e.g. web, db, redis"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          Docker Image
                        </label>
                        <input
                          type="text"
                          value={svc.image}
                          onChange={(e) =>
                            updateService(svc.id, 'image', e.target.value)
                          }
                          placeholder="e.g. nginx:alpine"
                          className="input-field"
                        />
                      </div>
                    </div>

                    {/* Command */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Command (optional)
                      </label>
                      <input
                        type="text"
                        value={svc.command}
                        onChange={(e) =>
                          updateService(svc.id, 'command', e.target.value)
                        }
                        placeholder="e.g. npm start, python app.py"
                        className="input-field"
                      />
                    </div>

                    {/* Restart Policy */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Restart Policy
                      </label>
                      <select
                        value={svc.restart}
                        onChange={(e) =>
                          updateService(svc.id, 'restart', e.target.value)
                        }
                        className="input-field"
                      >
                        {restartOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ports */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-400">Ports</label>
                        <button
                          onClick={() => addPort(svc.id)}
                          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      {svc.ports.map((port, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={port.host}
                            onChange={(e) =>
                              updatePort(svc.id, idx, 'host', e.target.value)
                            }
                            placeholder="Host port"
                            className="input-field flex-1 text-xs"
                          />
                          <span className="text-slate-500 text-xs">:</span>
                          <input
                            type="text"
                            value={port.container}
                            onChange={(e) =>
                              updatePort(svc.id, idx, 'container', e.target.value)
                            }
                            placeholder="Container port"
                            className="input-field flex-1 text-xs"
                          />
                          <button
                            onClick={() => removePort(svc.id, idx)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Volumes */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-400">Volumes</label>
                        <button
                          onClick={() => addVolume(svc.id)}
                          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      {svc.volumes.map((vol, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={vol.host}
                            onChange={(e) =>
                              updateVolume(svc.id, idx, 'host', e.target.value)
                            }
                            placeholder="Host path"
                            className="input-field flex-1 text-xs"
                          />
                          <span className="text-slate-500 text-xs">:</span>
                          <input
                            type="text"
                            value={vol.container}
                            onChange={(e) =>
                              updateVolume(svc.id, idx, 'container', e.target.value)
                            }
                            placeholder="Container path"
                            className="input-field flex-1 text-xs"
                          />
                          <button
                            onClick={() => removeVolume(svc.id, idx)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Environment Variables */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-400">
                          Environment Variables
                        </label>
                        <button
                          onClick={() => addEnvVar(svc.id)}
                          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      {svc.envVars.map((env, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={env.key}
                            onChange={(e) =>
                              updateEnvVar(svc.id, idx, 'key', e.target.value)
                            }
                            placeholder="KEY"
                            className="input-field flex-1 text-xs font-mono"
                          />
                          <span className="text-slate-500 text-xs">=</span>
                          <input
                            type="text"
                            value={env.value}
                            onChange={(e) =>
                              updateEnvVar(svc.id, idx, 'value', e.target.value)
                            }
                            placeholder="value"
                            className="input-field flex-[2] text-xs font-mono"
                          />
                          <button
                            onClick={() => removeEnvVar(svc.id, idx)}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Depends On */}
                    {otherServiceNames(svc.id).length > 0 && (
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          Depends On
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {otherServiceNames(svc.id).map((name) => (
                            <button
                              key={name}
                              onClick={() => toggleDependsOn(svc.id, name)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                svc.dependsOn.includes(name)
                                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                  : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:border-slate-500'
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - YAML Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-400" />
              docker-compose.yml
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={copyYaml}
                disabled={services.length === 0}
                className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-brand-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Copy YAML"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={downloadYaml}
                disabled={services.length === 0}
                className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-brand-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Download YAML"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-[#0f172a] border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre min-h-[300px] max-h-[600px] overflow-y-auto">
{yaml.split('\n').map((line, i) => (
              <div key={i} className="leading-6">
                {line.startsWith('#') ? (
                  <span className="text-slate-500">{line}</span>
                ) : line.includes(':') ? (
                  <span>
                    <span className="text-brand-400">
                      {line.substring(0, line.indexOf(':') + 1)}
                    </span>
                    <span className="text-slate-300">
                      {line.substring(line.indexOf(':') + 1)}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-300">{line}</span>
                )}
              </div>
            ))}
          </pre>

          {services.length > 0 && (
            <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10 text-xs text-slate-400">
              <p className="font-medium text-brand-300 mb-1">💡 Usage</p>
              <p>
                Save as <code className="text-brand-300">docker-compose.yml</code> and run:
              </p>
              <code className="block mt-1 text-slate-300 bg-slate-800 p-1.5 rounded">
                docker compose up -d
              </code>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

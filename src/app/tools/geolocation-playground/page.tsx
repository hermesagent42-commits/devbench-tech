'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  MapPin, Play, Square, Clock, Navigation, Gauge, Radio,
  Target, RefreshCw, Copy, Trash2, AlertTriangle, Wifi,
  WifiOff, ShieldAlert, Ban, Monitor, Zap, EyeOff,
  Layers, Crosshair
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PositionSnapshot {
  id: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

type WatchState = 'idle' | 'active' | 'paused';
type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

interface ErrorInfo {
  code: number;
  message: string;
  timestamp: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function formatAccuracy(meters: number): string {
  if (meters < 10) return `${meters.toFixed(1)}m — Excellent (GPS)`;
  if (meters < 50) return `${meters.toFixed(1)}m — Good (GPS/WiFi)`;
  if (meters < 500) return `${meters.toFixed(1)}m — Moderate (WiFi)`;
  return `${meters.toFixed(1)}m — Poor (Cell tower / IP)`;
}

function formatSpeed(mps: number | null): string {
  if (mps === null || mps === undefined) return 'N/A';
  const kph = mps * 3.6;
  const mph = mps * 2.23694;
  return `${kph.toFixed(1)} km/h (${mph.toFixed(1)} mph)`;
}

function formatHeading(deg: number | null): string {
  if (deg === null || deg === undefined) return 'N/A';
  if (deg < 0) deg += 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  return `${deg.toFixed(1)}° ${directions[idx]}`;
}

function openMaps(lat: number, lon: number, provider: 'google' | 'osm' | 'apple') {
  const urls: Record<string, string> = {
    google: `https://www.google.com/maps?q=${lat},${lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`,
    apple: `https://maps.apple.com/?q=${lat},${lon}`,
  };
  window.open(urls[provider], '_blank');
}

function errorToString(code: number): { title: string; description: string; icon: typeof AlertTriangle } {
  switch (code) {
    case 1: return { title: 'Permission Denied', description: 'User denied the geolocation request. Check browser settings (🔒 icon in address bar).', icon: Ban };
    case 2: return { title: 'Position Unavailable', description: 'Position information is unavailable — check GPS/WiFi signal. Try moving near a window.', icon: WifiOff };
    case 3: return { title: 'Timeout', description: 'The request timed out. Increase timeoutMs or check device GPS settings.', icon: Clock };
    default: return { title: 'Unknown Error', description: 'An unknown error occurred.', icon: AlertTriangle };
  }
}

// ── Position history dot component (inlined for simplicity) ───────────────

function HistoryDot({ pos, i, total, onClick }: { pos: PositionSnapshot; i: number; total: number; onClick: () => void }) {
  const scale = 1 - (total - i) / total * 0.8;
  const alpha = 0.2 + (i / total) * 0.8;
  return (
    <button
      onClick={onClick}
      className="relative group"
      title={`${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)} — ${new Date(pos.timestamp).toLocaleTimeString()}`}
    >
      <div
        className="w-3 h-3 rounded-full bg-brand-500 hover:ring-2 ring-white/30 transition-all cursor-pointer"
        style={{ transform: `scale(${scale})`, opacity: alpha }}
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[10px] text-slate-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
        {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
      </div>
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GeolocationPlaygroundPage() {
  const [watchState, setWatchState] = useState<WatchState>('idle');
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [currentPosition, setCurrentPosition] = useState<PositionSnapshot | null>(null);
  const [history, setHistory] = useState<PositionSnapshot[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const historyIdRef = useRef(0);
  const [watchCount, setWatchCount] = useState(0);

  // ── Check permission on mount ────────────────────────────────────────────

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermissionState(result.state as PermissionState);
        result.addEventListener('change', () => {
          setPermissionState(result.state as PermissionState);
        });
      }).catch(() => {
        setPermissionState('prompt');
      });
    } else {
      setPermissionState('prompt');
    }
  }, []);

  // ── Stop watching on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Start watching ──────────────────────────────────────────────────────

  const startWatching = useCallback(() => {
    setError(null);
    setHistory([]);
    historyIdRef.current = 0;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 15000,
      maximumAge: 0,
    };

    const onSuccess = (pos: GeolocationPosition) => {
      const snapshot: PositionSnapshot = {
        id: ++historyIdRef.current,
        timestamp: pos.timestamp,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };
      setCurrentPosition(snapshot);
      setHistory(prev => [...prev.slice(-99), snapshot]);
      setWatchCount(c => c + 1);
      setError(null);
      setWatchState('active');
    };

    const onError = (err: GeolocationPositionError) => {
      const errInfo: ErrorInfo = {
        code: err.code,
        message: err.message,
        timestamp: Date.now(),
      };
      setError(errInfo);
      if (err.code === 1) {
        // Permission denied — stop watching
        setWatchState('paused');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options);
    setWatchState('active');
  }, [highAccuracy]);

  // ── Stop watching ───────────────────────────────────────────────────────

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatchState('idle');
  }, []);

  // ── Get single position ─────────────────────────────────────────────────

  const getPosition = useCallback(() => {
    setError(null);

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 10000,
      maximumAge: 0,
    };

    const onSuccess = (pos: GeolocationPosition) => {
      const snapshot: PositionSnapshot = {
        id: ++historyIdRef.current,
        timestamp: pos.timestamp,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };
      setCurrentPosition(snapshot);
      setHistory(prev => [...prev.slice(-99), snapshot]);
      setWatchCount(c => c + 1);
      setError(null);
      toast.success('Position acquired!');
    };

    const onError = (err: GeolocationPositionError) => {
      setError({ code: err.code, message: err.message, timestamp: Date.now() });
      toast.error(`Geolocation error: ${err.message}`);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [highAccuracy]);

  // ── Copy coordinates ────────────────────────────────────────────────────

  const copyCoords = useCallback(() => {
    if (!currentPosition) return;
    navigator.clipboard.writeText(formatCoordinates(currentPosition.latitude, currentPosition.longitude)).then(
      () => toast.success('Coordinates copied!'),
      () => toast.error('Copy failed')
    );
  }, [currentPosition]);

  // ── Copy all history as JSON ────────────────────────────────────────────

  const copyHistory = useCallback(() => {
    if (history.length === 0) return;
    const json = JSON.stringify(history.map(p => ({
      timestamp: new Date(p.timestamp).toISOString(),
      lat: p.latitude,
      lon: p.longitude,
      accuracy: p.accuracy,
      altitude: p.altitude,
      heading: p.heading,
      speed: p.speed,
    })), null, 2);
    navigator.clipboard.writeText(json).then(
      () => toast.success(`Copied ${history.length} positions as JSON!`),
      () => toast.error('Copy failed')
    );
  }, [history]);

  // ── Selected history entry ──────────────────────────────────────────────

  const selectedPosition = useMemo(() => {
    if (selectedHistoryIdx === null) return null;
    return history.find(p => p.id === selectedHistoryIdx) || null;
  }, [selectedHistoryIdx, history]);

  const displayPosition = selectedPosition || currentPosition;

  // ── Error info ──────────────────────────────────────────────────────────

  const errorInfo = error ? errorToString(error.code) : null;

  return (
    <ToolLayout
      title="Geolocation API Playground"
      description="Test and explore the browser Geolocation API. Watch your position in real-time, track accuracy, speed, altitude, and heading."
    >
      {/* ── Controls Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-surface-light border border-slate-700/50 rounded-xl">
        {/* Start/Stop */}
        {watchState !== 'active' ? (
          <button
            onClick={startWatching}
            disabled={permissionState === 'denied'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Start Watching
          </button>
        ) : (
          <button
            onClick={stopWatching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all shadow-lg shadow-red-600/25"
          >
            <Square className="w-4 h-4" />
            Stop Watching
          </button>
        )}

        {/* Single-shot */}
        <button
          onClick={getPosition}
          disabled={permissionState === 'denied'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-all border border-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Crosshair className="w-4 h-4" />
          Get Position Once
        </button>

        {/* High accuracy toggle */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600/50 cursor-pointer hover:border-slate-500 transition-colors">
          <input
            type="checkbox"
            checked={highAccuracy}
            onChange={e => setHighAccuracy(e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-xs text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            High Accuracy
          </span>
        </label>

        {/* Permission badge */}
        <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          permissionState === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
          permissionState === 'denied' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
          'bg-slate-700/50 text-slate-400 border border-slate-600/30'
        }`}>
          {permissionState === 'granted' ? <Wifi className="w-3 h-3" /> :
           permissionState === 'denied' ? <Ban className="w-3 h-3" /> :
           <ShieldAlert className="w-3 h-3" />}
          {permissionState === 'checking' ? 'Checking...' : permissionState}
        </div>

        {/* Watch count */}
        {watchState === 'active' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 text-xs font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            {watchCount} {watchCount === 1 ? 'update' : 'updates'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Position info ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Error */}
          {errorInfo && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                {errorInfo.icon && <errorInfo.icon className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <h3 className="text-sm font-semibold text-red-400">{errorInfo.title}</h3>
                  <p className="text-xs text-red-400/80 mt-1">{errorInfo.description}</p>
                  <p className="text-[10px] text-red-400/50 mt-1 font-mono">{error?.message}</p>
                </div>
              </div>
            </div>
          )}

          {!displayPosition && !error && watchState === 'idle' ? (
            /* Empty state */
            <div className="card min-h-[300px] flex flex-col items-center justify-center text-center">
              <MapPin className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-slate-400 font-medium mb-2">No position data yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mb-4">
                Click <strong className="text-slate-300">Start Watching</strong> for live tracking
                or <strong className="text-slate-300">Get Position Once</strong> for a single snapshot.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Monitor className="w-3.5 h-3.5" />
                <span>Requires HTTPS or localhost. Browser will prompt for permission.</span>
              </div>
            </div>
          ) : displayPosition ? (
            <>
              {/* Coordinates */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Coordinates
                  </h3>
                  <div className="flex items-center gap-1">
                    <button onClick={copyCoords} className="p-1.5 rounded-md text-slate-500 hover:text-brand-400 hover:bg-slate-700/50 transition-all" title="Copy coordinates">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Latitude</span>
                    <p className="text-lg font-mono text-brand-400 font-semibold mt-0.5">
                      {displayPosition.latitude.toFixed(6)}°
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Longitude</span>
                    <p className="text-lg font-mono text-brand-400 font-semibold mt-0.5">
                      {displayPosition.longitude.toFixed(6)}°
                    </p>
                  </div>
                </div>

                {/* Accuracy bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Accuracy</span>
                    <span className="text-xs text-slate-400">{formatAccuracy(displayPosition.accuracy)}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(5, (1 - displayPosition.accuracy / 1000) * 100))}%`,
                        background: displayPosition.accuracy < 10 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                                     displayPosition.accuracy < 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                     'linear-gradient(90deg, #f97316, #fb923c)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Timestamp</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    {new Date(displayPosition.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Altitude</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    {displayPosition.altitude !== null ? `${displayPosition.altitude.toFixed(1)}m` : 'N/A'}
                  </p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Navigation className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Heading</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    {formatHeading(displayPosition.heading)}
                  </p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Speed</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    {formatSpeed(displayPosition.speed)}
                  </p>
                </div>
              </div>

              {/* Map links */}
              <div className="card">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Open in Maps
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[{ key: 'google', label: 'Google Maps' },
                    { key: 'osm', label: 'OpenStreetMap' },
                    { key: 'apple', label: 'Apple Maps' }].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => openMaps(displayPosition.latitude, displayPosition.longitude, key as 'google' | 'osm' | 'apple')}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600/50 hover:border-slate-500 transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Right column: History + Code ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* History */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                History ({history.length})
              </h3>
              {history.length > 0 && (
                <div className="flex items-center gap-1">
                  <button onClick={copyHistory} className="p-1 rounded-md text-slate-500 hover:text-brand-400 hover:bg-slate-700/50 transition-all" title="Copy all as JSON">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setHistory([]); setSelectedHistoryIdx(null); }}
                    className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-all"
                    title="Clear history"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">
                Position history will appear here as watcher fires
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                {[...history].reverse().map((pos, i) => {
                  const isSelected = selectedHistoryIdx === pos.id;
                  return (
                    <button
                      key={pos.id}
                      onClick={() => setSelectedHistoryIdx(isSelected ? null : pos.id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all text-xs border ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/30'
                          : 'bg-slate-800/30 border-transparent hover:bg-slate-800/60 hover:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-500">
                          #{pos.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(pos.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono text-slate-300 mt-0.5">
                        {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] ${
                          pos.accuracy < 10 ? 'text-emerald-400' :
                          pos.accuracy < 50 ? 'text-amber-400' :
                          'text-orange-400'
                        }`}>
                          ±{pos.accuracy.toFixed(0)}m
                        </span>
                        {pos.speed !== null && (
                          <span className="text-[10px] text-slate-600">
                            {(pos.speed * 3.6).toFixed(1)} km/h
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* API Details */}
          <div className="card">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              API Details
            </h3>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Protocol</span>
                <span className="text-slate-300 font-mono">HTTPS only</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Permission</span>
                <span className={`font-mono ${
                  permissionState === 'granted' ? 'text-emerald-400' :
                  permissionState === 'denied' ? 'text-red-400' :
                  'text-slate-400'
                }`}>{permissionState}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>High Accuracy</span>
                <span className={`font-mono ${highAccuracy ? 'text-amber-400' : 'text-slate-400'}`}>
                  {highAccuracy ? 'ON' : 'OFF'}
                </span>
              </div>
              {currentPosition && (
                <div className="flex items-center justify-between">
                  <span>Altitude Acc.</span>
                  <span className="font-mono text-slate-300">
                    {currentPosition.altitudeAccuracy !== null ? `±${currentPosition.altitudeAccuracy.toFixed(1)}m` : 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Raw data toggle */}
          {displayPosition && (
            <div className="card">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between text-xs"
              >
                <span className="text-slate-400 flex items-center gap-1.5">
                  {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Raw Position Object
                </span>
                <span className="text-slate-600">{showRaw ? 'Hide' : 'Show'}</span>
              </button>
              {showRaw && (
                <pre className="mt-3 p-3 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-700/30">
{`{
  coords: {
    latitude: ${displayPosition.latitude},
    longitude: ${displayPosition.longitude},
    accuracy: ${displayPosition.accuracy},
    altitude: ${displayPosition.altitude ?? null},
    altitudeAccuracy: ${displayPosition.altitudeAccuracy ?? null},
    heading: ${displayPosition.heading ?? null},
    speed: ${displayPosition.speed ?? null},
  },
  timestamp: ${displayPosition.timestamp}
}`}
                </pre>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              Tips
            </h4>
            <ul className="space-y-1.5 text-[10px] text-slate-500">
              <li>• <strong className="text-slate-400">Desktop:</strong> WiFi-based positioning — moderate accuracy (20–50m)</li>
              <li>• <strong className="text-slate-400">Mobile:</strong> GPS if you grant permission — excellent accuracy (&lt;10m)</li>
              <li>• <strong className="text-slate-400">Speed/Heading:</strong> Only available on mobile with GPS active</li>
              <li>• <strong className="text-slate-400">HTTPS:</strong> Geolocation requires a secure context</li>
              <li>• <strong className="text-slate-400">High Accuracy:</strong> Uses GPS on mobile (higher battery drain)</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

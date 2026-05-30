'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  Coffee,
  Brain,
  Settings2,
  Volume2,
  VolumeX,
  Bell,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Zap,
  Flame,
  History,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SessionType = 'focus' | 'short-break' | 'long-break';

interface SessionConfig {
  name: string;
  minutes: number;
  icon: typeof Timer;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

interface SessionRecord {
  date: string;
  type: SessionType;
  duration: number;
  completed: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_CONFIGS: Record<SessionType, Omit<SessionConfig, 'color' | 'bgColor' | 'borderColor' | 'textColor'>> = {
  focus: { name: 'Focus', minutes: 25, icon: Brain },
  'short-break': { name: 'Short Break', minutes: 5, icon: Coffee },
  'long-break': { name: 'Long Break', minutes: 15, icon: Zap },
};

const THEME: Record<SessionType, Pick<SessionConfig, 'color' | 'bgColor' | 'borderColor' | 'textColor'>> = {
  focus: {
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    textColor: 'text-orange-400',
  },
  'short-break': {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    textColor: 'text-green-400',
  },
  'long-break': {
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    textColor: 'text-purple-400',
  },
};

const STORAGE_KEY = 'devbench-pomodoro';
const HISTORY_KEY = 'devbench-pomodoro-history';

// ── Sound utilities ────────────────────────────────────────────────────────

function playBeep(type: 'start' | 'end') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'end') {
      // Three ascending beeps
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        g.gain.setValueAtTime(0.3, now + i * 0.2);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.3);
        o.start(now + i * 0.2);
        o.stop(now + i * 0.2 + 0.3);
      });
    } else {
      // Single soft chime
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio not supported — fail silently
  }
}

function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ── Formatting ─────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Circular Progress ──────────────────────────────────────────────────────

function CircularTimer({
  totalSeconds,
  remainingSeconds,
  isRunning,
  config,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  config: SessionConfig;
}) {
  const radius = 130;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} className="-rotate-90">
        {/* Background circle */}
        <circle
          stroke="rgba(255,255,255,0.06)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke={config.color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-mono font-bold tracking-tight tabular-nums"
          style={{ color: config.color }}
        >
          {formatTime(remainingSeconds)}
        </span>
        <span className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">
          {isRunning ? 'running' : 'paused'}
        </span>
      </div>
    </div>
  );
}

// ── Session Stats ──────────────────────────────────────────────────────────

function getStats(history: SessionRecord[]) {
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = history.filter((r) => r.date.startsWith(today) && r.completed && r.type === 'focus');
  const totalFocus = history.filter((r) => r.completed && r.type === 'focus');
  const streak = computeStreak(history);
  return {
    todayCount: todaySessions.length,
    todayMinutes: todaySessions.reduce((s, r) => s + r.duration, 0),
    totalCount: totalFocus.length,
    totalMinutes: totalFocus.reduce((s, r) => s + r.duration, 0),
    streak,
  };
}

function computeStreak(history: SessionRecord[]): number {
  const completed = history
    .filter((r) => r.completed && r.type === 'focus')
    .map((r) => r.date.split('T')[0])
    .sort()
    .reverse();

  if (completed.length === 0) return 0;

  const unique = Array.from(new Set(completed));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < unique.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (unique[i] === expectedStr) {
      streak++;
    } else if (i === 0 && unique[0] === new Date(today.getTime() - 86400000).toISOString().split('T')[0]) {
      // Allow yesterday as streak start
      streak++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PomodoroTimerPage() {
  // Session state
  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [customMinutes, setCustomMinutes] = useState<Record<SessionType, number>>({
    focus: 25,
    'short-break': 5,
    'long-break': 15,
  });
  const [remainingSeconds, setRemainingSeconds] = useState(customMinutes.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoCycle, setAutoCycle] = useState(true);
  const [focusCount, setFocusCount] = useState(0);

  // History
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const config: SessionConfig = {
    ...SESSION_CONFIGS[sessionType],
    ...THEME[sessionType],
    minutes: customMinutes[sessionType],
  };

  // ── Load state from localStorage ──────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.customMinutes) setCustomMinutes(data.customMinutes);
        if (data.soundEnabled !== undefined) setSoundEnabled(data.soundEnabled);
        if (data.autoCycle !== undefined) setAutoCycle(data.autoCycle);
        if (data.focusCount) setFocusCount(data.focusCount);
      }
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    } catch {
      // Corrupt data — reset
    }
    requestNotificationPermission();
  }, []);

  // Reset timer when session type changes
  useEffect(() => {
    setIsRunning(false);
    setRemainingSeconds(customMinutes[sessionType] * 60);
  }, [sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Timer complete
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Handle timer completion
  useEffect(() => {
    if (remainingSeconds === 0 && isRunning) {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ customMinutes, soundEnabled, autoCycle, focusCount }),
    );
  }, [customMinutes, soundEnabled, autoCycle, focusCount]);

  // Persist history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)));
  }, [history]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    const record: SessionRecord = {
      date: new Date().toISOString(),
      type: sessionType,
      duration: customMinutes[sessionType],
      completed: true,
    };
    setHistory((prev) => [record, ...prev]);

    if (soundEnabled) playBeep('end');
    notify(
      `${config.name} Complete!`,
      sessionType === 'focus'
        ? `Great job! Time for a ${focusCount % 4 === 3 ? 'long' : 'short'} break.`
        : 'Break over. Ready for another focus session?',
    );

    if (sessionType === 'focus') {
      const newCount = focusCount + 1;
      setFocusCount(newCount);
      if (autoCycle) {
        const nextType: SessionType = newCount % 4 === 0 ? 'long-break' : 'short-break';
        setSessionType(nextType);
        setRemainingSeconds(customMinutes[nextType] * 60);
      }
    } else {
      if (autoCycle) {
        setSessionType('focus');
        setRemainingSeconds(customMinutes.focus * 60);
      }
    }
  }, [sessionType, config.name, focusCount, soundEnabled, autoCycle, customMinutes]);

  const toggleRunning = useCallback(() => {
    if (!isRunning && remainingSeconds === 0) {
      setRemainingSeconds(customMinutes[sessionType] * 60);
    }
    if (!isRunning && soundEnabled) {
      playBeep('start');
    }
    setIsRunning(!isRunning);
  }, [isRunning, remainingSeconds, soundEnabled, customMinutes, sessionType]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(customMinutes[sessionType] * 60);
  }, [customMinutes, sessionType]);

  const skip = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setFocusCount(0);
    toast.success('History cleared');
  }, []);

  const stats = getStats(history);
  const totalSeconds = customMinutes[sessionType] * 60;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Pomodoro Timer"
      description="Stay focused with timed work sessions and breaks. Pure client-side — sounds, notifications, and session history."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          {(['focus', 'short-break', 'long-break'] as SessionType[]).map((type) => {
            const cfg = { ...SESSION_CONFIGS[type], ...THEME[type] };
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => {
                  if (!isRunning) setSessionType(type);
                }}
                disabled={isRunning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sessionType === type
                    ? 'bg-slate-700/80 text-white border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: sessionType === type ? cfg.color : undefined }} />
                {cfg.name}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Timer Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-8">
            <CircularTimer
              totalSeconds={totalSeconds}
              remainingSeconds={remainingSeconds}
              isRunning={isRunning}
              config={config}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={toggleRunning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: config.color,
                color: '#fff',
              }}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {remainingSeconds === totalSeconds ? 'Start' : 'Resume'}
                </>
              )}
            </button>

            <button
              onClick={reset}
              className="p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={skip}
              className="p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Quick settings row */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? 'Sound on' : 'Muted'}
            </button>

            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCycle}
                onChange={(e) => setAutoCycle(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-0"
              />
              Auto-cycle
            </label>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>

          {/* Custom duration settings */}
          {showSettings && (
            <div className="w-full max-w-xs p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Session Durations (minutes)
              </h3>
              {(['focus', 'short-break', 'long-break'] as SessionType[]).map((type) => {
                const cfg = { ...SESSION_CONFIGS[type], ...THEME[type] };
                return (
                  <div key={type} className="flex items-center gap-3 mb-2 last:mb-0">
                    <span className="text-xs text-slate-400 w-24">{cfg.name}</span>
                    <input
                      type="range"
                      min={type === 'focus' ? 1 : 1}
                      max={type === 'focus' ? 60 : 30}
                      value={customMinutes[type]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setCustomMinutes((prev) => ({ ...prev, [type]: val }));
                        if (sessionType === type) {
                          setRemainingSeconds(val * 60);
                          setIsRunning(false);
                        }
                      }}
                      className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400 [&::-webkit-slider-thumb]:cursor-pointer"
                      style={{ accentColor: cfg.color }}
                    />
                    <span className="text-xs text-slate-200 w-8 text-right font-mono">
                      {customMinutes[type]}m
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>
                Session {focusCount + 1} / ∞
              </span>
              <span>
                {focusCount % 4 === 3 ? 'Next: Long Break' : 'Next: Short Break'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((totalSeconds - remainingSeconds) / totalSeconds) * 100}%`,
                  backgroundColor: config.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="lg:w-72 space-y-4">
          {/* Stats card */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" /> Today
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-slate-900/50">
                <div className="text-2xl font-bold" style={{ color: THEME.focus.color }}>
                  {stats.todayCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Sessions</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-900/50">
                <div className="text-2xl font-bold" style={{ color: THEME.focus.color }}>
                  {stats.todayMinutes}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Minutes</div>
              </div>
            </div>
          </div>

          {/* All-time stats */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> All Time
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total sessions</span>
                <span className="text-sm font-semibold text-slate-200">{stats.totalCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total hours</span>
                <span className="text-sm font-semibold text-slate-200">
                  {(stats.totalMinutes / 60).toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Day streak</span>
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  {stats.streak}
                </span>
              </div>
            </div>
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'Hide history' : `History (${history.filter((r) => r.completed).length})`}
          </button>

          {/* History list */}
          {showHistory && (
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Session History
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              {history.filter((r) => r.completed).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No completed sessions yet. Start your first pomodoro!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {history
                    .filter((r) => r.completed)
                    .slice(0, 30)
                    .map((record, i) => {
                      const cfg = { ...SESSION_CONFIGS[record.type], ...THEME[record.type] };
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-slate-700/30"
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color }} />
                          <span className="text-slate-300">{cfg.name}</span>
                          <span className="text-slate-500">{record.duration}m</span>
                          <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Image as ImageIcon, GripHorizontal, RotateCcw, Download, ArrowLeftRight, Camera, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ImagePair {
  id: string;
  before: string;
  after: string;
  label: string;
  description: string;
}

// ── Sample Images ──────────────────────────────────────────────────────────

const SAMPLE_PAIRS: ImagePair[] = [
  {
    id: 'landscape',
    before: 'https://picsum.photos/seed/mountain1/800/500',
    after: 'https://picsum.photos/seed/mountain2/800/500',
    label: 'Landscape',
    description: 'Two similar landscape photos — compare composition',
  },
  {
    id: 'city',
    before: 'https://picsum.photos/seed/cityday/800/500',
    after: 'https://picsum.photos/seed/citynight/800/500',
    label: 'City',
    description: 'Day vs night — dramatic lighting comparison',
  },
  {
    id: 'abstract',
    before: 'https://picsum.photos/seed/abstract1/800/500',
    after: 'https://picsum.photos/seed/abstract2/800/500',
    label: 'Abstract',
    description: 'Abstract patterns — spot the subtle differences',
  },
  {
    id: 'nature',
    before: 'https://picsum.photos/seed/forest/800/500',
    after: 'https://picsum.photos/seed/ocean/800/500',
    label: 'Nature',
    description: 'Forest vs ocean — compare natural scenes',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function ImageComparisonSliderPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePair, setActivePair] = useState<ImagePair>(SAMPLE_PAIRS[0]);
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null);
  const [afterSrc, setAfterSrc] = useState<string | null>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [beforeLabel, setBeforeLabel] = useState('Before');
  const [afterLabel, setAfterLabel] = useState('After');
  const [showLabels, setShowLabels] = useState(true);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // ── Clamp position ───────────────────────────────────────────────────────

  const clampedPosition = Math.max(0, Math.min(100, position));

  // ── Drag handlers ────────────────────────────────────────────────────────

  const getPositionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
      if (!containerRef.current) return clampedPosition;
      const rect = containerRef.current.getBoundingClientRect();

      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        const touch = e.touches[0] || (e as TouchEvent).changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      if (orientation === 'horizontal') {
        const x = clientX - rect.left;
        return (x / rect.width) * 100;
      } else {
        const y = clientY - rect.top;
        return (y / rect.height) * 100;
      }
    },
    [clampedPosition, orientation]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPosition(getPositionFromEvent(e));
    },
    [getPositionFromEvent]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPosition(getPositionFromEvent(e));
    },
    [getPositionFromEvent]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setPosition(getPositionFromEvent(e as MouseEvent | TouchEvent));
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove as EventListener);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, getPositionFromEvent]);

  // ── Keyboard controls ────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((p) => Math.max(0, p - 1));
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition((p) => Math.min(100, p + 1));
      }
      if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        setPosition((p) => Math.max(0, p - 5));
      }
      if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        setPosition((p) => Math.min(100, p + 5));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── File uploads ─────────────────────────────────────────────────────────

  const handleBeforeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setBeforeSrc(url);
    toast.success(`Loaded: ${file.name}`);
  }, []);

  const handleAfterUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setAfterSrc(url);
    toast.success(`Loaded: ${file.name}`);
  }, []);

  // ── Select sample pair ───────────────────────────────────────────────────

  const selectSamplePair = useCallback((pair: ImagePair) => {
    setActivePair(pair);
    setBeforeSrc(null);
    setAfterSrc(null);
    setPosition(50);
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPosition(50);
    setBeforeSrc(null);
    setAfterSrc(null);
    setBeforeLabel('Before');
    setAfterLabel('After');
  }, []);

  // ── Derived image sources ────────────────────────────────────────────────

  const effectiveBefore = beforeSrc || activePair.before;
  const effectiveAfter = afterSrc || activePair.after;

  // ── Quick position buttons ───────────────────────────────────────────────

  const quickPositions = [0, 25, 50, 75, 100];

  return (
    <ToolLayout
      title="Image Comparison Slider"
      description="Compare two images with a draggable slider — perfect for before/after reveals, design iterations, and visual diffs."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-brand-400 transition-colors">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500/50"
            />
            Labels
          </label>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setOrientation('horizontal')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              orientation === 'horizontal'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ↔ Horizontal
          </button>
          <button
            onClick={() => setOrientation('vertical')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              orientation === 'vertical'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ↕ Vertical
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {quickPositions.map((p) => (
            <button
              key={p}
              onClick={() => setPosition(p)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                clampedPosition === p
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {p}%
            </button>
          ))}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={reset}
            className="text-xs px-2 py-1 rounded text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Upload Images
            </h3>

            <div className="space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Before Image</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-light border border-slate-700/50 cursor-pointer hover:border-brand-500/50 transition-colors text-sm text-slate-300">
                  <Camera className="w-4 h-4 text-slate-500" />
                  {beforeSrc ? 'Change before…' : 'Choose image…'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBeforeUpload}
                    className="hidden"
                  />
                </label>
                {beforeSrc && (
                  <p className="text-xs text-brand-400 mt-1 truncate">✓ Custom image loaded</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">After Image</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-light border border-slate-700/50 cursor-pointer hover:border-brand-500/50 transition-colors text-sm text-slate-300">
                  <Camera className="w-4 h-4 text-slate-500" />
                  {afterSrc ? 'Change after…' : 'Choose image…'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAfterUpload}
                    className="hidden"
                  />
                </label>
                {afterSrc && (
                  <p className="text-xs text-brand-400 mt-1 truncate">✓ Custom image loaded</p>
                )}
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Label Text</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={beforeLabel}
                onChange={(e) => setBeforeLabel(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-light border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                placeholder="Before"
                maxLength={20}
              />
              <input
                type="text"
                value={afterLabel}
                onChange={(e) => setAfterLabel(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-light border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                placeholder="After"
                maxLength={20}
              />
            </div>
          </div>

          {/* Sample pairs */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Sample Pairs
            </h3>
            <div className="space-y-1.5">
              {SAMPLE_PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => selectSamplePair(pair)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    (!beforeSrc && !afterSrc && activePair.id === pair.id)
                      ? 'bg-brand-500/15 border border-brand-500/30 text-brand-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-light border border-transparent'
                  }`}
                >
                  <div className="font-medium">{pair.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{pair.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">⌨ Shortcuts</h3>
            <div className="space-y-1 text-xs text-slate-500">
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">← →</kbd> Move slider 1%</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">Shift+← →</kbd> Move 5%</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">0−9</kbd> Quick percentage</div>
            </div>
          </div>
        </div>

        {/* ── Comparison Slider ──────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          {/* Slider container */}
          <div
            ref={containerRef}
            className={`relative w-full bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              aspectRatio: orientation === 'horizontal' ? '16 / 9' : '9 / 16',
              maxHeight: '70vh',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* After (full) image — appears as base */}
            <div className="absolute inset-0">
              <img
                src={effectiveAfter}
                alt="After"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Before image — clipped by slider position */}
            <div
              className="absolute inset-0"
              style={{
                clipPath:
                  orientation === 'horizontal'
                    ? `inset(0 ${100 - clampedPosition}% 0 0)`
                    : `inset(0 0 ${100 - clampedPosition}% 0)`,
              }}
            >
              <img
                src={effectiveBefore}
                alt="Before"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Labels */}
            {showLabels && (
              <>
                <div
                  className={`absolute px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium pointer-events-none transition-opacity ${
                    orientation === 'horizontal'
                      ? `top-3 ${clampedPosition > 50 ? 'left-3' : 'right-3'}`
                      : `left-3 ${clampedPosition > 50 ? 'top-3' : 'bottom-3'}`
                  }`}
                  style={{
                    opacity: clampedPosition > 5 ? 1 : 0,
                  }}
                >
                  {beforeLabel}
                </div>
                <div
                  className={`absolute px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium pointer-events-none transition-opacity ${
                    orientation === 'horizontal'
                      ? `top-3 ${clampedPosition > 50 ? 'right-3' : 'left-3'}`
                      : `left-3 ${clampedPosition > 50 ? 'bottom-3' : 'top-3'}`
                  }`}
                  style={{
                    opacity: clampedPosition < 95 ? 1 : 0,
                  }}
                >
                  {afterLabel}
                </div>
              </>
            )}

            {/* Slider line */}
            <div
              className="absolute bg-white shadow-lg pointer-events-none"
              style={
                orientation === 'horizontal'
                  ? {
                      left: `${clampedPosition}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      transform: 'translateX(-50%)',
                    }
                  : {
                      top: `${clampedPosition}%`,
                      left: 0,
                      right: 0,
                      height: '2px',
                      transform: 'translateY(-50%)',
                    }
              }
            />

            {/* Slider handle */}
            <div
              className={`absolute pointer-events-none flex items-center justify-center ${
                isDragging ? 'scale-110' : ''
              } transition-transform duration-150`}
              style={
                orientation === 'horizontal'
                  ? {
                      left: `${clampedPosition}%`,
                      top: '50%',
                      transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.15)' : 'scale(1)'}`,
                    }
                  : {
                      top: `${clampedPosition}%`,
                      left: '50%',
                      transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.15)' : 'scale(1)'}`,
                    }
              }
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xl border-2 border-slate-200 flex items-center justify-center">
                <GripHorizontal className="w-5 h-5 text-slate-500" />
              </div>
            </div>

            {/* Position indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-mono pointer-events-none">
              {Math.round(clampedPosition)}%
            </div>
          </div>

          {/* Slider bar below */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium w-12 text-right">
              {beforeLabel}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={clampedPosition}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none bg-slate-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:hover:bg-brand-400 [&::-webkit-slider-thumb]:transition-colors"
              aria-label={`Comparison slider at ${Math.round(clampedPosition)}%`}
            />
            <span className="text-xs text-slate-500 font-medium w-12">
              {afterLabel}
            </span>
          </div>

          {/* Info banner */}
          <div className="mt-4 p-3 rounded-lg bg-surface-light border border-slate-700/50 flex items-start gap-2">
            <ArrowLeftRight className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Drag</strong> the slider handle to compare images.{' '}
              <strong className="text-slate-300">Upload</strong> your own images, or use{' '}
              <strong className="text-slate-300">keyboard arrows</strong> for precise control.{' '}
              Toggle between <strong className="text-slate-300">horizontal</strong> and{' '}
              <strong className="text-slate-300">vertical</strong> modes above.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

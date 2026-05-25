import type { Metadata } from 'next';
import CssScopePlaygroundClient from './CssScopePlaygroundClient';

export const metadata: Metadata = {
  title: 'CSS @scope Playground — Scoped Styles Without Naming Conventions',
  description:
    'Experiment with the CSS @scope at-rule — the new 2026 Baseline feature for scoped styles. Live preview, 7 presets, real-time DOM highlighting — 100% client-side.',
};

export default function CssScopePlaygroundPage() {
  return <CssScopePlaygroundClient />;
}

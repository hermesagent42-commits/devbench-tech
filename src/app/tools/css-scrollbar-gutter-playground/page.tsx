import type { Metadata } from 'next';
import CssScrollbarGutterPlaygroundClient from './CssScrollbarGutterPlaygroundClient';

export const metadata: Metadata = {
  title: 'CSS scrollbar-gutter Playground — Prevent Layout Shift When Scrollbars Appear',
  description:
    'Experiment with CSS scrollbar-gutter — auto, stable, and stable both-edges. Compare side-by-side, see live Content-Security-Policy impact, 6 presets, and copy production-ready CSS. 100% client-side.',
};

export default function CssScrollbarGutterPlaygroundPage() {
  return <CssScrollbarGutterPlaygroundClient />;
}

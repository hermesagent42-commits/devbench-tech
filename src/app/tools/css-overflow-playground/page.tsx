import type { Metadata } from 'next';
import CssOverflowPlaygroundClient from './CssOverflowPlaygroundClient';

export const metadata: Metadata = {
  title: 'CSS Overflow Playground — Visible, Hidden, Clip, Scroll, Auto',
  description:
    'Visually explore all CSS overflow values — visible, hidden, clip, scroll, and auto. Split x/y axis control, overflow-clip-margin, 8 presets, live preview, and instant CSS output. 100% client-side.',
};

export default function CssOverflowPlaygroundPage() {
  return <CssOverflowPlaygroundClient />;
}

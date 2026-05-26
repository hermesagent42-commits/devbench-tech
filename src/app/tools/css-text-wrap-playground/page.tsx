import type { Metadata } from 'next';
import CssTextWrapPlaygroundClient from './CssTextWrapPlaygroundClient';

export const metadata: Metadata = {
  title: 'CSS text-wrap Playground — Balance, Pretty, Stable & More',
  description:
    'Experiment with the CSS text-wrap property — balance, pretty, stable, wrap, and nowrap. Live preview with custom text and instant CSS output. 100% client-side.',
};

export default function CssTextWrapPlaygroundPage() {
  return <CssTextWrapPlaygroundClient />;
}

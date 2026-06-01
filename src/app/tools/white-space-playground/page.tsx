import type { Metadata } from 'next';
import WhiteSpacePlaygroundClient from './WhiteSpacePlaygroundClient';

export const metadata: Metadata = {
  title: 'CSS white-space Playground — Normal, Pre, Pre-Wrap & More',
  description:
    'Experiment with the CSS white-space property — normal, nowrap, pre, pre-wrap, pre-line, and break-spaces. Interactive preview with custom text and instant CSS output. 100% client-side.',
};

export default function WhiteSpacePlaygroundPage() {
  return <WhiteSpacePlaygroundClient />;
}

import type { Metadata } from 'next';
import CssLogicalPropertiesClient from './CssLogicalPropertiesClient';

export const metadata: Metadata = {
  title: 'CSS Logical Properties Playground — Build Writing-Mode-Aware Layouts',
  description:
    'Explore CSS logical properties — margin-inline, padding-block, border-inline-start, inline-size, and more. Toggle writing modes and directions, see the physical mapping in real time, and copy production-ready CSS. 100% client-side.',
};

export default function CssLogicalPropertiesPage() {
  return <CssLogicalPropertiesClient />;
}

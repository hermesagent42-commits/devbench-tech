import dynamic from 'next/dynamic';

const CssHasPlaygroundClient = dynamic(
  () => import('./CssHasPlaygroundClient'),
  { ssr: false }
);

export default function CssHasPlaygroundPage() {
  return <CssHasPlaygroundClient />;
}

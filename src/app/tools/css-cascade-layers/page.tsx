import dynamic from 'next/dynamic';

const CssCascadeLayersClient = dynamic(
  () => import('./CssCascadeLayersClient'),
  { ssr: false }
);

export default function CssCascadeLayersPage() {
  return <CssCascadeLayersClient />;
}

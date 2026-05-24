import dynamic from 'next/dynamic';

const ViewTransitionsClient = dynamic(
  () => import('./ViewTransitionsClient'),
  { ssr: false }
);

export default function ViewTransitionsPlaygroundPage() {
  return <ViewTransitionsClient />;
}

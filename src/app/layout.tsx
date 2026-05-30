import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Analytics } from '@/components/Analytics';
import { JsonLd } from '@/components/JsonLd';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'DevBench — Developer Tools, Benchmarks & Calculators',
    template: '%s | DevBench',
  },
  description:
    'Free developer tools for everyday use: JSON formatter, Base64 encoder/decoder, UUID generator, regex tester, benchmarks, and more.',
  keywords: [
    'developer tools',
    'JSON formatter',
    'Base64',
    'UUID generator',
    'regex tester',
    'benchmarks',
    'dev tools',
  ],
  authors: [{ name: 'DevBench' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'DevBench',
    title: 'DevBench — Developer Tools & Calculators',
    description: 'Free developer tools for everyday use.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex flex-col min-h-screen">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'DevBench',
            url: 'https://devbench-roan.vercel.app',
            description:
              'Free developer tools for everyday use: JSON formatter, Base64 encoder/decoder, UUID generator, regex tester, benchmarks, and more.',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://devbench-roan.vercel.app/tools?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}

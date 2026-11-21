import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://monitor.arthaweb.com'),
  title: 'Artha Monitor | Website & API Uptime Monitoring',
  description: 'Production-grade uptime monitoring for websites, APIs, and HTTP endpoints. Monitor unlimited endpoints with custom intervals, real-time alerts, and detailed uptime reports.',
  keywords: ['uptime monitoring', 'website monitoring', 'API monitoring', 'health checks', 'downtime alerts', 'SLA monitoring'],
  authors: [{ name: 'Artha Web Services' }],
  creator: 'Artha Web Services',
  publisher: 'Artha Web Services',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://monitor.arthaweb.com',
    siteName: 'Artha Monitor',
    title: 'Artha Monitor | Website & API Uptime Monitoring',
    description: 'Production-grade uptime monitoring for websites, APIs, and HTTP endpoints.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Artha Monitor Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Artha Monitor | Website & API Uptime Monitoring',
    description: 'Production-grade uptime monitoring for websites, APIs, and HTTP endpoints.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
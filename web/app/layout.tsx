import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://theanalyst.dev'),
  title: 'The Analyst — Investigation Workspace',
  description:
    'A hands-on data simulation where analysts investigate a living company, make defensible decisions, and show their work.',
  openGraph: {
    title: 'The Analyst',
    description: 'Investigate. Decide. Show your work.',
    url: '/',
    siteName: 'The Analyst',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Analyst — Investigate. Decide. Show your work.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Analyst',
    description: 'Investigate. Decide. Show your work.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

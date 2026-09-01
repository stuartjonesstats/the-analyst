import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://theanalyst.dev';
const publicAssetUrl = (path: string) => `${publicSiteUrl.replace(/\/$/, '')}/${path}`;
const publicSitePath = (process.env.NEXT_PUBLIC_SITE_PATH ?? '').replace(/\/$/, '');

export const dynamic = 'force-static';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: 'The Analyst — Applied Data Science Casework',
  description:
    'Nine browser-based data science simulations where analysts investigate a living company, make defensible decisions, and show their work.',
  openGraph: {
    title: 'The Analyst',
    description: 'Investigate. Decide. Show your work.',
    url: publicSiteUrl,
    siteName: 'The Analyst',
    type: 'website',
    images: [{ url: publicAssetUrl('og.png'), width: 1200, height: 630, alt: 'The Analyst — Investigate. Decide. Show your work.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Analyst',
    description: 'Investigate. Decide. Show your work.',
    images: [publicAssetUrl('og.png')],
  },
  icons: { icon: `${publicSitePath}/favicon.svg` },
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

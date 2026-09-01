import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Submission Viewer — The Analyst',
  description: 'Open and inspect a portable The Analyst case submission locally.',
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function ReplayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

import type { Metadata } from 'next';
import './globals.css';
import LayoutContent from '@/components/LayoutContent';

export const metadata: Metadata = {
  title: 'GENRE REPORTING | Enterprise MRTG & SLA Portal',
  description: 'Automated A4 PDF reporting system for MRTG, PRTG, and network SLA analytics.',
  icons: {
    icon: '/favicon.ico',
  },
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-screen" suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/providers';
import AutocompleteDisabler from '@/components/common/autocomplete-disabler';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700'],
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: 'Kapo Presupuestos',
  description: 'Sistema de gestión de presupuestos',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.className} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AutocompleteDisabler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { QueryProvider } from '@/components/shared/QueryProvider';
import { AppToastProvider } from '@/components/shared/ToastProvider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Makhzoon',
  description: 'Multi-tenant asset and warranty management platform',
  icons: {
    icon: { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    shortcut: '/icon.svg?v=2',
    apple: '/icon.svg?v=2',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface-page`}>
        <QueryProvider>
          <AppToastProvider>
            {children}
          </AppToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

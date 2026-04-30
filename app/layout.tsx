import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { QueryProvider } from '@/components/shared/QueryProvider';
import { AppToastProvider } from '@/components/shared/ToastProvider';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { LocaleProvider } from '@/components/shared/LocaleProvider';

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

/** Inline script runs before React hydration to prevent theme flash (FOUC). */
const themeScript = `
(function(){
  try {
    var s = localStorage.getItem('makhzoon-theme');
    var t = s ? JSON.parse(s).state?.theme : 'system';
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch(e) {}
  try {
    var l = localStorage.getItem('makhzoon-locale');
    var loc = l ? JSON.parse(l).state?.locale : 'en';
    if (loc) {
      document.documentElement.lang = loc;
      document.documentElement.dir  = loc === 'ar' ? 'rtl' : 'ltr';
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface-page`}>
        <QueryProvider>
          <AppToastProvider>
            <ThemeProvider>
              <LocaleProvider>
                {children}
              </LocaleProvider>
            </ThemeProvider>
          </AppToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

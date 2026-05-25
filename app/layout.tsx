import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { QueryProvider } from '@/components/shared/QueryProvider';
import { AppToastProvider } from '@/components/shared/ToastProvider';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { EnvBadge } from '@/components/shared/EnvBadge';

const capriola = localFont({
  src: '../fonts/Capriola/Capriola-Regular.ttf',
  variable: '--font-capriola',
  weight: '400',
});
const thmanyah = localFont({
  src: [
    { path: '../fonts/Thmanyah-Font-Family/thmanyah typeface/thmanyahsans/woff2/thmanyahsans-Light.woff2', weight: '300' },
    { path: '../fonts/Thmanyah-Font-Family/thmanyah typeface/thmanyahsans/woff2/thmanyahsans-Regular.woff2', weight: '400' },
    { path: '../fonts/Thmanyah-Font-Family/thmanyah typeface/thmanyahsans/woff2/thmanyahsans-Medium.woff2', weight: '500' },
    { path: '../fonts/Thmanyah-Font-Family/thmanyah typeface/thmanyahsans/woff2/thmanyahsans-Bold.woff2', weight: '700' },
    { path: '../fonts/Thmanyah-Font-Family/thmanyah typeface/thmanyahsans/woff2/thmanyahsans-Black.woff2', weight: '900' },
  ],
  variable: '--font-thmanyah',
});

export const metadata: Metadata = {
  title: 'Makhzoon',
  description: 'Multi-tenant asset and warranty management platform',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

/** Inline script: sets theme + lang/dir before hydration to prevent flash. */
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
    var p = window.location.pathname.split('/');
    var locale = (p[1] === 'ar') ? 'ar' : 'en';
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      { }
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${capriola.variable} ${thmanyah.variable} antialiased bg-surface-page`}>
        <QueryProvider>
          <AppToastProvider>
            <ThemeProvider>
              {children}
              <EnvBadge />
            </ThemeProvider>
          </AppToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

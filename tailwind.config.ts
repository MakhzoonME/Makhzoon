import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-capriola)', 'Geist', 'system-ui', 'sans-serif'],
        display: ['var(--font-thmanyah)', 'Geist', 'system-ui', 'sans-serif'],
        arabic:  ['var(--font-thmanyah)', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        gray: {
          50:  'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        primary: {
          50:  'var(--primary-50)',
          100: 'var(--primary-100)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
        },
        surface: {
          page:    'var(--surface-page)',
          card:    'var(--surface-card)',
          input:   'var(--surface-input)',
          sidebar: 'var(--surface-sidebar)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
        },
        amber: {
          500: '#F59E0B',
        },
        violet: {
          600: '#7C3AED',
        },
      },
      borderRadius: {
        sm:  'var(--r-sm)',   /* 6px  — badges, chips */
        md:  'var(--r-md)',   /* 8px  — buttons, inputs */
        lg:  'var(--r-lg)',   /* 10px — cards, dialogs */
        xl:  'var(--r-xl)',   /* 14px — modals, sheets */
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        'out-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring':    'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-sharp':  'cubic-bezier(0.7, 0, 1, 0.6)',
        'smooth':    'cubic-bezier(0.65, 0, 0.35, 1)',
        'in-out-smooth': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        'micro': '120ms',
        'fast':  '200ms',
        'base':  '300ms',
        'slow':  '450ms',
        '120':   '120ms',
        '180':   '180ms',
        '250':   '250ms',
        '350':   '350ms',
        '450':   '450ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        shimmer:           'shimmer 1.5s infinite',
        float:             'float 6s ease-in-out infinite',
        'gradient-shift':  'gradient-shift 8s ease infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;

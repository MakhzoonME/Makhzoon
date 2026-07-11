/* Shared Tailwind Play CDN config — loaded right after the CDN script on every page */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Brand — Indigo (design system primary). DEFAULT = primary-600.
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        // Module identity colors (not overridden by the design system)
        usool: '#00695C',
        raseed: '#E65100',
        haraka: '#C2185B',
        maal: '#1B5E20',
        banna: '#1565C0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['Capriola', 'sans-serif'],
      },
    },
  },
};

const enabled = process.env.NEXT_PUBLIC_APP_ENV !== 'production';

export const logger = {
  log:   (...args: unknown[]) => { if (enabled) console.log(...args); },
  info:  (...args: unknown[]) => { if (enabled) console.info(...args); },
  warn:  (...args: unknown[]) => { if (enabled) console.warn(...args); },
  error: (...args: unknown[]) => { if (enabled) console.error(...args); },
  debug: (...args: unknown[]) => { if (enabled) console.debug(...args); },
};

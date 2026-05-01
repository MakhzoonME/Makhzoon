import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.2 : 1.0,
  debug: false,
});

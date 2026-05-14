import * as Sentry from '@sentry/node';
import logger from './logger.js';

const DSN = process.env.SENTRY_DSN;

/**
 * Initialise Sentry error tracking.
 * No-ops gracefully when SENTRY_DSN is not set (dev/test environments).
 */
export function initSentry() {
  if (!DSN) {
    logger.debug('[Sentry] SENTRY_DSN not set — error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    // Capture 100 % of transactions in dev; tune down for prod if needed
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Never log sensitive fields
    beforeSend(event) {
      // Strip Authorization headers from breadcrumbs
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  logger.info('[Sentry] Error tracking initialised.');
}

export { Sentry };

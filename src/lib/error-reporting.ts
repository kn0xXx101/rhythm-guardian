import { logJson, newCorrelationId } from '@/lib/logger';

let sessionCorrelationId = '';

function getSessionCid(): string {
  if (!sessionCorrelationId) {
    sessionCorrelationId = newCorrelationId();
  }
  return sessionCorrelationId;
}

/**
 * Best-effort client-side error capture (structured console). Wire to Sentry or a backend
 * endpoint later without changing call sites.
 */
export function reportClientError(scope: string, error: unknown, extra?: Record<string, unknown>): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
  logJson('error', scope, { cid: getSessionCid(), ...err, ...extra });
}

export function initClientErrorReporting(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'error',
    (event) => {
      reportClientError('window.error', event.error ?? event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError('unhandledrejection', event.reason);
  });
}

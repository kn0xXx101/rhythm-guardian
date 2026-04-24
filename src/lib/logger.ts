export function newCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logJson(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console[level](line);
    return;
  }
  if (import.meta.env.DEV) {
    console.log(line);
  }
}

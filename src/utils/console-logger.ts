// Enhanced console logging utility
// Captures and formats errors for easier debugging

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  stack?: string;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  log(message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    };
    this.addLog(entry);
    console.log(`[${entry.timestamp}] ℹ️ ${message}`, data || '');
  }

  warn(message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    };
    this.addLog(entry);
    console.warn(`[${entry.timestamp}] ⚠️ ${message}`, data || '');
  }

  error(message: string, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: error,
      stack: error?.stack,
    };
    this.addLog(entry);
    console.error(`[${entry.timestamp}] ❌ ${message}`, error || '');
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs() {
    return this.logs;
  }

  getErrorLogs() {
    return this.logs.filter(log => log.level === 'error');
  }

  exportLogs() {
    const logsText = this.logs
      .map(log => {
        let text = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
        if (log.data) {
          text += `\nData: ${JSON.stringify(log.data, null, 2)}`;
        }
        if (log.stack) {
          text += `\nStack: ${log.stack}`;
        }
        return text;
      })
      .join('\n\n');

    return logsText;
  }

  downloadLogs() {
    const logsText = this.exportLogs();
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.logs = [];
    console.clear();
  }
}

export const logger = new ConsoleLogger();

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
}

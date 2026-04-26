type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (IS_PROD) {
    // Structured JSON for log aggregation (Vercel, Datadog, etc.)
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](JSON.stringify(entry));
  } else {
    // Human-readable format for dev
    const prefix = `[${entry.timestamp.slice(11, 23)}] ${level.toUpperCase()}`;
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](`${prefix} ${message}${ctx}`);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};

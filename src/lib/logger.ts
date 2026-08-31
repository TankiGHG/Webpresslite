import 'server-only';

/**
 * Structured logging.
 *
 * One JSON object per line, because that is what a log collector can read
 * without a parser of its own. In development the same records are printed in
 * a shape a person can scan.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured];
  return process.env.NODE_ENV === 'production' ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

export interface LogFields {
  [key: string]: unknown;
}

/**
 * Keys whose values must never reach a log line, however they were passed in.
 * A log file is read by more people than a database.
 */
const REDACTED = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'tokenhash',
  'secret',
  'authorization',
  'cookie',
  'authoremail',
  'email',
]);

function redact(fields: LogFields): LogFields {
  const result: LogFields = {};

  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED.has(key.toLowerCase())) {
      result[key] = '[redacted]';
      continue;
    }
    result[key] = value instanceof Error ? { name: value.name, message: value.message } : value;
  }

  return result;
}

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (LEVEL_ORDER[level] < threshold()) return;

  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...redact(fields),
  };

  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(record)
      : `${level.toUpperCase().padEnd(5)} ${message} ${
          Object.keys(fields).length > 0 ? JSON.stringify(redact(fields)) : ''
        }`.trimEnd();

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};

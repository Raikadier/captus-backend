import { createLogger, format, transports } from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = format;

const isDev = process.env.NODE_ENV !== 'production';

// Human-readable format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${ts} ${level}: ${message}${stack ? '\n' + stack : ''}${metaStr}`;
  }),
);

// Structured JSON for production (Vercel / log aggregators)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [new transports.Console()],
  // Never log sensitive fields — redact them at the source before calling logger
});

export default logger;

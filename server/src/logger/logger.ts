import winston from 'winston';
import { config } from '../config/env.js';
import { redactSensitiveData } from '../modules/security/dlp.js';

const redact = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (key === 'timestamp' || key === 'level') continue;
    info[key] = redactSensitiveData(value);
  }
  return info;
})();

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  redact,
  config.env === 'development'
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const stackStr = stack ? `\n${stack}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
        }),
      )
    : winston.format.json(),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format,
  transports: [new winston.transports.Console()],
});

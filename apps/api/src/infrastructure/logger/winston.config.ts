import * as winston from 'winston';
import { WinstonModuleOptions } from 'nest-winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, context, correlationId, stack, ...meta }) => {
  const ctx = context ? `[${String(context).padEnd(20)}]` : '[                    ]';
  const cid = correlationId ? ` cid=${correlationId}` : '';
  const err = stack ? `\n${stack}` : '';
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level} ${ctx}${cid}: ${message}${extra}${err}`;
});

export function buildWinstonConfig(isProduction: boolean): WinstonModuleOptions {
  return {
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? combine(errors({ stack: true }), timestamp(), json())
          : combine(
              errors({ stack: true }),
              colorize({ all: true }),
              timestamp({ format: 'HH:mm:ss.SSS' }),
              devFormat,
            ),
      }),
      // Always write errors to file for post-mortem debugging
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(errors({ stack: true }), timestamp(), json()),
        maxsize: 20 * 1024 * 1024, // 20 MB
        maxFiles: 5,
        tailable: true,
      }),
    ],
  };
}
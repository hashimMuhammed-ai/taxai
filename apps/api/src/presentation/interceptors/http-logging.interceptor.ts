import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, correlationId, ip } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info(`${method} ${originalUrl} → ${res.statusCode}`, {
            context: 'HTTP',
            correlationId,
            method,
            path: originalUrl,
            statusCode: res.statusCode,
            duration: `${Date.now() - start}ms`,
            ip,
          });
        },
        error: () => {
          // Error details logged in GlobalExceptionFilter
          this.logger.debug(`${method} ${originalUrl} errored after ${Date.now() - start}ms`, {
            context: 'HTTP',
            correlationId,
          });
        },
      }),
    );
  }
}
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DomainException, errorResponse } from '@taxai/shared';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId;

    let statusCode: number;
    let code: string;
    let message: string;
    let details: Record<string, string[]> | undefined;

    if (exception instanceof DomainException) {
      // Our typed domain errors — we know exactly what happened
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;

    } else if (exception instanceof HttpException) {
      // NestJS validation errors, standard HTTP errors
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      code = 'HTTP_ERROR';
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message ?? 'Request failed';

      // class-validator produces an array of field errors
      if (Array.isArray((exceptionResponse as any).message)) {
        code = 'VALIDATION_FAILED';
        message = 'Validation failed';
        details = this.parseValidationErrors((exceptionResponse as any).message);
      }

    } else {
      // Completely unexpected — log with full stack trace
      console.dir(exception, { depth: null });
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error('Unhandled exception', {
        context: 'GlobalExceptionFilter',
        correlationId,
        path: request.url,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    // Log all non-500 errors at warn level
    if (statusCode < 500) {
      this.logger.warn(`${statusCode} ${code}: ${message}`, {
        context: 'GlobalExceptionFilter',
        correlationId,
        path: request.url,
        statusCode,
      });
    }

    response.status(statusCode).json(
      errorResponse(code, message, details, correlationId),
    );
  }

  private parseValidationErrors(messages: string[]): Record<string, string[]> {
    // class-validator errors look like: "email must be an email"
    const errors: Record<string, string[]> = {};
    for (const msg of messages) {
      const field = msg.split(' ')[0];
      if (!errors[field]) errors[field] = [];
      errors[field].push(msg);
    }
    return errors;
  }
}
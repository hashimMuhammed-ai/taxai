import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { successResponse } from '@taxai/shared';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const correlationId = req.correlationId;

    return next.handle().pipe(
      map((data) => {
        // If handler already returns an ApiResponse (has `success` field), don't double-wrap
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return successResponse(data, undefined, undefined, correlationId);
      }),
    );
  }
}
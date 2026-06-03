import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@taxai/shared';

// Usage: @CurrentUser() user: JwtPayload
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage: @CorrelationId() cid: string
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest().correlationId;
  },
);
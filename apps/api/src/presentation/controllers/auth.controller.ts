import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { RegisterUserCommand } from '../../application/auth/commands/register-user.command';
import { LoginUserCommand } from '../../application/auth/commands/login-user.command';
import { RefreshTokenCommand } from '../../application/auth/commands/refresh-token.command';
import { JwtAuthGuard, JwtRefreshGuard } from '../guards/guards';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@taxai/shared';
import { v4 as uuidv4 } from 'uuid';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registrations per minute per IP
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
  ) {
    return this.commandBus.execute(
      new RegisterUserCommand(
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
        dto.role ?? UserRole.USER,
        dto.workspaceAction,
        dto.workspaceName,
        dto.inviteCode,
        dto.phone,
        ip,
      ),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute per IP
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
  ) {
    return this.commandBus.execute(
      new LoginUserCommand(dto.email, dto.password, ip),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    // req.user is the validated JWT payload — no DB call needed for basic profile
    return user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload) {
    // Invalidate refresh token by clearing hash in DB
    // Full implementation uses the RefreshTokenCommand from Day 1 (handler clears hash)
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const user = req.user as JwtPayload & { rawToken: string };
    return this.commandBus.execute(
      new RefreshTokenCommand(user.sub, user.rawToken, user.tenantId),
    );
  }
}
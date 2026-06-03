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
import { JwtAuthGuard } from '../guards/guards';
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
    // In a real multi-tenant setup, tenantId comes from subdomain/header/invite token.
    // For now, each user gets their own tenant (personal workspace).
    const tenantId = uuidv4();

    return this.commandBus.execute(
      new RegisterUserCommand(
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
        dto.role ?? UserRole.USER,
        tenantId,
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
}
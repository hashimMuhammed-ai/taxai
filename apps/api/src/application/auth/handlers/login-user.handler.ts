import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUserCommand } from '../commands/login-user.command';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';
import { UserLoggedInEvent } from '../../../domain/events/user.events';
import { InvalidCredentialsException } from '@taxai/shared';
import { AppConfigService } from '../../../infrastructure/config/app-config.service';

@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<LoginUserCommand, AuthResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthResponseDto> {
    const { email, password, ipAddress} = command;

    // ── 1. Find user ────────────────────────────────────────────────────────
    const user = await this.userRepo.findByEmail(email);

    // Use constant-time comparison even when user not found (prevents timing attacks)
    const hash = user?.passwordHash ?? '$2b$12$invalidhashfortimingnomatch0000000';
    const passwordMatch = await bcrypt.compare(password, hash);

    if (!user || !passwordMatch) {
      throw new InvalidCredentialsException();
    }

    // ── 2. Domain guard — throws if suspended ───────────────────────────────
    user.canLogin();

    // ── 3. Issue tokens ─────────────────────────────────────────────────────
    const tokens = await this.issueTokens(user);

    // ── 4. Store refresh token hash + update last login ─────────────────────
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await Promise.all([
      this.userRepo.updateRefreshToken(user.id, refreshHash),
      this.userRepo.updateLastLogin(user.id),
    ]);

    // ── 5. Publish domain event ─────────────────────────────────────────────
    this.eventBus.publish(
      new UserLoggedInEvent(user.id, user.email, ipAddress, user.tenantId),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        phone: user.phone,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  private async issueTokens(user: UserEntity) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer' as const,
    };
  }
}
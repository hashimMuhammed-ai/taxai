import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RefreshTokenCommand } from '../commands/refresh-token.command';
import { AuthTokensDto } from '../dtos/auth-response.dto';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { InvalidCredentialsException } from '@taxai/shared';
import { AppConfigService } from '../../../infrastructure/config/app-config.service';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand, AuthTokensDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthTokensDto> {
    const { userId, refreshToken, tenantId } = command;

    // ── 1. Find user by id and tenantId ──────────────────────────────────────
    const user = await this.userRepo.findById(userId, tenantId);
    if (!user || !user.refreshTokenHash) {
      throw new InvalidCredentialsException();
    }

    // ── 2. Domain guard — throws if suspended ───────────────────────────────
    user.canLogin();

    // ── 3. Verify refresh token ──────────────────────────────────────────────
    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }

    // ── 4. Issue new tokens ──────────────────────────────────────────────────
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshExpiresIn,
      }),
    ]);

    // ── 5. Hash and update new refresh token ─────────────────────────────────
    const refreshHash = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepo.updateRefreshToken(user.id, refreshHash);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      tokenType: 'Bearer' as const,
    };
  }
}

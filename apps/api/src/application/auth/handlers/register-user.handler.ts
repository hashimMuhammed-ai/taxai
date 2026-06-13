import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterUserCommand } from '../commands/register-user.command';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../domain/repositories/tenant.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';
import { TenantEntity } from '../../../domain/entities/tenant.entity';
import { UserRegisteredEvent } from '../../../domain/events/user.events';
import { ResourceAlreadyExistsException } from '@taxai/shared';
import { AppConfigService } from '../../../infrastructure/config/app-config.service';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, AuthResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role, workspaceAction, workspaceName, inviteCode, phone } = command;

    let tenantId: string;

    if (workspaceAction === 'create') {
      if (!workspaceName || !workspaceName.trim()) {
        throw new BadRequestException('Workspace name is required to create a workspace');
      }
      tenantId = uuidv4();
      const code = uuidv4().substring(0, 8).toUpperCase();
      const tenant = TenantEntity.create({
        id: tenantId,
        name: workspaceName,
        inviteCode: code,
      });
      await this.tenantRepo.save(tenant);
    } else if (workspaceAction === 'join') {
      if (!inviteCode || !inviteCode.trim()) {
        throw new BadRequestException('Workspace invite code is required to join');
      }
      const tenant = await this.tenantRepo.findByInviteCode(inviteCode);
      if (!tenant) {
        throw new BadRequestException('Invalid workspace invite code');
      }
      tenantId = tenant.id;
    } else {
      throw new BadRequestException('Invalid workspaceAction');
    }

    // ── 1. Guard: email must be unique ──────────────────────────────────────
    const exists = await this.userRepo.existsByEmail(email, tenantId);
    if (exists) {
      throw new ResourceAlreadyExistsException('User', 'email', email);
    }

    // ── 2. Hash password (bcrypt, cost factor 12) ───────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── 3. Create domain entity ─────────────────────────────────────────────
    const user = UserEntity.create({
      id: uuidv4(),
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ── 4. Persist ──────────────────────────────────────────────────────────
    const saved = await this.userRepo.save(user);

    // ── 5. Generate token pair ──────────────────────────────────────────────
    const tokens = await this.issueTokens(saved);

    // ── 6. Store refresh token hash ─────────────────────────────────────────
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.updateRefreshToken(saved.id, refreshHash);

    // ── 7. Publish domain event (picked up by notification worker) ──────────
    this.eventBus.publish(
      new UserRegisteredEvent(saved.id, saved.email, saved.firstName, saved.tenantId, saved.role),
    );

    return {
      user: {
        id: saved.id,
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        fullName: saved.fullName,
        role: saved.role,
        tenantId: saved.tenantId,
        phone: saved.phone,
        createdAt: saved.createdAt,
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
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer' as const,
    };
  }
}
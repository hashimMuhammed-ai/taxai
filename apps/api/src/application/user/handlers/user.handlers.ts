import { CommandHandler, ICommandHandler, QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserProfileCommand, ChangePasswordCommand, GetUserProfileQuery, GetCAsQuery } from '../commands/user.commands';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../domain/repositories/tenant.repository.interface';
import { ResourceNotFoundException, InvalidCredentialsException } from '@taxai/shared';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler
  implements ICommandHandler<UpdateUserProfileCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(cmd: UpdateUserProfileCommand) {
    const user = await this.userRepo.findById(cmd.userId, cmd.tenantId);
    if (!user) throw new ResourceNotFoundException('User', cmd.userId);

    // Only update provided fields
    await this.userRepo.updateProfile(cmd.userId, {
      ...(cmd.firstName && { firstName: cmd.firstName.trim() }),
      ...(cmd.lastName && { lastName: cmd.lastName.trim() }),
      ...(cmd.phone !== undefined && { phone: cmd.phone }),
    });

    return this.userRepo.findById(cmd.userId, cmd.tenantId);
  }
}

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler
  implements ICommandHandler<ChangePasswordCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(cmd: ChangePasswordCommand): Promise<{ success: boolean }> {
    const user = await this.userRepo.findById(cmd.userId, cmd.tenantId);
    if (!user) throw new ResourceNotFoundException('User', cmd.userId);

    // Verify current password
    const isValid = await bcrypt.compare(cmd.currentPassword, user.passwordHash);
    if (!isValid) throw new InvalidCredentialsException();

    // Hash and store new password
    const newHash = await bcrypt.hash(cmd.newPassword, 12);
    await this.userRepo.updatePassword(cmd.userId, newHash);

    // Invalidate all refresh tokens — forces re-login on all devices
    await this.userRepo.updateRefreshToken(cmd.userId, null);

    return { success: true };
  }
}

@QueryHandler(GetUserProfileQuery)
export class GetUserProfileHandler
  implements IQueryHandler<GetUserProfileQuery>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
  ) {}

  async execute(query: GetUserProfileQuery) {
    const user = await this.userRepo.findById(query.userId, query.tenantId);
    if (!user) throw new ResourceNotFoundException('User', query.userId);

    let workspaceName = '';
    let inviteCode = '';
    if (user.tenantId) {
      const tenant = await this.tenantRepo.findById(user.tenantId);
      if (tenant) {
        workspaceName = tenant.name;
        inviteCode = tenant.inviteCode;
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      tenantId: user.tenantId,
      workspaceName,
      inviteCode,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

@QueryHandler(GetCAsQuery)
export class GetCAsHandler implements IQueryHandler<GetCAsQuery> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute() {
    const cas = await this.userRepo.findCAs();
    return cas.map((ca) => ({
      id: ca.id,
      email: ca.email,
      firstName: ca.firstName,
      lastName: ca.lastName,
      fullName: ca.fullName,
      role: ca.role,
    }));
  }
}
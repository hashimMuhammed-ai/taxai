import { UserRole } from '@taxai/shared';

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole = UserRole.USER,
    public readonly tenantId: string,
    public readonly phone?: string,
    public readonly ipAddress?: string,
  ) {}
}
import { UserRole } from '@taxai/shared';

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole = UserRole.USER,
    public readonly workspaceAction: 'create' | 'join',
    public readonly workspaceName?: string,
    public readonly inviteCode?: string,
    public readonly phone?: string,
    public readonly ipAddress?: string,
  ) {}
}
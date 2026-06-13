export class UpdateUserProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phone?: string,
  ) {}
}

export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}

export class GetUserProfileQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}

export class GetCAsQuery {}
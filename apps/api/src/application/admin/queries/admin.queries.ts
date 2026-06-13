export class GetAdminStatsQuery {
  constructor(public readonly tenantId: string) {}
}

export class GetAllUsersQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}

export class GetAllFilingsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly status?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
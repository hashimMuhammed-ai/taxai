export class GetDashboardSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
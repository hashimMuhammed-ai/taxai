export class GenerateTaxReportCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly taxRecordId: string,
    public readonly assessmentYear: string,
    public readonly filingId?: string,
  ) {}
}

export class GetReportDownloadUrlQuery {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
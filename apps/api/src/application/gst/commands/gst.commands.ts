export class CalculateGstCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly baseAmount: number,
    public readonly gstRate: number,          // e.g. 18 for 18%
    public readonly vendorState: string,       // 2-letter state code
    public readonly buyerState: string,
    public readonly invoiceNumber: string,
    public readonly vendorName: string,
    public readonly invoiceDate: Date,
    public readonly vendorGstin?: string,
    public readonly buyerGstin?: string,
    public readonly sourceDocumentId?: string,
    public readonly description?: string,
  ) {}
}

export class GetGstSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
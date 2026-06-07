import { TaxCalculationInput } from '@taxai/tax-rules';

export class CalculateTaxCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly assessmentYear: string,
    public readonly input: Omit<TaxCalculationInput, 'assessmentYear'>,
    public readonly sourceDocumentIds?: string[],
  ) {}
}

export class GetTaxEstimateQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly assessmentYear?: string,
  ) {}
}

export class GetTaxRecordByIdQuery {
  constructor(
    public readonly taxRecordId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
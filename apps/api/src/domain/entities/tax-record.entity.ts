import { BaseEntity } from './base.entity';
import { TaxRegime } from '@taxai/shared';
import { TaxCalculationResult } from '@taxai/tax-rules';

export interface DeductionSuggestion {
  section: string;          // e.g. '80C', '80D'
  description: string;
  currentAmount: number;
  maxAllowed: number;
  potentialSaving: number;  // Tax saving in ₹
  actionRequired: string;   // e.g. "Invest ₹50,000 more in ELSS or PPF"
  confidence: number;       // 0–1
}

export interface CreateTaxRecordProps {
  id: string;
  tenantId: string;
  userId: string;
  assessmentYear: string;
  sourceDocumentIds: string[];
  oldRegimeResult: TaxCalculationResult;
  newRegimeResult: TaxCalculationResult;
  recommendedRegime: TaxRegime;
  taxSavingBySwitch: number;       // ₹ saved by switching to recommended regime
  deductionSuggestions: DeductionSuggestion[];
  filingReadinessScore: number;    // 0–100
  missingDocuments: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaxRecordEntity extends BaseEntity {
  readonly userId: string;
  readonly assessmentYear: string;
  readonly sourceDocumentIds: string[];
  readonly oldRegimeResult: TaxCalculationResult;
  readonly newRegimeResult: TaxCalculationResult;
  readonly recommendedRegime: TaxRegime;
  readonly taxSavingBySwitch: number;
  readonly deductionSuggestions: DeductionSuggestion[];
  readonly filingReadinessScore: number;
  readonly missingDocuments: string[];

  private constructor(props: CreateTaxRecordProps) {
    super({
      id: props.id,
      tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.userId = props.userId;
    this.assessmentYear = props.assessmentYear;
    this.sourceDocumentIds = props.sourceDocumentIds;
    this.oldRegimeResult = props.oldRegimeResult;
    this.newRegimeResult = props.newRegimeResult;
    this.recommendedRegime = props.recommendedRegime;
    this.taxSavingBySwitch = props.taxSavingBySwitch;
    this.deductionSuggestions = props.deductionSuggestions;
    this.filingReadinessScore = props.filingReadinessScore;
    this.missingDocuments = props.missingDocuments;
  }

  static create(props: CreateTaxRecordProps): TaxRecordEntity {
    return new TaxRecordEntity(props);
  }

  // ─── Computed helpers ──────────────────────────────────────────────────────
  get bestRegimeResult(): TaxCalculationResult {
    return this.recommendedRegime === 'old' ? this.oldRegimeResult : this.newRegimeResult;
  }

  isFilingReady(): boolean {
    return this.filingReadinessScore >= 80 && this.missingDocuments.length === 0;
  }

  totalPotentialSaving(): number {
    return this.deductionSuggestions.reduce((sum, s) => sum + s.potentialSaving, 0);
  }
}
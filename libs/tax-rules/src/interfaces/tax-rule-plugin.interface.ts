import { TaxRegime } from '@taxai/shared';


export interface TaxCalculationInput {
  grossSalary: number;
  otherIncome: number;           // Interest, rental, freelance, etc.
  regime: TaxRegime;
  assessmentYear: string;        // e.g. '2024-25'

  // Deductions — only applicable in old regime
  deductions?: {
    section80C?: number;         // Max 1,50,000  //PPF (Public Provident Fund)  ELSS (Equity Linked Savings Scheme)  Life Insurance  EPF (Employees' Provident Fund)
    section80D?: number;         // Medical insurance — max 25,000 / 50,000 (senior)
    section80CCD1B?: number;     // NPS(National Pension System) — additional 50,000
    hra?: number;                // House Rent Allowance
    lta?: number;                // Leave Travel Allowance
    homeLoanInterest?: number;   // Section 24(b) — max 2,00,000
    standardDeduction?: number;  // Fixed 50,000 (salaried) in old regime
    professionalTax?: number;
    otherDeductions?: number;
  };

  // Flags
  isSeniorCitizen?: boolean;     // Age >= 60
  isSuperSeniorCitizen?: boolean; // Age >= 80
}

// ─── Result ───────────────────────────────────────────────────────────────────
export interface TaxSlabBreakdown {
  from: number;
  to: number | null;  // null = no upper limit
  rate: number;       // percentage e.g. 5, 10, 15, 20, 30
  taxableAmount: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  assessmentYear: string;
  regime: TaxRegime;

  // Income
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;

  // Tax breakdown
  slabBreakdown: TaxSlabBreakdown[];
  taxBeforeCess: number;
  surcharge: number;             // Applies on income > 50L
  cess: number;                  // 4% health & education cess
  totalTax: number;

  // Rebate
  section87ARebate: number;      // Rebate for income up to 5L (old) / 7L (new)
  taxAfterRebate: number;

  // Summary
  effectiveTaxRate: number;      // percentage
  marginalTaxRate: number;       // highest slab rate applied
}

// ─── Plugin Contract ──────────────────────────────────────────────────────────
export interface ITaxRulePlugin {
  readonly assessmentYear: string;
  readonly regime: TaxRegime;
  readonly pluginVersion: string;

  calculate(input: TaxCalculationInput): TaxCalculationResult;
  getDeductionLimits(): DeductionLimits;
  getSlabs(): TaxSlab[];
}

export interface TaxSlab {
  from: number;
  to: number | null;
  rate: number; // percentage
}

export interface DeductionLimits {
  section80C: number;
  section80D_self: number;
  section80D_parents: number;
  section80D_seniorParents: number;
  section80CCD1B: number;
  homeLoanInterest: number;
  standardDeduction: number;
  section87A_maxIncome: number;  // Income limit for rebate
  section87A_rebateAmount: number;
}
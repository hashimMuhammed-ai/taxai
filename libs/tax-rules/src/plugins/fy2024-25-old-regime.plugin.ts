import { TaxRegime } from '@taxai/shared';
import { BaseTaxCalculator } from './base-tax-calculator';
import { DeductionLimits, TaxSlab } from '../interfaces/tax-rule-plugin.interface';

/**
 * FY 2024-25 (AY 2025-26) — Old Tax Regime
 * Slabs: 0%, 5%, 20%, 30%
 * Standard deduction: ₹50,000
 * 87A rebate: up to ₹5,00,000 taxable income → ₹12,500 rebate
 */
export class FY2024_25_OldRegimePlugin extends BaseTaxCalculator {
  readonly assessmentYear = '2024-25';
  readonly regime: TaxRegime = 'old';
  readonly pluginVersion = '1.0.0';

  protected readonly slabs: TaxSlab[] = [
    { from: 0,          to: 250_000,   rate: 0  },
    { from: 250_000,    to: 500_000,   rate: 5  },
    { from: 500_000,    to: 1_000_000, rate: 20 },
    { from: 1_000_000,  to: null,      rate: 30 },
  ];

  protected readonly limits: DeductionLimits = {
    section80C: 150_000,
    section80D_self: 25_000,
    section80D_parents: 25_000,
    section80D_seniorParents: 50_000,
    section80CCD1B: 50_000,
    homeLoanInterest: 200_000,
    standardDeduction: 50_000,
    section87A_maxIncome: 500_000,
    section87A_rebateAmount: 12_500,
  };
}
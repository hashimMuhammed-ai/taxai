import { TaxRegime } from '@taxai/shared';
import { BaseTaxCalculator } from './base-tax-calculator';
import { DeductionLimits, TaxSlab, TaxCalculationInput, TaxCalculationResult } from '../interfaces/tax-rule-plugin.interface';

/**
 * FY 2024-25 (AY 2025-26) — New Tax Regime (default from FY 2023-24)
 * Updated slabs from Budget 2024:
 *   0–3L: 0%, 3–7L: 5%, 7–10L: 10%, 10–12L: 15%, 12–15L: 20%, >15L: 30%
 * Standard deduction: ₹75,000 (increased from ₹50,000 in Budget 2024)
 * 87A rebate: up to ₹7,00,000 taxable income → ₹25,000 rebate
 * Surcharge capped at 25% for income above ₹5Cr
 */
export class FY2024_25_NewRegimePlugin extends BaseTaxCalculator {
  readonly assessmentYear = '2024-25';
  readonly regime: TaxRegime = 'new';
  readonly pluginVersion = '1.0.0';

  protected readonly slabs: TaxSlab[] = [
    { from: 0,          to: 300_000,   rate: 0  },
    { from: 300_000,    to: 700_000,   rate: 5  },
    { from: 700_000,    to: 1_000_000, rate: 10 },
    { from: 1_000_000,  to: 1_200_000, rate: 15 },
    { from: 1_200_000,  to: 1_500_000, rate: 20 },
    { from: 1_500_000,  to: null,      rate: 30 },
  ];

  protected readonly limits: DeductionLimits = {
    section80C: 0,             // Not applicable in new regime
    section80D_self: 0,
    section80D_parents: 0,
    section80D_seniorParents: 0,
    section80CCD1B: 0,
    homeLoanInterest: 0,
    standardDeduction: 75_000, // Increased in Budget 2024
    section87A_maxIncome: 700_000,
    section87A_rebateAmount: 25_000,
  };

  // Override surcharge — new regime caps surcharge at 25% (even above 5Cr)
  protected calculateSurcharge(taxableIncome: number, taxBeforeCess: number): number {
    if (taxableIncome <= 5_000_000) return 0;
    if (taxableIncome <= 10_000_000) return Math.round(taxBeforeCess * 0.10);
    if (taxableIncome <= 20_000_000) return Math.round(taxBeforeCess * 0.15);
    // Capped at 25% for new regime regardless of income
    return Math.round(taxBeforeCess * 0.25);
  }
}
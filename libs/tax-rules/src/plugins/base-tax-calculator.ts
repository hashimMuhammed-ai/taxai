import {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxSlab,
  TaxSlabBreakdown,
  DeductionLimits,
} from '../interfaces/tax-rule-plugin.interface';
import { TaxRegime } from '@taxai/shared';

export abstract class BaseTaxCalculator {
  protected abstract readonly slabs: TaxSlab[];
  protected abstract readonly limits: DeductionLimits;
  abstract readonly assessmentYear: string;
  abstract readonly regime: TaxRegime;

  // ─── Slab Tax ─────────────────────────────────────────────────────────────
  protected calculateSlabTax(taxableIncome: number): {
    breakdown: TaxSlabBreakdown[];
    taxBeforeCess: number;
  } {
    let remaining = taxableIncome;
    let taxBeforeCess = 0;
    const breakdown: TaxSlabBreakdown[] = [];

    for (const slab of this.slabs) {
      if (remaining <= 0) break;

      const slabTop = slab.to ?? Infinity;
      const slabSize = slabTop - slab.from;
      const taxableInSlab = Math.min(remaining, slabSize);
      const taxInSlab = (taxableInSlab * slab.rate) / 100;

      breakdown.push({
        from: slab.from,
        to: slab.to,
        rate: slab.rate,
        taxableAmount: taxableInSlab,
        taxAmount: Math.round(taxInSlab),
      });

      taxBeforeCess += taxInSlab;
      remaining -= taxableInSlab;
    }

    return { breakdown, taxBeforeCess: Math.round(taxBeforeCess) };
  }

  // ─── Surcharge ────────────────────────────────────────────────────────────
  // Surcharge applies on income above 50L — same for both regimes
  protected calculateSurcharge(taxableIncome: number, taxBeforeCess: number): number {
    if (taxableIncome <= 5_000_000) return 0;          // Up to 50L — no surcharge
    if (taxableIncome <= 10_000_000) return Math.round(taxBeforeCess * 0.10);  // 10%
    if (taxableIncome <= 20_000_000) return Math.round(taxBeforeCess * 0.15);  // 15%
    if (taxableIncome <= 50_000_000) return Math.round(taxBeforeCess * 0.25);  // 25%
    return Math.round(taxBeforeCess * 0.37); // Above 5 Cr — 37% (old) / 25% cap (new handled in subclass)
  }

  // ─── Section 87A Rebate ───────────────────────────────────────────────────
  protected calculateRebate(taxableIncome: number, taxBeforeCess: number): number {
    if (taxableIncome > this.limits.section87A_maxIncome) return 0;
    return Math.min(taxBeforeCess, this.limits.section87A_rebateAmount);
  }

  // ─── Cess (4% Health & Education) ────────────────────────────────────────
  protected calculateCess(taxAfterRebate: number, surcharge: number): number {
    return Math.round((taxAfterRebate + surcharge) * 0.04);
  }

  // ─── Deductions (old regime only) ─────────────────────────────────────────
  protected calculateTotalDeductions(input: TaxCalculationInput): number {
    if (this.regime === 'new') {
      // New regime: only standard deduction applies (₹75,000 from FY 2024-25)
      return this.limits.standardDeduction;
    }

    const d = input.deductions ?? {};
    const standardDeduction = Math.min(d.standardDeduction ?? this.limits.standardDeduction, this.limits.standardDeduction);
    const section80C = Math.min(d.section80C ?? 0, this.limits.section80C);
    const section80D = Math.min(d.section80D ?? 0, this.limits.section80D_self);
    const section80CCD1B = Math.min(d.section80CCD1B ?? 0, this.limits.section80CCD1B);
    const homeLoanInterest = Math.min(d.homeLoanInterest ?? 0, this.limits.homeLoanInterest);
    const hra = d.hra ?? 0;
    const lta = d.lta ?? 0;
    const professionalTax = d.professionalTax ?? 0;
    const otherDeductions = d.otherDeductions ?? 0;

    return (
      standardDeduction +
      section80C +
      section80D +
      section80CCD1B +
      homeLoanInterest +
      hra +
      lta +
      professionalTax +
      otherDeductions
    );
  }

  // ─── Main calculate (orchestrates everything) ─────────────────────────────
  calculate(input: TaxCalculationInput): TaxCalculationResult {
    const grossIncome = input.grossSalary + input.otherIncome;
    const totalDeductions = this.calculateTotalDeductions(input);
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    const { breakdown, taxBeforeCess } = this.calculateSlabTax(taxableIncome);
    const surcharge = this.calculateSurcharge(taxableIncome, taxBeforeCess);
    const rebate = this.calculateRebate(taxableIncome, taxBeforeCess);
    const taxAfterRebate = Math.max(0, taxBeforeCess - rebate);
    const cess = this.calculateCess(taxAfterRebate, surcharge);
    const totalTax = taxAfterRebate + surcharge + cess;

    const highestSlab = breakdown.find((s) => s.taxableAmount > 0 && s.rate > 0);
    const marginalTaxRate = breakdown.reduce((max, s) => (s.taxableAmount > 0 ? Math.max(max, s.rate) : max), 0);
    const effectiveTaxRate = grossIncome > 0 ? parseFloat(((totalTax / grossIncome) * 100).toFixed(2)) : 0;

    return {
      assessmentYear: this.assessmentYear,
      regime: this.regime,
      grossIncome,
      totalDeductions,
      taxableIncome,
      slabBreakdown: breakdown,
      taxBeforeCess,
      surcharge,
      cess,
      section87ARebate: rebate,
      taxAfterRebate,
      totalTax,
      effectiveTaxRate,
      marginalTaxRate,
    };
  }

  getDeductionLimits(): DeductionLimits {
    return this.limits;
  }

  getSlabs(): TaxSlab[] {
    return this.slabs;
  }
}
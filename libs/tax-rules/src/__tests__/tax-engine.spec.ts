import { FY2024_25_OldRegimePlugin } from '../plugins/fy2024-25-old-regime.plugin';
import { FY2024_25_NewRegimePlugin } from '../plugins/fy2024-25-new-regime.plugin';
import { TaxRuleRegistry } from '../tax-rule.registry';
import { TaxCalculationInput } from '../interfaces/tax-rule-plugin.interface';
import { describe, test, expect } from '@jest/globals';

const oldPlugin = new FY2024_25_OldRegimePlugin();
const newPlugin = new FY2024_25_NewRegimePlugin();

// ─── Helper ───────────────────────────────────────────────────────────────────
function oldInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    grossSalary: 0,
    otherIncome: 0,
    regime: 'old',
    assessmentYear: '2024-25',
    ...overrides,
  };
}

// ─── Old Regime Tests ─────────────────────────────────────────────────────────
describe('FY2024-25 Old Regime', () => {
  test('zero income → zero tax', () => {
    const result = oldPlugin.calculate(oldInput({ grossSalary: 0, otherIncome: 0 }));
    expect(result.totalTax).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  test('income below 2.5L basic exemption → zero tax', () => {
    const result = oldPlugin.calculate(oldInput({ grossSalary: 200_000, otherIncome: 0 }));
    expect(result.taxableIncome).toBe(150_000); // standard deduction (50k) takes it to 1.5L, still under 2.5L
    expect(result.totalTax).toBe(0);
  });

  test('5L income → 87A rebate makes tax zero', () => {
    // Taxable = 5,00,000 - 50,000 (std deduction) = 4,50,000
    // Tax before cess = 5% of (4,50,000 - 2,50,000) = 10,000
    // 87A rebate = 12,500 → covers it fully → tax = 0
    const result = oldPlugin.calculate(oldInput({ grossSalary: 500_000 }));
    expect(result.totalTax).toBe(0);
    expect(result.section87ARebate).toBeGreaterThan(0);
  });

  test('7L income with max 80C deduction calculates correctly', () => {
    const result = oldPlugin.calculate(oldInput({
      grossSalary: 700_000,
      deductions: {
        section80C: 150_000,
        standardDeduction: 50_000,
      },
    }));
    // Taxable = 7,00,000 - 50,000 (std) - 1,50,000 (80C) = 5,00,000
    // Under 5L threshold → 87A rebate → zero tax
    expect(result.taxableIncome).toBe(500_000);
    expect(result.totalTax).toBe(0);
  });

  test('10L salary calculates correct slab tax', () => {
    const result = oldPlugin.calculate(oldInput({
      grossSalary: 1_000_000,
      deductions: { standardDeduction: 50_000 },
    }));
    // Taxable = 10,00,000 - 50,000 = 9,50,000
    // 0–2.5L: 0 = 0
    // 2.5L–5L: 5% of 2,50,000 = 12,500
    // 5L–9.5L: 20% of 4,50,000 = 90,000
    // Tax before cess = 1,02,500
    // Cess 4% = 4,100
    // Total = 1,06,600
    expect(result.taxBeforeCess).toBe(102_500);
    expect(result.cess).toBe(4_100);
    expect(result.totalTax).toBe(106_600);
    expect(result.section87ARebate).toBe(0); // Income > 5L, no rebate
  });

  test('12L salary hits 30% slab', () => {
    const result = oldPlugin.calculate(oldInput({
      grossSalary: 1_200_000,
      deductions: { standardDeduction: 50_000 },
    }));
    expect(result.marginalTaxRate).toBe(30);
  });

  test('deductions cannot exceed their limits', () => {
    const result = oldPlugin.calculate(oldInput({
      grossSalary: 1_000_000,
      deductions: {
        section80C: 999_999, // way over 1.5L limit
        section80D: 999_999, // way over 25k limit
      },
    }));
    // 80C should be capped at 1,50,000
    // 80D should be capped at 25,000
    const limits = oldPlugin.getDeductionLimits();
    expect(result.totalDeductions).toBeLessThanOrEqual(
      limits.section80C + limits.section80D_self + limits.standardDeduction,
    );
  });

  test('surcharge applies on income above 50L', () => {
    const result = oldPlugin.calculate(oldInput({ grossSalary: 6_000_000 }));
    expect(result.surcharge).toBeGreaterThan(0);
  });

  test('effective tax rate is within reasonable bounds', () => {
    const result = oldPlugin.calculate(oldInput({ grossSalary: 2_000_000 }));
    expect(result.effectiveTaxRate).toBeGreaterThan(0);
    expect(result.effectiveTaxRate).toBeLessThan(40);
  });
});

// ─── New Regime Tests ─────────────────────────────────────────────────────────
describe('FY2024-25 New Regime', () => {
  function newInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
    return { grossSalary: 0, otherIncome: 0, regime: 'new', assessmentYear: '2024-25', ...overrides };
  }

  test('zero income → zero tax', () => {
    const result = newPlugin.calculate(newInput());
    expect(result.totalTax).toBe(0);
  });

  test('standard deduction is 75,000 in new regime', () => {
    const result = newPlugin.calculate(newInput({ grossSalary: 1_000_000 }));
    expect(result.totalDeductions).toBe(75_000);
  });

  test('7L income → 87A rebate makes tax zero in new regime', () => {
    // Taxable = 7,00,000 - 75,000 = 6,25,000 — under 7L threshold
    const result = newPlugin.calculate(newInput({ grossSalary: 700_000 }));
    expect(result.totalTax).toBe(0);
    expect(result.section87ARebate).toBeGreaterThan(0);
  });

  test('10L salary new regime calculation', () => {
    const result = newPlugin.calculate(newInput({ grossSalary: 1_000_000 }));
    // Taxable = 10,00,000 - 75,000 = 9,25,000
    // 0–3L: 0
    // 3–7L: 5% of 4,00,000 = 20,000
    // 7–9.25L: 10% of 2,25,000 = 22,500
    // Tax before cess = 42,500; Cess 4% = 1,700; Total = 44,200
    expect(result.taxBeforeCess).toBe(42_500);
    expect(result.totalTax).toBe(44_200);
  });

  test('80C deductions are ignored in new regime', () => {
    const withDeduction = newPlugin.calculate(newInput({
      grossSalary: 1_000_000,
      deductions: { section80C: 150_000 },
    }));
    const withoutDeduction = newPlugin.calculate(newInput({ grossSalary: 1_000_000 }));
    // Should be identical — 80C not applicable in new regime
    expect(withDeduction.totalTax).toBe(withoutDeduction.totalTax);
  });

  test('surcharge in new regime capped at 25%', () => {
    const highIncome = newPlugin.calculate(newInput({ grossSalary: 60_000_000 })); // 6 crore
    const moderateIncome = newPlugin.calculate(newInput({ grossSalary: 6_000_000 })); // 60 lakh
    // New regime cap: surcharge cannot exceed 25% of tax
    if (highIncome.taxBeforeCess > 0) {
      expect(highIncome.surcharge / highIncome.taxBeforeCess).toBeLessThanOrEqual(0.25);
    }
  });
});

// ─── Regime Comparison Tests ──────────────────────────────────────────────────
describe('Old vs New Regime Comparison', () => {
  test('high deductions favour old regime', () => {
    const input = { grossSalary: 1_500_000, otherIncome: 0, assessmentYear: '2024-25' };
    const oldResult = oldPlugin.calculate({
      ...input,
      regime: 'old',
      deductions: {
        section80C: 150_000,
        section80D: 25_000,
        section80CCD1B: 50_000,
        homeLoanInterest: 200_000,
      },
    });
    const newResult = newPlugin.calculate({ ...input, regime: 'new' });
    expect(oldResult.totalTax).toBeLessThan(newResult.totalTax);
  });

  test('no deductions favour new regime for moderate income', () => {
    const input = { grossSalary: 800_000, otherIncome: 0, assessmentYear: '2024-25' };
    const oldResult = oldPlugin.calculate({ ...input, regime: 'old' });
    const newResult = newPlugin.calculate({ ...input, regime: 'new' });
    // New regime has higher standard deduction (75k vs 50k) → usually lower tax here
    expect(newResult.totalTax).toBeLessThanOrEqual(oldResult.totalTax);
  });
});

// ─── TaxRuleRegistry Tests ────────────────────────────────────────────────────
describe('TaxRuleRegistry', () => {
  const registry = new TaxRuleRegistry();

  test('resolves old regime plugin', () => {
    const plugin = registry.resolve('2024-25', 'old');
    expect(plugin.regime).toBe('old');
    expect(plugin.assessmentYear).toBe('2024-25');
  });

  test('resolves new regime plugin', () => {
    const plugin = registry.resolve('2024-25', 'new');
    expect(plugin.regime).toBe('new');
  });

  test('throws for unknown assessment year', () => {
    expect(() => registry.resolve('2099-00', 'old')).toThrow();
  });

  test('lists available years', () => {
    const years = registry.getAvailableYears();
    expect(years).toContain('2024-25');
  });
});
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CalculateTaxCommand } from '../commands/tax.commands';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { TaxRecordEntity, DeductionSuggestion } from '../../../domain/entities/tax-record.entity';
import { TaxCalculatedEvent } from '../../../domain/events/document-tax.events';
import { TaxRuleRegistry, TaxCalculationInput, TaxCalculationResult } from '@taxai/tax-rules';

@CommandHandler(CalculateTaxCommand)
export class CalculateTaxHandler
  implements ICommandHandler<CalculateTaxCommand, TaxRecordEntity>
{
  constructor(
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
    private readonly taxRuleRegistry: TaxRuleRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: CalculateTaxCommand): Promise<TaxRecordEntity> {
    const { userId, tenantId, assessmentYear, input, sourceDocumentIds = [] } = cmd;

    // ── 1. Resolve plugins for both regimes ───────────────────────────────────
    const oldPlugin = this.taxRuleRegistry.resolve(assessmentYear, 'old');
    const newPlugin = this.taxRuleRegistry.resolve(assessmentYear, 'new');

    const baseInput: TaxCalculationInput = { ...input, assessmentYear };

    // ── 2. Calculate both regimes (fully deterministic — no AI) ──────────────
    const oldResult = oldPlugin.calculate({ ...baseInput, regime: 'old' });
    const newResult = newPlugin.calculate({ ...baseInput, regime: 'new' });

    // ── 3. Recommend best regime ──────────────────────────────────────────────
    const recommendedRegime = oldResult.totalTax <= newResult.totalTax ? 'old' : 'new';
    const taxSavingBySwitch = Math.abs(oldResult.totalTax - newResult.totalTax);

    // ── 4. Generate deterministic deduction suggestions ───────────────────────
    const suggestions = this.buildDeductionSuggestions(oldResult, baseInput, oldPlugin.getDeductionLimits());

    // ── 5. Filing readiness score ─────────────────────────────────────────────
    const { score, missingDocuments } = this.calculateFilingReadiness(sourceDocumentIds, baseInput);

    // ── 6. Persist ────────────────────────────────────────────────────────────
    const record = TaxRecordEntity.create({
      id: uuidv4(),
      tenantId,
      userId,
      assessmentYear,
      sourceDocumentIds,
      oldRegimeResult: oldResult,
      newRegimeResult: newResult,
      recommendedRegime,
      taxSavingBySwitch,
      deductionSuggestions: suggestions,
      filingReadinessScore: score,
      missingDocuments,
    });

    const saved = await this.taxRepo.save(record);

    // ── 7. Publish domain event ───────────────────────────────────────────────
    this.eventBus.publish(
      new TaxCalculatedEvent(
        saved.id,
        userId,
        tenantId,
        assessmentYear,
        recommendedRegime,
        saved.bestRegimeResult.totalTax,
      ),
    );

    return saved;
  }

  // ── Deduction gap analysis — deterministic, rule-based ─────────────────────
  private buildDeductionSuggestions(
    oldResult: TaxCalculationResult,
    input: TaxCalculationInput,
    limits: any,
  ): DeductionSuggestion[] {
    const suggestions: DeductionSuggestion[] = [];
    const marginalRate = oldResult.marginalTaxRate / 100;
    const d = input.deductions ?? {};

    const used80C = d.section80C ?? 0;
    if (used80C < limits.section80C) {
      const gap = limits.section80C - used80C;
      suggestions.push({
        section: '80C',
        description: 'Tax-saving investments (ELSS, PPF, LIC, NSC, ULIP, 5-year FD)',
        currentAmount: used80C,
        maxAllowed: limits.section80C,
        potentialSaving: Math.round(gap * marginalRate),
        actionRequired: `Invest ₹${gap.toLocaleString('en-IN')} more in 80C instruments to claim full deduction`,
        confidence: 0.95,
      });
    }

    const used80D = d.section80D ?? 0;
    if (used80D < limits.section80D_self) {
      const gap = limits.section80D_self - used80D;
      suggestions.push({
        section: '80D',
        description: 'Health insurance premium for self, spouse and children',
        currentAmount: used80D,
        maxAllowed: limits.section80D_self,
        potentialSaving: Math.round(gap * marginalRate),
        actionRequired: `Purchase health insurance to claim up to ₹${limits.section80D_self.toLocaleString('en-IN')}`,
        confidence: 0.90,
      });
    }

    const usedNPS = d.section80CCD1B ?? 0;
    if (usedNPS < limits.section80CCD1B) {
      const gap = limits.section80CCD1B - usedNPS;
      suggestions.push({
        section: '80CCD(1B)',
        description: 'Additional NPS contribution (over and above 80C limit)',
        currentAmount: usedNPS,
        maxAllowed: limits.section80CCD1B,
        potentialSaving: Math.round(gap * marginalRate),
        actionRequired: `Contribute ₹${gap.toLocaleString('en-IN')} more to NPS Tier 1 account`,
        confidence: 0.88,
      });
    }

    return suggestions;
  }

  // ── Filing readiness scoring ────────────────────────────────────────────────
  private calculateFilingReadiness(
    documentIds: string[],
    input: TaxCalculationInput,
  ): { score: number; missingDocuments: string[] } {
    const missing: string[] = [];
    let score = 100;

    if (documentIds.length === 0) {
      missing.push('Form 16 (mandatory for salaried employees)');
      score -= 40;
    }
    if (!input.deductions?.section80C && input.grossSalary > 500_000) {
      missing.push('80C investment proof (ELSS/PPF/LIC receipts)');
      score -= 15;
    }
    if (!input.deductions?.section80D) {
      missing.push('Health insurance premium certificate (80D)');
      score -= 10;
    }

    return { score: Math.max(0, score), missingDocuments: missing };
  }
}
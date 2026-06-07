import { CommandHandler, ICommandHandler, EventBus, QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CalculateGstCommand, GetGstSummaryQuery } from '../commands/gst.commands';
import { IGstRecordRepository, GST_RECORD_REPOSITORY } from '../../../domain/repositories/gst-record.repository.interface';
import { GstRecordEntity, GstBreakdown } from '../../../domain/entities/gst-record.entity';
import { GstRecordCreatedEvent } from '../../../domain/events/document-tax.events';

// Registered GST rates in India
const VALID_GST_RATES = [0, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];

@CommandHandler(CalculateGstCommand)
export class CalculateGstHandler
  implements ICommandHandler<CalculateGstCommand, GstRecordEntity>
{
  constructor(
    @Inject(GST_RECORD_REPOSITORY) private readonly gstRepo: IGstRecordRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: CalculateGstCommand): Promise<GstRecordEntity> {
    // ── 1. Validate GST rate ───────────────────────────────────────────────────
    if (!VALID_GST_RATES.includes(cmd.gstRate)) {
      throw new Error(
        `Invalid GST rate: ${cmd.gstRate}%. Valid rates: ${VALID_GST_RATES.join(', ')}%`,
      );
    }

    // ── 2. Determine CGST+SGST vs IGST ───────────────────────────────────────
    const isInterState = cmd.vendorState.toUpperCase() !== cmd.buyerState.toUpperCase();
    const breakdown = this.computeGst(cmd.baseAmount, cmd.gstRate, isInterState);

    // ── 3. Persist ────────────────────────────────────────────────────────────
    const record = GstRecordEntity.create({
      id: uuidv4(),
      tenantId: cmd.tenantId,
      userId: cmd.userId,
      invoiceNumber: cmd.invoiceNumber,
      vendorName: cmd.vendorName,
      vendorGstin: cmd.vendorGstin,
      buyerGstin: cmd.buyerGstin,
      invoiceDate: cmd.invoiceDate,
      invoiceAmount: cmd.baseAmount,
      gstRate: cmd.gstRate,
      gstBreakdown: breakdown,
      sourceDocumentId: cmd.sourceDocumentId,
      vendorState: cmd.vendorState,
      buyerState: cmd.buyerState,
      description: cmd.description,
    });

    const saved = await this.gstRepo.save(record);

    this.eventBus.publish(
      new GstRecordCreatedEvent(saved.id, cmd.userId, cmd.tenantId, cmd.invoiceNumber),
    );

    return saved;
  }

  // ── Pure calculation logic — fully deterministic ───────────────────────────
  private computeGst(baseAmount: number, rate: number, isInterState: boolean): GstBreakdown {
    const totalGst = Math.round((baseAmount * rate) / 100 * 100) / 100;

    if (isInterState) {
      return {
        baseAmount,
        cgst: 0,
        sgst: 0,
        igst: totalGst,
        utgst: 0,
        totalGst,
        totalAmount: baseAmount + totalGst,
        isInterState: true,
      };
    }

    const halfGst = Math.round((totalGst / 2) * 100) / 100;
    return {
      baseAmount,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      utgst: 0,
      totalGst,
      totalAmount: baseAmount + totalGst,
      isInterState: false,
    };
  }
}

@QueryHandler(GetGstSummaryQuery)
export class GetGstSummaryHandler
  implements IQueryHandler<GetGstSummaryQuery>
{
  constructor(
    @Inject(GST_RECORD_REPOSITORY) private readonly gstRepo: IGstRecordRepository,
  ) {}

  async execute(query: GetGstSummaryQuery) {
    const [records, totals] = await Promise.all([
      this.gstRepo.findByUserId(query.userId, query.tenantId),
      this.gstRepo.getTotalGstByUser(query.userId, query.tenantId),
    ]);

    return {
      records,
      summary: {
        totalInvoices: records.length,
        totalTaxableAmount: totals.totalTaxable,
        totalGstPaid: totals.totalGst,
        cgstTotal: records.reduce((s, r) => s + r.gstBreakdown.cgst, 0),
        sgstTotal: records.reduce((s, r) => s + r.gstBreakdown.sgst, 0),
        igstTotal: records.reduce((s, r) => s + r.gstBreakdown.igst, 0),
      },
    };
  }
}
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetDashboardSummaryQuery } from '../queries/dashboard.queries';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../../domain/repositories/document.repository.interface';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { DOCUMENT_STATUS, FILING_STATUS } from '@taxai/shared';

export interface DashboardSummary {
  // Filing readiness
  filingReadiness: {
    score: number;
    status: 'not_started' | 'in_progress' | 'ready' | 'filed';
    missingDocuments: string[];
    assessmentYear: string;
  };

  // Tax summary
  taxSummary: {
    hasCalculation: boolean;
    recommendedRegime: string | null;
    totalTax: number | null;
    taxSavingBySwitch: number | null;
    effectiveTaxRate: number | null;
    totalPotentialSaving: number | null;
  } | null;

  // Documents
  documents: {
    total: number;
    pending: number;
    processing: number;
    extracted: number;
    failed: number;
    recentUploads: Array<{
      id: string;
      type: string;
      filename: string;
      status: string;
      uploadedAt: Date;
    }>;
  };

  // Deduction opportunities
  deductionOpportunities: Array<{
    section: string;
    description: string;
    potentialSaving: number;
    actionRequired: string;
  }>;

  // Active filing
  activeFiling: {
    id: string;
    status: string;
    assessmentYear: string;
    assignedCaId: string | null;
    lastUpdated: Date;
  } | null;

  // Unread notifications count
  unreadNotifications: number;
}

@QueryHandler(GetDashboardSummaryQuery)
export class GetDashboardSummaryHandler
  implements IQueryHandler<GetDashboardSummaryQuery, DashboardSummary>
{
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
  ) {}

  async execute(query: GetDashboardSummaryQuery): Promise<DashboardSummary> {
    const { userId, tenantId } = query;

    // Run all reads in parallel — never sequential when independent
    const [documents, latestTaxRecord, filings] = await Promise.all([
      this.docRepo.findByUserId(userId, tenantId),
      this.taxRepo.findLatestByUser(userId, tenantId),
      this.filingRepo.findByUserId(userId, tenantId),
    ]);

    // ── Document breakdown ─────────────────────────────────────────────────────
    const docsByStatus = {
      pending: documents.filter((d) => d.status === DOCUMENT_STATUS.PENDING).length,
      processing: documents.filter((d) => d.status === DOCUMENT_STATUS.PROCESSING).length,
      extracted: documents.filter((d) => d.status === DOCUMENT_STATUS.EXTRACTED).length,
      failed: documents.filter((d) => d.status === DOCUMENT_STATUS.FAILED).length,
    };

    const recentUploads = documents
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        type: d.type,
        filename: d.originalFilename,
        status: d.status,
        uploadedAt: d.createdAt,
      }));

    // ── Tax summary ─────────────────────────────────────────────────────────────
    const taxSummary = latestTaxRecord
      ? {
          hasCalculation: true,
          recommendedRegime: latestTaxRecord.recommendedRegime,
          totalTax: latestTaxRecord.bestRegimeResult.totalTax,
          taxSavingBySwitch: latestTaxRecord.taxSavingBySwitch,
          effectiveTaxRate: latestTaxRecord.bestRegimeResult.effectiveTaxRate,
          totalPotentialSaving: latestTaxRecord.totalPotentialSaving(),
        }
      : null;

    // ── Filing readiness ────────────────────────────────────────────────────────
    const currentYear = '2024-25';
    const activeFiling = filings.find(
      (f) => f.assessmentYear === currentYear && f.status !== FILING_STATUS.READY_TO_FILE,
    ) ?? null;

    let readinessStatus: DashboardSummary['filingReadiness']['status'] = 'not_started';
    if (activeFiling) {
      readinessStatus =
        activeFiling.status === FILING_STATUS.READY_TO_FILE ? 'filed' : 'in_progress';
    } else if (latestTaxRecord?.isFilingReady()) {
      readinessStatus = 'ready';
    }

    // ── Deduction opportunities ─────────────────────────────────────────────────
    const deductionOpportunities = (latestTaxRecord?.deductionSuggestions ?? [])
      .filter((s) => s.potentialSaving > 0)
      .sort((a, b) => b.potentialSaving - a.potentialSaving)
      .slice(0, 5)
      .map((s) => ({
        section: s.section,
        description: s.description,
        potentialSaving: s.potentialSaving,
        actionRequired: s.actionRequired,
      }));

    return {
      filingReadiness: {
        score: latestTaxRecord?.filingReadinessScore ?? 0,
        status: readinessStatus,
        missingDocuments: latestTaxRecord?.missingDocuments ?? [],
        assessmentYear: currentYear,
      },
      taxSummary,
      documents: {
        total: documents.length,
        ...docsByStatus,
        recentUploads,
      },
      deductionOpportunities,
      activeFiling: activeFiling
        ? {
            id: activeFiling.id,
            status: activeFiling.status,
            assessmentYear: activeFiling.assessmentYear,
            assignedCaId: activeFiling.assignedCaId ?? null,
            lastUpdated: activeFiling.updatedAt,
          }
        : null,
      unreadNotifications: 0,
    };
  }
}
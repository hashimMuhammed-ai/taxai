import { GetDashboardSummaryHandler } from '../application/dashboard/handlers/dashboard.handler';
import { DocumentEntity } from '../domain/entities/document.entity';
import { DOCUMENT_STATUS, FILING_STATUS } from '@taxai/shared';

// ─── Minimal mock factories ────────────────────────────────────────────────────
function mockDoc(status: string, type = 'form_16'): any {
  return {
    id: `doc-${Math.random()}`,
    type,
    status,
    originalFilename: `${type}.pdf`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mockTaxRecord(overrides: any = {}): any {
  return {
    id: 'taxrecord-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    assessmentYear: '2024-25',
    recommendedRegime: 'new',
    taxSavingBySwitch: 12000,
    filingReadinessScore: 85,
    missingDocuments: [],
    deductionSuggestions: [
      { section: '80C', description: 'Tax saving investments', potentialSaving: 31200, actionRequired: 'Invest more in ELSS' },
      { section: '80D', description: 'Health insurance', potentialSaving: 7800, actionRequired: 'Buy health insurance' },
    ],
    bestRegimeResult: { totalTax: 45000, effectiveTaxRate: 6.5 },
    oldRegimeResult: { totalTax: 57000 },
    newRegimeResult: { totalTax: 45000 },
    isFilingReady: () => true,
    totalPotentialSaving: () => 39000,
    ...overrides,
  };
}

function mockFiling(status: string): any {
  return {
    id: 'filing-1',
    status,
    assessmentYear: '2024-25',
    assignedCaId: status === FILING_STATUS.CA_REVIEW ? 'ca-1' : undefined,
    updatedAt: new Date(),
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockDocRepo = { findByUserId: jest.fn() };
const mockTaxRepo = { findLatestByUser: jest.fn() };
const mockFilingRepo = { findByUserId: jest.fn() };

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('GetDashboardSummaryHandler', () => {
  let handler: GetDashboardSummaryHandler;

  beforeEach(() => {
    handler = new GetDashboardSummaryHandler(
      mockDocRepo as any,
      mockTaxRepo as any,
      mockFilingRepo as any,
    );
    jest.clearAllMocks();
  });

  it('returns not_started status when no documents or tax record', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(null);
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.filingReadiness.status).toBe('not_started');
    expect(result.filingReadiness.score).toBe(0);
    expect(result.taxSummary).toBeNull();
    expect(result.documents.total).toBe(0);
    expect(result.unreadNotifications).toBe(0);
  });

  it('returns correct document breakdown', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([
      mockDoc(DOCUMENT_STATUS.EXTRACTED),
      mockDoc(DOCUMENT_STATUS.EXTRACTED),
      mockDoc(DOCUMENT_STATUS.PROCESSING),
      mockDoc(DOCUMENT_STATUS.FAILED),
      mockDoc(DOCUMENT_STATUS.PENDING),
    ]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(null);
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.documents.total).toBe(5);
    expect(result.documents.extracted).toBe(2);
    expect(result.documents.processing).toBe(1);
    expect(result.documents.failed).toBe(1);
    expect(result.documents.pending).toBe(1);
  });

  it('includes tax summary when calculation exists', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(mockTaxRecord());
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.taxSummary).not.toBeNull();
    expect(result.taxSummary?.hasCalculation).toBe(true);
    expect(result.taxSummary?.recommendedRegime).toBe('new');
    expect(result.taxSummary?.totalTax).toBe(45000);
    expect(result.taxSummary?.totalPotentialSaving).toBe(39000);
  });

  it('returns ready status when tax record is filing ready and no active filing', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(mockTaxRecord());
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.filingReadiness.status).toBe('ready');
    expect(result.filingReadiness.score).toBe(85);
  });

  it('returns in_progress when active filing exists', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(mockTaxRecord());
    mockFilingRepo.findByUserId.mockResolvedValue([mockFiling(FILING_STATUS.CA_REVIEW)]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.filingReadiness.status).toBe('in_progress');
    expect(result.activeFiling?.status).toBe(FILING_STATUS.CA_REVIEW);
    expect(result.activeFiling?.assignedCaId).toBe('ca-1');
  });

  it('deduction opportunities are sorted by saving desc and capped at 5', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(mockTaxRecord({
      deductionSuggestions: [
        { section: '80CCD', description: 'NPS', potentialSaving: 5000, actionRequired: 'Invest NPS' },
        { section: '80C', description: '80C', potentialSaving: 31200, actionRequired: 'ELSS' },
        { section: '80D', description: 'Health', potentialSaving: 7800, actionRequired: 'Insurance' },
      ],
    }));
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.deductionOpportunities[0].section).toBe('80C');  // highest saving first
    expect(result.deductionOpportunities[1].section).toBe('80D');
    expect(result.deductionOpportunities[2].section).toBe('80CCD');
  });

  it('unread notification count is always 0', async () => {
    mockDocRepo.findByUserId.mockResolvedValue([]);
    mockTaxRepo.findLatestByUser.mockResolvedValue(null);
    mockFilingRepo.findByUserId.mockResolvedValue([]);

    const result = await handler.execute({ userId: 'user-1', tenantId: 'tenant-1' });

    expect(result.unreadNotifications).toBe(0);
  });
});
import { FilingEntity } from '../domain/entities/filing.entity';
import { FILING_STATUS } from '@taxai/shared';
import { describe, it, expect } from '@jest/globals';

// ─── Test Helpers ─────────────────────────────────────────────────────────────
function makeFiling(overrides: Partial<Parameters<typeof FilingEntity.create>[0]> = {}): FilingEntity {
  return FilingEntity.create({
    id: 'filing-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    assessmentYear: '2024-25',
    taxRecordId: 'taxrecord-1',
    selectedRegime: 'new',
    ...overrides,
  });
}

// ─── State Machine Tests ──────────────────────────────────────────────────────
describe('FilingEntity state machine', () => {

  describe('DRAFT → AI_PREPARED', () => {
    it('transitions correctly', () => {
      const filing = makeFiling();
      expect(filing.status).toBe(FILING_STATUS.DRAFT);
      const prepared = filing.markAiPrepared();
      expect(prepared.status).toBe(FILING_STATUS.AI_PREPARED);
    });

    it('is immutable — original stays DRAFT', () => {
      const filing = makeFiling();
      filing.markAiPrepared();
      expect(filing.status).toBe(FILING_STATUS.DRAFT);
    });

    it('throws if not in DRAFT', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW });
      expect(() => filing.markAiPrepared()).toThrow("Cannot mark as AI prepared");
    });

    it('updates taxRecordId if passed', () => {
      const filing = makeFiling({ taxRecordId: 'taxrecord-old' });
      const prepared = filing.markAiPrepared('taxrecord-new');
      expect(prepared.taxRecordId).toBe('taxrecord-new');
    });

    it('clears rejectionReason upon transition', () => {
      const filing = makeFiling({ status: FILING_STATUS.DRAFT, rejectionReason: 'Missing files' });
      const prepared = filing.markAiPrepared();
      expect(prepared.rejectionReason).toBeUndefined();
    });
  });

  describe('AI_PREPARED → CA_REVIEW', () => {
    it('assigns CA and transitions', () => {
      const filing = makeFiling({ status: FILING_STATUS.AI_PREPARED });
      const submitted = filing.submitForCaReview('ca-1');
      expect(submitted.status).toBe(FILING_STATUS.CA_REVIEW);
      expect(submitted.assignedCaId).toBe('ca-1');
    });

    it('throws if not in AI_PREPARED', () => {
      const filing = makeFiling({ status: FILING_STATUS.DRAFT });
      expect(() => filing.submitForCaReview('ca-1')).toThrow("Cannot submit for CA review");
    });
  });

  describe('CA_REVIEW → USER_APPROVED', () => {
    it('CA approves with note', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      const approved = filing.approveByCA('ca-1', 'Looks good');
      expect(approved.status).toBe(FILING_STATUS.USER_APPROVED);
      expect(approved.approvedAt).toBeInstanceOf(Date);
      expect(approved.notes).toHaveLength(1);
      expect(approved.notes[0].content).toBe('Looks good');
    });

    it('CA approves without note — no note added', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      const approved = filing.approveByCA('ca-1');
      expect(approved.notes).toHaveLength(0);
    });

    it('throws if wrong CA tries to approve', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      expect(() => filing.approveByCA('ca-2')).toThrow('Only the assigned CA can approve');
    });

    it('throws if filing is not in CA_REVIEW', () => {
      const filing = makeFiling({ status: FILING_STATUS.DRAFT, assignedCaId: 'ca-1' });
      expect(() => filing.approveByCA('ca-1')).toThrow("Cannot approve");
    });
  });

  describe('CA_REVIEW → DRAFT (rejection)', () => {
    it('rejects and returns to DRAFT with reason', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      const rejected = filing.rejectByCA('ca-1', 'Missing bank statement');
      expect(rejected.status).toBe(FILING_STATUS.DRAFT);
      expect(rejected.rejectionReason).toBe('Missing bank statement');
    });

    it('throws if wrong CA rejects', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      expect(() => filing.rejectByCA('ca-999', 'reason')).toThrow('Only the assigned CA can reject');
    });
  });

  describe('USER_APPROVED → READY_TO_FILE', () => {
    it('attaches report key and marks ready', () => {
      const filing = makeFiling({ status: FILING_STATUS.USER_APPROVED });
      const ready = filing.markReadyToFile('reports/2024-25_tax_summary.pdf');
      expect(ready.status).toBe(FILING_STATUS.READY_TO_FILE);
      expect(ready.reportObjectKey).toBe('reports/2024-25_tax_summary.pdf');
    });

    it('throws if not in USER_APPROVED', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW });
      expect(() => filing.markReadyToFile('key')).toThrow("Cannot mark ready to file");
    });
  });

  describe('Full workflow: DRAFT → READY_TO_FILE', () => {
    it('completes the full lifecycle', () => {
      const draft = makeFiling();
      const prepared = draft.markAiPrepared();
      const underReview = prepared.submitForCaReview('ca-1');
      const approved = underReview.approveByCA('ca-1', 'All documents verified');
      const ready = approved.markReadyToFile('tenant-1/user-1/reports/2024-25.pdf');

      expect(ready.status).toBe(FILING_STATUS.READY_TO_FILE);
      expect(ready.assignedCaId).toBe('ca-1');
      expect(ready.notes).toHaveLength(1);
      expect(ready.approvedAt).toBeInstanceOf(Date);
      expect(ready.reportObjectKey).toBe('tenant-1/user-1/reports/2024-25.pdf');
    });
  });

  describe('addNote', () => {
    it('adds notes from multiple parties', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      const withNote1 = filing.addNote('user-1', 'user', 'I have uploaded Form 26AS');
      const withNote2 = withNote1.addNote('ca-1', 'ca', 'Please also upload investment proofs');
      expect(withNote2.notes).toHaveLength(2);
      expect(withNote2.notes[0].authorRole).toBe('user');
      expect(withNote2.notes[1].authorRole).toBe('ca');
    });
  });

  describe('domain guards', () => {
    it('isAssignedTo returns true for assigned CA only', () => {
      const filing = makeFiling({ assignedCaId: 'ca-1' });
      expect(filing.isAssignedTo('ca-1')).toBe(true);
      expect(filing.isAssignedTo('ca-2')).toBe(false);
    });

    it('canBeReviewedBy checks both status and assignment', () => {
      const filing = makeFiling({ status: FILING_STATUS.CA_REVIEW, assignedCaId: 'ca-1' });
      expect(filing.canBeReviewedBy('ca-1')).toBe(true);
      expect(filing.canBeReviewedBy('ca-2')).toBe(false);

      const notInReview = makeFiling({ status: FILING_STATUS.DRAFT, assignedCaId: 'ca-1' });
      expect(notInReview.canBeReviewedBy('ca-1')).toBe(false);
    });
  });
});

// ─── Command Handler Tests ──────────────────────────────────────────────────
import { CreateFilingHandler } from '../application/filing/handlers/create-filing.handler';
import { PrepareFilingHandler } from '../application/filing/handlers/prepare-filing.handler';
import { CreateFilingCommand, PrepareFilingCommand } from '../application/filing/commands/filing.commands';
import { BadRequestException } from '@nestjs/common';

const mockFilingRepo = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCaId: jest.fn(),
  findByStatus: jest.fn(),
};

const mockTaxRepo = {
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findLatestByUser: jest.fn(),
  save: jest.fn(),
};

const mockEventBus = {
  publish: jest.fn(),
};

const mockAudit = {
  log: jest.fn(),
};

function mockTaxRecord(ready = true): any {
  return {
    id: 'taxrecord-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    assessmentYear: '2024-25',
    filingReadinessScore: ready ? 85 : 50,
    missingDocuments: ready ? [] : ['Form 16'],
    isFilingReady: function() {
      return this.filingReadinessScore >= 80 && this.missingDocuments.length === 0;
    },
  };
}

describe('CreateFilingHandler & PrepareFilingHandler', () => {
  let createHandler: CreateFilingHandler;
  let prepareHandler: PrepareFilingHandler;

  beforeEach(() => {
    createHandler = new CreateFilingHandler(
      mockFilingRepo as any,
      mockTaxRepo as any,
      mockEventBus as any,
      mockAudit as any,
    );
    prepareHandler = new PrepareFilingHandler(
      mockFilingRepo as any,
      mockTaxRepo as any,
      mockEventBus as any,
      mockAudit as any,
    );
    jest.clearAllMocks();
  });

  describe('CreateFilingHandler', () => {
    it('creates filing in DRAFT if tax record is not ready', async () => {
      const taxRecord = mockTaxRecord(false);
      mockTaxRepo.findById.mockResolvedValue(taxRecord);
      mockFilingRepo.save.mockImplementation((filing) => Promise.resolve(filing));

      const cmd = new CreateFilingCommand('user-1', 'tenant-1', '2024-25', 'taxrecord-1', 'new');
      const filing = await createHandler.execute(cmd);

      expect(filing.status).toBe(FILING_STATUS.DRAFT);
      expect(mockFilingRepo.save).toHaveBeenCalled();
    });

    it('creates filing in AI_PREPARED if tax record is ready', async () => {
      const taxRecord = mockTaxRecord(true);
      mockTaxRepo.findById.mockResolvedValue(taxRecord);
      mockFilingRepo.save.mockImplementation((filing) => Promise.resolve(filing));

      const cmd = new CreateFilingCommand('user-1', 'tenant-1', '2024-25', 'taxrecord-1', 'new');
      const filing = await createHandler.execute(cmd);

      expect(filing.status).toBe(FILING_STATUS.AI_PREPARED);
      expect(mockFilingRepo.save).toHaveBeenCalled();
    });
  });

  describe('PrepareFilingHandler', () => {
    it('throws BadRequestException if latest tax record is not ready', async () => {
      const filing = FilingEntity.create({
        id: 'filing-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        assessmentYear: '2024-25',
        taxRecordId: 'taxrecord-1',
        selectedRegime: 'new',
      });
      mockFilingRepo.findById.mockResolvedValue(filing);

      const taxRecord = mockTaxRecord(false);
      mockTaxRepo.findByUserId.mockResolvedValue([taxRecord]);

      const cmd = new PrepareFilingCommand('filing-1', 'user-1', 'tenant-1');
      await expect(prepareHandler.execute(cmd)).rejects.toThrow(BadRequestException);
    });

    it('successfully prepares the filing if latest tax record is ready', async () => {
      const filing = FilingEntity.create({
        id: 'filing-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        assessmentYear: '2024-25',
        taxRecordId: 'taxrecord-old',
        selectedRegime: 'new',
        status: FILING_STATUS.DRAFT,
      });
      mockFilingRepo.findById.mockResolvedValue(filing);
      mockFilingRepo.update.mockImplementation((f) => Promise.resolve(f));

      const taxRecord = mockTaxRecord(true);
      taxRecord.id = 'taxrecord-new';
      mockTaxRepo.findByUserId.mockResolvedValue([taxRecord]);

      const cmd = new PrepareFilingCommand('filing-1', 'user-1', 'tenant-1');
      const prepared = await prepareHandler.execute(cmd);

      expect(prepared.status).toBe(FILING_STATUS.AI_PREPARED);
      expect(prepared.taxRecordId).toBe('taxrecord-new');
      expect(mockFilingRepo.update).toHaveBeenCalled();
    });
  });
});
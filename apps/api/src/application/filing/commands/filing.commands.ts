import { TaxRegime } from '@taxai/shared';

// ─── Commands ─────────────────────────────────────────────────────────────────
export class CreateFilingCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly assessmentYear: string,
    public readonly taxRecordId: string,
    public readonly selectedRegime: TaxRegime,
  ) {}
}

export class SubmitFilingForReviewCommand {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly caId: string,
  ) {}
}

export class ApproveFilingCommand {
  constructor(
    public readonly filingId: string,
    public readonly caId: string,
    public readonly tenantId: string,
    public readonly note?: string,
  ) {}
}

export class RejectFilingCommand {
  constructor(
    public readonly filingId: string,
    public readonly caId: string,
    public readonly tenantId: string,
    public readonly reason: string,
  ) {}
}

export class AddFilingNoteCommand {
  constructor(
    public readonly filingId: string,
    public readonly authorId: string,
    public readonly authorRole: string,
    public readonly tenantId: string,
    public readonly content: string,
  ) {}
}

export class PrepareFilingCommand {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export class GetMyFilingsQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}

export class GetFilingByIdQuery {
  constructor(
    public readonly filingId: string,
    public readonly requesterId: string,
    public readonly requesterRole: string,
    public readonly tenantId: string,
  ) {}
}

export class GetCaFilingsQuery {
  constructor(
    public readonly caId: string,
    public readonly tenantId: string,
  ) {}
}

export class GetFilingAuditTrailQuery {
  constructor(
    public readonly filingId: string,
    public readonly tenantId: string,
  ) {}
}
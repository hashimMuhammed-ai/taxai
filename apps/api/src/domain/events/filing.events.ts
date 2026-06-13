import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  readonly version = 1;
}

// ─── Filing Events ────────────────────────────────────────────────────────────
export class FilingCreatedEvent extends DomainEvent {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly assessmentYear: string,
  ) { super(); }
}

export class FilingStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly changedBy: string,
  ) { super(); }
}

export class FilingApprovedByCaEvent extends DomainEvent {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly caId: string,
    public readonly assessmentYear: string,
  ) { super(); }
}

export class FilingRejectedByCaEvent extends DomainEvent {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly caId: string,
    public readonly reason: string,
  ) { super(); }
}

// ─── CA Events ────────────────────────────────────────────────────────────────
export class CaAssignedToFilingEvent extends DomainEvent {
  constructor(
    public readonly filingId: string,
    public readonly userId: string,
    public readonly caId: string,
    public readonly tenantId: string,
  ) { super(); }
}

// ─── Report Events ────────────────────────────────────────────────────────────
export class ReportGeneratedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly reportType: string,
    public readonly objectKey: string,
  ) { super(); }
}
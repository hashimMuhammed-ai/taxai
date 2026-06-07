import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly version = 1;
  constructor() {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}

// ─── Document Events ──────────────────────────────────────────────────────────
export class DocumentUploadedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly documentType: string,
    public readonly objectKey: string,
    public readonly mimeType: string,
  ) { super(); }
}

export class DocumentExtractionCompletedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly hasLowConfidence: boolean,
  ) { super(); }
}

export class DocumentExtractionFailedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly error: string,
  ) { super(); }
}

// ─── Tax Events ───────────────────────────────────────────────────────────────
export class TaxCalculatedEvent extends DomainEvent {
  constructor(
    public readonly taxRecordId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly assessmentYear: string,
    public readonly recommendedRegime: string,
    public readonly totalTax: number,
  ) { super(); }
}

// ─── GST Events ───────────────────────────────────────────────────────────────
export class GstRecordCreatedEvent extends DomainEvent {
  constructor(
    public readonly gstRecordId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly invoiceNumber: string,
  ) { super(); }
}
import { BaseEntity } from './base.entity';
import { FilingStatus, FILING_STATUS, TaxRegime } from '@taxai/shared';

export { FilingStatus };

export interface FilingNote {
  authorId: string;
  authorRole: string;
  content: string;
  createdAt: Date;
}

export interface CreateFilingProps {
  id: string;
  tenantId: string;
  userId: string;
  assessmentYear: string;
  taxRecordId: string;
  selectedRegime: TaxRegime;
  status?: FilingStatus;
  assignedCaId?: string;
  notes?: FilingNote[];
  rejectionReason?: string;
  approvedAt?: Date;
  reportObjectKey?: string;   // R2 key for generated PDF
  createdAt?: Date;
  updatedAt?: Date;
}

export class FilingEntity extends BaseEntity {
  readonly userId: string;
  readonly assessmentYear: string;
  readonly taxRecordId: string;
  readonly selectedRegime: TaxRegime;
  readonly status: FilingStatus;
  readonly assignedCaId?: string;
  readonly notes: FilingNote[];
  readonly rejectionReason?: string;
  readonly approvedAt?: Date;
  readonly reportObjectKey?: string;

  private constructor(props: CreateFilingProps) {
    super({
      id: props.id,
      tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.userId = props.userId;
    this.assessmentYear = props.assessmentYear;
    this.taxRecordId = props.taxRecordId;
    this.selectedRegime = props.selectedRegime;
    this.status = props.status ?? FILING_STATUS.DRAFT;
    this.assignedCaId = props.assignedCaId;
    this.notes = props.notes ?? [];
    this.rejectionReason = props.rejectionReason;
    this.approvedAt = props.approvedAt;
    this.reportObjectKey = props.reportObjectKey;
  }

  static create(props: CreateFilingProps): FilingEntity {
    return new FilingEntity(props);
  }

  // ─── Guarded state transitions ─────────────────────────────────────────────
  // Each transition validates the current state — illegal moves throw immediately

  markAiPrepared(): FilingEntity {
    this.assertStatus(FILING_STATUS.DRAFT, 'mark as AI prepared');
    return this.withProps({ status: FILING_STATUS.AI_PREPARED });
  }

  submitForCaReview(caId: string): FilingEntity {
    this.assertStatus(FILING_STATUS.AI_PREPARED, 'submit for CA review');
    return this.withProps({ status: FILING_STATUS.CA_REVIEW, assignedCaId: caId });
  }

  approveByCA(caId: string, note?: string): FilingEntity {
    this.assertStatus(FILING_STATUS.CA_REVIEW, 'approve');
    if (this.assignedCaId !== caId) throw new Error('Only the assigned CA can approve this filing');
    const notes = note ? [...this.notes, { authorId: caId, authorRole: 'ca', content: note, createdAt: new Date() }] : this.notes;
    return this.withProps({ status: FILING_STATUS.USER_APPROVED, approvedAt: new Date(), notes });
  }

  rejectByCA(caId: string, reason: string): FilingEntity {
    this.assertStatus(FILING_STATUS.CA_REVIEW, 'reject');
    if (this.assignedCaId !== caId) throw new Error('Only the assigned CA can reject this filing');
    return this.withProps({ status: FILING_STATUS.DRAFT, rejectionReason: reason });
  }

  markReadyToFile(reportObjectKey: string): FilingEntity {
    this.assertStatus(FILING_STATUS.USER_APPROVED, 'mark ready to file');
    return this.withProps({ status: FILING_STATUS.READY_TO_FILE, reportObjectKey });
  }

  addNote(authorId: string, authorRole: string, content: string): FilingEntity {
    const note: FilingNote = { authorId, authorRole, content, createdAt: new Date() };
    return this.withProps({ notes: [...this.notes, note] });
  }

  // ─── Domain guards ──────────────────────────────────────────────────────────
  isAssignedTo(caId: string): boolean {
    return this.assignedCaId === caId;
  }

  canBeReviewedBy(caId: string): boolean {
    return this.status === FILING_STATUS.CA_REVIEW && this.assignedCaId === caId;
  }

  private assertStatus(expected: FilingStatus, action: string): void {
    if (this.status !== expected) {
      throw new Error(`Cannot ${action}: filing is in '${this.status}' status, expected '${expected}'`);
    }
  }

  private withProps(overrides: Partial<CreateFilingProps>): FilingEntity {
    return new FilingEntity({
      id: this.id, tenantId: this.tenantId, userId: this.userId,
      assessmentYear: this.assessmentYear, taxRecordId: this.taxRecordId,
      selectedRegime: this.selectedRegime, status: this.status,
      assignedCaId: this.assignedCaId, notes: this.notes,
      rejectionReason: this.rejectionReason, approvedAt: this.approvedAt,
      reportObjectKey: this.reportObjectKey,
      createdAt: this.createdAt, updatedAt: new Date(),
      ...overrides,
    });
  }
}
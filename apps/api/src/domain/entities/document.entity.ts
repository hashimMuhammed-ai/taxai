import { BaseEntity } from './base.entity';
import { DocumentType, DocumentStatus, DOCUMENT_STATUS } from '@taxai/shared';

export { DocumentType, DocumentStatus };

export interface ExtractedDocumentData {
  // Form 16 / Salary fields
  pan?: string;
  employerName?: string;
  employerTan?: string;
  grossSalary?: number;
  tdsDeducted?: number;
  standardDeduction?: number;
  professionalTax?: number;
  assessmentYear?: string;

  // Investment / deduction fields
  section80C?: number;
  section80D?: number;
  npsContribution?: number;
  hra?: number;
  homeLoanInterest?: number;

  // Invoice fields
  invoiceNumber?: string;
  gstin?: string;
  vendorName?: string;
  invoiceAmount?: number;
  gstAmount?: number;
  invoiceDate?: string;

  // Confidence score per field (0–1)
  confidence: Record<string, number>;
  rawText?: string;              // OCR raw output — stored for audit/re-extraction
}

export interface CreateDocumentProps {
  id: string;
  tenantId: string;
  userId: string;
  type: DocumentType;
  originalFilename: string;
  objectKey: string;             // R2 object key
  mimeType: string;
  sizeBytes: number;
  status?: DocumentStatus;
  extractedData?: ExtractedDocumentData;
  extractionError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DocumentEntity extends BaseEntity {
  readonly userId: string;
  readonly type: DocumentType;
  readonly originalFilename: string;
  readonly objectKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly status: DocumentStatus;
  readonly extractedData?: ExtractedDocumentData;
  readonly extractionError?: string;

  private constructor(props: CreateDocumentProps) {
    super({
      id: props.id,
      tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.userId = props.userId;
    this.type = props.type;
    this.originalFilename = props.originalFilename;
    this.objectKey = props.objectKey;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.status = props.status ?? DOCUMENT_STATUS.PENDING;
    this.extractedData = props.extractedData;
    this.extractionError = props.extractionError;
  }

  static create(props: CreateDocumentProps): DocumentEntity {
    return new DocumentEntity(props);
  }

  // ─── Domain guards ─────────────────────────────────────────────────────────
  isReadyForExtraction(): boolean {
    return this.status === DOCUMENT_STATUS.PENDING;
  }

  hasLowConfidence(): boolean {
    if (!this.extractedData?.confidence) return false;
    const scores = Object.values(this.extractedData.confidence);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return avg < 0.7;
  }

  // ─── Immutable state transitions ───────────────────────────────────────────
  withStatus(status: DocumentStatus): DocumentEntity {
    return new DocumentEntity({ ...this.toProps(), status, updatedAt: new Date() });
  }

  withExtractedData(data: ExtractedDocumentData): DocumentEntity {
    return new DocumentEntity({
      ...this.toProps(),
      extractedData: data,
      status: DOCUMENT_STATUS.EXTRACTED,
      updatedAt: new Date(),
    });
  }

  withError(error: string): DocumentEntity {
    return new DocumentEntity({
      ...this.toProps(),
      extractionError: error,
      status: DOCUMENT_STATUS.FAILED,
      updatedAt: new Date(),
    });
  }

  private toProps(): CreateDocumentProps {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      type: this.type,
      originalFilename: this.originalFilename,
      objectKey: this.objectKey,
      mimeType: this.mimeType,
      sizeBytes: this.sizeBytes,
      status: this.status,
      extractedData: this.extractedData,
      extractionError: this.extractionError,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
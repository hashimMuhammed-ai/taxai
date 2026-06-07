import { BaseEntity } from './base.entity';

export interface GstBreakdown {
  baseAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  utgst: number;
  totalGst: number;
  totalAmount: number;
  isInterState: boolean;  // true = IGST, false = CGST+SGST
}

export interface CreateGstRecordProps {
  id: string;
  tenantId: string;
  userId: string;
  invoiceNumber: string;
  vendorName: string;
  vendorGstin?: string;
  buyerGstin?: string;
  invoiceDate: Date;
  invoiceAmount: number;
  gstRate: number;           // e.g. 18 for 18%
  gstBreakdown: GstBreakdown;
  sourceDocumentId?: string; // Link back to the uploaded invoice document
  vendorState?: string;      // 2-letter state code
  buyerState?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GstRecordEntity extends BaseEntity {
  readonly userId: string;
  readonly invoiceNumber: string;
  readonly vendorName: string;
  readonly vendorGstin?: string;
  readonly buyerGstin?: string;
  readonly invoiceDate: Date;
  readonly invoiceAmount: number;
  readonly gstRate: number;
  readonly gstBreakdown: GstBreakdown;
  readonly sourceDocumentId?: string;
  readonly vendorState?: string;
  readonly buyerState?: string;
  readonly description?: string;

  private constructor(props: CreateGstRecordProps) {
    super({
      id: props.id,
      tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.userId = props.userId;
    this.invoiceNumber = props.invoiceNumber;
    this.vendorName = props.vendorName;
    this.vendorGstin = props.vendorGstin;
    this.buyerGstin = props.buyerGstin;
    this.invoiceDate = props.invoiceDate;
    this.invoiceAmount = props.invoiceAmount;
    this.gstRate = props.gstRate;
    this.gstBreakdown = props.gstBreakdown;
    this.sourceDocumentId = props.sourceDocumentId;
    this.vendorState = props.vendorState;
    this.buyerState = props.buyerState;
    this.description = props.description;
  }

  static create(props: CreateGstRecordProps): GstRecordEntity {
    return new GstRecordEntity(props);
  }
}
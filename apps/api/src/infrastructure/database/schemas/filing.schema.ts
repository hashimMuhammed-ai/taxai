import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FILING_STATUS } from '@taxai/shared';

export type FilingDocument = HydratedDocument<FilingSchemaClass>;

@Schema({ collection: 'filings', timestamps: true })
export class FilingSchemaClass {
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) assessmentYear!: string;
  @Prop({ required: true }) taxRecordId!: string;
  @Prop({ required: true, enum: ['old', 'new'] }) selectedRegime!: string;
  @Prop({ required: true, enum: Object.values(FILING_STATUS), default: FILING_STATUS.DRAFT, index: true })
  status!: string;
  @Prop() assignedCaId?: string;
  @Prop({ type: [Object], default: [] }) notes!: Record<string, any>[];
  @Prop() rejectionReason?: string;
  @Prop() approvedAt?: Date;
  @Prop() reportObjectKey?: string;
}

export const FilingSchema = SchemaFactory.createForClass(FilingSchemaClass);
FilingSchema.index({ tenantId: 1, userId: 1 });
FilingSchema.index({ tenantId: 1, assignedCaId: 1, status: 1 });
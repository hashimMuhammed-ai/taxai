import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GstRecordDocument = HydratedDocument<GstRecordSchemaClass>;

@Schema({ collection: 'gst_records', timestamps: true })
export class GstRecordSchemaClass {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  vendorName!: string;

  @Prop()
  vendorGstin?: string;

  @Prop()
  buyerGstin?: string;

  @Prop({ required: true })
  invoiceDate!: Date;

  @Prop({ required: true })
  invoiceAmount!: number;

  @Prop({ required: true })
  gstRate!: number;

  @Prop({ required: true, type: Object })
  gstBreakdown!: Record<string, any>;

  @Prop()
  sourceDocumentId?: string;

  @Prop()
  vendorState?: string;

  @Prop()
  buyerState?: string;

  @Prop()
  description?: string;
}

export const GstRecordSchema = SchemaFactory.createForClass(GstRecordSchemaClass);
GstRecordSchema.index({ tenantId: 1, userId: 1 });
GstRecordSchema.index({ tenantId: 1, invoiceNumber: 1 });
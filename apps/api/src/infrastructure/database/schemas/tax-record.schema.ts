import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaxRecordDocument = HydratedDocument<TaxRecordSchemaClass>;

@Schema({ collection: 'tax_records', timestamps: true })
export class TaxRecordSchemaClass {
  @Prop({ required: true, index: true })
  userId!: string;
 
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  assessmentYear!: string;

  @Prop({ type: [String], default: [] })
  sourceDocumentIds?: string[];

  @Prop({ required: true, type: Object })
  oldRegimeResult!: Record<string, any>;

  @Prop({ required: true, type: Object })
  newRegimeResult!: Record<string, any>;

  @Prop({ required: true, enum: ['old', 'new'] })
  recommendedRegime!: string;

  @Prop({ required: true })
  taxSavingBySwitch!: number;

  @Prop({ type: [Object], default: [] })
  deductionSuggestions?: Record<string, any>[];

  @Prop({ required: true, min: 0, max: 100 })
  filingReadinessScore!: number;

  @Prop({ type: [String], default: [] })
  missingDocuments?: string[];
}

export const TaxRecordSchema = SchemaFactory.createForClass(TaxRecordSchemaClass);
TaxRecordSchema.index({ tenantId: 1, userId: 1, assessmentYear: 1 });
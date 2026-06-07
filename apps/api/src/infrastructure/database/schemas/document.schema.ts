import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DOCUMENT_TYPE, DOCUMENT_STATUS } from '@taxai/shared';

export type DocumentDocument = HydratedDocument<DocumentSchemaClass>;

@Schema({ collection: 'documents', timestamps: true })
export class DocumentSchemaClass {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, enum: Object.values(DOCUMENT_TYPE) })
  type!: string;

  @Prop({ required: true })
  originalFilename!: string;

  @Prop({ required: true })
  objectKey!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;

  @Prop({ required: true, enum: Object.values(DOCUMENT_STATUS), default: DOCUMENT_STATUS.PENDING, index: true })
  status!: string;

  @Prop({ type: Object })
  extractedData?: Record<string, any>;

  @Prop()
  extractionError?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentSchemaClass);
DocumentSchema.index({ tenantId: 1, userId: 1 });
DocumentSchema.index({ tenantId: 1, status: 1 });
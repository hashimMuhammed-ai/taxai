import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLogSchemaClass>;

@Schema({
  collection: 'audit_logs',
  // No timestamps — occurredAt is explicit and immutable
  // No update hooks — this collection is append-only
})
export class AuditLogSchemaClass {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true, index: true }) action!: string;
  @Prop({ required: true }) resourceType!: string;
  @Prop({ required: true, index: true }) resourceId!: string;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
  @Prop({ required: true, index: true }) occurredAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogSchemaClass);
AuditLogSchema.index({ tenantId: 1, userId: 1, occurredAt: -1 });
AuditLogSchema.index({ tenantId: 1, resourceId: 1 });
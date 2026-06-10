import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationSchemaClass>;

@Schema({ collection: 'notifications', timestamps: true })
export class NotificationSchemaClass {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true }) type!: string;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) message!: string;
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
  @Prop({ default: false, index: true }) isRead!: boolean;
  @Prop({ default: false }) emailSent!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationSchemaClass);
NotificationSchema.index({ tenantId: 1, userId: 1, isRead: 1, createdAt: -1 });
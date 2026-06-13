import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<TenantSchemaClass>;

@Schema({
  collection: 'tenants',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TenantSchemaClass {
  @Prop({ type: String }) // Plain string UUID
  _id!: string;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  inviteCode!: string;
}

export const TenantSchema = SchemaFactory.createForClass(TenantSchemaClass);

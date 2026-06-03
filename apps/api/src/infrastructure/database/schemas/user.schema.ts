import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserStatus } from '@taxai/shared';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({
  collection: 'users',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserSchemaClass {
  @Prop({ type: String }) // ✅ tell Mongoose _id is a plain string (UUID)
  _id!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.USER })
  role!: UserRole;

  @Prop({ required: true, enum: Object.values(UserStatus), default: UserStatus.ACTIVE, index: true })
  status!: UserStatus;

  @Prop({ trim: true })
  phone?: string;

  @Prop()
  lastLoginAt?: Date;

  // select: false — NEVER returned unless explicitly requested with .select('+refreshTokenHash')
  @Prop({ select: false, type: String, default: null })
  refreshTokenHash?: string | null;

  // Every document must belong to a tenant
  @Prop({ required: true, index: true })
  tenantId!: string;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);

// Compound indexes for common query patterns
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, status: 1 });
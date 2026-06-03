import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { UserDocument, UserSchemaClass } from '../schemas/user.schema';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly model: Model<UserDocument>,
  ) {}

  async findById(id: string, tenantId: string): Promise<UserEntity | null> {
    const doc = await this.model.findOne({ _id: id, tenantId }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase()}).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.model.exists({ email: email.toLowerCase() }).then(Boolean);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const created = await this.model.create({
      _id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      tenantId: user.tenantId,
    });
    return this.toEntity(created.toObject());
  }

  async updateRefreshToken(userId: string, hash: string | null): Promise<void> {
    await this.model.updateOne({ _id: userId }, { $set: { refreshTokenHash: hash } }).exec();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.model.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } }).exec();
  }

  // ─── Anti-Corruption Layer ───────────────────────────────────────────────
  // The rest of the app NEVER sees a Mongoose document — only domain entities
  private toEntity(doc: any): UserEntity {
    return UserEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      email: doc.email,
      passwordHash: doc.passwordHash,
      firstName: doc.firstName,
      lastName: doc.lastName,
      role: doc.role as UserRole,
      status: doc.status as UserStatus,
      phone: doc.phone,
      lastLoginAt: doc.lastLoginAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      refreshTokenHash: doc.refreshTokenHash,
    });
  }
}
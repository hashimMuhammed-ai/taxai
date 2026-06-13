import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITenantRepository } from '../../../domain/repositories/tenant.repository.interface';
import { TenantEntity } from '../../../domain/entities/tenant.entity';
import { TenantDocument, TenantSchemaClass } from '../schemas/tenant.schema';

@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(
    @InjectModel(TenantSchemaClass.name)
    private readonly model: Model<TenantDocument>,
  ) {}

  async findById(id: string): Promise<TenantEntity | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByInviteCode(inviteCode: string): Promise<TenantEntity | null> {
    const doc = await this.model.findOne({ inviteCode: inviteCode.trim().toUpperCase() }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async save(tenant: TenantEntity): Promise<TenantEntity> {
    const created = await this.model.create({
      _id: tenant.id,
      tenantId: tenant.id,
      name: tenant.name,
      inviteCode: tenant.inviteCode,
    });
    return this.toEntity(created.toObject());
  }

  private toEntity(doc: any): TenantEntity {
    return TenantEntity.create({
      id: doc._id.toString(),
      name: doc.name,
      inviteCode: doc.inviteCode,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}

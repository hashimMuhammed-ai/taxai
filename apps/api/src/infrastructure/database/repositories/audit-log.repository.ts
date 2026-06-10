import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAuditLogRepository } from '../../../domain/repositories/audit-log.repository.interface';
import { AuditLogEntity } from '../../../domain/entities/audit-log.entity';
import { AuditLogDocument, AuditLogSchemaClass } from '../schemas/audit-log.schema';
import { AuditAction } from '@taxai/shared';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectModel(AuditLogSchemaClass.name)
    private readonly model: Model<AuditLogDocument>,
  ) {}

  // Only operation allowed is inserting a new record — never update, never delete
  async append(log: AuditLogEntity): Promise<void> {
    await this.model.create({
      _id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      occurredAt: log.occurredAt,
    });
  }

  async findByResource(resourceId: string, tenantId: string): Promise<AuditLogEntity[]> {
    const docs = await this.model.find({ resourceId, tenantId }).sort({ occurredAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByUser(userId: string, tenantId: string, limit = 50): Promise<AuditLogEntity[]> {
    const docs = await this.model.find({ userId, tenantId }).sort({ occurredAt: -1 }).limit(limit).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: any): AuditLogEntity {
    return new AuditLogEntity({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      action: doc.action as AuditAction,
      resourceType: doc.resourceType,
      resourceId: doc.resourceId,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      metadata: doc.metadata,
      occurredAt: doc.occurredAt,
    });
  }
}
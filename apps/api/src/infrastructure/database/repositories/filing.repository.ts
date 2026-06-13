import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IFilingRepository } from '../../../domain/repositories/filing.repository.interface';
import { FilingEntity, FilingNote } from '../../../domain/entities/filing.entity';
import { FilingDocument, FilingSchemaClass } from '../schemas/filing.schema';
import { FilingStatus, TaxRegime } from '@taxai/shared';

@Injectable()
export class FilingRepository implements IFilingRepository {
  constructor(
    @InjectModel(FilingSchemaClass.name)
    private readonly model: Model<FilingDocument>,
  ) {}

  async findById(id: string, tenantId?: string): Promise<FilingEntity | null> {
    const filter: any = { _id: id };
    if (tenantId) filter.tenantId = tenantId;
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string, tenantId: string): Promise<FilingEntity[]> {
    const docs = await this.model.find({ userId, tenantId }).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByCaId(caId: string, tenantId?: string): Promise<FilingEntity[]> {
    const filter: any = { assignedCaId: caId };
    if (tenantId) filter.tenantId = tenantId;
    const docs = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findByStatus(status: FilingStatus, tenantId: string): Promise<FilingEntity[]> {
    const docs = await this.model.find({ status, tenantId }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async save(filing: FilingEntity): Promise<FilingEntity> {
    const created = await this.model.create({
      _id: filing.id,
      tenantId: filing.tenantId,
      userId: filing.userId,
      assessmentYear: filing.assessmentYear,
      taxRecordId: filing.taxRecordId,
      selectedRegime: filing.selectedRegime,
      status: filing.status,
      assignedCaId: filing.assignedCaId,
      notes: filing.notes,
      rejectionReason: filing.rejectionReason,
      approvedAt: filing.approvedAt,
      reportObjectKey: filing.reportObjectKey,
    });
    return this.toEntity(created.toObject());
  }

  async update(filing: FilingEntity): Promise<FilingEntity> {
    const updated = await this.model.findOneAndUpdate(
      { _id: filing.id, tenantId: filing.tenantId },
      {
        $set: {
          status: filing.status,
          assignedCaId: filing.assignedCaId,
          notes: filing.notes,
          rejectionReason: filing.rejectionReason,
          approvedAt: filing.approvedAt,
          reportObjectKey: filing.reportObjectKey,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean().exec();
    return this.toEntity(updated);
  }

  private toEntity(doc: any): FilingEntity {
    return FilingEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      assessmentYear: doc.assessmentYear,
      taxRecordId: doc.taxRecordId,
      selectedRegime: doc.selectedRegime as TaxRegime,
      status: doc.status as FilingStatus,
      assignedCaId: doc.assignedCaId,
      notes: (doc.notes ?? []) as FilingNote[],
      rejectionReason: doc.rejectionReason,
      approvedAt: doc.approvedAt,
      reportObjectKey: doc.reportObjectKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
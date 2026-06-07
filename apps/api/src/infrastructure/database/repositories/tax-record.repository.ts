import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITaxRecordRepository } from '../../../domain/repositories/tax-record.repository.interface';
import { TaxRecordEntity } from '../../../domain/entities/tax-record.entity';
import { TaxRecordDocument, TaxRecordSchemaClass } from '../schemas/tax-record.schema';
import { TaxRegime } from '@taxai/shared';

@Injectable()
export class TaxRecordRepository implements ITaxRecordRepository {
  constructor(
    @InjectModel(TaxRecordSchemaClass.name)
    private readonly model: Model<TaxRecordDocument>,
  ) {}

  async findById(id: string, tenantId: string): Promise<TaxRecordEntity | null> {
    const doc = await this.model.findOne({ _id: id, tenantId }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string, tenantId: string, assessmentYear?: string): Promise<TaxRecordEntity[]> {
    const filter: any = { userId, tenantId };
    if (assessmentYear) filter.assessmentYear = assessmentYear;
    const docs = await this.model.find(filter).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findLatestByUser(userId: string, tenantId: string): Promise<TaxRecordEntity | null> {
    const doc = await this.model.findOne({ userId, tenantId }).sort({ createdAt: -1 }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async save(record: TaxRecordEntity): Promise<TaxRecordEntity> {
    const created = await this.model.create({
      _id: record.id,
      userId: record.userId,
      tenantId: record.tenantId,
      assessmentYear: record.assessmentYear,
      sourceDocumentIds: record.sourceDocumentIds,
      oldRegimeResult: record.oldRegimeResult,
      newRegimeResult: record.newRegimeResult,
      recommendedRegime: record.recommendedRegime,
      taxSavingBySwitch: record.taxSavingBySwitch,
      deductionSuggestions: record.deductionSuggestions,
      filingReadinessScore: record.filingReadinessScore,
      missingDocuments: record.missingDocuments,
    });
    return this.toEntity(created.toObject());
  }

  private toEntity(doc: any): TaxRecordEntity {
    return TaxRecordEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      assessmentYear: doc.assessmentYear,
      sourceDocumentIds: doc.sourceDocumentIds,
      oldRegimeResult: doc.oldRegimeResult,
      newRegimeResult: doc.newRegimeResult,
      recommendedRegime: doc.recommendedRegime as TaxRegime,
      taxSavingBySwitch: doc.taxSavingBySwitch,
      deductionSuggestions: doc.deductionSuggestions,
      filingReadinessScore: doc.filingReadinessScore,
      missingDocuments: doc.missingDocuments,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
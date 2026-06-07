import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IGstRecordRepository } from '../../../domain/repositories/gst-record.repository.interface';
import { GstRecordEntity } from '../../../domain/entities/gst-record.entity';
import { GstRecordDocument, GstRecordSchemaClass } from '../schemas/gst-record.schema';

@Injectable()
export class GstRecordRepository implements IGstRecordRepository {
  constructor(
    @InjectModel(GstRecordSchemaClass.name)
    private readonly model: Model<GstRecordDocument>,
  ) {}

  async findById(id: string, tenantId: string): Promise<GstRecordEntity | null> {
    const doc = await this.model.findOne({ _id: id, tenantId }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string, tenantId: string): Promise<GstRecordEntity[]> {
    const docs = await this.model.find({ userId, tenantId }).sort({ invoiceDate: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async save(record: GstRecordEntity): Promise<GstRecordEntity> {
    const created = await this.model.create({
      _id: record.id,
      userId: record.userId,
      tenantId: record.tenantId,
      invoiceNumber: record.invoiceNumber,
      vendorName: record.vendorName,
      vendorGstin: record.vendorGstin,
      buyerGstin: record.buyerGstin,
      invoiceDate: record.invoiceDate,
      invoiceAmount: record.invoiceAmount,
      gstRate: record.gstRate,
      gstBreakdown: record.gstBreakdown,
      sourceDocumentId: record.sourceDocumentId,
      vendorState: record.vendorState,
      buyerState: record.buyerState,
      description: record.description,
    });
    return this.toEntity(created.toObject());
  }

  async getTotalGstByUser(userId: string, tenantId: string): Promise<{ totalTaxable: number; totalGst: number }> {
    const result = await this.model.aggregate([
      { $match: { userId, tenantId } },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$invoiceAmount' },
          totalGst: { $sum: '$gstBreakdown.totalGst' },
        },
      },
    ]).exec();

    return result[0] ?? { totalTaxable: 0, totalGst: 0 };
  }

  private toEntity(doc: any): GstRecordEntity {
    return GstRecordEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      invoiceNumber: doc.invoiceNumber,
      vendorName: doc.vendorName,
      vendorGstin: doc.vendorGstin,
      buyerGstin: doc.buyerGstin,
      invoiceDate: doc.invoiceDate,
      invoiceAmount: doc.invoiceAmount,
      gstRate: doc.gstRate,
      gstBreakdown: doc.gstBreakdown,
      sourceDocumentId: doc.sourceDocumentId,
      vendorState: doc.vendorState,
      buyerState: doc.buyerState,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
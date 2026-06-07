import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDocumentRepository } from '../../../domain/repositories/document.repository.interface';
import { DocumentEntity, DocumentType, DocumentStatus } from '../../../domain/entities/document.entity';
import { DocumentDocument, DocumentSchemaClass } from '../schemas/document.schema';
import { DOCUMENT_STATUS } from '@taxai/shared';

@Injectable()
export class DocumentRepository implements IDocumentRepository {
  constructor(
    @InjectModel(DocumentSchemaClass.name)
    private readonly model: Model<DocumentDocument>,
  ) {}

  async findById(id: string, tenantId: string): Promise<DocumentEntity | null> {
    const doc = await this.model.findOne({ _id: id, tenantId }).lean().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string, tenantId: string): Promise<DocumentEntity[]> {
    const docs = await this.model.find({ userId, tenantId }).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async save(doc: DocumentEntity): Promise<DocumentEntity> {
    const created = await this.model.create({
      _id: doc.id,
      userId: doc.userId,
      tenantId: doc.tenantId,
      type: doc.type,
      originalFilename: doc.originalFilename,
      objectKey: doc.objectKey,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
    });
    return this.toEntity(created.toObject());
  }

  async updateStatus(id: string, status: DocumentStatus, tenantId: string): Promise<void> {
    await this.model.updateOne({ _id: id, tenantId }, { $set: { status } }).exec();
  }

  async updateExtractedData(id: string, data: any, tenantId: string): Promise<void> {
    await this.model.updateOne(
      { _id: id, tenantId },
      { $set: { extractedData: data, status: DOCUMENT_STATUS.EXTRACTED } },
    ).exec();
  }

  async updateError(id: string, error: string, tenantId: string): Promise<void> {
    await this.model.updateOne(
      { _id: id, tenantId },
      { $set: { extractionError: error, status: DOCUMENT_STATUS.FAILED } },
    ).exec();
  }

  private toEntity(doc: any): DocumentEntity {
    return DocumentEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      type: doc.type as DocumentType,
      originalFilename: doc.originalFilename,
      objectKey: doc.objectKey,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status as DocumentStatus,
      extractedData: doc.extractedData,
      extractionError: doc.extractionError,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
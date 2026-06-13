import { DocumentEntity } from '../entities/document.entity';
import { DocumentStatus } from '@taxai/shared';

export const DOCUMENT_REPOSITORY = Symbol('IDocumentRepository');

export interface IDocumentRepository {
  findById(id: string, tenantId?: string): Promise<DocumentEntity | null>;
  findByUserId(userId: string, tenantId: string): Promise<DocumentEntity[]>;
  save(doc: DocumentEntity): Promise<DocumentEntity>;
  updateStatus(id: string, status: DocumentStatus, tenantId: string): Promise<void>;
  updateExtractedData(id: string, data: any, tenantId: string): Promise<void>;
  updateError(id: string, error: string, tenantId: string): Promise<void>;
}
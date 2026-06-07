import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InitiateDocumentUploadCommand } from '../commands/document.commands';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../../domain/repositories/document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/document.entity';
import { DocumentUploadedEvent } from '../../../domain/events/document-tax.events';
import { StorageService } from '../../../infrastructure/storage/storage.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface InitiateUploadResult {
  documentId: string;
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

@CommandHandler(InitiateDocumentUploadCommand)
export class InitiateDocumentUploadHandler
  implements ICommandHandler<InitiateDocumentUploadCommand, InitiateUploadResult>
{
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
    private readonly storage: StorageService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: InitiateDocumentUploadCommand): Promise<InitiateUploadResult> {
    // ── 1. Validate ───────────────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(cmd.mimeType)) {
      throw new Error(`Unsupported file type: ${cmd.mimeType}. Allowed: PDF, JPEG, PNG, WEBP`);
    }
    if (cmd.sizeBytes > MAX_SIZE_BYTES) {
      throw new Error(`File too large: ${cmd.sizeBytes} bytes. Maximum: ${MAX_SIZE_BYTES} bytes (20 MB)`);
    }

    // ── 2. Build object key / storage path ───────────────────────────────────────────────────
    const objectKey = this.storage.buildObjectKey({
      tenantId: cmd.tenantId,
      userId: cmd.userId,
      category: cmd.documentType === 'invoice' ? 'invoices' : 'tax-documents',
      filename: cmd.filename,
    });

    // ── 3. Create document record in DB (status: pending) ─────────────────────
    const documentId = uuidv4();
    const document = DocumentEntity.create({
      id: documentId,
      tenantId: cmd.tenantId,
      userId: cmd.userId,
      type: cmd.documentType,
      originalFilename: cmd.filename,
      objectKey,
      mimeType: cmd.mimeType,
      sizeBytes: cmd.sizeBytes,
    });

    await this.docRepo.save(document);

    // ── 4. Generate R2 pre-signed upload URL ──────────────────────────────────
    const { uploadUrl, expiresInSeconds } = await this.storage.getPresignedUploadUrl({
      objectKey,
      contentType: cmd.mimeType,
      expiresInSeconds: 300, // 5 minutes to upload
    });

    // ── 5. Publish event (worker will start processing when upload is confirmed) ─
    this.eventBus.publish(
      new DocumentUploadedEvent(documentId, cmd.userId, cmd.tenantId, cmd.documentType, objectKey, cmd.mimeType),
    );

    return { documentId, uploadUrl, objectKey, expiresInSeconds };
  }
}
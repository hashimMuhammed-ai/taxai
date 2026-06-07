import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfirmDocumentUploadCommand } from '../commands/document.commands';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../../domain/repositories/document.repository.interface';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { ResourceNotFoundException } from '@taxai/shared';
import { QUEUES, JOBS, DOCUMENT_STATUS } from '@taxai/shared';

@CommandHandler(ConfirmDocumentUploadCommand)
export class ConfirmDocumentUploadHandler
  implements ICommandHandler<ConfirmDocumentUploadCommand, { queued: boolean }>
{
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
    @InjectQueue(QUEUES.DOCUMENT_PROCESSING) private readonly docQueue: Queue,
    private readonly storage: StorageService,
  ) {}

  async execute(cmd: ConfirmDocumentUploadCommand): Promise<{ queued: boolean }> {
    // ── 1. Fetch document record ───────────────────────────────────────────────
    const document = await this.docRepo.findById(cmd.documentId, cmd.tenantId);
    if (!document || document.userId !== cmd.userId) {
      throw new ResourceNotFoundException('Document', cmd.documentId);
    }

    // ── 2. Verify file physically exists in R2 ────────────────────────────────
    const exists = await this.storage.fileExists(document.objectKey);
    if (!exists) {
      throw new Error('File not found in storage. Please re-upload.');
    }

    // ── 3. Update status to processing ────────────────────────────────────────
    await this.docRepo.updateStatus(cmd.documentId, DOCUMENT_STATUS.PROCESSING, cmd.tenantId);

    // ── 4. Enqueue OCR + extraction job ───────────────────────────────────────
    await this.docQueue.add(
      JOBS.DOCUMENT_PROCESSING.PROCESS_DOCUMENT,
      {
        documentId: cmd.documentId,
        objectKey: document.objectKey,
        mimeType: document.mimeType,
        documentType: document.type,
        userId: cmd.userId,
        tenantId: cmd.tenantId,
      },
      {
        priority: document.type === 'form_16' ? 1 : 2, // Form 16 gets higher priority
        jobId: `doc-${cmd.documentId}`,               // Idempotent — safe to re-confirm
      },
    );

    return { queued: true };
  }
}
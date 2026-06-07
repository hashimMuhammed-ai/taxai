import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { QUEUES, JOBS, DOCUMENT_STATUS } from '@taxai/shared';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../../api/src/domain/repositories/document.repository.interface';
import { AppConfigService } from '../../../api/src/infrastructure/config/app-config.service';
import { AiExtractionService } from '../services/ai-extraction.service';

export interface ProcessDocumentJobData {
  documentId: string;
  objectKey: string;
  mimeType: string;
  documentType: string;
  userId: string;
  tenantId: string;
}

@Processor(QUEUES.DOCUMENT_PROCESSING, {
  concurrency: 3,               // Process 3 documents in parallel max
})
export class DocumentProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingWorker.name);
  private readonly r2: S3Client;

  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
    private readonly config: AppConfigService,
    private readonly aiExtraction: AiExtractionService,
  ) {
    super();
    this.r2 = new S3Client({
      region: 'auto',
      endpoint: config.r2Endpoint,
      credentials: {
        accessKeyId: config.r2AccessKey,
        secretAccessKey: config.r2SecretKey,
      },
    });
  }

  async process(job: Job<ProcessDocumentJobData>): Promise<void> {
    const { documentId, objectKey, mimeType, documentType, tenantId } = job.data;
    this.logger.log(`[Job ${job.id}] Processing ${documentType} document: ${documentId}`);

    try {
      // ── Step 1: Download from R2 ────────────────────────────────────────────
      await job.updateProgress(10);
      const fileBuffer = await this.downloadFromR2(objectKey);
      this.logger.debug(`[Job ${job.id}] Downloaded ${fileBuffer.length} bytes from R2`);

      // ── Step 2: Extract raw text (OCR / pdf-parse) ──────────────────────────
      await job.updateProgress(30);
      const rawText = await this.extractRawText(fileBuffer, mimeType);
      this.logger.debug(`[Job ${job.id}] Extracted ${rawText.length} chars of raw text`);

      // ── Step 3: AI structured extraction ───────────────────────────────────
      await job.updateProgress(60);
      const extractedData = await this.aiExtraction.extract(rawText, documentType);

      // ── Step 4: Confidence check — flag low-confidence for manual review ────
      await job.updateProgress(80);
      const avgConfidence = this.calculateAvgConfidence(extractedData.confidence);
      this.logger.log(`[Job ${job.id}] Extraction confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      // ── Step 5: Persist ─────────────────────────────────────────────────────
      await this.docRepo.updateExtractedData(documentId, extractedData, tenantId);
      await job.updateProgress(100);

      this.logger.log(`[Job ${job.id}] ✅ Document ${documentId} extracted successfully`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Job ${job.id}] ❌ Document ${documentId} failed: ${message}`);
      await this.docRepo.updateError(documentId, message, tenantId);
      throw error; // BullMQ will retry per the job backoff config
    }
  }

  // ─── Download file bytes from Cloudflare R2 ─────────────────────────────────
  private async downloadFromR2(objectKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.config.r2Bucket,
      Key: objectKey,
    });
    const response = await this.r2.send(command);
    if (!response.Body) throw new Error(`Empty response body for key: ${objectKey}`);

    // Stream → Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // ─── Raw text extraction — pdf-parse for PDFs, Tesseract for images ─────────
  private async extractRawText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return result.text as string;
    }

    // Images: jpeg, png, webp → Tesseract OCR
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    try {
      const { data: { text } } = await worker.recognize(buffer);
      return text as string;
    } finally {
      await worker.terminate();
    }
  }

  private calculateAvgConfidence(confidence: Record<string, number>): number {
    const values = Object.values(confidence);
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }
}

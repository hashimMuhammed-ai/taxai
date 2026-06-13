import { Injectable, Inject } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AppConfigService } from '../config/app-config.service';

export interface PresignedUploadResult {
  uploadUrl: string;   // Browser PUTs directly to this — API never handles bytes
  objectKey: string;   // Store this in MongoDB
  publicUrl?: string;  // Optional public URL after upload completes
  expiresInSeconds: number;
}

export type DocumentCategory = 'tax-documents' | 'invoices' | 'reports' | 'bank-statements';

@Injectable()
export class StorageService {
  private readonly r2: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // R2 is S3-compatible — only endpoint and credentials differ
    this.r2 = new S3Client({
      region: 'auto',
      endpoint: config.r2Endpoint,
      credentials: {
        accessKeyId: config.r2AccessKey,
        secretAccessKey: config.r2SecretKey,
      },
    });
    this.bucket = config.r2Bucket;
  }

  /**
   * Generates a pre-signed URL so the browser uploads directly to R2.
   * The API never touches the file bytes — more efficient and cheaper.
   */
  async getPresignedUploadUrl(params: {
    objectKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedUploadResult> {
    const { objectKey, contentType, expiresInSeconds = 300 } = params;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.r2, command, { expiresIn: expiresInSeconds });

    this.logger.debug(`Generated presigned upload URL for ${objectKey}`, {
      context: 'StorageService',
      objectKey,
      expiresInSeconds,
    });

    const publicUrl = this.config.r2PublicUrl ? `${this.config.r2PublicUrl}/${objectKey}` : undefined;

    return {
      uploadUrl,
      objectKey,
      publicUrl,
      expiresInSeconds,
    };
  }

  /**
   * Generates a time-limited read URL for private documents.
   * Tax documents are NEVER stored with public access.
   */
  async getPresignedReadUrl(objectKey: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return getSignedUrl(this.r2, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(objectKey: string): Promise<void> {
    await this.r2.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    this.logger.info(`Deleted file: ${objectKey}`, { context: 'StorageService' });
  }

  async fileExists(objectKey: string): Promise<boolean> {
    try {
      await this.r2.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Builds a consistent, tenant-scoped object key.
   * Structure: {tenantId}/{userId}/{category}/{timestamp}_{filename}
   */
  buildObjectKey(params: {
    tenantId: string;
    userId: string;
    category: DocumentCategory;
    filename: string;
  }): string {
    const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    return `${params.tenantId}/${params.userId}/${params.category}/${Date.now()}_${safe}`;
  }
}
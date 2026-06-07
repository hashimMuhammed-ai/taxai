import { DocumentType } from '@taxai/shared';

export class InitiateDocumentUploadCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly documentType: DocumentType,
  ) {}
}

export class ConfirmDocumentUploadCommand {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}

export class DeleteDocumentCommand {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserDocumentsQuery, GetDocumentByIdQuery } from '../queries/document.queries';
import { IDocumentRepository, DOCUMENT_REPOSITORY } from '../../../domain/repositories/document.repository.interface';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { DocumentEntity } from '../../../domain/entities/document.entity';
import { ResourceNotFoundException, ForbiddenOperationException } from '@taxai/shared';
import { StorageService } from '../../../infrastructure/storage/storage.service';

@QueryHandler(GetUserDocumentsQuery)
export class GetUserDocumentsHandler
  implements IQueryHandler<GetUserDocumentsQuery, DocumentEntity[]>
{
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
  ) {}

  async execute(query: GetUserDocumentsQuery): Promise<DocumentEntity[]> {
    return this.docRepo.findByUserId(query.userId, query.tenantId);
  }
}

@QueryHandler(GetDocumentByIdQuery)
export class GetDocumentByIdHandler
  implements IQueryHandler<GetDocumentByIdQuery, { document: DocumentEntity; readUrl: string }>
{
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly docRepo: IDocumentRepository,
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(query: GetDocumentByIdQuery): Promise<{document: DocumentEntity; readUrl: string;}> {
    const document = await this.docRepo.findById(
      query.documentId,
      query.requesterRole === 'user' ? query.tenantId : undefined,
    );
    if (!document) {
      throw new ResourceNotFoundException('Document', query.documentId);
    }

    if (query.requesterRole === 'user') {
      if (document.userId !== query.userId) {
        throw new ForbiddenOperationException();
      }
    } else if (query.requesterRole === 'ca') {
      const filings = await this.filingRepo.findByCaId(query.userId);
      const hasAccess = filings.some(f => f.tenantId === document.tenantId);
      if (!hasAccess) {
        throw new ForbiddenOperationException();
      }
    } else {
      throw new ForbiddenOperationException();
    }

    // Generate a 15-minute pre-signed read URL — never expose the objectKey publicly
    const readUrl = await this.storage.getPresignedReadUrl(document.objectKey, 900);

    return { document, readUrl };
  }
}
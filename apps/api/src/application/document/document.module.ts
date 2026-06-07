import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { DocumentController } from '../../presentation/controllers/document.controller';
import { InitiateDocumentUploadHandler } from './handlers/initiate-upload.handler';
import { ConfirmDocumentUploadHandler } from './handlers/confirm-upload.handler';
import { GetUserDocumentsHandler, GetDocumentByIdHandler } from './handlers/document-query.handler';

const CommandHandlers = [InitiateDocumentUploadHandler, ConfirmDocumentUploadHandler];
const QueryHandlers = [GetUserDocumentsHandler, GetDocumentByIdHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, StorageModule, QueueModule],
  controllers: [DocumentController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class DocumentModule {}
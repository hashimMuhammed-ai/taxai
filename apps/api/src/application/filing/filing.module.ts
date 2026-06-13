import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { FilingController } from '../../presentation/controllers/filing.controller';
import { AuditLogService } from '../audit/audit-log.service';
import {
  CreateFilingHandler,
} from './handlers/create-filing.handler';
import {
  PrepareFilingHandler,
} from './handlers/prepare-filing.handler';
import {
  SubmitFilingForReviewHandler,
  ApproveFilingHandler,
  RejectFilingHandler,
  AddFilingNoteHandler,
  GetMyFilingsHandler,
  GetFilingByIdHandler,
  GetCaFilingsHandler,
  GetFilingAuditTrailHandler,
} from './handlers/filing.handlers';

const CommandHandlers = [
  CreateFilingHandler,
  PrepareFilingHandler,
  SubmitFilingForReviewHandler,
  ApproveFilingHandler,
  RejectFilingHandler,
  AddFilingNoteHandler,
];

const QueryHandlers = [
  GetMyFilingsHandler,
  GetFilingByIdHandler,
  GetCaFilingsHandler,
  GetFilingAuditTrailHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [FilingController],
  providers: [...CommandHandlers, ...QueryHandlers, AuditLogService],
  exports: [AuditLogService],
})
export class FilingModule {}
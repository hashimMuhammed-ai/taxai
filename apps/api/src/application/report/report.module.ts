import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { ReportController } from '../../presentation/controllers/report.controller';
import { GenerateTaxReportHandler, GetReportDownloadUrlHandler } from './handlers/report.handlers';
import { AuditLogService } from '../audit/audit-log.service';

@Module({
  imports: [CqrsModule, DatabaseModule, QueueModule, StorageModule],
  controllers: [ReportController],
  providers: [GenerateTaxReportHandler, GetReportDownloadUrlHandler, AuditLogService],
})
export class ReportModule {}
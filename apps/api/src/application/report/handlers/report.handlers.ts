import { CommandHandler, ICommandHandler, QueryHandler, IQueryHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerateTaxReportCommand, GetReportDownloadUrlQuery } from '../commands/report.commands';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { ReportGeneratedEvent } from '../../../domain/events/filing.events';
import { ResourceNotFoundException, AUDIT_ACTION, QUEUES, JOBS } from '@taxai/shared';

@CommandHandler(GenerateTaxReportCommand)
export class GenerateTaxReportHandler
  implements ICommandHandler<GenerateTaxReportCommand, { jobId: string; message: string }>
{
  constructor(
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
    @InjectQueue(QUEUES.REPORT_GENERATION) private readonly reportQueue: Queue,
    private readonly audit: AuditLogService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: GenerateTaxReportCommand): Promise<{ jobId: string; message: string }> {
    // Verify tax record exists and belongs to user
    const taxRecord = await this.taxRepo.findById(cmd.taxRecordId, cmd.tenantId);
    if (!taxRecord || taxRecord.userId !== cmd.userId) {
      throw new ResourceNotFoundException('TaxRecord', cmd.taxRecordId);
    }

    // Enqueue PDF generation job — async, does not block the request
    const job = await this.reportQueue.add(
      JOBS.REPORT_GENERATION.TAX_SUMMARY_PDF,
      {
        type: 'tax_summary',
        taxRecordId: cmd.taxRecordId,
        filingId: cmd.filingId,
        userId: cmd.userId,
        tenantId: cmd.tenantId,
        assessmentYear: cmd.assessmentYear,
      },
      {
        jobId: `report-${cmd.userId}-${cmd.assessmentYear}-${Date.now()}`,
        priority: 2,
      },
    );

    await this.audit.log({
      userId: cmd.userId,
      tenantId: cmd.tenantId,
      action: AUDIT_ACTION.REPORT_GENERATED,
      resourceType: 'TaxRecord',
      resourceId: cmd.taxRecordId,
      metadata: { assessmentYear: cmd.assessmentYear, jobId: job.id },
    });

    return {
      jobId: String(job.id),
      message: 'Report generation started. You will be notified when it is ready.',
    };
  }
}

@QueryHandler(GetReportDownloadUrlQuery)
export class GetReportDownloadUrlHandler
  implements IQueryHandler<GetReportDownloadUrlQuery, { downloadUrl: string; expiresIn: number }>
{
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(query: GetReportDownloadUrlQuery) {
    const filing = await this.filingRepo.findById(query.filingId, query.tenantId);
    if (!filing || filing.userId !== query.userId) {
      throw new ResourceNotFoundException('Filing', query.filingId);
    }
    if (!filing.reportObjectKey) {
      throw new Error('Report has not been generated yet for this filing. Please generate it first.');
    }

    // 30-minute pre-signed URL for download
    const downloadUrl = await this.storage.getPresignedReadUrl(filing.reportObjectKey, 1800);

    return { downloadUrl, expiresIn: 1800 };
  }
}
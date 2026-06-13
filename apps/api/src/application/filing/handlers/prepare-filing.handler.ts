import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, BadRequestException } from '@nestjs/common';
import { PrepareFilingCommand } from '../commands/filing.commands';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { FilingEntity } from '../../../domain/entities/filing.entity';
import { FilingStatusChangedEvent } from '../../../domain/events/filing.events';
import { AuditLogService } from '../../audit/audit-log.service';
import { ResourceNotFoundException, AUDIT_ACTION } from '@taxai/shared';

@CommandHandler(PrepareFilingCommand)
export class PrepareFilingHandler implements ICommandHandler<PrepareFilingCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogService,
  ) {}

  async execute(cmd: PrepareFilingCommand): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(cmd.filingId, cmd.tenantId);
    if (!filing || filing.userId !== cmd.userId) {
      throw new ResourceNotFoundException('Filing', cmd.filingId);
    }

    // Fetch all tax records for this user and assessment year
    const taxRecords = await this.taxRepo.findByUserId(filing.userId, filing.tenantId, filing.assessmentYear);
    const latestTaxRecord = taxRecords[0];
    if (!latestTaxRecord) {
      throw new BadRequestException('No tax record found for the assessment year.');
    }

    if (!latestTaxRecord.isFilingReady()) {
      throw new BadRequestException(
        `Tax record is not ready. Score: ${latestTaxRecord.filingReadinessScore}%, Missing documents: ${latestTaxRecord.missingDocuments.join(', ')}`,
      );
    }

    // Transition state to AI_PREPARED and update the referenced tax record ID
    const updated = filing.markAiPrepared(latestTaxRecord.id);
    const saved = await this.filingRepo.update(updated);

    await this.audit.log({
      userId: cmd.userId,
      tenantId: cmd.tenantId,
      action: AUDIT_ACTION.FILING_STATUS_CHANGED,
      resourceType: 'Filing',
      resourceId: cmd.filingId,
      metadata: { from: filing.status, to: saved.status, taxRecordId: latestTaxRecord.id },
    });

    this.eventBus.publish(
      new FilingStatusChangedEvent(saved.id, cmd.userId, cmd.tenantId, filing.status, saved.status, cmd.userId),
    );

    return saved;
  }
}

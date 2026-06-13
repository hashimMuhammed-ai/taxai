import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateFilingCommand } from '../commands/filing.commands';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { FilingEntity } from '../../../domain/entities/filing.entity';
import { FilingCreatedEvent } from '../../../domain/events/filing.events';
import { AuditLogService } from '../../audit/audit-log.service';
import { ResourceNotFoundException, AUDIT_ACTION } from '@taxai/shared';

@CommandHandler(CreateFilingCommand)
export class CreateFilingHandler implements ICommandHandler<CreateFilingCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogService,
  ) {}

  async execute(cmd: CreateFilingCommand): Promise<FilingEntity> {
    // ── 1. Verify tax record exists and belongs to user ─────────────────────
    const taxRecord = await this.taxRepo.findById(cmd.taxRecordId, cmd.tenantId);
    if (!taxRecord || taxRecord.userId !== cmd.userId) {
      throw new ResourceNotFoundException('TaxRecord', cmd.taxRecordId);
    }

    // ── 2. Create filing in DRAFT state ─────────────────────────────────────
    let filing = FilingEntity.create({
      id: uuidv4(),
      tenantId: cmd.tenantId,
      userId: cmd.userId,
      assessmentYear: cmd.assessmentYear,
      taxRecordId: cmd.taxRecordId,
      selectedRegime: cmd.selectedRegime,
    });

    if (taxRecord.isFilingReady()) {
      filing = filing.markAiPrepared();
    }

    const saved = await this.filingRepo.save(filing);

    // ── 3. Audit + event ─────────────────────────────────────────────────────
    await this.audit.log({
      userId: cmd.userId, tenantId: cmd.tenantId,
      action: AUDIT_ACTION.FILING_CREATED,
      resourceType: 'Filing', resourceId: saved.id,
      metadata: { assessmentYear: cmd.assessmentYear, regime: cmd.selectedRegime },
    });

    this.eventBus.publish(
      new FilingCreatedEvent(saved.id, cmd.userId, cmd.tenantId, cmd.assessmentYear),
    );

    return saved;
  }
}
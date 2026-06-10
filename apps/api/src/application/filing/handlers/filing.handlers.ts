import { CommandHandler, ICommandHandler, EventBus, QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  SubmitFilingForReviewCommand,
  ApproveFilingCommand,
  RejectFilingCommand,
  AddFilingNoteCommand,
  GetMyFilingsQuery,
  GetFilingByIdQuery,
  GetCaFilingsQuery,
  GetFilingAuditTrailQuery,
} from '../commands/filing.commands';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { FilingEntity } from '../../../domain/entities/filing.entity';
import { FilingStatusChangedEvent, FilingApprovedByCaEvent, FilingRejectedByCaEvent, CaAssignedToFilingEvent } from '../../../domain/events/filing.events';
import { AuditLogService } from '../../audit/audit-log.service';
import { ResourceNotFoundException, ForbiddenOperationException, AUDIT_ACTION } from '@taxai/shared';

// ─── Submit for CA Review ─────────────────────────────────────────────────────
@CommandHandler(SubmitFilingForReviewCommand)
export class SubmitFilingForReviewHandler implements ICommandHandler<SubmitFilingForReviewCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogService,
  ) {}

  async execute(cmd: SubmitFilingForReviewCommand): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(cmd.filingId, cmd.tenantId);
    if (!filing || filing.userId !== cmd.userId) throw new ResourceNotFoundException('Filing', cmd.filingId);

    const updated = filing.submitForCaReview(cmd.caId); // domain guard throws if invalid transition
    const saved = await this.filingRepo.update(updated);

    await this.audit.log({
      userId: cmd.userId, tenantId: cmd.tenantId,
      action: AUDIT_ACTION.FILING_STATUS_CHANGED, resourceType: 'Filing', resourceId: cmd.filingId,
      metadata: { from: filing.status, to: saved.status, assignedCaId: cmd.caId },
    });

    this.eventBus.publish(new FilingStatusChangedEvent(saved.id, cmd.userId, cmd.tenantId, filing.status, saved.status, cmd.userId));
    this.eventBus.publish(new CaAssignedToFilingEvent(saved.id, cmd.userId, cmd.caId, cmd.tenantId));

    return saved;
  }
}

// ─── CA Approve ───────────────────────────────────────────────────────────────
@CommandHandler(ApproveFilingCommand)
export class ApproveFilingHandler implements ICommandHandler<ApproveFilingCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogService,
  ) {}

  async execute(cmd: ApproveFilingCommand): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(cmd.filingId, cmd.tenantId);
    if (!filing) throw new ResourceNotFoundException('Filing', cmd.filingId);

    const updated = filing.approveByCA(cmd.caId, cmd.note); // throws if not assigned CA
    const saved = await this.filingRepo.update(updated);

    await this.audit.log({
      userId: cmd.caId, tenantId: cmd.tenantId,
      action: AUDIT_ACTION.CA_APPROVED, resourceType: 'Filing', resourceId: cmd.filingId,
    });

    this.eventBus.publish(new FilingApprovedByCaEvent(saved.id, saved.userId, cmd.tenantId, cmd.caId, saved.assessmentYear));

    return saved;
  }
}

// ─── CA Reject ────────────────────────────────────────────────────────────────
@CommandHandler(RejectFilingCommand)
export class RejectFilingHandler implements ICommandHandler<RejectFilingCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogService,
  ) {}

  async execute(cmd: RejectFilingCommand): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(cmd.filingId, cmd.tenantId);
    if (!filing) throw new ResourceNotFoundException('Filing', cmd.filingId);

    const updated = filing.rejectByCA(cmd.caId, cmd.reason);
    const saved = await this.filingRepo.update(updated);

    await this.audit.log({
      userId: cmd.caId, tenantId: cmd.tenantId,
      action: AUDIT_ACTION.CA_REJECTED, resourceType: 'Filing', resourceId: cmd.filingId,
      metadata: { reason: cmd.reason },
    });

    this.eventBus.publish(new FilingRejectedByCaEvent(saved.id, saved.userId, cmd.tenantId, cmd.caId, cmd.reason));

    return saved;
  }
}

// ─── Add Note ─────────────────────────────────────────────────────────────────
@CommandHandler(AddFilingNoteCommand)
export class AddFilingNoteHandler implements ICommandHandler<AddFilingNoteCommand, FilingEntity> {
  constructor(
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
  ) {}

  async execute(cmd: AddFilingNoteCommand): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(cmd.filingId, cmd.tenantId);
    if (!filing) throw new ResourceNotFoundException('Filing', cmd.filingId);
    const updated = filing.addNote(cmd.authorId, cmd.authorRole, cmd.content);
    return this.filingRepo.update(updated);
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────
@QueryHandler(GetMyFilingsQuery)
export class GetMyFilingsHandler implements IQueryHandler<GetMyFilingsQuery, FilingEntity[]> {
  constructor(@Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository) {}
  async execute(q: GetMyFilingsQuery) { return this.filingRepo.findByUserId(q.userId, q.tenantId); }
}

@QueryHandler(GetFilingByIdQuery)
export class GetFilingByIdHandler implements IQueryHandler<GetFilingByIdQuery, FilingEntity> {
  constructor(@Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository) {}
  async execute(q: GetFilingByIdQuery): Promise<FilingEntity> {
    const filing = await this.filingRepo.findById(q.filingId, q.tenantId);
    if (!filing) throw new ResourceNotFoundException('Filing', q.filingId);
    // CA can see any filing assigned to them; user can only see their own
    if (q.requesterRole === 'user' && filing.userId !== q.requesterId) throw new ForbiddenOperationException();
    if (q.requesterRole === 'ca' && !filing.isAssignedTo(q.requesterId)) throw new ForbiddenOperationException();
    return filing;
  }
}

@QueryHandler(GetCaFilingsQuery)
export class GetCaFilingsHandler implements IQueryHandler<GetCaFilingsQuery, FilingEntity[]> {
  constructor(@Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository) {}
  async execute(q: GetCaFilingsQuery) { return this.filingRepo.findByCaId(q.caId, q.tenantId); }
}

@QueryHandler(GetFilingAuditTrailQuery)
export class GetFilingAuditTrailHandler implements IQueryHandler<GetFilingAuditTrailQuery> {
  constructor(private readonly audit: AuditLogService) {}
  async execute(q: GetFilingAuditTrailQuery) { return this.audit.getResourceHistory(q.filingId, q.tenantId); }
}
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserRegisteredEvent, UserLoggedInEvent } from '../../domain/events/user.events';
import { DocumentExtractionCompletedEvent, DocumentExtractionFailedEvent, TaxCalculatedEvent } from '../../domain/events/document-tax.events';
import { FilingCreatedEvent, FilingApprovedByCaEvent, FilingRejectedByCaEvent, CaAssignedToFilingEvent } from '../../domain/events/filing.events';
import { QUEUES, JOBS } from '@taxai/shared';

@Injectable()
export class DomainEventListeners {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notifQueue: Queue,
  ) {}

  // ─── User Events ──────────────────────────────────────────────────────────
  @OnEvent(UserRegisteredEvent.name)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await this.notifQueue.add(JOBS.NOTIFICATIONS.WELCOME_EMAIL, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: event.email,
      type: 'document_uploaded',
      title: 'Welcome to TaxAI! 🎉',
      message: `Hi ${event.firstName},\n\nWelcome to TaxAI — your AI-powered Indian tax assistant.\n\nHere's how to get started:\n1. Upload your Form 16 from your employer\n2. Our AI will extract your salary and TDS details\n3. We'll calculate both old and new regime taxes instantly\n4. Get personalized deduction suggestions to save more tax\n\nLog in to your dashboard to get started.`,
    }, { priority: 1 });
  }

  // ─── Document Events ───────────────────────────────────────────────────────
  @OnEvent(DocumentExtractionCompletedEvent.name)
  async onExtractionCompleted(event: DocumentExtractionCompletedEvent): Promise<void> {
    const user = await this.userRepo.findById(event.userId, event.tenantId);
    if (!user) return;

    const title = event.hasLowConfidence
      ? '⚠️ Document extracted — please review'
      : '✅ Document extracted successfully';

    const message = event.hasLowConfidence
      ? 'Your document was processed but some fields have low confidence. Please review and correct the extracted data in your dashboard.'
      : 'Your document has been processed. The extracted data is ready for review. Go to your dashboard to calculate your taxes.';

    await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: user.email,
      type: 'extraction_complete',
      title,
      message,
    });
  }

  @OnEvent(DocumentExtractionFailedEvent.name)
  async onExtractionFailed(event: DocumentExtractionFailedEvent): Promise<void> {
    const user = await this.userRepo.findById(event.userId, event.tenantId);
    if (!user) return;

    await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: user.email,
      type: 'extraction_failed',
      title: '❌ Document processing failed',
      message: 'We were unable to process your document automatically. Please try uploading again, or contact support if the issue persists.',
    });
  }

  // ─── Tax Events ────────────────────────────────────────────────────────────
  @OnEvent(TaxCalculatedEvent.name)
  async onTaxCalculated(event: TaxCalculatedEvent): Promise<void> {
    const user = await this.userRepo.findById(event.userId, event.tenantId);
    if (!user) return;

    const taxFormatted = `₹${event.totalTax.toLocaleString('en-IN')}`;

    await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: user.email,
      type: 'tax_calculated',
      title: '📊 Your tax estimate is ready',
      message: `Your tax has been calculated for AY ${event.assessmentYear}.\n\nEstimated Tax: ${taxFormatted}\nRecommended Regime: ${event.recommendedRegime === 'new' ? 'New Regime' : 'Old Regime'}\n\nVisit your dashboard to see the full breakdown, deduction suggestions, and filing readiness score.`,
    });
  }

  // ─── Filing Events ─────────────────────────────────────────────────────────
  @OnEvent(CaAssignedToFilingEvent.name)
  async onCaAssigned(event: CaAssignedToFilingEvent): Promise<void> {
    const [user, ca] = await Promise.all([
      this.userRepo.findById(event.userId, event.tenantId),
      this.userRepo.findById(event.caId, event.tenantId),
    ]);

    if (user) {
      await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
        userId: event.userId,
        tenantId: event.tenantId,
        toEmail: user.email,
        type: 'ca_assigned',
        title: '👤 CA assigned to your filing',
        message: `A Chartered Accountant has been assigned to review your filing. They will review your documents and tax calculation. You'll be notified once the review is complete.`,
      });
    }

    if (ca) {
      await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
        userId: event.caId,
        tenantId: event.tenantId,
        toEmail: ca.email,
        type: 'ca_assigned',
        title: '📋 New filing assigned for review',
        message: `A new filing has been assigned to you for review. Please log in to your CA dashboard to review the documents and tax calculation.`,
      });
    }
  }

  @OnEvent(FilingApprovedByCaEvent.name)
  async onFilingApproved(event: FilingApprovedByCaEvent): Promise<void> {
    const user = await this.userRepo.findById(event.userId, event.tenantId);
    if (!user) return;

    await this.notifQueue.add(JOBS.NOTIFICATIONS.FILING_APPROVED, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: user.email,
      type: 'ca_approved',
      title: '✅ Filing approved by CA',
      message: `Your filing for AY ${event.assessmentYear} has been approved by your Chartered Accountant.\n\nYour filing is now ready for submission. Log in to your dashboard to download your tax summary PDF and proceed with filing.`,
    });
  }

  @OnEvent(FilingRejectedByCaEvent.name)
  async onFilingRejected(event: FilingRejectedByCaEvent): Promise<void> {
    const user = await this.userRepo.findById(event.userId, event.tenantId);
    if (!user) return;

    await this.notifQueue.add(JOBS.NOTIFICATIONS.SEND_EMAIL, {
      userId: event.userId,
      tenantId: event.tenantId,
      toEmail: user.email,
      type: 'ca_rejected',
      title: '⚠️ Filing returned by CA — action required',
      message: `Your CA has reviewed your filing and returned it with the following feedback:\n\n"${event.reason}"\n\nPlease address the feedback and resubmit your filing.`,
    });
  }
}
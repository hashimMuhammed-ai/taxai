import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { QUEUES, JOBS, NOTIFICATION_TYPE } from '@taxai/shared';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../../api/src/domain/repositories/notification.repository.interface';
import { NotificationEntity } from '../../../api/src/domain/entities/notification.entity';
import { AppConfigService } from '../../../api/src/infrastructure/config/app-config.service';
import { v4 as uuidv4 } from 'uuid';

export interface SendEmailJobData {
  userId: string;
  tenantId: string;
  toEmail: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Processor(QUEUES.NOTIFICATIONS, { concurrency: 5 })
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifRepo: INotificationRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async process(job: Job<SendEmailJobData>): Promise<void> {
    const { userId, tenantId, toEmail, type, title, message, metadata } = job.data;
    this.logger.log(`[Job ${job.id}] Sending notification: ${type} to ${toEmail}`);

    // ── 1. Save in-app notification ─────────────────────────────────────────
    const notification = NotificationEntity.create({
      id: uuidv4(),
      tenantId,
      userId,
      type: type as any,
      title,
      message,
      metadata,
    });
    await this.notifRepo.save(notification);

    // ── 2. Send email via Resend (free tier: 3k/month) ───────────────────────
    try {
      await this.sendEmail(toEmail, title, message);
      this.logger.log(`[Job ${job.id}] Email sent to ${toEmail}`);
    } catch (emailError) {
      // Email failure should NOT fail the entire job — in-app notification already saved
      this.logger.warn(`[Job ${job.id}] Email send failed (in-app notification saved): ${emailError}`);
    }
  }

  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const resendApiKey = this.config.resendApiKey;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TaxAI <noreply@taxai.in>',
        to,
        subject,
        html: this.buildEmailHtml(subject, text),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${err}`);
    }
  }

  private buildEmailHtml(title: string, message: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 32px; max-width: 560px; margin: 0 auto; }
  .logo { color: #2563eb; font-size: 24px; font-weight: 700; margin-bottom: 24px; }
  h2 { color: #111827; margin: 0 0 16px; }
  p { color: #4b5563; line-height: 1.6; }
  .footer { color: #9ca3af; font-size: 12px; margin-top: 32px; }
</style></head>
<body>
  <div class="card">
    <div class="logo">TaxAI</div>
    <h2>${title}</h2>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <div class="footer">
      This is an automated message from TaxAI. 
      If you have questions, visit your dashboard or contact support.
    </div>
  </div>
</body>
</html>`;
  }
}
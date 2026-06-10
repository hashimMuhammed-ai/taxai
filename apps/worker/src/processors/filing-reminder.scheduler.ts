import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS, REMINDER_TYPE } from '@taxai/shared';

// FY 2024-25 key deadlines
const FILING_DEADLINES = [
  {
    type: REMINDER_TYPE.ADVANCE_TAX_Q1,
    label: 'Advance Tax Q1 (15% of annual tax)',
    deadline: new Date('2024-06-15'),
    remindDaysBefore: [30, 15, 7, 1],
  },
  {
    type: REMINDER_TYPE.ADVANCE_TAX_Q2,
    label: 'Advance Tax Q2 (45% cumulative)',
    deadline: new Date('2024-09-15'),
    remindDaysBefore: [30, 15, 7, 1],
  },
  {
    type: REMINDER_TYPE.ADVANCE_TAX_Q3,
    label: 'Advance Tax Q3 (75% cumulative)',
    deadline: new Date('2024-12-15'),
    remindDaysBefore: [30, 15, 7, 1],
  },
  {
    type: REMINDER_TYPE.ITR_DEADLINE,
    label: 'ITR Filing Deadline (AY 2024-25)',
    deadline: new Date('2024-07-31'),
    remindDaysBefore: [60, 30, 15, 7, 3, 1],
  },
  {
    type: REMINDER_TYPE.ADVANCE_TAX_Q4,
    label: 'Advance Tax Q4 (100% cumulative)',
    deadline: new Date('2025-03-15'),
    remindDaysBefore: [30, 15, 7, 1],
  },
  {
    type: REMINDER_TYPE.GST_GSTR1,
    label: 'GSTR-1 Monthly Filing',
    deadline: new Date('2024-11-11'), // Example: October GSTR-1
    remindDaysBefore: [7, 3, 1],
  },
  {
    type: REMINDER_TYPE.GST_GSTR3B,
    label: 'GSTR-3B Monthly Filing',
    deadline: new Date('2024-11-20'), // Example: October GSTR-3B
    remindDaysBefore: [7, 3, 1],
  },
];

@Injectable()
export class FilingReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(FilingReminderScheduler.name);

  constructor(
    @InjectQueue(QUEUES.FILING_REMINDERS)
    private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.scheduleAllReminders();
  }

  private async scheduleAllReminders(): Promise<void> {
    const now = new Date();

    for (const deadline of FILING_DEADLINES) {
      for (const daysBefore of deadline.remindDaysBefore) {
        const reminderDate = new Date(deadline.deadline);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);

        if (reminderDate <= now) continue; // Skip past reminders

        const delay = reminderDate.getTime() - now.getTime();

        await this.reminderQueue.add(
          JOBS.FILING_REMINDERS.ITR_DEADLINE,
          {
            reminderType: deadline.type,
            label: deadline.label,
            deadlineDate: deadline.deadline.toISOString(),
            daysRemaining: daysBefore,
          },
          {
            delay,
            jobId: `reminder-${deadline.type}-${daysBefore}d`,  // Idempotent
            attempts: 3,
          },
        );

        this.logger.log(
          `Scheduled "${deadline.label}" reminder (${daysBefore}d before) at ${reminderDate.toLocaleDateString('en-IN')}`,
        );
      }
    }
  }

  // Called manually to enqueue a reminder for a specific user immediately
  async triggerUserReminder(params: {
    userId: string;
    tenantId: string;
    toEmail: string;
    reminderType: string;
    deadlineDate: Date;
    daysRemaining: number;
  }): Promise<void> {
    await this.reminderQueue.add(
      JOBS.FILING_REMINDERS.ITR_DEADLINE,
      params,
      {
        jobId: `user-reminder-${params.userId}-${params.reminderType}-${params.daysRemaining}d`,
      },
    );
  }
}
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../config/app-config.service';
import { QUEUES } from '@taxai/shared';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          // Reconnect with exponential backoff
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 200, age: 24 * 3600 },
          removeOnFail: { count: 1000 },
        },
      }),
    }),
    // Register all queues — adding a new queue is one line here
    BullModule.registerQueue(
      { name: QUEUES.DOCUMENT_PROCESSING },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.FILING_REMINDERS },
      { name: QUEUES.REPORT_GENERATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
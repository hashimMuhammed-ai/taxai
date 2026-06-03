import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';
import { envValidationSchema } from '../../api/src/infrastructure/config/env.validation';
import { AppConfigModule } from '../../api/src/infrastructure/config/config.module';
import { AppConfigService } from '../../api/src/infrastructure/config/app-config.service';
import { buildWinstonConfig } from '../../api/src/infrastructure/logger/winston.config';
import { QUEUES } from '@taxai/shared';

@Module({
  imports: [
    AppConfigModule,

    WinstonModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => buildWinstonConfig(config.isProduction),
    }),

    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
    }),

    // Register worker-specific queue consumers here
    // Day 2+: DocumentProcessingConsumer, NotificationConsumer, etc.
    BullModule.registerQueue(
      { name: QUEUES.DOCUMENT_PROCESSING },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.FILING_REMINDERS },
      { name: QUEUES.REPORT_GENERATION },
    ),
  ],
})
export class WorkerModule {}
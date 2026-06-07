import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import mongoose from 'mongoose';

import { AppConfigModule } from '../../api/src/infrastructure/config/config.module';
import { AppConfigService } from '../../api/src/infrastructure/config/app-config.service';
import { buildWinstonConfig } from '../../api/src/infrastructure/logger/winston.config';
import { multiTenantPlugin } from '../../api/src/infrastructure/database/plugins/multi-tenant.plugin';

// Schemas
import {
  DocumentSchemaClass,
  DocumentSchema,
} from '../../api/src/infrastructure/database/schemas/document.schema';
import {
  TaxRecordSchemaClass,
  TaxRecordSchema,
} from '../../api/src/infrastructure/database/schemas/tax-record.schema';

// Repositories + tokens
import { DocumentRepository } from '../../api/src/infrastructure/database/repositories/document.repository';
import { TaxRecordRepository } from '../../api/src/infrastructure/database/repositories/tax-record.repository';
import { DOCUMENT_REPOSITORY } from '../../api/src/domain/repositories/document.repository.interface';
import { TAX_RECORD_REPOSITORY } from '../../api/src/domain/repositories/tax-record.repository.interface';

// Worker processors + services
import { DocumentProcessingWorker } from './processors/document-processing.worker';
import { AiExtractionService } from './services/ai-extraction.service';

import { QUEUES } from '@taxai/shared';

@Module({
  imports: [
    AppConfigModule,

    WinstonModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        buildWinstonConfig(config.isProduction),
    }),

    // MongoDB (worker needs to read/write documents)
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        mongoose.plugin(multiTenantPlugin);

        return {
          uri: config.mongoUri,
          dbName: 'taxai',
          maxPoolSize: 5,
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),

    MongooseModule.forFeature([
      {
        name: DocumentSchemaClass.name,
        schema: DocumentSchema,
      },
      {
        name: TaxRecordSchemaClass.name,
        schema: TaxRecordSchema,
      },
    ]),

    // BullMQ
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times: number) =>
            Math.min(times * 200, 5000),
        },
      }),
    }),

    BullModule.registerQueue(
      { name: QUEUES.DOCUMENT_PROCESSING },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.FILING_REMINDERS },
      { name: QUEUES.REPORT_GENERATION },
    ),
  ],

  providers: [
    // Repository bindings
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: DocumentRepository,
    },
    {
      provide: TAX_RECORD_REPOSITORY,
      useClass: TaxRecordRepository,
    },

    // Services
    AiExtractionService,

    // Queue processors
    DocumentProcessingWorker,
    // Day 3+: NotificationWorker, FilingReminderWorker, ReportWorker
  ],
})
export class WorkerModule {}
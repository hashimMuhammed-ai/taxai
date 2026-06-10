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
import {
  FilingSchemaClass,
  FilingSchema,
} from '../../api/src/infrastructure/database/schemas/filing.schema';
import {
  NotificationSchemaClass,
  NotificationSchema,
} from '../../api/src/infrastructure/database/schemas/notification.schema';
import {
  UserSchemaClass,
  UserSchema,
} from '../../api/src/infrastructure/database/schemas/user.schema';
import {
  AuditLogSchemaClass,
  AuditLogSchema,
} from '../../api/src/infrastructure/database/schemas/audit-log.schema';

// Repositories + tokens
import { DocumentRepository } from '../../api/src/infrastructure/database/repositories/document.repository';
import { TaxRecordRepository } from '../../api/src/infrastructure/database/repositories/tax-record.repository';
import { FilingRepository } from '../../api/src/infrastructure/database/repositories/filing.repository';
import { NotificationRepository } from '../../api/src/infrastructure/database/repositories/notification.repository';
import { UserRepository } from '../../api/src/infrastructure/database/repositories/user.repository';
import { AuditLogRepository } from '../../api/src/infrastructure/database/repositories/audit-log.repository';

import { DOCUMENT_REPOSITORY } from '../../api/src/domain/repositories/document.repository.interface';
import { TAX_RECORD_REPOSITORY } from '../../api/src/domain/repositories/tax-record.repository.interface';
import { FILING_REPOSITORY } from '../../api/src/domain/repositories/filing.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../api/src/domain/repositories/notification.repository.interface';
import { USER_REPOSITORY } from '../../api/src/domain/repositories/user.repository.interface';
import { AUDIT_LOG_REPOSITORY } from '../../api/src/domain/repositories/audit-log.repository.interface';

// Worker processors + services
import { DocumentProcessingWorker } from './processors/document-processing.worker';
import { NotificationWorker } from './processors/notification.worker';
import { FilingReminderScheduler } from './processors/filing-reminder.scheduler';
import { ReportGeneratorWorker } from './processors/report-generator.worker';

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
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: DocumentSchemaClass.name, schema: DocumentSchema },
      { name: TaxRecordSchemaClass.name, schema: TaxRecordSchema },
      { name: FilingSchemaClass.name, schema: FilingSchema },
      { name: NotificationSchemaClass.name, schema: NotificationSchema },
      { name: AuditLogSchemaClass.name, schema: AuditLogSchema },
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
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 200,
            age: 24 * 3600,
          },
          removeOnFail: {
            count: 1000,
          },
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
    // ── Repository bindings ────────────────────────────────────────────────
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: DOCUMENT_REPOSITORY, useClass: DocumentRepository },
    { provide: TAX_RECORD_REPOSITORY, useClass: TaxRecordRepository },
    { provide: FILING_REPOSITORY, useClass: FilingRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogRepository },

    // ── Services ───────────────────────────────────────────────────────────
    AiExtractionService,

    // ── Queue Processors ───────────────────────────────────────────────────
    DocumentProcessingWorker,
    NotificationWorker,
    FilingReminderScheduler,
    ReportGeneratorWorker,
  ],
})
export class WorkerModule {}
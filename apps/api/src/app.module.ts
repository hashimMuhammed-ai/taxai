import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { WinstonModule } from 'nest-winston';

import { AppConfigModule } from './infrastructure/config/config.module';
import { AppConfigService } from './infrastructure/config/app-config.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { buildWinstonConfig } from './infrastructure/logger/winston.config';
import { CorrelationIdMiddleware } from './presentation/interceptors/correlation-id.middleware';

// Feature modules
import { AuthModule } from './application/auth/auth.module';
import { DocumentModule } from './application/document/document.module';
import { TaxModule } from './application/tax/tax.module';
import { GstModule } from './application/gst/gst.module';
import { FilingModule } from './application/filing/filing.module';
import { AiChatModule } from './application/ai-chat/ai-chat.module';
import { DashboardModule } from './application/dashboard/dashboard.module';
import { ReportModule } from './application/report/report.module';
import { UserModule } from './application/user/user.module';
import { AdminModule } from './application/admin/admin.module';

import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    // ── Core infrastructure ─────────────────────────────────────────────────
    AppConfigModule,  // Must be first — all other modules depend on config

    WinstonModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => buildWinstonConfig(config.isProduction),
    }),

    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          { ttl: config.throttleTtl, limit: config.throttleLimit },
        ],
      }),
    }),

    EventEmitterModule.forRoot({
      wildcard: true,       // Support 'user.*' pattern subscriptions
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    TerminusModule,
    CqrsModule.forRoot(),

    // ── Feature infrastructure ──────────────────────────────────────────────
    DatabaseModule,
    QueueModule,
    StorageModule,

    // Feature modules
    AuthModule,
    DocumentModule,
    TaxModule,
    GstModule,
    FilingModule,
    AiChatModule,
    DashboardModule,
    ReportModule,
    UserModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  // Apply correlation ID middleware to ALL routes — must be first in the chain
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
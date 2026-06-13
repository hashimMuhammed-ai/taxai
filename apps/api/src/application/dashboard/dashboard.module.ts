import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { DashboardController } from '../../presentation/controllers/dashboard.controller';
import { GetDashboardSummaryHandler } from './handlers/dashboard.handler';

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [DashboardController],
  providers: [GetDashboardSummaryHandler],
})
export class DashboardModule {}
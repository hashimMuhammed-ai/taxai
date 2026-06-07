import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { GstController } from '../../presentation/controllers/gst.controller';
import { CalculateGstHandler, GetGstSummaryHandler } from './handlers/gst.handlers';

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [GstController],
  providers: [CalculateGstHandler, GetGstSummaryHandler],
})
export class GstModule {}
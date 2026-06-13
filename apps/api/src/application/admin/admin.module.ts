import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AdminController } from '../../presentation/controllers/admin.controller';
import {
  GetAdminStatsHandler,
  GetAllUsersHandler,
  GetAllFilingsHandler,
} from './handlers/admin.handlers';

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [AdminController],
  providers: [GetAdminStatsHandler, GetAllUsersHandler, GetAllFilingsHandler],
})
export class AdminModule {}
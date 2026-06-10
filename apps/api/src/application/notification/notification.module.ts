import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { NotificationController } from '../../presentation/controllers/notification.controller';
import { DomainEventListeners } from './domain-event.listeners';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [NotificationController],
  providers: [DomainEventListeners],
})
export class NotificationModule {}
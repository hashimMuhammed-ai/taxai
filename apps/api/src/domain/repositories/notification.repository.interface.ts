import { NotificationEntity } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('INotificationRepository');

export interface INotificationRepository {
  save(notification: NotificationEntity): Promise<NotificationEntity>;
  findByUserId(userId: string, tenantId: string, onlyUnread?: boolean): Promise<NotificationEntity[]>;
  markRead(id: string, userId: string, tenantId: string): Promise<void>;
  markAllRead(userId: string, tenantId: string): Promise<void>;
}
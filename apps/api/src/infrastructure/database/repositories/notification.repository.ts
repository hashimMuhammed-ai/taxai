import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationDocument, NotificationSchemaClass } from '../schemas/notification.schema';
import { NotificationType } from '@taxai/shared';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectModel(NotificationSchemaClass.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    const created = await this.model.create({
      _id: notification.id,
      tenantId: notification.tenantId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      isRead: notification.isRead,
      emailSent: notification.emailSent,
    });
    return this.toEntity(created.toObject());
  }

  async findByUserId(userId: string, tenantId: string, onlyUnread = false): Promise<NotificationEntity[]> {
    const filter: any = { userId, tenantId };
    if (onlyUnread) filter.isRead = false;
    const docs = await this.model.find(filter).sort({ createdAt: -1 }).limit(50).lean().exec();
    return docs.map((d) => this.toEntity(d));
  }

  async markRead(id: string, userId: string, tenantId: string): Promise<void> {
    await this.model.updateOne({ _id: id, userId, tenantId }, { $set: { isRead: true } }).exec();
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await this.model.updateMany({ userId, tenantId, isRead: false }, { $set: { isRead: true } }).exec();
  }

  private toEntity(doc: any): NotificationEntity {
    return NotificationEntity.create({
      id: doc._id.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      type: doc.type as NotificationType,
      title: doc.title,
      message: doc.message,
      metadata: doc.metadata,
      isRead: doc.isRead,
      emailSent: doc.emailSent,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
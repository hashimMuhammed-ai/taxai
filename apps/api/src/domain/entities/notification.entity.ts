import { BaseEntity } from './base.entity';
import { NotificationType } from '@taxai/shared';

export interface CreateNotificationProps {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead?: boolean;
  emailSent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class NotificationEntity extends BaseEntity {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
  readonly isRead: boolean;
  readonly emailSent: boolean;

  private constructor(props: CreateNotificationProps) {
    super({
      id: props.id, tenantId: props.tenantId,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.userId = props.userId;
    this.type = props.type;
    this.title = props.title;
    this.message = props.message;
    this.metadata = props.metadata;
    this.isRead = props.isRead ?? false;
    this.emailSent = props.emailSent ?? false;
  }

  static create(props: CreateNotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  markRead(): NotificationEntity {
    return new NotificationEntity({ ...this.toProps(), isRead: true, updatedAt: new Date() });
  }

  markEmailSent(): NotificationEntity {
    return new NotificationEntity({ ...this.toProps(), emailSent: true, updatedAt: new Date() });
  }

  private toProps(): CreateNotificationProps {
    return {
      id: this.id, tenantId: this.tenantId, userId: this.userId,
      type: this.type, title: this.title, message: this.message,
      metadata: this.metadata, isRead: this.isRead, emailSent: this.emailSent,
      createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}
import { Controller, Get, Patch, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/repositories/notification.repository.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
  ) {}

  @Get()
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('unread') unread?: string,
  ) {
    return this.notifRepo.findByUserId(user.sub, user.tenantId, unread === 'true');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notifRepo.markRead(id, user.sub, user.tenantId);
    return { success: true };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notifRepo.markAllRead(user.sub, user.tenantId);
    return { success: true };
  }
}
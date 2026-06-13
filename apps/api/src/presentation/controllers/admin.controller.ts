import {
  Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard, RolesGuard, Roles } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@taxai/shared';
import {
  GetAdminStatsQuery,
  GetAllUsersQuery,
  GetAllFilingsQuery,
} from '../../application/admin/queries/admin.queries';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly queryBus: QueryBus) {}

  /** Platform-wide stats: user count, document breakdown, filing pipeline */
  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetAdminStatsQuery(user.tenantId));
  }

  /** Paginated user list */
  @Get('users')
  async getAllUsers(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.queryBus.execute(new GetAllUsersQuery(user.tenantId, page, Math.min(limit, 100)));
  }

  /** Paginated filing list, filterable by status */
  @Get('filings')
  async getAllFilings(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.queryBus.execute(
      new GetAllFilingsQuery(user.tenantId, status, page, Math.min(limit, 100)),
    );
  }
}
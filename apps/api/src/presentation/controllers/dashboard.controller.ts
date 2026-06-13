import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import { GetDashboardSummaryQuery } from '../../application/dashboard/queries/dashboard.queries';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Single endpoint that returns everything the dashboard UI needs:
   * - Filing readiness score
   * - Tax summary (both regimes)
   * - Deduction opportunities with potential savings
   * - Document upload status breakdown
   * - Active filing status
   * - Unread notification count
   */
  @Get()
  async getDashboard(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(
      new GetDashboardSummaryQuery(user.sub, user.tenantId),
    );
  }
}
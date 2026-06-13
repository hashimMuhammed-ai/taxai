import {
  Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import { GenerateTaxReportCommand, GetReportDownloadUrlQuery } from '../../application/report/commands/report.commands';

class GenerateReportDto {
  @IsString() @IsNotEmpty() taxRecordId!: string;
  @IsString() @IsNotEmpty() assessmentYear!: string;
  @IsOptional() @IsString() filingId?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Enqueues a PDF generation job. Returns a jobId immediately.
   * User gets notified via in-app + email when the report is ready.
   */
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateReport(@Body() dto: GenerateReportDto, @CurrentUser() user: JwtPayload) {
    return this.commandBus.execute(
      new GenerateTaxReportCommand(
        user.sub,
        user.tenantId,
        dto.taxRecordId,
        dto.assessmentYear,
        dto.filingId,
      ),
    );
  }

  /**
   * Returns a 30-minute pre-signed download URL for a filing's PDF report.
   * The PDF must have been generated first via POST /reports/generate.
   */
  @Get('download/:filingId')
  async getDownloadUrl(
    @Param('filingId') filingId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.queryBus.execute(
      new GetReportDownloadUrlQuery(filingId, user.sub, user.tenantId),
    );
  }
}
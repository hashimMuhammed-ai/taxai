import {
  Controller, Post, Get, Patch, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsString, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { JwtAuthGuard, RolesGuard, Roles } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload, UserRole, TaxRegime, TAX_REGIME } from '@taxai/shared';
import {
  CreateFilingCommand, SubmitFilingForReviewCommand,
  ApproveFilingCommand, RejectFilingCommand, AddFilingNoteCommand,
  GetMyFilingsQuery, GetFilingByIdQuery, GetCaFilingsQuery, GetFilingAuditTrailQuery,
} from '../../application/filing/commands/filing.commands';

class CreateFilingDto {
  @IsString() @IsNotEmpty() assessmentYear!: string;
  @IsString() @IsNotEmpty() taxRecordId!: string;
  @IsEnum(TAX_REGIME) selectedRegime!: TaxRegime;
}

class SubmitForReviewDto {
  @IsString() @IsNotEmpty() caId!: string;
}

class ApproveFilingDto {
  @IsOptional() @IsString() note?: string;
}

class RejectFilingDto {
  @IsString() @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  reason!: string;
}

class AddNoteDto {
  @IsString() @IsNotEmpty() content!: string;
}

@Controller('filings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ── User endpoints ──────────────────────────────────────────────────────────
  @Post()
  @Roles(UserRole.USER)
  async createFiling(@Body() dto: CreateFilingDto, @CurrentUser() user: JwtPayload) {
    return this.commandBus.execute(
      new CreateFilingCommand(user.sub, user.tenantId, dto.assessmentYear, dto.taxRecordId, dto.selectedRegime),
    );
  }

  @Get()
  @Roles(UserRole.USER)
  async getMyFilings(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetMyFilingsQuery(user.sub, user.tenantId));
  }

  @Post(':filingId/submit')
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.OK)
  async submitForReview(
    @Param('filingId') filingId: string,
    @Body() dto: SubmitForReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new SubmitFilingForReviewCommand(filingId, user.sub, user.tenantId, dto.caId),
    );
  }

  @Post(':filingId/notes')
  @HttpCode(HttpStatus.OK)
  async addNote(
    @Param('filingId') filingId: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new AddFilingNoteCommand(filingId, user.sub, user.role, user.tenantId, dto.content),
    );
  }

  @Get(':filingId')
  async getFilingById(@Param('filingId') filingId: string, @CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(
      new GetFilingByIdQuery(filingId, user.sub, user.role, user.tenantId),
    );
  }

  @Get(':filingId/audit')
  async getAuditTrail(@Param('filingId') filingId: string, @CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetFilingAuditTrailQuery(filingId, user.tenantId));
  }

  // ── CA endpoints ────────────────────────────────────────────────────────────
  @Get('ca/assigned')
  @Roles(UserRole.CA)
  async getCaFilings(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetCaFilingsQuery(user.sub, user.tenantId));
  }

  @Patch(':filingId/approve')
  @Roles(UserRole.CA)
  @HttpCode(HttpStatus.OK)
  async approveFiling(
    @Param('filingId') filingId: string,
    @Body() dto: ApproveFilingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new ApproveFilingCommand(filingId, user.sub, user.tenantId, dto.note),
    );
  }

  @Patch(':filingId/reject')
  @Roles(UserRole.CA)
  @HttpCode(HttpStatus.OK)
  async rejectFiling(
    @Param('filingId') filingId: string,
    @Body() dto: RejectFilingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new RejectFilingCommand(filingId, user.sub, user.tenantId, dto.reason),
    );
  }
}
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload, TAX_REGIME, TaxRegime } from '@taxai/shared';
import {
  CalculateTaxCommand,
  GetTaxEstimateQuery,
  GetTaxRecordByIdQuery,
} from '../../application/tax/commands/tax.commands';

class DeductionsDto {
  @IsOptional() @IsNumber() @Min(0) section80C?: number;
  @IsOptional() @IsNumber() @Min(0) section80D?: number;
  @IsOptional() @IsNumber() @Min(0) section80CCD1B?: number;
  @IsOptional() @IsNumber() @Min(0) hra?: number;
  @IsOptional() @IsNumber() @Min(0) lta?: number;
  @IsOptional() @IsNumber() @Min(0) homeLoanInterest?: number;
  @IsOptional() @IsNumber() @Min(0) standardDeduction?: number;
  @IsOptional() @IsNumber() @Min(0) professionalTax?: number;
  @IsOptional() @IsNumber() @Min(0) otherDeductions?: number;
}

class CalculateTaxDto {
  @IsString()
  assessmentYear!: string;          // e.g. '2024-25'

  @IsNumber() @Min(0)
  grossSalary!: number;

  @IsNumber() @Min(0)
  otherIncome!: number;

  @IsEnum(TAX_REGIME)
  regime!: TaxRegime;              // 'old' | 'new' — used as hint; we calculate both

  @IsOptional()
  @ValidateNested()
  @Type(() => DeductionsDto)
  deductions?: DeductionsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceDocumentIds?: string[];

  @IsOptional()
  isSeniorCitizen?: boolean;

  @IsOptional()
  isSuperSeniorCitizen?: boolean;
}

@Controller('tax')
@UseGuards(JwtAuthGuard)
export class TaxController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Calculate taxes for both regimes and persist the result.
   * Returns a full TaxRecord with regime comparison, deduction suggestions,
   * and filing readiness score.
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateTax(
    @Body() dto: CalculateTaxDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new CalculateTaxCommand(
        user.sub,
        user.tenantId,
        dto.assessmentYear,
        {
          grossSalary: dto.grossSalary,
          otherIncome: dto.otherIncome,
          regime: dto.regime,
          deductions: dto.deductions,
          isSeniorCitizen: dto.isSeniorCitizen,
          isSuperSeniorCitizen: dto.isSuperSeniorCitizen,
        },
        dto.sourceDocumentIds,
      ),
    );
  }

  /** Get the latest tax estimate for the authenticated user */
  @Get('estimate')
  async getMyEstimate(
    @CurrentUser() user: JwtPayload,
    @Query('assessmentYear') assessmentYear?: string,
  ) {
    return this.queryBus.execute(
      new GetTaxEstimateQuery(user.sub, user.tenantId, assessmentYear),
    );
  }

  /** Get a specific tax record by ID */
  @Get(':taxRecordId')
  async getTaxRecord(
    @Param('taxRecordId') taxRecordId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.queryBus.execute(
      new GetTaxRecordByIdQuery(taxRecordId, user.sub, user.tenantId, user.role),
    );
  }
}
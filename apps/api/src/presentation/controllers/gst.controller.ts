import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsNotEmpty,
  IsDateString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import { CalculateGstCommand, GetGstSummaryQuery } from '../../application/gst/commands/gst.commands';

class CalculateGstDto {
  @IsNumber() @Min(0)
  baseAmount!: number;

  @IsNumber() @Min(0) @Max(28)
  gstRate!: number;

  @IsString() @Length(2, 2)
  vendorState!: string;             // 2-letter state code e.g. 'KA', 'MH'

  @IsString() @Length(2, 2)
  buyerState!: string;

  @IsString() @IsNotEmpty()
  invoiceNumber!: string;

  @IsString() @IsNotEmpty()
  vendorName!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format',
  })
  vendorGstin?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format',
  })
  buyerGstin?: string;

  @IsOptional()
  @IsString()
  sourceDocumentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('gst')
@UseGuards(JwtAuthGuard)
export class GstController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Calculate GST for an invoice.
   * Automatically routes to CGST+SGST (intra-state) or IGST (inter-state).
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateGst(
    @Body() dto: CalculateGstDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new CalculateGstCommand(
        user.sub,
        user.tenantId,
        dto.baseAmount,
        dto.gstRate,
        dto.vendorState,
        dto.buyerState,
        dto.invoiceNumber,
        dto.vendorName,
        new Date(dto.invoiceDate),
        dto.vendorGstin,
        dto.buyerGstin,
        dto.sourceDocumentId,
        dto.description,
      ),
    );
  }

  /** GST summary: all records + CGST/SGST/IGST totals for the user */
  @Get('summary')
  async getGstSummary(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(
      new GetGstSummaryQuery(user.sub, user.tenantId),
    );
  }
}
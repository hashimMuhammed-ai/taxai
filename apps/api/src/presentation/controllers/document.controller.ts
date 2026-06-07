import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload, DOCUMENT_TYPE, DocumentType } from '@taxai/shared';
import { InitiateDocumentUploadCommand } from '../../application/document/commands/document.commands';
import { ConfirmDocumentUploadCommand } from '../../application/document/commands/document.commands';
import { GetUserDocumentsQuery, GetDocumentByIdQuery } from '../../application/document/queries/document.queries';

class InitiateUploadDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes!: number;

  @IsEnum(DOCUMENT_TYPE)
  documentType!: DocumentType;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Step 1: Client requests a pre-signed upload URL.
   * Returns: uploadUrl (PUT directly to R2), documentId, objectKey
   */
  @Post('upload/initiate')
  async initiateUpload(
    @Body() dto: InitiateUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new InitiateDocumentUploadCommand(
        user.sub,
        user.tenantId,
        dto.filename,
        dto.mimeType,
        dto.sizeBytes,
        dto.documentType,
      ),
    );
  }

  /**
   * Step 2: Client calls this after successful PUT to R2.
   * Triggers the OCR + extraction job in the worker queue.
   */
  @Post('upload/confirm/:documentId')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commandBus.execute(
      new ConfirmDocumentUploadCommand(documentId, user.sub, user.tenantId),
    );
  }

  /** List all documents for the authenticated user */
  @Get()
  async getMyDocuments(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(
      new GetUserDocumentsQuery(user.sub, user.tenantId),
    );
  }

  /** Get a single document + pre-signed read URL */
  @Get(':documentId')
  async getDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.queryBus.execute(
      new GetDocumentByIdQuery(documentId, user.sub, user.tenantId),
    );
  }
}
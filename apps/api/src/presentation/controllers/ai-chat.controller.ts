import {
  Controller, Post, Get, Body, Sse, UseGuards, HttpCode, HttpStatus, Req, Res,
} from '@nestjs/common';
import { IsString, IsArray, IsOptional, IsEnum, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import { AiChatService, ChatMessage } from '@taxai/ai';

class MessageDto {
  @IsEnum(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() @MinLength(1) content!: string;
}

class ChatRequestDto {
  @IsString() @MinLength(1) message!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  @IsOptional()
  history?: ChatMessage[];

  @IsOptional() taxSummary?: string;
  @IsOptional() documentSummary?: string;
  @IsOptional() filingStatus?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly chatService: AiChatService) {}

  /**
   * Standard chat endpoint — full response returned at once.
   * Use for simple integrations or when SSE is not available.
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: JwtPayload) {
    const response = await this.chatService.chat(
      dto.message,
      dto.history ?? [],
      {
        taxSummary: dto.taxSummary,
        documentSummary: dto.documentSummary,
        filingStatus: dto.filingStatus,
      },
    );
    return { message: response.message, tokensUsed: response.tokensUsed };
  }

  /**
   * Streaming chat endpoint — tokens streamed via Server-Sent Events.
   * Frontend renders tokens as they arrive for a real-time feel.
   *
   * Usage:
   *   const events = new EventSource('/api/v1/ai/chat/stream');
   *   events.onmessage = (e) => { buffer += JSON.parse(e.data).token; }
   */
  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      const stream = this.chatService.chatStream(
        dto.message,
        dto.history ?? [],
        {
          taxSummary: dto.taxSummary,
          documentSummary: dto.documentSummary,
          filingStatus: dto.filingStatus,
        },
      );

      for await (const token of stream) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    } finally {
      res.end();
    }
  }
}
import { Module } from '@nestjs/common';
import { AiChatService } from '@taxai/ai';
import { AiChatController } from '../../presentation/controllers/ai-chat.controller';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule {}
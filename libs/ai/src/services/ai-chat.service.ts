import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../apps/api/src/infrastructure/config/app-config.service';
import { CHAT_SYSTEM_PROMPT, DOCUMENT_CONTEXT_TEMPLATE } from '../prompts/chat.prompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  taxSummary?: string;       // e.g. "Gross: ₹12L, TDS: ₹95k, Recommended: New regime"
  documentSummary?: string;  // e.g. "Form 16 uploaded. Employer: TCS. AY: 2024-25"
  filingStatus?: string;     // e.g. "Filing in DRAFT status"
}

export interface ChatResponse {
  message: string;
  tokensUsed: number;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(private readonly config: AppConfigService) {}

  // ─── Non-streaming response (for standard API responses) ─────────────────
  async chat(
    userMessage: string,
    history: ChatMessage[],
    context?: ChatContext,
  ): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);

    // Sliding window: keep last 10 messages to stay within token limits
    const windowedHistory = history.slice(-10);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...windowedHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,     // Low temperature for factual tax advice
        max_tokens: 800,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content ?? 'I could not generate a response. Please try again.';
    const tokensUsed = data.usage?.total_tokens ?? 0;

    this.logger.debug(`Chat response: ${tokensUsed} tokens used`);

    return { message: content, tokensUsed };
  }

  // ─── Streaming response (for SSE endpoints) ───────────────────────────────
  async *chatStream(
    userMessage: string,
    history: ChatMessage[],
    context?: ChatContext,
  ): AsyncGenerator<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    const windowedHistory = history.slice(-10);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...windowedHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 800,
        stream: true,
        messages,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI streaming error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const json = line.replace('data: ', '');
          if (json === '[DONE]') return;

          try {
            const parsed = JSON.parse(json);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ─── Build system prompt with user context injected ───────────────────────
  private buildSystemPrompt(context?: ChatContext): string {
    if (!context) return CHAT_SYSTEM_PROMPT;

    const parts: string[] = [CHAT_SYSTEM_PROMPT];

    if (context.taxSummary || context.documentSummary || context.filingStatus) {
      const contextLines: string[] = [];
      if (context.documentSummary) contextLines.push(`Documents: ${context.documentSummary}`);
      if (context.taxSummary) contextLines.push(`Tax Summary: ${context.taxSummary}`);
      if (context.filingStatus) contextLines.push(`Filing: ${context.filingStatus}`);
      parts.push(DOCUMENT_CONTEXT_TEMPLATE(contextLines.join('\n')));
    }

    return parts.join('');
  }
}
import { ChatCompletionRequest, ChatCompletionResult, ChatModelProvider } from './types';

export interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
}

export class OpenAICompatibleProvider implements ChatModelProvider {
  model: string;
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs || 30000;
    this.defaultHeaders = options.defaultHeaders || {};
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
          ...this.defaultHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status} ${text}`);
      }

      const payload = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        model?: string;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('LLM response missing content');
      }

      return {
        content,
        model: payload.model || this.model,
        usage: {
          promptTokens: payload.usage?.prompt_tokens,
          completionTokens: payload.usage?.completion_tokens,
          totalTokens: payload.usage?.total_tokens,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

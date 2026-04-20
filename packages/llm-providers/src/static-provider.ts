import { ChatCompletionRequest, ChatCompletionResult, ChatModelProvider } from './types';

export class StaticChatProvider implements ChatModelProvider {
  model = 'static-test-model';
  private reply: string;

  constructor(reply = '您好，已收到您的咨询，我们会尽快安排招商顾问跟进。') {
    this.reply = reply;
  }

  async complete(_request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    return {
      content: this.reply,
      model: this.model,
    };
  }
}

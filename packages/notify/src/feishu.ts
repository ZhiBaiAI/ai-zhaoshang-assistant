import { FeishuOpenPlatformClient } from '@ai-zhaoshang/feishu';
import { NotificationMessage, Notifier } from './types';

export class FeishuWebhookNotifier implements Notifier {
  constructor(private webhookUrl: string) {}

  async send(message: NotificationMessage): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: formatNotification(message),
        },
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Feishu webhook failed: ${response.status} ${text}`);
    }
  }
}

export class FeishuOpenPlatformNotifier implements Notifier {
  constructor(
    private client: FeishuOpenPlatformClient,
    private receiveId: string,
    private receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email' = 'chat_id',
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    await this.client.sendTextMessage({
      receiveIdType: this.receiveIdType,
      receiveId: this.receiveId,
      text: formatNotification(message),
    });
  }
}

export function formatNotification(message: NotificationMessage): string {
  const level = message.level ? `[${message.level}] ` : '';
  return `${level}${message.title}\n${message.content}`;
}

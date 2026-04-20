import crypto from 'crypto';
import { NotificationMessage, Notifier } from './types';
import { formatNotification } from './feishu';

export class CompositeNotifier implements Notifier {
  constructor(private notifiers: Notifier[]) {}

  async send(message: NotificationMessage): Promise<void> {
    const errors: string[] = [];
    for (const notifier of this.notifiers) {
      try {
        await notifier.send(message);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (errors.length === this.notifiers.length) {
      throw new Error(`All notification channels failed: ${errors.join('; ')}`);
    }
  }
}

export class WeComWebhookNotifier implements Notifier {
  constructor(private webhookUrl: string) {}

  async send(message: NotificationMessage): Promise<void> {
    await postWebhook({
      url: this.webhookUrl,
      payload: {
        msgtype: 'text',
        text: {
          content: formatNotification(message),
        },
      },
      failureLabel: 'WeCom webhook failed',
    });
  }
}

export class DingTalkWebhookNotifier implements Notifier {
  constructor(
    private webhookUrl: string,
    private secret?: string,
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    await postWebhook({
      url: this.secret ? signedDingTalkUrl(this.webhookUrl, this.secret) : this.webhookUrl,
      payload: {
        msgtype: 'text',
        text: {
          content: formatNotification(message),
        },
      },
      failureLabel: 'DingTalk webhook failed',
    });
  }
}

async function postWebhook(input: {
  url: string;
  payload: unknown;
  failureLabel: string;
}): Promise<unknown> {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input.payload),
  });
  const text = await response.text();
  const body = text ? parseJson(text) : undefined;
  if (!response.ok || hasErrorCode(body)) {
    throw new Error(`${input.failureLabel}: ${response.status} ${text}`);
  }
  return body;
}

function signedDingTalkUrl(webhookUrl: string, secret: string): string {
  const timestamp = Date.now();
  const sign = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}\n${secret}`)
    .digest('base64');
  const url = new URL(webhookUrl);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('sign', sign);
  return url.toString();
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function hasErrorCode(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const payload = body as { errcode?: unknown; code?: unknown };
  if (typeof payload.errcode === 'number') return payload.errcode !== 0;
  if (typeof payload.code === 'number') return payload.code !== 0;
  return false;
}

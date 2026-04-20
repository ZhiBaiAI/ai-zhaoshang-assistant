export interface FeishuClientOptions {
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

export class FeishuOpenPlatformClient {
  private appId: string;
  private appSecret: string;
  private baseUrl: string;
  private tenantToken?: { value: string; expiresAt: number };

  constructor(options: FeishuClientOptions) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.baseUrl = options.baseUrl || 'https://open.feishu.cn';
  }

  async getTenantAccessToken(): Promise<string> {
    if (this.tenantToken && this.tenantToken.expiresAt > Date.now() + 60000) {
      return this.tenantToken.value;
    }

    const payload = await this.request<{
      code: number;
      msg?: string;
      tenant_access_token?: string;
      expire?: number;
    }>('/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      body: {
        app_id: this.appId,
        app_secret: this.appSecret,
      },
      auth: false,
    });

    if (payload.code !== 0 || !payload.tenant_access_token) {
      throw new Error(`Feishu tenant token failed: ${payload.msg || payload.code}`);
    }

    this.tenantToken = {
      value: payload.tenant_access_token,
      expiresAt: Date.now() + (payload.expire || 7200) * 1000,
    };
    return this.tenantToken.value;
  }

  async createBitableRecord(input: {
    appToken: string;
    tableId: string;
    fields: Record<string, unknown>;
  }): Promise<unknown> {
    return this.request(
      `/open-apis/bitable/v1/apps/${input.appToken}/tables/${input.tableId}/records`,
      {
        method: 'POST',
        body: { fields: input.fields },
      },
    );
  }

  async updateBitableRecord(input: {
    appToken: string;
    tableId: string;
    recordId: string;
    fields: Record<string, unknown>;
  }): Promise<unknown> {
    return this.request(
      `/open-apis/bitable/v1/apps/${input.appToken}/tables/${input.tableId}/records/${input.recordId}`,
      {
        method: 'PUT',
        body: { fields: input.fields },
      },
    );
  }

  async listBitableRecords(input: {
    appToken: string;
    tableId: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<unknown> {
    const params = new URLSearchParams();
    if (input.pageSize) params.set('page_size', String(input.pageSize));
    if (input.pageToken) params.set('page_token', input.pageToken);
    const query = params.toString();
    return this.request(
      `/open-apis/bitable/v1/apps/${input.appToken}/tables/${input.tableId}/records${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      },
    );
  }

  async sendTextMessage(input: {
    receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email';
    receiveId: string;
    text: string;
  }): Promise<unknown> {
    return this.request(`/open-apis/im/v1/messages?receive_id_type=${input.receiveIdType}`, {
      method: 'POST',
      body: {
        receive_id: input.receiveId,
        msg_type: 'text',
        content: JSON.stringify({ text: input.text }),
      },
    });
  }

  private async request<T = unknown>(
    path: string,
    options: { method: string; body?: unknown; auth?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
    };
    if (options.auth !== false) {
      headers.authorization = `Bearer ${await this.getTenantAccessToken()}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.method === 'GET' || options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Feishu request failed: ${response.status} ${text}`);
    }
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import type { DingTalkA1SyncConfig } from './config';
import type { WorkerLogger } from './worker';

export interface DingTalkA1AudioFile {
  fileId: string;
  fileName?: string;
  creatorUserId?: string;
  createTime?: number;
  duration?: number;
  fileSize?: number;
  attributes?: Record<string, unknown>;
}

export interface DingTalkA1TranscriptSummary {
  content?: string;
}

export interface DingTalkA1AudioManifest {
  fileId: string;
  deviceType: string;
  sn: string;
  firstSeenAt: string;
  savedAt: string;
  source: DingTalkA1AudioFile;
  info?: DingTalkA1AudioFile;
  downloadUrls: string[];
  transcriptSummary?: DingTalkA1TranscriptSummary;
  audioPath?: string;
  errors: string[];
}

export interface DingTalkA1PollResult {
  listed: number;
  saved: number;
  created: number;
  updated: number;
  audioDownloaded: number;
  failed: number;
}

export interface DingTalkA1ClientOptions {
  baseUrl: string;
  accessToken?: string;
  appKey?: string;
  appSecret?: string;
  fetchImpl?: typeof fetch;
}

export class DingTalkA1Client {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly appKey?: string;
  private readonly appSecret?: string;
  private readonly fetchImpl: typeof fetch;
  private cachedToken?: { value: string; expiresAt: number };

  constructor(options: DingTalkA1ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.accessToken = options.accessToken;
    this.appKey = options.appKey;
    this.appSecret = options.appSecret;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async queryAudioFiles(input: {
    deviceType: string;
    sn: string;
    maxResults: number;
    nextToken?: string;
    startTimestamp: number;
    endTimestamp: number;
  }): Promise<{ result: DingTalkA1AudioFile[]; nextToken?: string; totalCount?: number }> {
    return this.requestJson('/v1.0/dvi/device/audio/list', {
      method: 'POST',
      body: {
        deviceType: input.deviceType,
        maxResults: input.maxResults,
        nextToken: input.nextToken,
        sn: input.sn,
        startTimestamp: input.startTimestamp,
        endTimestamp: input.endTimestamp,
      },
    });
  }

  async getAudioFileInfo(input: { deviceType: string; fileId: string }): Promise<{ result?: DingTalkA1AudioFile }> {
    return this.requestJson('/v1.0/dvi/device/audio/get', {
      method: 'POST',
      body: input,
    });
  }

  async getAudioFileDownloadInfo(input: { deviceType: string; fileId: string }): Promise<{ result?: Array<{ url?: string }> }> {
    return this.requestJson('/v1.0/dvi/device/audio/download', {
      method: 'POST',
      body: input,
    });
  }

  async getTranscriptSummary(input: { deviceType: string; fileId: string }): Promise<{ result?: DingTalkA1TranscriptSummary }> {
    const query = new URLSearchParams({
      fileId: input.fileId,
      deviceType: input.deviceType,
    });
    return this.requestJson(`/v1.0/dvi/transcripts/summary?${query.toString()}`, {
      method: 'GET',
    });
  }

  async download(url: string): Promise<{ bytes: Uint8Array; contentType?: string }> {
    const response = await this.fetchImpl(url);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`DingTalk audio download failed: ${response.status} ${text}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      contentType: response.headers.get('content-type') || undefined,
    };
  }

  private async requestJson<T>(path: string, input: { method: 'GET' | 'POST'; body?: Record<string, unknown> }): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: input.method,
      headers: {
        'content-type': 'application/json',
        'x-acs-dingtalk-access-token': token,
      },
      body: input.body ? JSON.stringify(removeUndefined(input.body)) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`DingTalk API failed: ${response.status} ${text}`);
    }
    return text ? JSON.parse(text) as T : {} as T;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) return this.cachedToken.value;
    if (!this.appKey || !this.appSecret) {
      throw new Error('DINGTALK_A1_ACCESS_TOKEN or DINGTALK_APP_KEY/DINGTALK_APP_SECRET is required');
    }

    const response = await this.fetchImpl(`${this.baseUrl}/v1.0/oauth2/accessToken`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appKey: this.appKey, appSecret: this.appSecret }),
    });
    const payload = await response.json() as { accessToken?: string; expireIn?: number; code?: string; message?: string };
    if (!response.ok || !payload.accessToken) {
      throw new Error(`DingTalk access token failed: ${payload.message || payload.code || response.status}`);
    }
    const ttlMs = Math.max(60_000, (payload.expireIn || 7200) * 1000 - 300_000);
    this.cachedToken = { value: payload.accessToken, expiresAt: Date.now() + ttlMs };
    return payload.accessToken;
  }
}

export class LocalDingTalkA1Store {
  constructor(private readonly dataDir: string) {}

  async readManifest(fileId: string): Promise<DingTalkA1AudioManifest | undefined> {
    try {
      const text = await readFile(this.manifestPath(fileId), 'utf8');
      return JSON.parse(text) as DingTalkA1AudioManifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async saveManifest(manifest: DingTalkA1AudioManifest): Promise<void> {
    const path = this.manifestPath(manifest.fileId);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  async saveAudio(input: { fileId: string; bytes: Uint8Array; contentType?: string; url?: string }): Promise<string> {
    const path = this.audioPath(input.fileId, input.contentType, input.url);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.bytes);
    return path;
  }

  async audioExists(path: string | undefined): Promise<boolean> {
    if (!path) return false;
    try {
      const info = await stat(path);
      return info.isFile() && info.size > 0;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async listManifestFileIds(): Promise<string[]> {
    const recordsDir = join(this.dataDir, 'records');
    try {
      const names = await readdir(recordsDir);
      return names
        .filter(name => name.endsWith('.json'))
        .map(name => name.slice(0, -'.json'.length));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private manifestPath(fileId: string): string {
    return join(this.dataDir, 'records', `${safeName(fileId)}.json`);
  }

  private audioPath(fileId: string, contentType?: string, url?: string): string {
    return join(this.dataDir, 'audio', `${safeName(fileId)}${audioExtension(contentType, url)}`);
  }
}

export interface DingTalkA1PollDependencies {
  client: Pick<DingTalkA1Client, 'queryAudioFiles' | 'getAudioFileInfo' | 'getAudioFileDownloadInfo' | 'getTranscriptSummary' | 'download'>;
  store: LocalDingTalkA1Store;
}

export function createDingTalkA1PollDependencies(config: DingTalkA1SyncConfig): DingTalkA1PollDependencies {
  return {
    client: new DingTalkA1Client({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      appKey: config.appKey,
      appSecret: config.appSecret,
    }),
    store: new LocalDingTalkA1Store(config.dataDir),
  };
}

export async function pollDingTalkA1(
  config: DingTalkA1SyncConfig,
  dependencies: DingTalkA1PollDependencies = createDingTalkA1PollDependencies(config),
  logger: WorkerLogger = console,
): Promise<DingTalkA1PollResult> {
  if (!config.enabled) {
    return emptyPollResult();
  }
  if (config.snList.length === 0) {
    throw new Error('DINGTALK_A1_SN_LIST is required when WORKER_DINGTALK_A1_SYNC=1');
  }

  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - config.lookbackMs;
  const result = emptyPollResult();

  for (const sn of config.snList) {
    let nextToken: string | undefined;
    do {
      const page = await dependencies.client.queryAudioFiles({
        deviceType: config.deviceType,
        sn,
        maxResults: config.maxResults,
        nextToken,
        startTimestamp,
        endTimestamp,
      });
      const files = page.result || [];
      result.listed += files.length;

      for (const file of files) {
        try {
          const saved = await saveAudioRecord({ config, dependencies, file, sn });
          result.saved += 1;
          result.audioDownloaded += saved.audioDownloaded ? 1 : 0;
          if (saved.created) result.created += 1;
          else result.updated += 1;
        } catch (error) {
          result.failed += 1;
          logger.error(`Failed to save DingTalk A1 audio ${file.fileId}: ${String(error)}`);
        }
      }

      nextToken = page.nextToken || undefined;
    } while (nextToken);
  }

  return result;
}

async function saveAudioRecord(input: {
  config: DingTalkA1SyncConfig;
  dependencies: DingTalkA1PollDependencies;
  file: DingTalkA1AudioFile;
  sn: string;
}): Promise<{ created: boolean; audioDownloaded: boolean }> {
  const { config, dependencies, file, sn } = input;
  if (!file.fileId) throw new Error('DingTalk A1 audio file has no fileId');

  const existing = await dependencies.store.readManifest(file.fileId);
  const errors: string[] = [];
  let info = existing?.info;
  let downloadUrls = existing?.downloadUrls || [];
  let transcriptSummary = existing?.transcriptSummary;
  let audioPath = existing?.audioPath;
  let audioDownloaded = false;

  try {
    info = (await dependencies.client.getAudioFileInfo({ deviceType: config.deviceType, fileId: file.fileId })).result;
  } catch (error) {
    errors.push(`getAudioFileInfo: ${String(error)}`);
  }

  try {
    const download = await dependencies.client.getAudioFileDownloadInfo({ deviceType: config.deviceType, fileId: file.fileId });
    downloadUrls = (download.result || []).map(item => item.url).filter((url): url is string => Boolean(url));
  } catch (error) {
    errors.push(`getAudioFileDownloadInfo: ${String(error)}`);
  }

  try {
    transcriptSummary = (await dependencies.client.getTranscriptSummary({ deviceType: config.deviceType, fileId: file.fileId })).result;
  } catch (error) {
    errors.push(`getTranscriptSummary: ${String(error)}`);
  }

  if (config.downloadAudio && downloadUrls[0] && !(await dependencies.store.audioExists(audioPath))) {
    try {
      const audio = await dependencies.client.download(downloadUrls[0]);
      audioPath = await dependencies.store.saveAudio({
        fileId: file.fileId,
        bytes: audio.bytes,
        contentType: audio.contentType,
        url: downloadUrls[0],
      });
      audioDownloaded = true;
    } catch (error) {
      errors.push(`downloadAudio: ${String(error)}`);
    }
  }

  await dependencies.store.saveManifest({
    fileId: file.fileId,
    deviceType: config.deviceType,
    sn,
    firstSeenAt: existing?.firstSeenAt || new Date().toISOString(),
    savedAt: new Date().toISOString(),
    source: file,
    info,
    downloadUrls,
    transcriptSummary,
    audioPath,
    errors,
  });

  return { created: !existing, audioDownloaded };
}

function emptyPollResult(): DingTalkA1PollResult {
  return {
    listed: 0,
    saved: 0,
    created: 0,
    updated: 0,
    audioDownloaded: 0,
    failed: 0,
  };
}

function removeUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function audioExtension(contentType?: string, url?: string): string {
  if (contentType?.includes('mpeg')) return '.mp3';
  if (contentType?.includes('mp4')) return '.m4a';
  if (contentType?.includes('wav')) return '.wav';
  if (contentType?.includes('ogg')) return '.ogg';
  let extension = '';
  if (url) {
    try {
      extension = extname(new URL(url).pathname);
    } catch {
      extension = extname(url);
    }
  }
  return extension || '.audio';
}

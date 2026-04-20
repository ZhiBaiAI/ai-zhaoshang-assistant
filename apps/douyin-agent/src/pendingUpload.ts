import fs from 'fs';
import { DouyinMessageBatch } from '@ai-zhaoshang/shared';
import { uploadDouyinMessageBatch } from './apiClient';

export interface PendingUploadEntry {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  batch: DouyinMessageBatch;
}

export interface PendingUploadFile {
  schemaVersion: 1;
  source: 'douyin';
  entries: PendingUploadEntry[];
}

export interface FlushPendingUploadsOptions {
  pendingPath: string;
  apiBaseUrl: string;
  apiToken?: string;
  maxBatches?: number;
}

export function loadPendingUploads(pendingPath: string): PendingUploadFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(pendingPath, 'utf8')) as Partial<PendingUploadFile>;
    return {
      schemaVersion: 1,
      source: 'douyin',
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return {
      schemaVersion: 1,
      source: 'douyin',
      entries: [],
    };
  }
}

export function savePendingUploads(pendingPath: string, file: PendingUploadFile): void {
  const tmpPath = `${pendingPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(file, null, 2));
  fs.renameSync(tmpPath, pendingPath);
}

export function appendPendingUpload(pendingPath: string, batch: DouyinMessageBatch, error?: string): PendingUploadEntry {
  const file = loadPendingUploads(pendingPath);
  const entry: PendingUploadEntry = {
    id: `${batch.source}_${batch.capturedAt}_${batch.count}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: error,
    batch,
  };
  file.entries.push(entry);
  savePendingUploads(pendingPath, file);
  return entry;
}

export async function flushPendingUploads(options: FlushPendingUploadsOptions): Promise<{
  attempted: number;
  uploaded: number;
  remaining: number;
  lastError?: string;
}> {
  const file = loadPendingUploads(options.pendingPath);
  const limit = options.maxBatches || file.entries.length;
  const keep: PendingUploadEntry[] = [];
  let attempted = 0;
  let uploaded = 0;
  let lastError: string | undefined;

  for (const entry of file.entries) {
    if (attempted >= limit) {
      keep.push(entry);
      continue;
    }

    attempted += 1;
    try {
      await uploadDouyinMessageBatch({
        apiBaseUrl: options.apiBaseUrl,
        apiToken: options.apiToken,
        batch: entry.batch,
      });
      uploaded += entry.batch.events.length;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      keep.push({
        ...entry,
        attempts: entry.attempts + 1,
        lastError,
      });
    }
  }

  savePendingUploads(options.pendingPath, {
    schemaVersion: 1,
    source: 'douyin',
    entries: keep,
  });

  return {
    attempted,
    uploaded,
    remaining: keep.length,
    lastError,
  };
}

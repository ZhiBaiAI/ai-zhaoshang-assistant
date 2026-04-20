import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import { createDouyinMessageBatch } from './apiClient';
import {
  appendPendingUpload,
  flushPendingUploads,
  loadPendingUploads,
} from './pendingUpload';

const event = {
  schemaVersion: 1 as const,
  id: 'douyin_msg_1',
  source: 'douyin' as const,
  type: 'message.created' as const,
  capturedAt: '2026-04-17T10:00:00.000Z',
  session: {
    name: '客户A',
    unreadCount: 1,
    lastMessage: '想了解加盟',
    time: '10:00',
    index: 0,
  },
  message: {
    direction: 'incoming' as const,
    text: '想了解加盟',
  },
};

test('appendPendingUpload stores failed batches on disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douyin-pending-'));
  const pendingPath = path.join(dir, 'pending.json');
  const batch = createDouyinMessageBatch({
    projectId: 'project-1',
    capturedAt: '2026-04-17T10:00:00.000Z',
    events: [event],
  });

  appendPendingUpload(pendingPath, batch, 'network error');

  const file = loadPendingUploads(pendingPath);
  assert.equal(file.entries.length, 1);
  assert.equal(file.entries[0].batch.projectId, 'project-1');
  assert.equal(file.entries[0].lastError, 'network error');
});

test('flushPendingUploads uploads queued batches and keeps failures', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douyin-pending-'));
  const pendingPath = path.join(dir, 'pending.json');
  const batch = createDouyinMessageBatch({
    projectId: 'project-1',
    capturedAt: '2026-04-17T10:00:00.000Z',
    events: [event],
  });
  appendPendingUpload(pendingPath, batch);

  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ inserted: 1 }), { status: 202 });
  }) as typeof fetch;

  try {
    const result = await flushPendingUploads({
      pendingPath,
      apiBaseUrl: 'http://127.0.0.1:3001',
    });

    assert.equal(calls, 1);
    assert.equal(result.attempted, 1);
    assert.equal(result.uploaded, 1);
    assert.equal(result.remaining, 0);
    assert.equal(loadPendingUploads(pendingPath).entries.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

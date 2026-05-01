import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { DingTalkA1SyncConfig } from './config';
import {
  DingTalkA1Client,
  LocalDingTalkA1Store,
  pollDingTalkA1,
} from './dingtalkA1';

test('DingTalkA1Client calls list, detail, download info and summary APIs', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = new DingTalkA1Client({
    baseUrl: 'https://api.dingtalk.test',
    accessToken: 'token-1',
    fetchImpl: (async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/v1.0/dvi/device/audio/list')) {
        return jsonResponse({ result: [{ fileId: 'file-1' }], nextToken: '' });
      }
      if (String(url).endsWith('/v1.0/dvi/device/audio/get')) {
        return jsonResponse({ result: { fileId: 'file-1', fileName: 'recording' } });
      }
      if (String(url).endsWith('/v1.0/dvi/device/audio/download')) {
        return jsonResponse({ result: [{ url: 'https://download.test/file-1.m4a' }] });
      }
      if (String(url).includes('/v1.0/dvi/transcripts/summary?')) {
        return jsonResponse({ result: { content: '# 摘要' } });
      }
      throw new Error(`unexpected url ${String(url)}`);
    }) as typeof fetch,
  });

  await client.queryAudioFiles({
    deviceType: 'A1',
    sn: 'sn-1',
    maxResults: 10,
    startTimestamp: 1,
    endTimestamp: 2,
  });
  await client.getAudioFileInfo({ deviceType: 'A1', fileId: 'file-1' });
  await client.getAudioFileDownloadInfo({ deviceType: 'A1', fileId: 'file-1' });
  await client.getTranscriptSummary({ deviceType: 'A1', fileId: 'file-1' });

  assert.equal(calls.length, 4);
  assert.equal((calls[0].init?.headers as Record<string, string>)['x-acs-dingtalk-access-token'], 'token-1');
});

test('pollDingTalkA1 saves manifest and optionally downloads audio', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dingtalk-a1-'));
  try {
    const store = new LocalDingTalkA1Store(dir);
    const config: DingTalkA1SyncConfig = {
      enabled: true,
      baseUrl: 'https://api.dingtalk.test',
      accessToken: 'token-1',
      appKey: undefined,
      appSecret: undefined,
      snList: ['sn-1'],
      deviceType: 'A1',
      lookbackMs: 60_000,
      maxResults: 10,
      dataDir: dir,
      downloadAudio: true,
    };
    const client = {
      async queryAudioFiles() {
        return {
          result: [{
            fileId: 'file-1',
            fileName: '2026-04-27 录音',
            attributes: { businessOrder: 'order-1' },
          }],
        };
      },
      async getAudioFileInfo() {
        return { result: { fileId: 'file-1', duration: 5000, fileSize: 1000 } };
      },
      async getAudioFileDownloadInfo() {
        return { result: [{ url: 'https://download.test/file-1.m4a' }] };
      },
      async getTranscriptSummary() {
        return { result: { content: '# 摘要\n\n客户希望下周跟进。' } };
      },
      async download() {
        return { bytes: new Uint8Array([1, 2, 3]), contentType: 'audio/mp4' };
      },
    };

    const result = await pollDingTalkA1(
      config,
      { client, store },
      { info() {}, warn() {}, error() {} },
    );

    assert.equal(result.listed, 1);
    assert.equal(result.saved, 1);
    assert.equal(result.created, 1);
    assert.equal(result.audioDownloaded, 1);

    const manifestText = await readFile(join(dir, 'records', 'file-1.json'), 'utf8');
    const manifest = JSON.parse(manifestText);
    assert.equal(manifest.fileId, 'file-1');
    assert.equal(manifest.sn, 'sn-1');
    assert.equal(manifest.transcriptSummary.content, '# 摘要\n\n客户希望下周跟进。');
    assert.equal(manifest.audioPath, join(dir, 'audio', 'file-1.m4a'));
    assert.deepEqual(manifest.errors, []);
    assert.deepEqual(await store.listManifestFileIds(), ['file-1']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

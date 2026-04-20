import fs from 'fs';
import path from 'path';
import {
  createDianpingReviewBatch,
  uploadDianpingReviewBatch,
} from './apiClient';
import {
  normalizeDianpingReview,
  parseRawDianpingReviews,
} from './reviewNormalizer';

const INBOX_DIR = path.join(process.cwd(), 'data/inbox');

async function main(): Promise<void> {
  const mode = process.argv[2] || 'ingest-file';
  if (mode !== 'ingest-file') {
    throw new Error(`Unknown mode: ${mode}`);
  }

  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const projectId = process.env.DIANPING_PROJECT_ID || process.env.PROJECT_ID;
  if (!projectId) throw new Error('DIANPING_PROJECT_ID or PROJECT_ID is required');

  const samplePath = process.argv[3] || process.env.DIANPING_SAMPLE_PATH;
  if (!samplePath) throw new Error('DIANPING_SAMPLE_PATH or file argument is required');

  const capturedAt = new Date().toISOString();
  const raw = JSON.parse(fs.readFileSync(samplePath, 'utf8')) as unknown;
  const events = parseRawDianpingReviews(raw)
    .map(review => normalizeDianpingReview(review, capturedAt));
  const batch = createDianpingReviewBatch({ projectId, capturedAt, events });
  const inboxPath = path.join(INBOX_DIR, `dianping-reviews-${makeTimestamp()}.json`);
  fs.writeFileSync(inboxPath, JSON.stringify(batch, null, 2));
  console.log(`Saved ${events.length} Dianping review event(s): ${inboxPath}`);

  const apiBaseUrl = process.env.DIANPING_API_BASE_URL || process.env.API_BASE_URL;
  if (apiBaseUrl) {
    await uploadDianpingReviewBatch({
      apiBaseUrl,
      apiToken: process.env.DIANPING_API_TOKEN || process.env.API_TOKEN,
      batch,
    });
    console.log(`Uploaded ${events.length} Dianping review event(s) to api-service.`);
  }
}

function makeTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

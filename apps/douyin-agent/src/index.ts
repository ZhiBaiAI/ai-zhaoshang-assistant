import {
  launchBrowser,
  ensureLoggedIn,
  askUserToContinue,
  openCreatorCenter,
} from './browser';
import {
  DOUYIN_CREATOR_URL,
  scanForChatEntries,
  scoreChatCandidate,
  listSessions,
  switchToSession,
  scrollChatToTop,
  stripLocator,
  sessionToSummary,
  ChatEntryCandidate,
} from './douyin';
import { extractChat } from './extractChat';
import { runWatch } from './watch';
import { makeTimestamp } from './utils';
import path from 'path';
import fs from 'fs';
import { Page } from 'playwright';

function ensureOutputDirs(): void {
  ['data/captures', 'data/screenshots', 'debug'].forEach(dir => {
    fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
  });
}

async function ensureCreatorPage(page: Page): Promise<void> {
  if (!page.url().startsWith('https://creator.douyin.com/')) {
    await openCreatorCenter(page, DOUYIN_CREATOR_URL);
  }
  await ensureLoggedIn(page);
}

function saveJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

// ── start ────────────────────────────────────────────────────────────────────

async function runStart() {
  ensureOutputDirs();
  const browserSession = await launchBrowser();
  const { page } = browserSession;

  try {
    await openCreatorCenter(page, DOUYIN_CREATOR_URL);
    await ensureLoggedIn(page);

    console.log('\n--- Login/Setup Complete ---');
    console.log('You can now leave this browser open.');
    console.log('Open a NEW terminal and run:');
    console.log('  npm run inspect  - To see what chats are detected');
    console.log('  npm run capture  - To grab current active chat');
    console.log('  npm run scan     - To crawl all sidebar sessions');
    console.log('  npm run watch    - To keep polling DMs in read-only mode');
    console.log('----------------------------\n');

    await askUserToContinue('Press Enter here to close the browser (or just keep it running).');
  } finally {
    await browserSession.cleanup();
  }
}

// ── inspect ──────────────────────────────────────────────────────────────────

async function runInspect(page: Page) {
  ensureOutputDirs();
  console.log('Scanning for chat entrance candidates...');
  const candidates = await scanForChatEntries(page);
  const ts = makeTimestamp();
  const outPath = path.join(process.cwd(), `debug/inspect-${ts}.json`);
  const screenshotPath = path.join(process.cwd(), `data/screenshots/inspect-${ts}.png`);

  const data = {
    title: await page.title(),
    url: page.url(),
    candidateCount: candidates.length,
    candidates: candidates.map(stripLocator),
  };

  saveJson(outPath, data);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(error => {
    console.warn(`Failed to save inspect screenshot: ${String(error)}`);
  });
  console.log(`Found ${candidates.length} candidates.`);
  console.log(`Saved detailed inspect info to ${outPath}`);
  console.log(`Saved screenshot to ${screenshotPath}`);
}

// ── capture ──────────────────────────────────────────────────────────────────

async function runCapture(page: Page) {
  ensureOutputDirs();
  console.log('Scanning for chat entrance and sessions...');

  // 1. Try to get to the IM page and list sessions
  const sessions = await listSessions(page);
  
  if (sessions.length === 0) {
    console.log('No chat sessions found. Scanning for entry points...');
    const candidates = await scanForChatEntries(page);
    let clicked = false;

    if (candidates.length > 0) {
      const scored: Array<{ candidate: ChatEntryCandidate; score: number }> = candidates
        .filter(c => c.locator)
        .map(c => ({ candidate: c, score: c.score ?? scoreChatCandidate(c) }))
        .sort((a, b) => b.score - a.score);

      for (const { candidate } of scored) {
        const locator = candidate.locator;
        if (!locator) continue;
        try {
          await locator.click({ timeout: 3000 });
          console.log(`Clicked candidate: "${candidate.text}"`);
          await page.waitForTimeout(4000);
          clicked = true;
          break;
        } catch {
          console.log(`Failed to click candidate: "${candidate.text}"`);
        }
      }
    }

    if (!clicked) {
      const ts = makeTimestamp();
      const candidatesPath = path.join(process.cwd(), `debug/capture-candidates-${ts}.json`);
      saveJson(candidatesPath, {
        title: await page.title(),
        url: page.url(),
        candidates: candidates.map(stripLocator),
      });
      console.log(`Saved ${candidates.length} capture candidate(s) to ${candidatesPath}`);
      await askUserToContinue(
        'Please navigate to the DM / Chat page manually, then press Enter.',
      );
    }
  }

  // 2. Refresh sessions and check if we have an active one
  const updatedSessions = await listSessions(page);
  console.log(`Found ${updatedSessions.length} session(s).`);

  // 3. Capture chat content (from whatever is currently active on the right)
  console.log('Capturing active chat content...');
  const ts = makeTimestamp();
  const captureResult = await extractChat(page);
  
  // Attach the session list to the result
  captureResult.sessions = updatedSessions.map(sessionToSummary);

  const capturePath = path.join(process.cwd(), `data/captures/chat-${ts}.json`);
  const screenshotPath = path.join(process.cwd(), `data/screenshots/chat-${ts}.png`);

  saveJson(capturePath, captureResult);
  await page.screenshot({ path: screenshotPath });

  console.log(`Capture JSON saved to ${capturePath}`);
  console.log(`Screenshot saved to ${screenshotPath}`);
  console.log(`Session: "${captureResult.sessionTitle}"`);
  console.log(`Extracted ${captureResult.messages.length} message(s).`);
}

// ── scan (Multi-session) ──────────────────────────────────────────────────────

async function runScan(page: Page) {
  ensureOutputDirs();
  console.log('Starting multi-session scan...');
  
  const sessions = await listSessions(page);
  console.log(`Detected ${sessions.length} sessions in sidebar.`);

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    console.log(`\n[${i+1}/${sessions.length}] Processing: ${s.name}`);
    
    try {
      await switchToSession(page, s);
      await scrollChatToTop(page, 5); // Scroll up to load some history
      
      const captureResult = await extractChat(page);
      const ts = makeTimestamp();
      const sanitizedName = s.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || `session-${i + 1}`;
      const capturePath = path.join(process.cwd(), `data/captures/session-${sanitizedName}-${ts}.json`);
      
      captureResult.sessions = [sessionToSummary(s)];
      saveJson(capturePath, captureResult);
      console.log(`  Saved ${captureResult.messages.length} messages to ${path.basename(capturePath)}`);
    } catch (err) {
      console.error(`  Error processing session ${s.name}:`, err);
    }
  }
  
  console.log('\n--- Scan complete ---');
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] || 'start';

  if (mode === 'start') {
    await runStart();
  } else if (mode === 'watch') {
    await runWatch();
  } else if (mode === 'watch-once') {
    process.env.WATCH_ONCE = '1';
    await runWatch();
  } else {
    // For 'inspect', 'capture', or 'scan', connect via CDP
    const browserSession = await launchBrowser();
    const { page } = browserSession;
    try {
      await ensureCreatorPage(page);
      if (mode === 'inspect') {
        await runInspect(page);
      } else if (mode === 'capture') {
        await runCapture(page);
      } else if (mode === 'scan') {
        await runScan(page);
      } else {
        console.error(`Unknown mode: ${mode}`);
      }
    } finally {
      await browserSession.cleanup();
    }
  }
}

main();

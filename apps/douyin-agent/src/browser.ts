import { chromium, BrowserContext, Page, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import readline from 'readline/promises';

/**
 * Default profile directory lives outside the project to avoid Chromium
 * issues when the persistent profile sits inside the working tree on macOS.
 */
const DEFAULT_PROFILE_DIR = path.join(os.homedir(), '.douyin-dm-autoreply', 'browser-profile');

/** CDP port used for remote debugging, allows inspect/capture to connect to a running start session. */
const CDP_PORT = parseInt(process.env.CDP_PORT || '19222', 10);

export function getProfileDir(): string {
  return path.resolve(process.env.BROWSER_PROFILE_DIR || DEFAULT_PROFILE_DIR);
}

/**
 * Represents a browser session. Call `cleanup()` when done:
 *  - For a **launched** session it closes the browser.
 *  - For a **connected** (CDP) session it merely disconnects without killing the browser.
 */
export interface BrowserSession {
  context: BrowserContext;
  page: Page;
  /** True when we connected to an already-running browser instead of launching a new one. */
  isConnected: boolean;
  cleanup: () => Promise<void>;
}

/**
 * Try to connect to an already-running browser via CDP (e.g. one started by `npm run start`).
 */
async function tryConnectCDP(): Promise<BrowserSession | null> {
  try {
    const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, {
      timeout: 3000,
    });
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      await browser.close();
      return null;
    }
    const context = contexts[0];
    const page = context.pages()[0] || (await context.newPage());
    return {
      context,
      page,
      isConnected: true,
      cleanup: async () => {
        // Leave an externally-started browser alive. The Node process exit will
        // tear down this CDP client connection.
      },
    };
  } catch {
    return null;
  }
}

/**
 * Remove Chrome singleton lock files that prevent a second launch after a crash.
 */
function cleanStaleLockFiles(profilePath: string): void {
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const p = path.join(profilePath, name);
    try {
      fs.unlinkSync(p);
    } catch {
      // file doesn't exist or isn't removable — fine
    }
  }
}

/**
 * Launch (or connect to) a browser.
 *
 * Strategy:
 *  1. Try CDP connect on 127.0.0.1:CDP_PORT   → reuse existing browser
 *  2. Clean stale lock files, then launchPersistentContext with --remote-debugging-port
 */
export async function launchBrowser(): Promise<BrowserSession> {
  // ── attempt 1: connect to running browser ──
  const existing = await tryConnectCDP();
  if (existing) {
    console.log(`Connected to existing browser via CDP (port ${CDP_PORT}).`);
    return existing;
  }

  // ── attempt 2: launch a fresh browser ──
  const profilePath = getProfileDir();
  fs.mkdirSync(profilePath, { recursive: true });
  cleanStaleLockFiles(profilePath);
  console.log(`Launching new browser (profile: ${profilePath}, CDP port: ${CDP_PORT})...`);

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process', // Help with about:blank on macOS
    ],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  return {
    context,
    page,
    isConnected: false,
    cleanup: async () => {
      await context.close();
    },
  };
}

/**
 * Navigate to the Douyin Creator Center with a resilient strategy:
 *  - Uses 'domcontentloaded' with a 60 s timeout.
 *  - If the timeout fires but the page is no longer about:blank we warn and continue.
 *  - If still on about:blank we throw with actionable advice.
 */
export async function openCreatorCenter(page: Page, url: string): Promise<void> {
  console.log(`Navigating to ${url}...`);
  try {
    // Sometimes explicit double-navigation helps with macOS hangs
    await page.goto('about:blank').catch(() => {});
    await page.waitForTimeout(500);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error: any) {
    const currentUrl = page.url();
    if (currentUrl && currentUrl !== 'about:blank') {
      console.warn(
        `\n⚠️  Navigation timeout, but page seems partially loaded at ${currentUrl}. Continuing...\n`,
      );
    } else {
      throw new Error(
        `Browser is stuck on about:blank after 60 s.\n` +
          `This usually happens when the persistent profile directory is inside the project folder on macOS.\n` +
          `Current profile: ${getProfileDir()}\n` +
          `Try: BROWSER_PROFILE_DIR=/tmp/douyin-browser-profile npm run ${process.argv[2] || 'start'}`,
      );
    }
  }
}

export async function askUserToContinue(
  promptText: string = 'Please complete the manual action in the browser, then press Enter to continue...',
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await rl.question(
    `\n======================================================\n⚠️  ${promptText}\n======================================================\n\n`,
  );
  rl.close();
}

export async function ensureLoggedIn(page: Page): Promise<void> {
  console.log('Checking login status or verification pages...');
  // Wait a bit for redirects
  await page.waitForTimeout(3000);

  let needsManualWait = false;
  const url = page.url();
  if (url.includes('login') || url.includes('passport')) {
    needsManualWait = true;
    console.log('Detected login/passport URL.');
  } else {
    // Check for common verification text
    const textToCheck = ['验证码', '向右滑动', '安全验证', '请完成安全验证'];
    for (const text of textToCheck) {
      if ((await page.getByText(text, { exact: false }).count()) > 0) {
        needsManualWait = true;
        console.log(`Detected security/captcha keyword: ${text}`);
        break;
      }
    }
  }

  if (needsManualWait) {
    await askUserToContinue(
      'Detected login or security verification. Please complete it manually in the browser, and press Enter here when you are done.',
    );
    // Check again? For MVP, we trust the user.
  } else {
    console.log('No obvious login/verification block detected.');
  }
}

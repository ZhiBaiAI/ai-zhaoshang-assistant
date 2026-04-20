import { Page, Locator } from 'playwright';
import { ChatSessionSummary } from './types';

export const DOUYIN_CREATOR_URL = 'https://creator.douyin.com/';

export const CANDIDATE_DM_TEXTS = [
  '私信',
  '消息',
  '互动管理',
  '用户消息',
  '粉丝群聊',
  '客服',
  '私信管理'
];

export interface Session {
  name: string;
  unreadCount: number;
  lastMessage: string;
  time: string;
  index: number;
  clickX?: number;
  clickY?: number;
  locator: Locator;
}

export interface ChatEntryCandidate {
  text: string;
  /** Truncated outerHTML for debugging (max 300 chars) */
  html: string;
  role?: string | null;
  ariaLabel?: string | null;
  title?: string | null;
  href?: string | null;
  tag: string;
  selectorIndex?: number;
  score?: number;
  /** Playwright locator, stripped before serialisation */
  locator?: Locator;
}

export interface SendReplyOptions {
  dryRun?: boolean;
}

export function stripLocator<T extends { locator?: Locator }>(value: T): Omit<T, 'locator'> {
  const { locator: _locator, ...rest } = value;
  return rest;
}

export function sessionToSummary(session: Session): ChatSessionSummary {
  return {
    name: session.name,
    unreadCount: session.unreadCount,
    lastMessage: session.lastMessage,
    time: session.time,
    index: session.index,
  };
}

async function maybeClick(locator: Locator, timeout = 2500): Promise<boolean> {
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function softGoto(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch {
    if (page.url() === 'about:blank') {
      throw new Error(`Failed to open ${url}; page stayed on about:blank.`);
    }
    console.warn(`Navigation to ${url} timed out, continuing at ${page.url()}.`);
  }
}

/**
 * List the current chat sessions from the IM/private message page.
 */
export async function listSessions(page: Page): Promise<Session[]> {
  const targetUrl = 'https://creator.douyin.com/creator-micro/data/following/chat';
  
  // 1. Try to get to the correct URL
  if (!page.url().includes('/following/chat')) {
    console.log('Not on IM page. Attempting navigation...');
    
    // Try expanding Interaction Management first (UI way)
    const interactionMenu = page.locator('[role="menuitem"]').filter({ hasText: '互动管理' }).first();
    if (await interactionMenu.count() > 0) {
       await maybeClick(interactionMenu);
       await page.waitForTimeout(1000);
    }

    const sixin = page.locator('a, li, div').filter({ hasText: /^私信管理$|^私信$/ }).first();
    if (await sixin.count() > 0) {
      await maybeClick(sixin);
    } else {
      // Fallback: direct navigation
      console.log(`Directly navigating to ${targetUrl}`);
      await softGoto(page, targetUrl);
    }
    await page.waitForTimeout(3000);
  }

  // 2. Wait briefly for a list to appear; keep going so capture can still dump debug data.
  await page
    .waitForSelector('.semi-list-item, [class*="item-header-name"], [class*="chat-content"]', {
      timeout: 10000,
    })
    .catch(() => null);

  const sessions = await page.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.semi-list-item')).map((item, domIndex) => ({
      item,
      domIndex,
    })).filter(({ item }) => {
      const rect = item.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return Boolean(item.querySelector('[class*="item-header-name"], [class*="item-content"]'));
    });

    const parseUnread = (text) => {
      const match = (text || '').match(/\\d+/);
      return match ? Number(match[0]) : 0;
    };

    return items.map(({ item, domIndex }) => {
      const rect = item.getBoundingClientRect();
      const nameEl = item.querySelector('[class*="item-header-name"]');
      const timeEl = item.querySelector('[class*="item-header-time"]');
      const lastMsgEl = item.querySelector('[class*="item-content"]');
      const unreadEl = item.querySelector('.semi-badge-count');

      return {
        name: nameEl?.textContent?.trim() || 'Unknown User',
        unreadCount: parseUnread(unreadEl?.textContent?.trim()),
        lastMessage: lastMsgEl?.textContent?.trim() || '',
        time: timeEl?.textContent?.trim() || '',
        index: domIndex,
        clickX: Math.round(rect.left + rect.width / 2),
        clickY: Math.round(rect.top + rect.height / 2)
      };
    }).filter(item => item.name !== 'Unknown User' || item.lastMessage);
  })()`) as Array<Omit<Session, 'locator'>>;

  return sessions.map(s => ({
    ...s,
    locator: page.locator('.semi-list-item').nth(s.index)
  }));
}

/**
 * Switch to a specific session by clicking its locator and waiting for the 
 * right-side chat header to update to the session's name.
 */
export async function switchToSession(page: Page, session: Session) {
  console.log(`Switching to session: ${session.name}`);
  let clicked = false;

  if (typeof session.clickX === 'number' && typeof session.clickY === 'number') {
    await page.mouse.click(session.clickX, session.clickY).then(() => {
      clicked = true;
    }).catch(() => null);
  }

  const clickedByDom = clicked || await page.evaluate(`(target) => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, '');
    const targetName = normalize(target.name);
    const targetLastMessage = normalize(target.lastMessage);
    const items = Array.from(document.querySelectorAll('.semi-list-item'));
    const visibleMatch = items.find((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const text = normalize(item.textContent);
      return text.includes(targetName) || Boolean(targetLastMessage && text.includes(targetLastMessage));
    });
    const fallbackMatch = visibleMatch || items.find((item) => {
      const text = normalize(item.textContent);
      return text.includes(targetName) || Boolean(targetLastMessage && text.includes(targetLastMessage));
    });

    if (!fallbackMatch) return false;
    fallbackMatch.scrollIntoView({ block: 'nearest' });
    fallbackMatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fallbackMatch.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    fallbackMatch.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }`, { name: session.name, lastMessage: session.lastMessage }) as boolean;

  if (!clickedByDom) {
    await session.locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => null);
    await session.locator.click({ timeout: 5000 });
  }
  
  // Wait for the header in the chat box to match the session name
  await page.waitForFunction(
    `(name) => {
      const selectors = [
        '.box-header-name-z3_MyF', 
        '[class*="header-name"]', 
        '[class*="chat-header"] [class*="name"]', 
        '[class*="conversation-header"] [class*="title"]',
        'h1', 'h2', 'h3'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim() === name) return true;
      }
      return false;
    }`,
    session.name,
    { timeout: 5000 }
  ).catch(() => {
    console.warn(`Timeout waiting for chat header to match "${session.name}"`);
  });
  
  await page.waitForTimeout(1000); // Buffer for message rendering
}

/**
 * Scroll the chat history upwards to load older messages.
 */
export async function scrollChatToTop(page: Page, maxScrolls: number = 8) {
  const containerSelector = '.box-content-qyCVPY, [class*="box-content"], .chat-content, .im-message-list';
  console.log('Scrolling up to load more messages...');

  for (let i = 0; i < maxScrolls; i++) {
    const prevCount = await page.evaluate(`(sel) => {
      const el = document.querySelector(sel);
      if (!el) return 0;
      el.scrollTop = 0;
      return el.children.length;
    }`, containerSelector) as number;

    await page.waitForTimeout(1500); // Wait for potential "Load More" trigger

    const currentCount = await page.evaluate(`(sel) => {
      const el = document.querySelector(sel);
      return el ? el.children.length : 0;
    }`, containerSelector) as number;

    if (currentCount === prevCount && i > 1) {
      console.log(`No more messages loaded after ${i + 1} scrolls.`);
      break;
    }
  }
}

export async function sendReplyToSession(
  page: Page,
  session: Session,
  text: string,
  options: SendReplyOptions = {},
): Promise<void> {
  await switchToSession(page, session);
  await sendReplyToCurrentSession(page, text, options);
}

export async function sendReplyToCurrentSession(
  page: Page,
  text: string,
  options: SendReplyOptions = {},
): Promise<void> {
  const inputReady = await page.evaluate((replyText) => {
    const candidates = Array.from(document.querySelectorAll([
      'textarea',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[class*="input"] textarea',
      '[class*="editor"] [contenteditable="true"]',
    ].join(','))) as HTMLElement[];

    const target = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const disabled = el.getAttribute('disabled') !== null || el.getAttribute('aria-disabled') === 'true';
      return !disabled;
    });

    if (!target) return false;
    target.focus();
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      target.value = replyText;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      target.textContent = replyText;
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replyText }));
    }
    return true;
  }, text);

  if (!inputReady) {
    throw new Error('Reply input box not found');
  }

  await page.waitForTimeout(300);
  if (options.dryRun) return;

  const clickedSend = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]')) as HTMLElement[];
    const sendButton = buttons.find((button) => {
      const rect = button.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const text = button.textContent?.trim() || '';
      const aria = button.getAttribute('aria-label') || '';
      const disabled = button.getAttribute('disabled') !== null || button.getAttribute('aria-disabled') === 'true';
      return !disabled && (text === '发送' || aria.includes('发送'));
    });
    if (!sendButton) return false;
    sendButton.click();
    return true;
  }) as boolean;

  if (!clickedSend) {
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(800);
}

/**
 * Scan the current page for clickable elements whose text matches
 * known DM / chat entry keywords.
...
 */
export async function scanForChatEntries(page: Page): Promise<ChatEntryCandidate[]> {
  const candidates: ChatEntryCandidate[] = [];
  const seenHtml = new Set<string>();

  const addCandidate = async (loc: Locator, selectorIndex: number) => {
    const isVisible = await loc.isVisible().catch(() => false);
    if (!isVisible) return;

    const info = await loc
      .evaluate((el: Element) => {
        const clickable =
          el.closest('a, button, [role="button"], [role="menuitem"]') || el;
        const html = clickable.outerHTML.substring(0, 300);
        return {
          html,
          text: (clickable as HTMLElement).textContent?.trim() || '',
          role: clickable.getAttribute('role'),
          ariaLabel: clickable.getAttribute('aria-label'),
          title: clickable.getAttribute('title'),
          href: clickable.getAttribute('href'),
          tagName: clickable.tagName.toLowerCase(),
        };
      })
      .catch(() => null);

    if (!info || seenHtml.has(info.html)) return;
    seenHtml.add(info.html);
    const candidate: ChatEntryCandidate = {
      text: info.text,
      html: info.html,
      role: info.role,
      ariaLabel: info.ariaLabel,
      title: info.title,
      href: info.href,
      tag: info.tagName,
      selectorIndex,
      locator: loc.locator('xpath=ancestor-or-self::*[self::a or self::button or @role="button" or @role="menuitem"][1]').first(),
    };
    candidate.score = scoreChatCandidate(candidate);
    candidates.push(candidate);
  };

  // --- Pass 1: text-based scanning ---
  for (const matchText of CANDIDATE_DM_TEXTS) {
    const locators = page.getByText(matchText, { exact: false });
    const count = await locators.count();
    for (let i = 0; i < count; i++) {
      await addCandidate(locators.nth(i), i);
    }
  }

  // --- Pass 2: interactive-element scanning ---
  const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [role="menuitem"]';
  const interactive = page.locator(INTERACTIVE_SELECTOR);
  const interactiveCount = await interactive.count();
  for (let i = 0; i < interactiveCount; i++) {
    const loc = interactive.nth(i);
    const matches = await loc
      .evaluate((el: Element, keywords: string[]) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const combined = [
          (el as HTMLElement).textContent?.trim() || '',
          el.getAttribute('aria-label') || '',
          el.getAttribute('title') || '',
          el.getAttribute('href') || '',
        ].join(' ');
        return keywords.some(kw => combined.includes(kw));
      }, CANDIDATE_DM_TEXTS)
      .catch(() => false);
    if (matches) await addCandidate(loc, i);
  }

  return candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Score a candidate for how likely it is a real chat page entry.
 * Higher is better.
 */
export function scoreChatCandidate(c: ChatEntryCandidate): number {
  let score = 0;
  // Clickable tags
  if (['a', 'button'].includes(c.tag)) score += 3;
  if (c.role === 'button' || c.role === 'menuitem') score += 2;
  // href pointing to known DM URLs
  if (c.href && (c.href.includes('im') || c.href.includes('message') || c.href.includes('chat'))) {
    score += 5;
  }
  // Specific text matches (shorter = more specific)
  if (c.text === '私信管理') score += 6;
  if (c.text === '私信') score += 4;
  if (c.text.includes('私信管理')) score += 4;
  if (c.text === '消息') score += 3;
  if (c.text === '客服') score += 2;
  if (c.text === '互动管理') score += 2;
  // Penalise very long text — it's likely a container, not a button
  if (c.text.length > 30) score -= 3;
  return score;
}

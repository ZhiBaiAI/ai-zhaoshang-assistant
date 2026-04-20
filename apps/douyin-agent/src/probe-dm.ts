#!/usr/bin/env -S npx tsx
/**
 * One-shot DOM probe: navigates to the DM section and dumps structure.
 * Saves screenshot + DOM info to debug/dm-probe-*.json
 * 
 * NOTE: All page.evaluate callbacks must be pure JS with NO helper functions
 * defined in outer scope (tsx injects __name helpers that break in browser).
 */
import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';

const profilePath = process.env.BROWSER_PROFILE_DIR ||
  path.join(os.homedir(), '.douyin-dm-autoreply', 'browser-profile');

const CDP_PORT = 19222;

async function connectOrLaunch() {
  try {
    const b = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 2000 });
    const ctx = b.contexts()[0];
    return { page: ctx.pages()[0] || await ctx.newPage(), close: async () => { try { await b.close(); } catch {} } };
  } catch {}
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    try { fs.unlinkSync(path.join(profilePath, name)); } catch {}
  }
  fs.mkdirSync(profilePath, { recursive: true });
  const ctx = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: [`--remote-debugging-port=${CDP_PORT}`],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  return { page: p, close: async () => ctx.close() };
}

async function main() {
  fs.mkdirSync('debug', { recursive: true });
  fs.mkdirSync('data/screenshots', { recursive: true });

  const { page, close } = await connectOrLaunch();

  console.log('Navigating to creator center...');
  try {
    await page.goto('https://creator.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch {
    if (page.url() === 'about:blank') { console.error('stuck on about:blank'); await close(); process.exit(1); }
    console.warn('nav timeout, continuing...');
  }
  await page.waitForTimeout(3000);

  const ts = new Date().toISOString().replace(/[:.T-]/g, '').slice(0, 14);

  // ── Try to find and navigate to DM/IM page ──
  // First check what nav links exist
  const navLinks = await page.$$eval('a[href]', (els: Element[]) =>
    els.map(el => ({ href: (el as HTMLAnchorElement).href, text: (el as HTMLElement).textContent?.trim().slice(0, 40) }))
       .filter(l => l.href && (l.href.includes('im') || l.href.includes('interaction') || l.href.includes('comment') || l.href.includes('message') || l.href.includes('private')))
  );
  console.log('Nav links with IM-related hrefs:', JSON.stringify(navLinks, null, 2));

  // Try expanding 互动管理 via menuitem click
  const interactionMenu = page.locator('[role="menuitem"]').filter({ hasText: '互动管理' }).first();
  if (await interactionMenu.count() > 0) {
    const expanded = await interactionMenu.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      console.log('Clicking 互动管理 to expand...');
      await interactionMenu.click();
      await page.waitForTimeout(1500);
    }
  }

  // Dump all links after expanding
  const allLinks = await page.$$eval('a[href]', (els: Element[]) =>
    els.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).map(el => ({ href: (el as HTMLAnchorElement).href, text: (el as HTMLElement).textContent?.trim().slice(0, 40) }))
  );
  console.log('All visible links after expand:', JSON.stringify(allLinks, null, 2));

  // Try to find 私信 link and click it
  let dmUrl = '';
  const sixinLink = page.locator('a').filter({ hasText: '私信' }).first();
  if (await sixinLink.count() > 0) {
    dmUrl = (await sixinLink.getAttribute('href')) || '';
    console.log(`Found 私信 link: ${dmUrl}`);
    await sixinLink.click();
    await page.waitForTimeout(3000);
  }

  // Also try 私信管理 button
  if (!dmUrl) {
    const mgmtBtn = page.locator('[class*="button"]').filter({ hasText: '私信管理' }).first();
    if (await mgmtBtn.count() > 0) {
      console.log('Clicking 私信管理...');
      await mgmtBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  const landedUrl = page.url();
  console.log(`Final URL: ${landedUrl}`);
  await page.screenshot({ path: `data/screenshots/dm-probe-${ts}.png` });

  // ── DOM dump using IIFE string to avoid __name injection ──
  const domScript = `(() => {
    const result = {
      url: location.href,
      title: document.title,
      visibleElements: [],
      chatListCandidates: [],
      messageCandidates: [],
      allClassesSample: []
    };

    // Collect unique class names for analysis
    const classSet = new Set();
    document.querySelectorAll('[class]').forEach(el => {
      const cls = el.className;
      if (typeof cls === 'string') {
        cls.split(' ').filter(Boolean).forEach(c => classSet.add(c));
      }
    });
    result.allClassesSample = Array.from(classSet).slice(0, 200);

    // Visible leaf-level elements with text
    const allEls = Array.from(document.querySelectorAll('*'));
    const seen = new Set();
    for (const el of allEls) {
      const text = el.textContent && el.textContent.trim();
      if (!text || text.length < 2 || text.length > 100) continue;
      if (el.children.length > 6) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const key = el.tagName + '|' + (el.className || '') + '|' + text.slice(0, 30);
      if (seen.has(key)) continue;
      seen.add(key);
      result.visibleElements.push({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 5).join(' ') : '',
        role: el.getAttribute('role') || undefined,
        href: el.getAttribute('href') || undefined,
        text: text.slice(0, 80),
        x: Math.round(rect.left), y: Math.round(rect.top),
        w: Math.round(rect.width), h: Math.round(rect.height),
      });
      if (result.visibleElements.length >= 400) break;
    }

    // Chat session / conversation list candidates - keyword based class search
    const chatKeywords = ['session', 'conversation', 'chat', 'im', 'inbox', 'contact', 'SessionItem', 'ConvItem', 'ImItem', 'user-item'];
    for (const kw of chatKeywords) {
      const nodes = document.querySelectorAll('[class*="' + kw + '"]');
      nodes.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        result.chatListCandidates.push({
          kw,
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
          text: (el.textContent || '').trim().slice(0, 100),
          outerHTML: el.outerHTML.slice(0, 500),
          x: Math.round(rect.left), y: Math.round(rect.top),
        });
      });
    }

    // Message bubble candidates
    const msgKeywords = ['bubble', 'Bubble', 'msg-content', 'message-content', 'MessageContent', 'chat-msg', 'im-message'];
    for (const kw of msgKeywords) {
      const nodes = document.querySelectorAll('[class*="' + kw + '"]');
      nodes.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        result.messageCandidates.push({
          kw,
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
          text: (el.textContent || '').trim().slice(0, 100),
          outerHTML: el.outerHTML.slice(0, 500),
        });
      });
    }

    return result;
  })()`;

  const domDump = await page.evaluate(domScript) as any;

  const outPath = `debug/dm-probe-${ts}.json`;
  fs.writeFileSync(outPath, JSON.stringify(domDump, null, 2));
  console.log(`\nDOM dump saved: ${outPath}`);
  console.log(`Screenshot: data/screenshots/dm-probe-${ts}.png`);
  console.log(`visibleElements: ${domDump.visibleElements.length}`);
  console.log(`chatListCandidates: ${domDump.chatListCandidates.length}`);
  console.log(`messageCandidates: ${domDump.messageCandidates.length}`);
  console.log('\nSample classes (for selector hunting):');
  console.log(domDump.allClassesSample.filter((c: string) =>
    /im|chat|session|msg|bubble|conversation|inbox|private|dm|sixin/i.test(c)
  ).slice(0, 40));

  await close();
}

main().catch(e => { console.error(e); process.exit(1); });

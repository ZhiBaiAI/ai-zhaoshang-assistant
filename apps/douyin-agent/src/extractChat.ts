import { Page } from 'playwright';
import { CaptureResult, ChatMessage, MessageDirection } from './types';

/**
 * Extract the visible chat messages from the current page.
 *
 * Session title priority:
 *  1. Visible heading / title element inside the chat area
 *  2. document.title (stripped of generic boilerplate)
 *  3. Fallback: 'Unknown Session'
 */
export async function extractChat(page: Page): Promise<CaptureResult> {
  // We use evaluate with a pure browser function to avoid tsx transpilation injecting __name
  return page.evaluate((): CaptureResult => {
    // ---------- session title ----------
    let sessionTitle = '';

    // Priority 1 – chat header name
    const titleSelectors = [
      '.box-header-name-z3_MyF',
      '[class*="header-name"]',
      '[class*="box-header"] [class*="name"]',
      '[class*="chat-header"] [class*="name"]',
      '[class*="conversation-header"] [class*="title"]',
      '.semi-list-item-selected [class*="item-header-name"]', // If selected in list
      'h1', 'h2', 'h3'
    ];

    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && (el as HTMLElement).getBoundingClientRect().width > 0) {
          sessionTitle = text;
          break;
        }
      }
    }

    // Priority 2 – document.title
    if (!sessionTitle) {
      const raw = document.title || '';
      sessionTitle = raw.replace(/\s*[-–—|].*$/, '').trim();
    }

    if (!sessionTitle) {
      sessionTitle = 'Unknown Session';
    }

    // ---------- messages ----------
    const messages: ChatMessage[] = [];
    const seenTexts = new Set<string>();
    let currentTime = '';

    const chatPane = document.querySelector('.box-content-qyCVPY') || 
                     document.querySelector('[class*="box-content"]') ||
                     document.querySelector('.chat-content') || 
                     document.querySelector('.im-message-list') ||
                     document.body;

    const itemElements = new Set<Element>();
    
    // Strategy 1: Known or guessable classes for items
    const itemSelector =
      '[class*="box-item"], [class*="msg-item"], [class*="message-item"], [class*="time"], [class*="tip"]';
    chatPane.querySelectorAll(itemSelector).forEach(el => itemElements.add(el));
    if (itemElements.size === 0) {
      document.querySelectorAll(itemSelector).forEach(el => itemElements.add(el));
    }
    
    // Strategy 2: If we didn't find any or just a few, grab direct children if chatPane isn't body
    if (chatPane !== document.body) {
      Array.from(chatPane.children).forEach(el => itemElements.add(el));
    }

    // Convert to array and filter out elements with no size
    let messageItems = Array.from(itemElements).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // Sort by vertical position to ensure chronology
    messageItems.sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    const chatPaneRect = chatPane.getBoundingClientRect();
    const chatPaneCenter = chatPaneRect.left + (chatPaneRect.width / 2);

    for (const el of messageItems) {
      const element = el as HTMLElement;
      // Use innerText if available (ignores hidden text), fallback to textContent
      if (
        element.closest('[contenteditable="true"], textarea, input, button, [class*="chat-editor"], [class*="chat-footer"]')
      ) {
        continue;
      }

      const text = element.innerText?.trim() || element.textContent?.trim();
      if (!text || text.length < 1) continue;
      if (/按回车.*发送|shift\+enter|发送$/.test(text)) continue;

      // Check if this text is fully contained within another already processed element 
      // (happens if we snagged both parent and child). We track exact text matches to avoid duplicates.
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      let direction: MessageDirection = 'incoming';
      let isSystem = false;
      const className = (element.className || '').toLowerCase();
      const looksLikeTime = /^\d{4}[-/年]\d{1,2}[-/月]\d{1,2}|\d{1,2}:\d{2}|昨天|今天|星期|周[一二三四五六日天]/.test(text);

      // Explicit hints from class names
      if (className.includes('time') || className.includes('tip') || className.includes('system') || looksLikeTime) {
        isSystem = true;
      } else if (className.includes('is-me') || className.includes('outgoing') || className.includes('right')) {
        direction = 'outgoing';
      } else if (className.includes('incoming') || className.includes('left')) {
        direction = 'incoming';
      } else {
        // Layout-based inference fallback
        const rect = element.getBoundingClientRect();
        
        // Find the actual message bubble inside (often the one with background or just first child)
        const bubble = element.querySelector('[class*="bubble"], [class*="content"], [style*="background"]') || element;
        const bubbleRect = bubble.getBoundingClientRect();
        const bubbleCenter = bubbleRect.left + (bubbleRect.width / 2);

        // Very centered = probably system/time tip
        if (Math.abs(bubbleCenter - chatPaneCenter) < 40 && bubbleRect.width < chatPaneRect.width * 0.6) {
          isSystem = true;
        } 
        // Bubble is heavily on the right side
        else if (bubbleRect.left > chatPaneCenter || (bubbleRect.right > chatPaneRect.right - 40 && bubbleRect.left > chatPaneRect.left + 40)) {
          direction = 'outgoing';
        }
        // Bubble is heavily on the left side
        else if (bubbleRect.right < chatPaneCenter || (bubbleRect.left < chatPaneRect.left + 40 && bubbleRect.right < chatPaneRect.right - 40)) {
          direction = 'incoming';
        }
      }

      if (looksLikeTime) {
        currentTime = text;
      }

      messages.push({
        direction: isSystem ? 'system' : direction,
        text,
        time: isSystem ? undefined : currentTime || undefined,
        rawHtml: element.outerHTML.slice(0, 200),
      });
    }

    return {
      sessionTitle,
      messages,
      timestamp: new Date().toISOString(),
    };
  });
}

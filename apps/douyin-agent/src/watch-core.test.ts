import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMessageEvents,
  createInitialWatchState,
  makeMessageKey,
  normalizeMessageText,
  parseBooleanFlag,
  parsePositiveInt,
  pruneSeenKeys,
  safeFilePart,
  selectSessions,
} from './watch-core';
import { ChatSessionSummary } from './types';

const session: ChatSessionSummary = {
  name: '张三',
  unreadCount: 1,
  lastMessage: '你好',
  time: '10:30',
  index: 3,
};

test('normalizes message text for stable dedupe', () => {
  assert.equal(normalizeMessageText('  你好\n  加盟  '), '你好 加盟');
});

test('message key ignores sidebar index changes', () => {
  const first = makeMessageKey(session, {
    direction: 'incoming',
    text: '想了解加盟',
    time: '10:31',
  });
  const second = makeMessageKey({ ...session, index: 9 }, {
    direction: 'incoming',
    text: '想了解加盟',
    time: '10:31',
  });

  assert.equal(first, second);
});

test('buildMessageEvents emits only new non-system messages', () => {
  const state = createInitialWatchState();
  const first = buildMessageEvents({
    session,
    state,
    capturedAt: '2026-04-17T10:00:00.000Z',
    emitEvents: true,
    messages: [
      { direction: 'system', text: '今天 10:30' },
      { direction: 'incoming', text: ' 想了解加盟 ', time: '10:31' },
      { direction: 'outgoing', text: '您好，请问您在哪个城市？', time: '10:32' },
    ],
  });

  assert.equal(first.length, 2);
  assert.equal(first[0].schemaVersion, 1);
  assert.equal(first[0].source, 'douyin');
  assert.equal(first[0].type, 'message.created');
  assert.equal(first[0].message.text, '想了解加盟');

  const second = buildMessageEvents({
    session,
    state,
    capturedAt: '2026-04-17T10:01:00.000Z',
    emitEvents: true,
    messages: [
      { direction: 'incoming', text: '想了解加盟', time: '10:31' },
      { direction: 'incoming', text: '加盟费多少', time: '10:33' },
    ],
  });

  assert.equal(second.length, 1);
  assert.equal(second[0].message.text, '加盟费多少');
});

test('buildMessageEvents can seed state without emitting bootstrap events', () => {
  const state = createInitialWatchState();
  const events = buildMessageEvents({
    session,
    state,
    capturedAt: '2026-04-17T10:00:00.000Z',
    emitEvents: false,
    messages: [
      { direction: 'incoming', text: '历史消息', time: '09:00' },
    ],
  });

  assert.equal(events.length, 0);
  assert.equal(Object.keys(state.seenMessageKeys).length, 1);
});

test('selectSessions scans all on first loop, otherwise unread sessions by default', () => {
  const sessions = [
    { unreadCount: 0, name: 'a' },
    { unreadCount: 2, name: 'b' },
    { unreadCount: 1, name: 'c' },
  ];

  assert.deepEqual(
    selectSessions(sessions, true, { scanAllEachTick: false, maxSessions: 2 }).map(s => s.name),
    ['a', 'b'],
  );
  assert.deepEqual(
    selectSessions(sessions, false, { scanAllEachTick: false, maxSessions: 5 }).map(s => s.name),
    ['b', 'c'],
  );
  assert.deepEqual(
    selectSessions(sessions, false, { scanAllEachTick: true, maxSessions: 2 }).map(s => s.name),
    ['a', 'b'],
  );
});

test('parses env-style flags and integers', () => {
  assert.equal(parsePositiveInt('15', 30), 15);
  assert.equal(parsePositiveInt('0', 30), 30);
  assert.equal(parsePositiveInt('abc', 30), 30);
  assert.equal(parseBooleanFlag('1'), true);
  assert.equal(parseBooleanFlag('true'), true);
  assert.equal(parseBooleanFlag('no'), false);
  assert.equal(parseBooleanFlag(undefined, true), true);
});

test('safeFilePart removes path separators and keeps fallback', () => {
  assert.equal(safeFilePart('a/b:c*?'), 'a_b_c__');
  assert.equal(safeFilePart(''), 'session');
});

test('pruneSeenKeys keeps newest timestamps', () => {
  const state = createInitialWatchState();
  state.seenMessageKeys.a = '2026-04-17T10:00:00.000Z';
  state.seenMessageKeys.b = '2026-04-17T10:01:00.000Z';
  state.seenMessageKeys.c = '2026-04-17T10:02:00.000Z';

  pruneSeenKeys(state, 2);

  assert.deepEqual(Object.keys(state.seenMessageKeys).sort(), ['b', 'c']);
});

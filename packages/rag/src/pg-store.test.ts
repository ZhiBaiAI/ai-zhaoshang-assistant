import assert from 'node:assert/strict';
import test from 'node:test';
import { toPgVector } from './pg-store';

test('toPgVector serializes vectors for pgvector', () => {
  assert.equal(toPgVector([0.1, -0.2, Number.NaN]), '[0.1,-0.2,0]');
});

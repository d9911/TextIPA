import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadingTimer } from '../src/domain/reading-timer.ts';
import { durationMs } from '../src/domain/library.ts';

test('pause freezes remaining time and resume does not restart the phrase', () => {
  const timer = new ReadingTimer();
  assert.equal(timer.start(10000, 1000), 10000);
  timer.pause(4000);
  assert.equal(timer.remaining(50000), 7000);
  assert.equal(timer.start(10000, 60000, true), 7000);
  assert.equal(timer.total, 10000);
  assert.equal(timer.remaining(63000), 4000);
  timer.pause(63000);
  timer.start(10000, 70000, true);
  assert.equal(timer.remaining(74000), 0);
});
test('new phrase, pace changes and reset discard a paused countdown', () => {
  const timer = new ReadingTimer();
  timer.start(10000, 0);
  timer.pause(2000);
  timer.start(5000, 3000);
  assert.equal(timer.remaining(4000), 4000);
  timer.pause(4000);
  timer.reset();
  assert.equal(timer.paused, false);
  assert.equal(timer.running, false);
  assert.equal(timer.start(2000, 5000, true), 2000);
  assert.equal(timer.remaining(8000), 0);
});
test('reading pace includes the pause and uses the selected text word count', () => {
  assert.equal(durationMs('один два три четыре', 120, 1000), 3000);
  assert.equal(durationMs('uno dos', 60, 1000, 2), 4000);
});

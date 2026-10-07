import test from 'node:test';
import assert from 'node:assert/strict';
import { NoticeQueue } from '../src/domain/notifications.ts';

test('new notices follow earlier ones and dismissal preserves the rest', () => {
  const queue = new NoticeQueue();
  const first = queue.add('Imported', 'success')!;
  const second = queue.add('No voice', 'warning')!;
  const third = queue.add('Invalid file', 'error')!;
  assert.deepEqual(
    queue.items.map((item) => item.id),
    [first.id, second.id, third.id],
  );
  queue.remove(second.id);
  assert.deepEqual(
    queue.items.map((item) => item.text),
    ['Imported', 'Invalid file'],
  );
});
test('repeated errors share one notice; empty messages are ignored', () => {
  const queue = new NoticeQueue();
  const first = queue.add('Storage failed', 'error');
  assert.equal(queue.add('Storage failed', 'error'), first);
  assert.equal(queue.add('  ', 'warning'), undefined);
  assert.equal(queue.items.length, 1);
  queue.remove(first!.id);
  assert.notEqual(queue.add('Storage failed', 'error')!.id, first!.id);
});

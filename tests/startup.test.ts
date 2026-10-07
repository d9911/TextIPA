import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { realpathSync } from 'node:fs';
import { existingInstance, sameInstance } from '../scripts/server-instance.ts';
const root = realpathSync(new URL('..', import.meta.url));
test('startup reuses only the same application, checkout and server mode', async () => {
  const correct = { app: 'text-ipa', root, mode: 'production' };
  assert.equal(sameInstance(correct, root, 'production'), true);
  assert.equal(sameInstance({ ...correct, app: 'another-app' }, root, 'production'), false);
  assert.equal(sameInstance({ ...correct, root: root + '/other' }, root, 'production'), false);
  assert.equal(sameInstance(correct, root, 'development'), false);
  assert.equal(sameInstance(null, root, 'production'), false);
  const server = createServer((_req, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(correct));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    assert.equal(await existingInstance(address.port, root, 'production'), true);
    await assert.rejects(existingInstance(address.port, root, 'development'), /No process was stopped/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  assert.equal(await existingInstance(address.port, root, 'production'), false);
});

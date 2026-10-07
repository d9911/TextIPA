import test from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { apiPlugin, localRequest, parseIpaRequest } from '../src/infrastructure/server/api.ts';
import { generateIpa } from '../src/infrastructure/server/ipa.ts';
import type { IncomingMessage } from 'node:http';

test('IPA validates languages, dialects, empty texts and argument shapes', () => {
  assert.throws(() => parseIpaRequest({ language: '__proto__', dialect: 'es-ES', texts: ['hola'] }), /INVALID_FILE/);
  assert.throws(() => parseIpaRequest({ language: 'es', dialect: 'en-US', texts: ['hola'] }), /INVALID_FILE/);
  assert.throws(() => parseIpaRequest({ language: 'es', dialect: 'es-ES', texts: [''] }), /INVALID_FILE/);
  assert.deepEqual(parseIpaRequest({ language: 'en', dialect: 'en-GB', texts: ['Hello.'] }), { language: 'en', dialect: 'en-GB', texts: ['Hello.'] });
});
test('local API blocks foreign origins and rebinding hosts', () => {
  const req = (host: string, origin?: string) => ({ headers: { host, origin } }) as IncomingMessage;
  assert.equal(localRequest(req('127.0.0.1:8767', 'http://127.0.0.1:8767')), true);
  assert.equal(localRequest(req('localhost:8767', 'https://example.com')), false);
  assert.equal(localRequest(req('example.com:8767')), false);
});
test('real local eSpeak generates Spanish and English drafts', async () => {
  const es = await generateIpa(['Hola a todos.'], 'es', 'es-ES');
  assert.equal(es[0], '[ˈola a ˈtoðos]');
  const plain = await generateIpa(['cinco'], 'es', 'es-419');
  assert.ok(!plain[0]?.includes('θ'));
  const en = await generateIpa(['This is a test.'], 'en', 'en-GB');
  assert.ok(en[0]?.startsWith('['));
  assert.ok(en[0]?.includes('ð'));
});
test('running HTTP service accepts local IPA and rejects cross-origin POST', async () => {
  const root = new URL('..', import.meta.url).pathname;
  const server = await createServer({
    configFile: false,
    root,
    plugins: [apiPlugin(decodeURIComponent(root))],
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, open: false },
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    assert.ok(address && typeof address !== 'string');
    const url = 'http://127.0.0.1:' + address.port;
    const instance = await fetch(url + '/api/instance');
    assert.deepEqual(await instance.json(), { app: 'text-ipa', root: decodeURIComponent(root).replace(/\/$/, ''), mode: 'development' });
    const health = await fetch(url + '/api/health');
    assert.equal(health.status, 200);
    assert.equal(((await health.json()) as { engineAvailable: boolean }).engineAvailable, true);
    const blocked = await fetch(url + '/api/ipa', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://example.com' },
      body: JSON.stringify({ language: 'es', dialect: 'es-ES', texts: ['Hola.'] }),
    });
    assert.equal(blocked.status, 403);
    const ok = await fetch(url + '/api/ipa', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: 'es', dialect: 'es-ES', texts: ['Hola.'] }),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(((await ok.json()) as { ipa: string[] }).ipa, ['[ˈola]']);
    const legacy = await fetch(url + '/ES_PAUSAS_IPA.html', { redirect: 'manual' });
    assert.equal(legacy.status, 302);
    const catalog = await fetch(url + '/api/examples');
    assert.equal(catalog.status, 200);
    assert.ok(((await catalog.json()) as { name: string }[]).some((file) => file.name === 'kolobok-es-ru.json'));
    const file = await fetch(url + '/api/examples/file?name=kolobok-es-ru.json');
    assert.equal(file.status, 200);
    assert.equal(JSON.parse(await file.text()).translationLanguage, 'ru');
    assert.equal((await fetch(url + '/api/examples/file?name=../LICENSE')).status, 400);
    if (existsSync(new URL('../examples/cable-es.json', import.meta.url))) {
      const sample = await fetch(url + '/api/example/cable-es');
      assert.equal(sample.status, 200);
    }
  } finally {
    await server.close();
  }
});

test('stdin termination preserves the last character of isolated words and one-letter tokens', async () => {
  assert.deepEqual(await generateIpa(['una', 'a'], 'es', 'es-ES'), ['[ˈuna]', '[ˈa]']);
  const ru = await generateIpa(['старик'], 'ru', 'ru-RU');
  assert.ok(ru[0]?.includes('ik'));
  assert.ok(!ru[0]?.includes('(en)'));
});

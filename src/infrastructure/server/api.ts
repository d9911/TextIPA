import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { dialects } from '../../domain/preferences.ts';
import type { IpaRequest } from '../../types/api.ts';
import type { Dialect, Language } from '../../types/domain.ts';
import { listExamples, readExample } from './examples.ts';
import { generateIpa, runEspeak } from './ipa.ts';
let busy = false;
export async function requestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += b.length;
    if (size > 262144) throw new Error('FILE_TOO_LARGE');
    chunks.push(b);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_FILE');
  }
}
export function parseIpaRequest(body: unknown): IpaRequest {
  if (!body || typeof body !== 'object') throw new Error('INVALID_FILE');
  const x = body as Record<string, unknown>;
  const language = x.language as Language;
  const dialect = x.dialect as Dialect;
  if (!Object.hasOwn(dialects, language) || !dialects[language].includes(dialect)) throw new Error('INVALID_FILE');
  if (
    !Array.isArray(x.texts) ||
    !x.texts.length ||
    x.texts.length > 300 ||
    !x.texts.every((s) => typeof s === 'string' && s.trim() && s.length <= 1500) ||
    x.texts.join('').length > 100000
  )
    throw new Error('INVALID_FILE');
  return { texts: x.texts as string[], language, dialect };
}
export function localRequest(req: IncomingMessage): boolean {
  const host = req.headers.host ?? '';
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return false;
  const origin = req.headers.origin;
  return !origin || origin === 'http://' + host;
}
export function apiPlugin(root: string): Plugin {
  let mode: 'production' | 'development' = 'development';
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = (req.url ?? '').split('?')[0];
    if (url === '/ES_PAUSAS_IPA.html') {
      res.writeHead(302, { Location: '/' });
      res.end();
      return;
    }
    if (!url?.startsWith('/api/')) {
      next();
      return;
    }
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(body));
    };
    if (!localRequest(req)) {
      send(403, { error: 'LOCAL_ONLY' });
      return;
    }
    try {
      if (url === '/api/instance' && req.method === 'GET') {
        send(200, { app: 'text-ipa', root: realpathSync(root), mode });
        return;
      }
      if (url === '/api/health' && req.method === 'GET') {
        let engine: string | null = null;
        try {
          engine = await runEspeak(['--version']);
        } catch {}
        send(200, { engineAvailable: Boolean(engine), engine, offline: true });
        return;
      }
      if (url === '/api/examples' && req.method === 'GET') {
        send(200, await listExamples(root));
        return;
      }
      if (url === '/api/examples/file' && req.method === 'GET') {
        const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? '';
        const text = await readExample(root, name);
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(text);
        return;
      }
      if (url === '/api/example/cable-es' && req.method === 'GET') {
        send(200, JSON.parse(await readFile(resolve(root, 'examples/cable-es.json'), 'utf8')));
        return;
      }
      if (url === '/api/ipa' && req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) {
          send(415, { error: 'INVALID_FILE' });
          return;
        }
        const input = parseIpaRequest(await requestBody(req));
        if (busy) {
          send(429, { error: 'ENGINE_BUSY' });
          return;
        }
        busy = true;
        try {
          send(200, { ipa: await generateIpa(input.texts, input.language, input.dialect), method: 'eSpeak NG; automatic broad IPA draft' });
        } finally {
          busy = false;
        }
        return;
      }
      send(404, { error: 'NOT_FOUND' });
    } catch (error) {
      send(error instanceof Error && error.message === 'FILE_TOO_LARGE' ? 413 : 400, { error: error instanceof Error ? error.message : 'ENGINE_FAILED' });
    }
  };
  return {
    name: 'local-ipa-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void middleware(req, res, next);
      });
    },
    configurePreviewServer(server) {
      mode = 'production';
      server.middlewares.use((req, res, next) => {
        void middleware(req, res, next);
      });
    },
  };
}

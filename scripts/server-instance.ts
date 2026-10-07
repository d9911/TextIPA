import { createServer } from 'node:net';
import { realpathSync } from 'node:fs';

export type ServerMode = 'production' | 'development';
export interface ServerInstance {
  app: 'text-ipa';
  root: string;
  mode: ServerMode;
}
export function sameInstance(value: unknown, root: string, mode: ServerMode): boolean {
  if (!value || typeof value !== 'object') return false;
  const instance = value as Partial<ServerInstance>;
  return instance.app === 'text-ipa' && instance.root === realpathSync(root) && instance.mode === mode;
}
export async function existingInstance(port: number, root: string, mode: ServerMode): Promise<boolean> {
  const occupied = await new Promise<boolean>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => (error.code === 'EADDRINUSE' ? resolve(true) : reject(error)));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(false)));
  });
  if (!occupied) return false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/instance`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
    if (response.ok && sameInstance(await response.json(), root, mode)) return true;
  } catch {}
  throw new Error(`Port ${port} is occupied by another server or mode. No process was stopped. Stop that server in its terminal or use PORT=8768 make s.`);
}

import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { existingInstance } from './server-instance.ts';
import { resolve } from 'node:path';
async function start(): Promise<void> {
  const root = resolve(import.meta.dirname, '..');
  process.chdir(root);
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ required.');
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
  const missing = Object.entries(manifest.devDependencies).some(([name, version]) => {
    try {
      return JSON.parse(readFileSync(resolve(root, 'node_modules', name, 'package.json'), 'utf8')).version !== version;
    } catch {
      return true;
    }
  });
  if (missing)
    await new Promise<void>((ok, fail) => {
      const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', [existsSync(resolve(root, 'package-lock.json')) ? 'ci' : 'install'], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      child.on('error', fail);
      child.on('close', (code) => (code === 0 ? ok() : fail(new Error('Dependency installation failed.'))));
    });
  if (!process.argv.includes('--init')) {
    await new Promise<void>((ok, fail) => {
      const child = spawn(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit'], { stdio: 'inherit' });
      child.on('error', fail);
      child.on('close', (code) => (code === 0 ? ok() : fail(new Error('TypeScript check failed. Fix the reported source errors before starting.'))));
    });
    const { copyFile } = await import('node:fs/promises');
    await copyFile(resolve(root, 'LICENSE'), resolve(root, 'public/LICENSE'));
    const { createServer, build, preview } = await import('vite');
    const port = Number(process.env.PORT ?? 8767);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT.');
    const open = process.env.NO_OPEN !== '1';
    const production = process.argv.includes('--production');
    const reused = await existingInstance(port, root, production ? 'production' : 'development');
    if (reused) {
      if (production) await build();
      const url = `http://127.0.0.1:${port}/`;
      console.log(`Text IPA is already running for this project. ${production ? 'Production assets updated. ' : ''}${url}`);
      if (open) {
        const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
        const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
        const browser = spawn(command, args, { stdio: 'ignore', detached: true });
        browser.on('error', () => console.log(`Open ${url} in your browser.`));
        browser.unref();
      }
    } else if (production) {
      await build();
      const server = await preview({ preview: { port, open } });
      server.printUrls();
      const stop = () => {
        server.httpServer.close();
        process.exit(0);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    } else {
      const server = await createServer({ server: { port, open } });
      await server.listen();
      server.printUrls();
      const stop = async () => {
        await server.close();
        process.exit(0);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    }
  }
}
void start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

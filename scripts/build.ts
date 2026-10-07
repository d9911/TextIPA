import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
await copyFile(resolve(root, 'LICENSE'), resolve(root, 'public/LICENSE'));
await build();

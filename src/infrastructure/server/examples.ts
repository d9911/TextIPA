import { maxImportBytes } from '../../domain/library.ts';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ExampleFile } from '../../types/api.ts';

export async function listExamples(root: string): Promise<ExampleFile[]> {
  const directory = resolve(root, 'examples');
  const files: ExampleFile[] = [];
  async function walk(folder: string, prefix = ''): Promise<void> {
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await walk(resolve(folder, entry.name), name + '/');
      else if (entry.isFile() && /\.(txt|md|json)$/i.test(name)) {
        const size = (await stat(resolve(folder, entry.name))).size;
        if (size <= maxImportBytes) files.push({ name, size });
      }
    }
  }
  await walk(directory);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
export async function readExample(root: string, name: string): Promise<string> {
  if (!(await listExamples(root)).some((file) => file.name === name)) throw new Error('INVALID_FILE');
  const text = await readFile(resolve(root, 'examples', name), 'utf8');
  if (Buffer.byteLength(text) > maxImportBytes) throw new Error('FILE_TOO_LARGE');
  return text;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listExamples, readExample } from '../src/infrastructure/server/examples.ts';

test('example catalog discovers supported files, preserves Unicode names and excludes symlinks and unrelated files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'text-ipa-examples-'));
  try {
    await mkdir(join(root, 'examples/sub'), { recursive: true });
    await writeFile(join(root, 'examples/a.json'), '{}');
    await writeFile(join(root, 'examples/sub/речь.md'), '# Text\nHola.');
    await writeFile(join(root, 'examples/read.TXT'), 'Hello.');
    await writeFile(join(root, 'examples/ignore.csv'), 'ignore');
    await writeFile(join(root, 'secret.txt'), 'private');
    await symlink(join(root, 'secret.txt'), join(root, 'examples/leak.txt'));
    const files = await listExamples(root);
    assert.deepEqual(
      files.map((file) => file.name),
      ['a.json', 'read.TXT', 'sub/речь.md'],
    );
    assert.equal(await readExample(root, 'sub/речь.md'), '# Text\nHola.');
    await assert.rejects(readExample(root, '../secret.txt'), /INVALID_FILE/);
    await assert.rejects(readExample(root, 'leak.txt'), /INVALID_FILE/);
    await assert.rejects(readExample(root, 'ignore.csv'), /INVALID_FILE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

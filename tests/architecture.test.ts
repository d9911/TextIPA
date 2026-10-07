import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';

const source = resolve(import.meta.dirname, '../src');
const allowed: Record<string, readonly string[]> = {
  types: ['types'],
  domain: ['domain', 'types'],
  shared: ['shared'],
  i18n: ['i18n', 'types'],
  infrastructure: ['infrastructure', 'domain', 'types'],
  features: ['features', 'domain', 'types', 'shared', 'i18n', 'infrastructure'],
  widgets: ['widgets', 'features', 'domain', 'types', 'shared', 'i18n'],
  app: ['app', 'widgets', 'features', 'domain', 'types', 'shared', 'i18n', 'infrastructure', 'styles'],
};
async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (entry.name.endsWith('.ts')) result.push(path);
  }
  return result;
}
test('source imports follow declared ownership and browser widgets cannot import server implementations', async () => {
  for (const file of await files(source)) {
    const owner = relative(source, file).split('/')[0]!;
    const text = await readFile(file, 'utf8');
    assert.ok(allowed[owner], 'Unknown source owner: ' + file);
    for (const match of text.matchAll(/(?:from\s+|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)) {
      const target = match[1]!;
      if (!target.startsWith('.')) {
        assert.ok(owner === 'infrastructure' || !target.startsWith('node:'), file + ' imports Node API');
        continue;
      }
      const dependency = relative(source, resolve(dirname(file), target));
      const dependencyOwner = dependency.split('/')[0]!;
      assert.ok(allowed[owner]!.includes(dependencyOwner), `${relative(source, file)} -> ${dependency}`);
      if (owner === 'features' || owner === 'widgets' || owner === 'app')
        assert.ok(!dependency.startsWith('infrastructure/server/'), file + ' imports server implementation');
    }
  }
});

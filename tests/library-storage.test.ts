import test from 'node:test';
import assert from 'node:assert/strict';
import { LibraryStorage, preferencesKey } from '../src/infrastructure/library-storage.ts';
import type { LibraryDatabase } from '../src/infrastructure/library-database.ts';
import type { Library } from '../src/types/domain.ts';
import { emptyLibrary } from '../src/domain/preferences.ts';
import { projectFromText } from '../src/domain/library.ts';
import { storageKey } from '../src/infrastructure/storage.ts';
function localStore(limit = Infinity) {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (value.length > limit) throw new Error('QuotaExceededError');
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function memoryDatabase() {
  let stored: unknown;
  const database: LibraryDatabase = {
    read: async () => structuredClone(stored),
    write: async (library) => {
      stored = structuredClone(library);
    },
  };
  return database;
}
function sample(): Library {
  const library = emptyLibrary();
  const project = projectFromText('Persistent text', 'Hello world.', 'en');
  library.projects = [project];
  library.activeId = project.id;
  library.settings.theme = 'dark';
  return library;
}
test('legacy library migrates only after a committed database write and survives a fresh repository', async () => {
  const local = localStore();
  const database = memoryDatabase();
  const library = sample();
  local.setItem(storageKey, JSON.stringify(library));
  const loaded = await new LibraryStorage(local, database).load();
  assert.deepEqual(loaded.library, library);
  assert.equal(loaded.existing, true);
  assert.equal(loaded.error, false);
  assert.equal(local.getItem(storageKey), null);
  assert.deepEqual(JSON.parse(local.getItem(preferencesKey)!).settings, library.settings);
  assert.deepEqual((await new LibraryStorage(local, database).load()).library, library);
});
test('large data uses the database even when localStorage rejects the full library', async () => {
  const local = localStore(2000);
  const database = memoryDatabase();
  const library = sample();
  library.projects[0]!.phrases[0]!.note = 'x'.repeat(2500);
  assert.throws(() => local.setItem(storageKey, JSON.stringify(library)), /QuotaExceededError/);
  const repository = new LibraryStorage(local, database);
  assert.equal(await repository.save(library), true);
  assert.deepEqual((await repository.load()).library, library);
  assert.equal(local.getItem(storageKey), null);
});
test('failed migration preserves the legacy bytes and corrupt database data is never replaced automatically', async () => {
  const local = localStore();
  const library = sample();
  const raw = JSON.stringify(library);
  local.setItem(storageKey, raw);
  const failed = {
    read: async () => undefined,
    write: async () => {
      throw new Error('quota');
    },
  };
  assert.deepEqual((await new LibraryStorage(local, failed).load()).library, library);
  assert.equal(local.getItem(storageKey), raw);
  assert.equal(await new LibraryStorage(local, failed).save(library), false);
  let writes = 0;
  const corrupt = {
    read: async () => ({ corrupt: true }),
    write: async () => {
      writes++;
    },
  };
  assert.equal((await new LibraryStorage(local, corrupt).load()).error, true);
  assert.equal(writes, 0);
});
test('queued snapshots commit in order, recover after failure, and ignore stale small preferences', async () => {
  const local = localStore();
  let stored: unknown;
  let attempt = 0;
  const database: LibraryDatabase = {
    read: async () => stored,
    write: async (library) => {
      attempt++;
      if (attempt === 1) throw new Error('temporary');
      stored = library;
    },
  };
  const repository = new LibraryStorage(local, database);
  const library = sample();
  const old = repository.save(library);
  library.settings.fontSize = 35;
  const latest = repository.save(library);
  assert.equal(await old, false);
  assert.equal(await latest, true);
  local.setItem(preferencesKey, JSON.stringify({ settings: { fontSize: 18 }, activeId: null }));
  assert.equal((await repository.load()).library.settings.fontSize, 35);
});
test('without IndexedDB the existing localStorage fallback still reports quota failure', async () => {
  const library = sample();
  const local = localStore();
  const repository = new LibraryStorage(local);
  assert.equal(await repository.save(library), true);
  assert.deepEqual((await repository.load()).library, library);
  assert.equal(await new LibraryStorage(localStore(10)).save(library), false);
});

test('JSON larger than the old 5 MB limit imports and reloads through the database', async () => {
  const { decodeImport, maxImportBytes } = await import('../src/domain/library.ts');
  const library = sample();
  const source = library.projects[0]!;
  library.projects = Array.from({ length: 200 }, (_, index) => ({
    ...structuredClone(source),
    id: 'large-' + index,
    title: 'Large ' + index,
    phrases: Array.from({ length: 10 }, (_, at) => ({ ...structuredClone(source.phrases[0]!), id: 'phrase-' + at, note: 'x'.repeat(2990) })),
  }));
  library.activeId = library.projects.at(-1)!.id;
  const json = JSON.stringify(library);
  assert.ok(Buffer.byteLength(json) > 5 * 1024 * 1024);
  assert.ok(Buffer.byteLength(json) < maxImportBytes);
  assert.equal(decodeImport(json, 'large.json', 'en').length, 200);
  const repository = new LibraryStorage(localStore(2000), memoryDatabase());
  assert.equal(await repository.save(library), true);
  const restored = await repository.load();
  assert.equal(restored.library.projects.length, 200);
  assert.equal(restored.library.projects.at(-1)!.phrases.at(-1)!.note.length, 2990);
});

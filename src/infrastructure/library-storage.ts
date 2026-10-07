import type { Library } from '../types/domain.ts';
import { validateLibrary } from '../domain/library.ts';
import { loadLibrary, saveLibrary, storageKey } from './storage.ts';
import type { StorageLike } from './storage.ts';
import type { LibraryDatabase } from './library-database.ts';

export const preferencesKey = 'espanol-text-ipa:preferences:v1';
export class LibraryStorage {
  private queue: Promise<boolean> = Promise.resolve(true);
  private readonly local: StorageLike & { removeItem?: (key: string) => void };
  private readonly database: LibraryDatabase | undefined;
  constructor(local: StorageLike & { removeItem?: (key: string) => void }, database?: LibraryDatabase) {
    this.local = local;
    this.database = database;
  }
  async load(languages: readonly string[] = []): Promise<{ library: Library; error: boolean; existing: boolean }> {
    if (this.database) {
      let stored: unknown;
      try {
        stored = await this.database.read();
      } catch {
        return { ...loadLibrary(this.local, languages), error: true, existing: this.hasLegacy() };
      }
      if (stored !== undefined) {
        try {
          const library = validateLibrary(stored);
          return { library, error: false, existing: true };
        } catch {
          return { ...loadLibrary(this.local, languages), error: true, existing: true };
        }
      }
    }
    const legacy = loadLibrary(this.local, languages);
    const existing = this.hasLegacy();
    if (!legacy.error && existing && this.database) await this.save(legacy.library);
    return { ...legacy, existing };
  }
  save(library: Library): Promise<boolean> {
    const snapshot = structuredClone(library);
    this.queue = this.queue.then(async () => {
      if (!this.database) return saveLibrary(this.local, snapshot);
      try {
        await this.database.write(snapshot);
        // Remove the large legacy copy only after IndexedDB commits successfully.
        try {
          this.local.removeItem?.(storageKey);
        } catch {
          /* Keep the legacy copy if removal is unavailable. */
        }
        try {
          this.local.setItem(preferencesKey, JSON.stringify({ settings: snapshot.settings, activeId: snapshot.activeId }));
        } catch {
          /* Preferences remain in IndexedDB. */
        }
        return true;
      } catch {
        return false;
      }
    });
    return this.queue;
  }
  private hasLegacy(): boolean {
    try {
      return this.local.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }
}

import { emptyLibrary } from '../domain/preferences.ts';
import { validateLibrary } from '../domain/library.ts';
import type { Library } from '../types/domain.ts';
export const storageKey = 'espanol-text-ipa:library:v1';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadLibrary(storage: StorageLike, languages: readonly string[] = []): { library: Library; error: boolean } {
  try {
    const raw = storage.getItem(storageKey);
    return { library: raw ? validateLibrary(JSON.parse(raw)) : emptyLibrary(languages), error: false };
  } catch {
    return { library: emptyLibrary(languages), error: true };
  }
}
export function saveLibrary(storage: StorageLike, library: Library): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

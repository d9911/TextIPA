import { emptyLibrary } from '../domain/preferences.ts';
import { validateLibrary } from '../domain/library.ts';
import type { Library } from '../types/domain.ts';
export const storageKey = 'espanol-text-ipa:library:v1';
export const readingPositionKey = 'espanol-text-ipa:reading-position:v1';
export function loadReadingPosition(storage: StorageLike): URLSearchParams {
  try {
    const raw = storage.getItem(readingPositionKey);
    return new URLSearchParams(raw && raw.length <= 5000 ? raw : '');
  } catch {
    return new URLSearchParams();
  }
}
export function saveReadingPosition(storage: StorageLike, position: URLSearchParams): boolean {
  try {
    storage.setItem(readingPositionKey, position.toString());
    return true;
  } catch {
    return false;
  }
}
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

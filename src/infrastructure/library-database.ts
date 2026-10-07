import type { Library } from '../types/domain.ts';

export interface LibraryDatabase {
  read(): Promise<unknown>;
  write(library: Library): Promise<void>;
}
export function indexedLibraryDatabase(factory: IDBFactory): LibraryDatabase {
  let connection: Promise<IDBDatabase> | undefined;
  const open = (): Promise<IDBDatabase> => {
    connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('text-ipa', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('library');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('STORAGE_BLOCKED'));
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          connection = undefined;
        };
        resolve(database);
      };
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
    return connection;
  };
  return {
    async read() {
      const database = await open();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction('library', 'readonly');
        const request = transaction.objectStore('library').get('current');
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
    async write(library) {
      const database = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('library', 'readwrite');
        transaction.objectStore('library').put(library, 'current');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
  };
}

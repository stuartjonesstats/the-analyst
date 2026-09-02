const DATABASE_NAME = 'the-analyst-workbench';
const DATABASE_VERSION = 1;
const STORE_NAME = 'assignment-workspaces';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The local workspace database could not open.'));
  });
}

export async function loadWorkbenchRecord<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  const database = await openDatabase();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('The local workspace could not be read.'));
    });
  } finally {
    database.close();
  }
}

export async function saveWorkbenchRecord<T>(key: string, value: T): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('The local workspace could not be saved.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('The local workspace save was interrupted.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteWorkbenchRecord(key: string): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('The local workspace could not be cleared.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('The local workspace clear was interrupted.'));
    });
  } finally {
    database.close();
  }
}

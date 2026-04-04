/**
 * Action queue for offline operations
 */

const DB_NAME = 'rhythm-guardian-cache';
const STORE_NAME = 'queue';

export interface QueuedAction {
  id?: number;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries?: number;
}

class ActionQueue {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB for queue'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const queuedAction: QueuedAction = {
      ...action,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: action.maxRetries || 3,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedAction);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async dequeue(): Promise<QueuedAction | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        if (actions.length === 0) {
          resolve(null);
          return;
        }

        // Get the oldest action
        const oldest = actions[0];
        const deleteRequest = store.delete(oldest.id!);

        deleteRequest.onsuccess = () => resolve(oldest);
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedAction[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: number): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const actionQueue = new ActionQueue();


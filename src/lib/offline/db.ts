import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  conflictData?: Record<string, unknown>;
  userId?: string;
  schoolId?: string;
}

interface CachedData {
  key: string;
  table: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
  schoolId?: string;
}

interface OfflineSettings {
  key: string;
  value: unknown;
}

interface SyncLog {
  id: string;
  syncedAt: number;
  itemsSynced: number;
  itemsFailed: number;
  details: string;
}

interface School20DB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-table': string;
      'by-timestamp': number;
    };
  };
  cachedData: {
    key: string;
    value: CachedData;
    indexes: {
      'by-table': string;
      'by-expiry': number;
    };
  };
  offlineSettings: {
    key: string;
    value: OfflineSettings;
  };
  syncLog: {
    key: string;
    value: SyncLog;
    indexes: {
      'by-date': number;
    };
  };
}

let dbInstance: IDBPDatabase<School20DB> | null = null;

export async function getOfflineDB(): Promise<IDBPDatabase<School20DB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<School20DB>('school20-offline', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-table', 'table');
        syncStore.createIndex('by-timestamp', 'timestamp');

        const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
        cacheStore.createIndex('by-table', 'table');
        cacheStore.createIndex('by-expiry', 'expiresAt');

        db.createObjectStore('offlineSettings', { keyPath: 'key' });
      }
      if (oldVersion < 2) {
        const logStore = db.createObjectStore('syncLog', { keyPath: 'id' });
        logStore.createIndex('by-date', 'syncedAt');
      }
    },
  });

  return dbInstance;
}

// Sync Queue Operations
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
  const db = await getOfflineDB();
  const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry: SyncQueueItem = {
    ...item,
    id,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };
  await db.put('syncQueue', entry);
  return id;
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('syncQueue', 'by-status', 'failed');
}

export async function getConflictItems(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('syncQueue', 'by-status', 'conflict');
}

export async function updateSyncItemStatus(id: string, status: SyncQueueItem['status'], conflictData?: Record<string, unknown>): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.status = status;
    if (status === 'failed') item.retryCount += 1;
    if (conflictData) item.conflictData = conflictData;
    await db.put('syncQueue', item);
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('syncQueue', id);
}

export async function clearSyncedItems(): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const index = tx.store.index('by-status');
  let cursor = await index.openCursor('pending');
  // Only clear items that were successfully synced (removed individually)
  await tx.done;
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getOfflineDB();
  const pending = await db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  return pending.length;
}

// Cache Operations
export async function cacheData(table: string, key: string, data: unknown, ttlMinutes: number = 60, schoolId?: string): Promise<void> {
  const db = await getOfflineDB();
  const entry: CachedData = {
    key: `${table}:${key}`,
    table,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    schoolId,
  };
  await db.put('cachedData', entry);
}

export async function getCachedData<T = unknown>(table: string, key: string): Promise<T | null> {
  const db = await getOfflineDB();
  const entry = await db.get('cachedData', `${table}:${key}`);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    await db.delete('cachedData', `${table}:${key}`);
    return null;
  }
  return entry.data as T;
}

export async function invalidateCache(table: string): Promise<void> {
  const db = await getOfflineDB();
  const items = await db.getAllFromIndex('cachedData', 'by-table', table);
  const tx = db.transaction('cachedData', 'readwrite');
  for (const item of items) {
    await tx.store.delete(item.key);
  }
  await tx.done;
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('cachedData', 'readwrite');
  const index = tx.store.index('by-expiry');
  let cursor = await index.openCursor(IDBKeyRange.upperBound(Date.now()));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Settings Operations
export async function getOfflineSetting<T = unknown>(key: string): Promise<T | null> {
  const db = await getOfflineDB();
  const entry = await db.get('offlineSettings', key);
  return entry ? (entry.value as T) : null;
}

export async function setOfflineSetting(key: string, value: unknown): Promise<void> {
  const db = await getOfflineDB();
  await db.put('offlineSettings', { key, value });
}

// Sync Log Operations
export async function addSyncLog(itemsSynced: number, itemsFailed: number, details: string): Promise<void> {
  const db = await getOfflineDB();
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.put('syncLog', {
    id,
    syncedAt: Date.now(),
    itemsSynced,
    itemsFailed,
    details,
  });
}

export async function getRecentSyncLogs(limit: number = 20): Promise<SyncLog[]> {
  const db = await getOfflineDB();
  const all = await db.getAllFromIndex('syncLog', 'by-date');
  return all.slice(-limit).reverse();
}

export type { SyncQueueItem, CachedData, SyncLog };

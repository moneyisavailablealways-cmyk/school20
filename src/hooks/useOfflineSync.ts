import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { processSyncQueue } from '@/lib/offline/syncEngine';
import { getSyncQueueCount, getConflictItems, type SyncQueueItem } from '@/lib/offline/db';
import { preCacheAllData } from '@/lib/offline/cacheManager';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface OfflineSyncState {
  isSyncing: boolean;
  pendingCount: number;
  conflicts: SyncQueueItem[];
  lastSyncResult: { synced: number; failed: number; conflicts: number } | null;
  syncProgress: { current: number; total: number } | null;
}

export function useOfflineSync() {
  const { connectionStatus, isOnline } = useOnlineStatus();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<OfflineSyncState>({
    isSyncing: false,
    pendingCount: 0,
    conflicts: [],
    lastSyncResult: null,
    syncProgress: null,
  });
  const syncingRef = useRef(false);
  const wasOfflineRef = useRef(false);

  // Refresh pending count
  const refreshCounts = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      const conflicts = await getConflictItems();
      setState((prev) => ({ ...prev, pendingCount: count, conflicts }));
    } catch {
      // IndexedDB may not be ready yet
    }
  }, []);

  // Execute sync
  const runSync = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;

    const count = await getSyncQueueCount();
    if (count === 0) return;

    syncingRef.current = true;
    setState((prev) => ({ ...prev, isSyncing: true, syncProgress: { current: 0, total: count } }));

    try {
      const result = await processSyncQueue((current, total) => {
        setState((prev) => ({ ...prev, syncProgress: { current, total } }));
      });

      setState((prev) => ({ ...prev, lastSyncResult: result }));

      if (result.synced > 0) {
        toast({
          title: '✅ Data Synced',
          description: `${result.synced} offline record${result.synced > 1 ? 's' : ''} synced successfully.`,
        });
      }

      if (result.conflicts > 0) {
        toast({
          title: '⚠️ Sync Conflicts',
          description: `${result.conflicts} record${result.conflicts > 1 ? 's' : ''} have conflicts that need resolution.`,
          variant: 'destructive',
        });
      }

      if (result.failed > 0 && result.synced === 0) {
        toast({
          title: 'Sync Issues',
          description: `${result.failed} record${result.failed > 1 ? 's' : ''} failed to sync. Will retry later.`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Sync process error:', err);
    } finally {
      syncingRef.current = false;
      setState((prev) => ({ ...prev, isSyncing: false, syncProgress: null }));
      await refreshCounts();
    }
  }, [isOnline, toast]);

  // Pre-cache data when coming online
  const preCacheData = useCallback(async () => {
    if (!profile?.school_id) return;
    try {
      await preCacheAllData(profile.school_id);
    } catch (err) {
      console.error('Pre-cache failed:', err);
    }
  }, [profile?.school_id]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (connectionStatus === 'offline' || connectionStatus === 'limited') {
      wasOfflineRef.current = true;
    }

    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast({
        title: '🌐 Connection Restored',
        description: 'Syncing offline data...',
      });
      // Small delay to let connection stabilize
      const timer = setTimeout(() => {
        runSync();
        preCacheData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, isOnline, runSync, preCacheData, toast]);

  // Periodically refresh counts
  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 10000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  // Pre-cache on mount if online
  useEffect(() => {
    if (isOnline && profile?.school_id) {
      preCacheData();
    }
  }, [isOnline, profile?.school_id, preCacheData]);

  return {
    ...state,
    connectionStatus,
    isOnline,
    runSync,
    refreshCounts,
  };
}

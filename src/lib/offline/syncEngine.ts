import { supabase } from '@/integrations/supabase/client';
import {
  getPendingSyncItems,
  updateSyncItemStatus,
  removeSyncItem,
  addSyncLog,
  type SyncQueueItem,
} from './db';

type SyncProgressCallback = (synced: number, total: number) => void;

/**
 * Process all pending sync queue items against Supabase.
 * Returns { synced, failed, conflicts } counts.
 */
export async function processSyncQueue(
  onProgress?: SyncProgressCallback
): Promise<{ synced: number; failed: number; conflicts: number }> {
  const pending = await getPendingSyncItems();
  if (pending.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      await updateSyncItemStatus(item.id, 'syncing');
      const result = await syncItem(item);

      if (result === 'success') {
        await removeSyncItem(item.id);
        synced++;
      } else if (result === 'conflict') {
        conflicts++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Sync failed for item ${item.id}:`, err);
      await updateSyncItemStatus(item.id, 'failed');
      failed++;
    }

    onProgress?.(i + 1, pending.length);
  }

  // Log the sync session
  await addSyncLog(
    synced,
    failed,
    `Synced ${synced}/${pending.length} items. ${conflicts} conflicts. ${failed} failures.`
  );

  return { synced, failed, conflicts };
}

async function syncItem(item: SyncQueueItem): Promise<'success' | 'conflict' | 'failed'> {
  const { table, operation, data } = item;

  // Type-safe table access - only allow known tables
  const allowedTables = [
    'attendance_records',
    'subject_submissions',
    'behavior_notes',
    'timetables',
  ] as const;

  if (!allowedTables.includes(table as any)) {
    console.warn(`Table "${table}" is not in the allowed sync list`);
    await updateSyncItemStatus(item.id, 'failed');
    return 'failed';
  }

  try {
    if (operation === 'insert') {
      // Check for conflict (record already exists with same unique keys)
      if (data.id) {
        const { data: existing } = await supabase
          .from(table as any)
          .select('id, updated_at')
          .eq('id', data.id as string)
          .maybeSingle();

        if (existing) {
          // Record already exists - potential conflict
          const serverUpdatedAt = new Date(existing.updated_at || 0).getTime();
          if (serverUpdatedAt > item.timestamp) {
            await updateSyncItemStatus(item.id, 'conflict', existing);
            return 'conflict';
          }
        }
      }

      const { error } = await supabase.from(table as any).insert(data as any);
      if (error) {
        // Duplicate key = conflict, not failure
        if (error.code === '23505') {
          await updateSyncItemStatus(item.id, 'conflict');
          return 'conflict';
        }
        throw error;
      }
      return 'success';
    }

    if (operation === 'update') {
      if (!data.id) {
        await updateSyncItemStatus(item.id, 'failed');
        return 'failed';
      }

      // Check for conflict
      const { data: existing } = await supabase
        .from(table as any)
        .select('updated_at')
        .eq('id', data.id as string)
        .maybeSingle();

      if (existing) {
        const serverUpdatedAt = new Date(existing.updated_at || 0).getTime();
        if (serverUpdatedAt > item.timestamp) {
          await updateSyncItemStatus(item.id, 'conflict', existing);
          return 'conflict';
        }
      }

      const { id, ...updateData } = data;
      const { error } = await supabase
        .from(table as any)
        .update(updateData as any)
        .eq('id', id as string);

      if (error) throw error;
      return 'success';
    }

    if (operation === 'upsert') {
      const { error } = await supabase.from(table as any).upsert(data as any);
      if (error) throw error;
      return 'success';
    }

    if (operation === 'delete') {
      if (!data.id) {
        await updateSyncItemStatus(item.id, 'failed');
        return 'failed';
      }
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', data.id as string);
      if (error) throw error;
      return 'success';
    }

    return 'failed';
  } catch (err: any) {
    console.error(`Error syncing ${operation} on ${table}:`, err);
    await updateSyncItemStatus(item.id, item.retryCount >= 3 ? 'failed' : 'pending');
    return 'failed';
  }
}

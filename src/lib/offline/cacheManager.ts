import { supabase } from '@/integrations/supabase/client';
import { cacheData, getCachedData, clearExpiredCache } from './db';

// Tables and their cache TTL in minutes
const CACHE_CONFIG: Record<string, { ttl: number; columns: string }> = {
  students: { ttl: 120, columns: 'id, student_id, profile_id, school_id, enrollment_status, profiles(id, first_name, last_name, email)' },
  classes: { ttl: 240, columns: '*' },
  subjects: { ttl: 240, columns: '*' },
  timetables: { ttl: 60, columns: '*' },
  profiles: { ttl: 120, columns: 'id, first_name, last_name, email, role, school_id, is_active' },
  student_enrollments: { ttl: 120, columns: 'id, student_id, class_id, stream_id, status, academic_year_id' },
  teacher_subjects: { ttl: 240, columns: '*' },
};

/**
 * Refresh cache for a specific table by fetching from Supabase.
 */
export async function refreshCache(table: string, schoolId?: string): Promise<boolean> {
  const config = CACHE_CONFIG[table];
  if (!config) return false;

  try {
    let query = supabase.from(table as any).select(config.columns);
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    // Limit to prevent massive downloads
    query = query.limit(2000);

    const { data, error } = await query;
    if (error) throw error;

    await cacheData(table, schoolId || 'all', data, config.ttl, schoolId);
    return true;
  } catch (err) {
    console.error(`Failed to refresh cache for ${table}:`, err);
    return false;
  }
}

/**
 * Get data from cache, falling back to Supabase if online.
 */
export async function getDataWithCache<T = unknown>(
  table: string,
  schoolId?: string,
  forceRefresh: boolean = false
): Promise<T | null> {
  const cacheKey = schoolId || 'all';

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedData<T>(table, cacheKey);
    if (cached) return cached;
  }

  // If online, fetch and cache
  if (navigator.onLine) {
    const success = await refreshCache(table, schoolId);
    if (success) {
      return getCachedData<T>(table, cacheKey);
    }
  }

  // Return stale cache if offline
  return getCachedData<T>(table, cacheKey);
}

/**
 * Pre-cache all important tables for offline use.
 */
export async function preCacheAllData(schoolId?: string): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Clean expired entries first
  await clearExpiredCache();

  const tables = Object.keys(CACHE_CONFIG);
  const results = await Promise.allSettled(
    tables.map((table) => refreshCache(table, schoolId))
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      success++;
    } else {
      failed++;
    }
  });

  return { success, failed };
}

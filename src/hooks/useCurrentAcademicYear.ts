import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AcademicYearLite {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

/**
 * Returns the current academic year for the logged-in school.
 * Falls back to the most recent (by start_date) year when no `is_current`
 * row is marked. Modules should use this as the default selection.
 */
export const useCurrentAcademicYear = () => {
  const { profile } = useAuth();
  const [currentYear, setCurrentYear] = useState<AcademicYearLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: current } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date, is_current')
        .eq('school_id', profile.school_id)
        .eq('is_current', true)
        .maybeSingle();

      if (!cancelled && current) {
        setCurrentYear(current as AcademicYearLite);
        setLoading(false);
        return;
      }

      const { data: fallback } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date, is_current')
        .eq('school_id', profile.school_id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setCurrentYear((fallback as AcademicYearLite) || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.school_id]);

  return { currentYear, currentYearId: currentYear?.id ?? null, loading };
};

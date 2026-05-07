import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SectionLevel = 'nursery' | 'primary';

interface SectionCtx {
  /** currently selected section in the UI */
  section: SectionLevel;
  setSection: (s: SectionLevel) => void;
  /** true when this school has the nursery section enabled */
  nurseryEnabled: boolean;
  /** true when the school is a Primary school (toggle only shows here) */
  isPrimarySchool: boolean;
  /** raw school_level from schools table */
  schoolLevel: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SectionContext = createContext<SectionCtx | undefined>(undefined);

const STORAGE_KEY = 'school20.section';

export const SchoolSectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [schoolLevel, setSchoolLevel] = useState<string | null>(null);
  const [nurseryEnabled, setNurseryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [section, setSectionState] = useState<SectionLevel>(() => {
    if (typeof window === 'undefined') return 'primary';
    return (sessionStorage.getItem(STORAGE_KEY) as SectionLevel) || 'primary';
  });

  const refresh = useCallback(async () => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('schools')
      .select('school_level, has_nursery_section')
      .eq('id', profile.school_id)
      .maybeSingle();
    if (data) {
      setSchoolLevel(data.school_level ?? null);
      setNurseryEnabled(!!(data as any).has_nursery_section);
    }
    setLoading(false);
  }, [profile?.school_id]);

  useEffect(() => { refresh(); }, [refresh]);

  const setSection = useCallback((s: SectionLevel) => {
    setSectionState(s);
    try { sessionStorage.setItem(STORAGE_KEY, s); } catch {}
  }, []);

  const isPrimarySchool = schoolLevel === 'primary';

  // If nursery isn't enabled (or not a primary school), force section back to primary
  useEffect(() => {
    if ((!nurseryEnabled || !isPrimarySchool) && section !== 'primary') {
      setSection('primary');
    }
  }, [nurseryEnabled, isPrimarySchool, section, setSection]);

  const value = useMemo<SectionCtx>(() => ({
    section,
    setSection,
    nurseryEnabled,
    isPrimarySchool,
    schoolLevel,
    loading,
    refresh,
  }), [section, setSection, nurseryEnabled, isPrimarySchool, schoolLevel, loading, refresh]);

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>;
};

export const useSchoolSection = (): SectionCtx => {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSchoolSection must be used inside SchoolSectionProvider');
  return ctx;
};

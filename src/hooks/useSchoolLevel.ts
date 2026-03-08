import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SchoolLevel = 'primary' | 'secondary' | 'higher_institution';

export const useSchoolLevel = () => {
  const { profile } = useAuth();
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolLevel = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('school_level')
          .eq('id', profile.school_id)
          .single();

        if (!error && data) {
          setSchoolLevel(data.school_level as SchoolLevel);
        }
      } catch (err) {
        console.error('Error fetching school level:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolLevel();
  }, [profile?.school_id]);

  return { schoolLevel, loading };
};

// Subject suggestions by education level
export const SUGGESTED_SUBJECTS: Record<SchoolLevel, { name: string; code: string; isCore: boolean }[]> = {
  primary: [
    { name: 'Mathematics', code: 'MATH', isCore: true },
    { name: 'English', code: 'ENG', isCore: true },
    { name: 'Science', code: 'SCI', isCore: true },
    { name: 'Social Studies', code: 'SST', isCore: true },
    { name: 'Literacy', code: 'LIT', isCore: true },
    { name: 'Religious Education', code: 'RE', isCore: true },
    { name: 'Physical Education', code: 'PE', isCore: false },
    { name: 'Art and Craft', code: 'ART', isCore: false },
  ],
  secondary: [
    { name: 'Mathematics', code: 'MATH', isCore: true },
    { name: 'English', code: 'ENG', isCore: true },
    { name: 'Physics', code: 'PHY', isCore: false },
    { name: 'Chemistry', code: 'CHEM', isCore: false },
    { name: 'Biology', code: 'BIO', isCore: false },
    { name: 'Geography', code: 'GEO', isCore: false },
    { name: 'History', code: 'HIST', isCore: false },
    { name: 'Literature', code: 'LIT', isCore: false },
    { name: 'Economics', code: 'ECON', isCore: false },
    { name: 'Computer Studies', code: 'ICT', isCore: false },
  ],
  higher_institution: [
    { name: 'Mathematics', code: 'MATH', isCore: true },
    { name: 'English', code: 'ENG', isCore: true },
  ],
};

// Class structure suggestions by education level
export const SUGGESTED_CLASSES: Record<SchoolLevel, string[]> = {
  primary: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
  secondary: ['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6'],
  higher_institution: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
};

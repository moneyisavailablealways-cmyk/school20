import { supabase } from '@/integrations/supabase/client';

export const loadCurrentSchoolBranding = async (schoolId?: string | null) => {
  if (!schoolId) return null;

  const [schoolRes, settingsRes] = await Promise.all([
    supabase
      .from('schools')
      .select('id, school_name, motto, address, phone, email, website, logo_url, po_box')
      .eq('id', schoolId)
      .maybeSingle(),
    supabase
      .from('school_settings')
      .select('school_name, motto, address, phone, email, website, logo_url, footer_motto')
      .eq('school_id', schoolId)
      .maybeSingle(),
  ]);

  if (schoolRes.error) throw schoolRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const school = schoolRes.data;
  const settings = settingsRes.data;

  if (!school && !settings) return null;

  return {
    id: school?.id ?? schoolId,
    name: settings?.school_name || school?.school_name || 'School Name',
    motto: settings?.motto || school?.motto || '',
    address: settings?.address || school?.address || '',
    poBox: school?.po_box || '',
    phone: settings?.phone || school?.phone || '',
    email: settings?.email || school?.email || '',
    website: settings?.website || school?.website || '',
    logoUrl: settings?.logo_url || school?.logo_url || '',
    footerMotto: settings?.footer_motto || '',
    badge: '',
  };
};

export const mergeCurrentSchoolBranding = async <T extends Record<string, any>>(
  reportData: T,
  schoolId?: string | null,
): Promise<T> => {
  if (!reportData) return reportData;

  const branding = await loadCurrentSchoolBranding(schoolId || reportData.school?.id || null);
  if (!branding) return reportData;

  const mergedSchool = {
    ...(reportData.school || {}),
  };

  Object.entries(branding).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      mergedSchool[key] = value;
    }
  });

  return {
    ...reportData,
    school: mergedSchool,
  };
};
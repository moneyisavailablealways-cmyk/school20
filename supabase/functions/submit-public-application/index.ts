import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Must match DB check constraint students_gender_check -> ('male','female')
const normalizeGender = (value: unknown): string | null => {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!v) return null;
  if (['m', 'male', 'boy'].includes(v)) return 'male';
  if (['f', 'female', 'girl'].includes(v)) return 'female';
  return null;
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const {
      school_slug,
      application_type = 'learner',
      student_name,
      parent_name,
      parent_email,
      parent_phone,
      parent_national_id,
      parent_relationship,
      date_of_birth,
      gender,
      address,
      previous_school,
      class_applying_for,
      national_id,
      birth_certificate_number,
      photo_url,
      documents = [],
      medical_info = {},
      emergency_contacts = [],
      staff_details = {},
      notes,
    } = body ?? {};

    if (!school_slug || !student_name || (application_type === 'learner' && !class_applying_for)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['learner', 'staff'].includes(application_type)) {
      return new Response(JSON.stringify({ error: 'Invalid application_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: school, error: schoolErr } = await admin
      .from('schools').select('id').eq('slug', school_slug).maybeSingle();
    if (schoolErr || !school) {
      return new Response(JSON.stringify({ error: 'School not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await admin
      .from('school_settings').select('admissions_mode').eq('school_id', school.id).maybeSingle();
    if (!settings || settings.admissions_mode !== 'internal_and_online') {
      return new Response(JSON.stringify({ error: 'Online admissions are not enabled for this school' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: inserted, error: insErr } = await admin
      .from('admission_applications')
      .insert({
        school_id: school.id,
        application_type,
        source: 'online',
        stage: 'pending',
        student_name,
        parent_name: parent_name ?? '',
        parent_email: parent_email || null,
        parent_phone: parent_phone || null,
        parent_national_id: parent_national_id || null,
        parent_relationship: parent_relationship || null,
        date_of_birth: date_of_birth || null,
        gender: normalizeGender(gender),
        address: address || null,
        previous_school: previous_school || null,
        class_applying_for: class_applying_for || (application_type === 'staff' ? 'N/A' : ''),
        national_id: national_id || null,
        birth_certificate_number: birth_certificate_number || null,
        photo_url: photo_url || null,
        documents,
        medical_info,
        emergency_contacts,
        staff_details,
        notes: notes || null,
      })
      .select('id, application_number')
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({
      success: true,
      id: inserted.id,
      application_number: inserted.application_number,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { application_number, phone, school_slug } = await req.json();
    if (!application_number && !phone) {
      return new Response(JSON.stringify({ error: 'Provide application_number or phone' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let schoolId: string | null = null;
    if (school_slug) {
      const { data: s } = await admin.from('schools').select('id').eq('slug', school_slug).maybeSingle();
      schoolId = s?.id ?? null;
    }

    let q = admin
      .from('admission_applications')
      .select('application_number, student_name, class_applying_for, stage, status, created_at, interview_at, school_id')
      .order('created_at', { ascending: false })
      .limit(5);
    if (application_number) q = q.eq('application_number', application_number);
    else if (phone) q = q.eq('parent_phone', phone);
    if (schoolId) q = q.eq('school_id', schoolId);

    const { data, error } = await q;
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, results: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

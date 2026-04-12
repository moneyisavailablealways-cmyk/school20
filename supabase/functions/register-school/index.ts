import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      school_name,
      school_code,
      country,
      region,
      email,
      phone,
      address,
      school_level,
      motto,
      po_box,
      website,
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_password,
    } = await req.json()

    // Validate required fields
    if (!school_name || !school_code || !country || !email || !admin_first_name || !admin_last_name || !admin_email || !admin_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (admin_password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate school_code
    const { data: existingCode } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('school_code', school_code.toUpperCase())
      .maybeSingle()

    if (existingCode) {
      return new Response(
        JSON.stringify({ error: 'A school with this code already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate school email
    const { data: existingEmail } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: 'A school with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate admin email in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailTaken = existingUsers?.users?.some(u => u.email === admin_email)
    if (emailTaken) {
      return new Response(
        JSON.stringify({ error: 'A user with this email address already exists. Please use a different admin email or sign in with your existing account.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create the school record
    const slug = school_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        school_name,
        school_code: school_code.toUpperCase(),
        slug: `${slug}-${Date.now()}`,
        country,
        region: region || null,
        email,
        phone: phone || null,
        address: address || null,
        motto: motto || null,
        po_box: po_box || null,
        website: website || null,
        admin_name: `${admin_first_name} ${admin_last_name}`,
        admin_email,
        status: 'active',
        school_level: school_level || 'secondary',
      })
      .select()
      .single()

    if (schoolError) {
      console.error('School creation error:', schoolError)
      return new Response(
        JSON.stringify({ error: `Failed to create school: ${schoolError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create the admin auth user
    console.log('Creating admin auth user for email:', admin_email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        first_name: admin_first_name,
        last_name: admin_last_name,
        role: 'admin',
      },
    })

    if (authError) {
      // Rollback: delete the school we just created
      await supabaseAdmin.from('schools').delete().eq('id', schoolData.id)
      console.error('Auth user creation error:', authError)
      return new Response(
        JSON.stringify({ error: `Failed to create admin account: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created successfully:', authData.user.id, 'email:', authData.user.email)

    // 3. Wait for profile trigger, then update with school_id and admin role
    await new Promise(r => setTimeout(r, 1500))

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        school_id: schoolData.id,
        role: 'admin',
        first_name: admin_first_name,
        last_name: admin_last_name,
      })
      .eq('user_id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Non-fatal — the profile trigger may not have fired yet, but we still succeed
    }

    // 4. Auto-generate default academic year and classes based on school level
    const currentYear = new Date().getFullYear();
    const academicYearName = `${currentYear}`;
    const { data: academicYear } = await supabaseAdmin
      .from('academic_years')
      .insert({
        name: academicYearName,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        is_current: true,
        school_id: schoolData.id,
      })
      .select()
      .single();

    if (academicYear) {
      // Create a root level
      const levelName = (school_level === 'primary') ? 'Primary' : 'Secondary';
      const { data: rootLevel } = await supabaseAdmin
        .from('levels')
        .insert({ name: levelName, school_id: schoolData.id, parent_id: null })
        .select()
        .single();

      if (rootLevel) {
        // Generate default classes
        const classNames = (school_level === 'primary')
          ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
          : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

        const classInserts = classNames.map(name => ({
          name,
          school_id: schoolData.id,
          academic_year_id: academicYear.id,
          level_id: rootLevel.id,
        }));

        const { error: classesError } = await supabaseAdmin.from('classes').insert(classInserts);
        if (classesError) {
          console.error('Auto-generate classes error:', classesError);
        } else {
          console.log(`Auto-generated ${classNames.length} classes for ${school_level} school`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        school_id: schoolData.id,
        school_name: schoolData.school_name,
        admin_email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in register-school:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Registration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

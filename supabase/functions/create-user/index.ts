import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single()

    if (!profile || !['admin', 'principal'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, firstName, lastName, phone, role, teacherDetails, parentDetails } = await req.json()

    // Create the user with admin privileges
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role,
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure a profile exists and get profile ID (insert if missing)
    const { data: existingProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', newUser.user.id)
      .maybeSingle()

    if (fetchProfileError) {
      return new Response(
        JSON.stringify({ error: fetchProfileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let profileId = existingProfile?.id

    if (!profileId) {
      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          first_name: firstName || newUser.user.user_metadata?.first_name || 'User',
          last_name: lastName || newUser.user.user_metadata?.last_name || '',
          email,
          phone: phone || null,
          role,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertProfileError) {
        return new Response(
          JSON.stringify({ error: insertProfileError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      profileId = insertedProfile.id
    } else {
      // Update existing profile with latest details
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          role,
        })
        .eq('id', existingProfile.id)

      if (updateProfileError) {
        return new Response(
          JSON.stringify({ error: updateProfileError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const profileData = { id: profileId }
    // Create teacher details if role is teacher or head_teacher
    if ((role === 'teacher' || role === 'head_teacher') && teacherDetails) {
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          profile_id: profileData.id,
          employee_id: teacherDetails.employeeId,
          specialization: teacherDetails.specialization,
          qualification: teacherDetails.qualification,
          experience_years: teacherDetails.experienceYears,
          joining_date: teacherDetails.joiningDate,
          department: teacherDetails.department,
          salary: teacherDetails.salary,
          is_class_teacher: teacherDetails.isClassTeacher || false,
        })

      if (teacherError) {
        return new Response(
          JSON.stringify({ error: teacherError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create parent details if role is parent
    if (role === 'parent' && parentDetails) {
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          profile_id: profileData.id,
          occupation: parentDetails.occupation,
          workplace: parentDetails.workplace,
          national_id: parentDetails.nationalId,
          address: parentDetails.address,
          emergency_contact_name: parentDetails.emergencyContactName,
          emergency_contact_phone: parentDetails.emergencyContactPhone,
          emergency_contact_relationship: parentDetails.emergencyContactRelationship,
          preferred_contact_method: parentDetails.preferredContactMethod,
        })

      if (parentError) {
        return new Response(
          JSON.stringify({ error: parentError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
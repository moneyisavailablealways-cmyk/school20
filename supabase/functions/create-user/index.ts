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

    // First check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email)
    
    let authUserId: string
    
    if (existingAuthUser) {
      // User already exists in auth - use their ID and unban them if banned
      console.log('User already exists in auth, using existing user:', existingAuthUser.id)
      authUserId = existingAuthUser.id
      
      // Unban the user and update their password
      const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        ban_duration: 'none', // Unban the user
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        }
      })
      
      if (updateError) {
        console.error('Error updating existing user:', updateError)
        return new Response(
          JSON.stringify({ error: `Failed to reactivate user: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Unbanned and updated existing user:', authUserId)
    } else {
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
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      authUserId = newUser.user.id
    }

    // Ensure a profile exists and get profile ID (insert if missing)
    const { data: existingProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle()

    if (fetchProfileError) {
      console.error('Error fetching existing profile:', fetchProfileError)
      return new Response(
        JSON.stringify({ error: `Profile fetch error: ${fetchProfileError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let profileId = existingProfile?.id

    if (!profileId) {
      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUserId,
          first_name: firstName || 'User',
          last_name: lastName || '',
          email,
          phone: phone || null,
          role,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertProfileError) {
        console.error('Error inserting profile:', insertProfileError)
        return new Response(
          JSON.stringify({ error: `Profile creation error: ${insertProfileError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      profileId = insertedProfile.id
    } else {
      // Update existing profile with latest details INCLUDING role
      // Using service role key bypasses RLS and triggers, allowing role updates
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          role: role, // Update role to admin-selected value
          is_active: true,
        })
        .eq('id', existingProfile.id)

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError)
        return new Response(
          JSON.stringify({ error: `Profile update error: ${updateProfileError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`Updated profile ${existingProfile.id} with role: ${role}`)
    }

    const profileData = { id: profileId }
    let teacherId = null;
    
    // Create teacher details if role is teacher or head_teacher
    if ((role === 'teacher' || role === 'head_teacher') && teacherDetails) {
      const { data: teacherData, error: teacherError } = await supabase
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
        .select('id')
        .single()

      if (teacherError) {
        return new Response(
          JSON.stringify({ error: teacherError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      teacherId = teacherData.id;
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
      JSON.stringify({ 
        success: true, 
        user_id: authUserId,
        email: email,
        profile_id: profileId,
        teacher_id: teacherId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
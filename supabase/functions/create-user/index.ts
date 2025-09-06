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
      console.error('Auth user creation error:', createError)
      return new Response(
        JSON.stringify({ error: `Auth user creation failed: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser?.user?.id) {
      console.error('No user ID returned from auth creation')
      return new Response(
        JSON.stringify({ error: 'User creation failed - no user ID returned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create/update the profile record using the auth user ID as the primary key
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,  // Use auth user ID as profile ID
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        role: role
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        console.error('Teacher details creation error:', teacherError)
        // Try to clean up profile and auth user if teacher creation fails
        try {
          await supabase.from('profiles').delete().eq('id', profileData.id)
          await supabase.auth.admin.deleteUser(newUser.user.id)
        } catch (cleanupError) {
          console.error('Failed to cleanup after teacher error:', cleanupError)
        }
        return new Response(
          JSON.stringify({ error: `Teacher details creation failed: ${teacherError.message}` }),
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
        console.error('Parent details creation error:', parentError)
        // Try to clean up profile and auth user if parent creation fails
        try {
          await supabase.from('profiles').delete().eq('id', profileData.id)
          await supabase.auth.admin.deleteUser(newUser.user.id)
        } catch (cleanupError) {
          console.error('Failed to cleanup after parent error:', cleanupError)
        }
        return new Response(
          JSON.stringify({ error: `Parent details creation failed: ${parentError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create student details if role is student
    if (role === 'student') {
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          profile_id: profileData.id,
          student_id: `STU${Date.now()}`, // Generate unique student ID
          admission_date: new Date().toISOString().split('T')[0],
          date_of_birth: new Date().toISOString().split('T')[0], // This should come from frontend
          enrollment_status: 'active'
        })

      if (studentError) {
        console.error('Student details creation error:', studentError)
        // Try to clean up profile and auth user if student creation fails
        try {
          await supabase.from('profiles').delete().eq('id', profileData.id)
          await supabase.auth.admin.deleteUser(newUser.user.id)
        } catch (cleanupError) {
          console.error('Failed to cleanup after student error:', cleanupError)
        }
        return new Response(
          JSON.stringify({ error: `Student details creation failed: ${studentError.message}` }),
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
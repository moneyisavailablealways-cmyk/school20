import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { student_id, signature_image, school_id } = body;

    if (!student_id || !signature_image || !school_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: student_id, signature_image, school_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate signature is not empty (must be more than blank canvas)
    if (signature_image.length < 500) {
      return new Response(JSON.stringify({ error: 'Signature appears empty. Please draw a valid signature.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch student with profile and class info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id, student_id, school_id,
        profiles:profile_id (id, first_name, last_name, email, phone),
        student_enrollments!inner (
          class_id,
          classes:class_id (name)
        )
      `)
      .eq('id', student_id)
      .eq('school_id', school_id)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found in this school' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Check if already marked today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('signature_attendance_logs')
      .select('id')
      .eq('student_id', student_id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Attendance already recorded for today' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Get reference signature for comparison
    const { data: refSignature } = await supabase
      .from('student_signatures')
      .select('signature_data')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .maybeSingle();

    // 4. Simple signature comparison (placeholder for future AI)
    let verificationStatus = 'no_reference';
    let similarityScore: number | null = null;

    if (refSignature) {
      // Basic comparison: check if both signatures have similar data density
      const refLen = refSignature.signature_data.length;
      const newLen = signature_image.length;
      const ratio = Math.min(refLen, newLen) / Math.max(refLen, newLen);
      similarityScore = Math.round(ratio * 100);
      verificationStatus = similarityScore >= 40 ? 'verified' : 'mismatch';
    } else {
      // First time - store as reference signature
      await supabase.from('student_signatures').insert({
        student_id,
        signature_data: signature_image,
        school_id,
        is_active: true,
      });
      verificationStatus = 'verified';
      similarityScore = 100;
    }

    // 5. Get marker profile
    const { data: markerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // 6. Record attendance
    const { data: attendanceRecord, error: insertError } = await supabase
      .from('signature_attendance_logs')
      .insert({
        student_id,
        school_id,
        signature_image,
        date: today,
        check_in_time: new Date().toISOString(),
        status: 'present',
        verification_status: verificationStatus,
        similarity_score: similarityScore,
        marked_by: markerProfile?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record attendance', details: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 7. Get school info for notifications
    const { data: school } = await supabase
      .from('schools')
      .select('school_name')
      .eq('id', school_id)
      .single();

    const studentName = `${(student as any).profiles?.first_name} ${(student as any).profiles?.last_name}`;
    const checkInTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const schoolName = school?.school_name || 'School';

    // 8. Notify parents (in-app)
    const { data: parentRelations } = await supabase
      .from('parent_student_relationships')
      .select(`
        parent_id,
        profiles:parent_id (id, first_name, last_name, email, phone)
      `)
      .eq('student_id', student_id);

    const notificationDetails: any = { parents_notified: [] };

    if (parentRelations && parentRelations.length > 0) {
      for (const rel of parentRelations) {
        const parent = (rel as any).profiles;
        if (!parent) continue;

        const message = `Hello ${parent.first_name}, your child ${studentName} has reported to ${schoolName} at ${checkInTime}.`;

        // In-app notification
        await supabase.from('notifications').insert({
          user_id: parent.id,
          title: '✅ Attendance Confirmed',
          message,
          type: 'info',
          category: 'attendance',
          reference_id: attendanceRecord.id,
          reference_type: 'signature_attendance',
          school_id,
        });

        notificationDetails.parents_notified.push({
          parent_id: parent.id,
          name: `${parent.first_name} ${parent.last_name}`,
          email: parent.email,
          phone: parent.phone,
          notified_at: new Date().toISOString(),
        });
      }

      // Update attendance record with notification info
      await supabase
        .from('signature_attendance_logs')
        .update({
          parent_notified: true,
          notification_details: notificationDetails,
        })
        .eq('id', attendanceRecord.id);
    }

    return new Response(JSON.stringify({
      success: true,
      attendance: {
        id: attendanceRecord.id,
        student_name: studentName,
        check_in_time: checkInTime,
        verification_status: verificationStatus,
        similarity_score: similarityScore,
        parent_notified: (parentRelations?.length || 0) > 0,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

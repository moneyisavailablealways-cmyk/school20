import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const notificationType = body.type || 'auto'; // 'weekend', 'holiday', 'reminder', 'auto'

    // Get all active schools
    const { data: schools, error: schoolsErr } = await supabase
      .from('schools')
      .select('id, school_name')
      .eq('status', 'active');

    if (schoolsErr) throw schoolsErr;

    let totalNotifications = 0;

    for (const school of schools || []) {
      // Get current term for this school
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('school_id', school.id)
        .eq('is_current', true)
        .maybeSingle();

      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri
      let shouldSend = false;
      let type = notificationType;
      let customMessage: string | null = null;

      if (notificationType === 'auto') {
        // Friday weekend notification
        if (dayOfWeek === 5) {
          type = 'weekend';
          shouldSend = true;
        }

        if (currentTerm) {
          const endDate = new Date(currentTerm.end_date);
          const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Last day of term
          if (daysUntilEnd <= 0 && daysUntilEnd >= -1) {
            type = 'holiday';
            shouldSend = true;
          }

          // 7 days before end of term
          if (daysUntilEnd === 7) {
            type = 'reminder';
            customMessage = `Only ${daysUntilEnd} days left to the end of ${currentTerm.term_name}. Please ensure assignments and marks are submitted.`;
            shouldSend = true;
          }

          // 5 days reminder
          if (daysUntilEnd === 5) {
            type = 'reminder';
            customMessage = `Only ${daysUntilEnd} days left to the end of ${currentTerm.term_name}. Please ensure assignments and marks are submitted.`;
            shouldSend = true;
          }
        }

        // Check for exam reminders (7 days before exam events)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        const { data: upcomingExams } = await supabase
          .from('school_events')
          .select('*')
          .eq('school_id', school.id)
          .eq('event_type', 'exam')
          .eq('start_date', nextWeekStr);

        if (upcomingExams && upcomingExams.length > 0) {
          type = 'reminder';
          customMessage = `Exam week begins in 7 days! ${upcomingExams[0].title} starts on ${nextWeekStr}. Prepare well.`;
          shouldSend = true;
        }
      } else {
        shouldSend = true;
      }

      if (shouldSend) {
        const { data: count } = await supabase.rpc('send_term_notifications', {
          p_school_id: school.id,
          p_notification_type: type,
          p_custom_message: customMessage,
        });
        totalNotifications += (count || 0);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: totalNotifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Term notifications error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

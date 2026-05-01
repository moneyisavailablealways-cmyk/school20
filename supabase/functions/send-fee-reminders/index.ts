// Send in-app fee reminders to parents for outstanding invoices.
// Can be called manually by bursar/admin or scheduled via cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let bodyJson: any = {};
    try { bodyJson = await req.json(); } catch { /* empty */ }
    const schoolFilter: string | null = bodyJson?.school_id ?? null;

    // Find unpaid/partially paid invoices with positive balance
    let invQuery = supabase
      .from('invoices')
      .select('id, school_id, student_id, balance_amount, due_date, invoice_number, status')
      .gt('balance_amount', 0)
      .neq('status', 'paid')
      .neq('status', 'cancelled');
    if (schoolFilter) invQuery = invQuery.eq('school_id', schoolFilter);

    const { data: invoices, error: invErr } = await invQuery;
    if (invErr) throw invErr;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No outstanding invoices' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load schools for branding
    const schoolIds = [...new Set(invoices.map(i => i.school_id))];
    const { data: schools } = await supabase.from('schools').select('id, school_name').in('id', schoolIds);
    const schoolMap = new Map((schools || []).map(s => [s.id, s.school_name]));

    // Load students -> profiles
    const studentIds = [...new Set(invoices.map(i => i.student_id).filter(Boolean))];
    const { data: students } = await supabase.from('students').select('id, profile_id').in('id', studentIds);
    const studentMap = new Map((students || []).map(s => [s.id, s.profile_id]));

    // Load parent relationships
    const { data: rels } = await supabase
      .from('parent_student_relationships')
      .select('parent_id, student_id')
      .in('student_id', studentIds);
    const parentByStudent = new Map<string, string[]>();
    (rels || []).forEach(r => {
      const arr = parentByStudent.get(r.student_id) || [];
      arr.push(r.parent_id);
      parentByStudent.set(r.student_id, arr);
    });

    // Student names for messages
    const profileIds = [...new Set((students || []).map(s => s.profile_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds);
    const nameByProfile = new Map((profiles || []).map(p => [p.id, `${p.first_name} ${p.last_name}`]));

    const today = new Date();
    let sent = 0;
    const notifications: any[] = [];
    const reminders: any[] = [];

    for (const inv of invoices) {
      const parents = parentByStudent.get(inv.student_id) || [];
      if (parents.length === 0) continue;
      const schoolName = schoolMap.get(inv.school_id) || 'Your school';
      const childName = nameByProfile.get(studentMap.get(inv.student_id) || '') || 'your child';
      const balance = Number(inv.balance_amount);
      const balanceStr = `UGX ${balance.toLocaleString()}`;

      let reminderType = 'balance';
      let urgency = '';
      if (inv.due_date) {
        const due = new Date(inv.due_date);
        const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0) { reminderType = 'overdue'; urgency = ` Payment is overdue by ${Math.abs(days)} day(s).`; }
        else if (days <= 7) { reminderType = 'due_soon'; urgency = ` Due in ${days} day(s).`; }
      }

      const message = `${schoolName}: Reminder - ${childName} has a fees balance of ${balanceStr}.${urgency} Please clear before end of term.`;

      for (const parentId of parents) {
        notifications.push({
          user_id: parentId,
          title: '💰 Fee Balance Reminder',
          message,
          type: reminderType === 'overdue' ? 'error' : 'warning',
          category: 'fees',
          reference_id: inv.id,
          reference_type: 'invoice',
          school_id: inv.school_id,
        });
        reminders.push({
          school_id: inv.school_id,
          invoice_id: inv.id,
          student_id: inv.student_id,
          parent_profile_id: parentId,
          balance_amount: balance,
          reminder_type: reminderType,
          channel: 'in_app',
          message,
        });
        sent++;
      }
    }

    if (notifications.length > 0) {
      const { error: nErr } = await supabase.from('notifications').insert(notifications);
      if (nErr) throw nErr;
    }
    if (reminders.length > 0) {
      const { error: rErr } = await supabase.from('fee_reminders').insert(reminders);
      if (rErr) throw rErr;
    }

    return new Response(JSON.stringify({ sent, invoices: invoices.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('send-fee-reminders error:', e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

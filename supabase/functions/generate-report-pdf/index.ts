import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: fetch student data
async function fetchStudentData(supabase: any, studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, student_id, gender, date_of_birth, section, house, photo_url, profile_id, school_id,
      profiles:profile_id(first_name, last_name)
    `)
    .eq('id', studentId)
    .single();
  if (error) throw new Error(`Student fetch error: ${error.message}`);
  return data;
}

// Helper: fetch enrollment
async function fetchEnrollment(supabase: any, studentId: string, academicYearId: string) {
  const { data } = await supabase
    .from('student_enrollments')
    .select(`class_id, stream_id, classes(id, name, level_id, class_teacher_id, levels(name)), streams(name)`)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'active')
    .single();
  return data;
}

// Helper: calculate fees balance
async function calculateFeesBalance(supabase: any, studentId: string, academicYearId: string, term: string) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .neq('status', 'cancelled');

  const totalRequired = (invoices || []).reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);

  const { data: scholarships } = await supabase
    .from('student_scholarships')
    .select('amount')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'active');

  const totalScholarship = (scholarships || []).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
  const adjustedFees = Math.max(totalRequired - totalScholarship, 0);

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('student_id', studentId)
    .eq('status', 'completed');

  const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const calculatedBalance = Math.max(adjustedFees - totalPaid, 0);

  const { data: override } = await supabase
    .from('student_fee_overrides')
    .select('override_amount')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('term', term)
    .maybeSingle();

  const hasOverride = !!override;
  const overrideAmount = override ? Number(override.override_amount) : 0;
  const finalBalance = hasOverride ? overrideAmount : calculatedBalance;

  return { totalRequired, totalScholarship, adjustedFees, totalPaid, calculatedBalance, hasOverride, overrideAmount, finalBalance };
}

// Helper: fetch attendance summary
async function fetchAttendanceSummary(supabase: any, studentId: string, schoolId: string) {
  const { data: records } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('student_id', studentId)
    .eq('school_id', schoolId);

  if (!records || records.length === 0) {
    return { totalDays: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };
  }

  const totalDays = records.length;
  const present = records.filter((r: any) => r.status === 'present').length;
  const absent = records.filter((r: any) => r.status === 'absent').length;
  const late = records.filter((r: any) => r.status === 'late').length;
  const excused = records.filter((r: any) => r.status === 'excused').length;
  const percentage = totalDays > 0 ? Math.round((present + late) / totalDays * 100 * 10) / 10 : 0;

  return { totalDays, present, absent, late, excused, percentage };
}

// Helper: fetch digital signatures
async function fetchSignatures(supabase: any, schoolId: string, classTeacherId: string | null) {
  const result: any = { classTeacher: null, headTeacher: null };

  // Head teacher signature - any admin/principal/head_teacher with active signature
  const { data: htSigs } = await supabase
    .from('digital_signatures')
    .select('signature_data, signature_type, font_family, user_id, profiles:user_id(first_name, last_name, role)')
    .eq('school_id', schoolId)
    .eq('is_active', true);

  if (htSigs) {
    const headSig = htSigs.find((s: any) => 
      s.profiles?.role === 'head_teacher' || s.profiles?.role === 'principal'
    );
    if (headSig) {
      result.headTeacher = {
        signatureData: headSig.signature_data,
        signatureType: headSig.signature_type,
        fontFamily: headSig.font_family,
        name: `${headSig.profiles?.first_name || ''} ${headSig.profiles?.last_name || ''}`.trim(),
      };
    }
  }

  // Class teacher signature
  if (classTeacherId && htSigs) {
    const ctSig = htSigs.find((s: any) => s.user_id === classTeacherId);
    if (ctSig) {
      result.classTeacher = {
        signatureData: ctSig.signature_data,
        signatureType: ctSig.signature_type,
        fontFamily: ctSig.font_family,
        name: `${ctSig.profiles?.first_name || ''} ${ctSig.profiles?.last_name || ''}`.trim(),
      };
    }
  }

  return result;
}

// Helper: fetch school stamp
async function fetchSchoolStamp(supabase: any, schoolId: string) {
  const { data } = await supabase
    .from('school_stamps')
    .select('stamp_url')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.stamp_url || null;
}

// Helper: process subjects
function processSubjects(submissions: any[]) {
  return (submissions || []).map((sub: any) => {
    const a1 = sub.a1_score;
    const a2 = sub.a2_score;
    const a3 = sub.a3_score;
    const validScores = [a1, a2, a3].filter((s) => s !== null && s !== undefined);
    const avg = validScores.length > 0 ? validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length : null;
    const ca20 = avg !== null ? (avg / 3) * 0.2 * 100 : null;
    const exam80 = sub.exam_score !== null ? sub.exam_score * 0.8 : null;
    const total100 = ca20 !== null && exam80 !== null ? ca20 + exam80 : sub.marks;

    return {
      code: sub.subjects?.code || '',
      name: sub.subjects?.name || '',
      a1, a2, a3,
      avg: avg !== null ? Math.round(avg * 10) / 10 : null,
      ca20: ca20 !== null ? Math.round(ca20 * 10) / 10 : null,
      exam80: exam80 !== null ? Math.round(exam80 * 10) / 10 : null,
      total100: total100 !== null ? Math.round(total100 * 10) / 10 : null,
      identifier: sub.identifier || 2,
      grade: sub.grade || '',
      remark: sub.remark || '',
      teacherInitials: sub.teacher_initials || '',
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { studentId, academicYearId, term, generatedBy, classTeacherComment: overrideCtComment, headTeacherComment: overrideHtComment } = await req.json();

    if (!studentId || !academicYearId || !term) {
      throw new Error('Missing required parameters: studentId, academicYearId, term');
    }

    console.log(`Generating report for student: ${studentId}, year: ${academicYearId}, term: ${term}`);

    // Fetch core data in parallel
    const [studentData, enrollment, academicYear, submissions, gradingConfig, comments] = await Promise.all([
      fetchStudentData(supabase, studentId),
      fetchEnrollment(supabase, studentId, academicYearId),
      supabase.from('academic_years').select('name').eq('id', academicYearId).single().then((r: any) => r.data),
      supabase.from('subject_submissions').select(`*, subjects(id, name, code)`).eq('student_id', studentId).eq('academic_year_id', academicYearId).eq('term', term).eq('status', 'approved').then((r: any) => { if (r.error) throw new Error(`Submissions fetch error: ${r.error.message}`); return r.data; }),
      supabase.from('grading_config').select('*').eq('is_active', true).order('max_marks', { ascending: false }).then((r: any) => r.data),
      supabase.from('report_comments').select('*').eq('student_id', studentId).eq('academic_year_id', academicYearId).eq('term', term).then((r: any) => r.data),
    ]);

    const schoolId = studentData.school_id;
    const classTeacherId = enrollment?.classes?.class_teacher_id || null;

    // Fetch school-specific data in parallel
    const [schoolSettings, termConfig, feesData, attendanceSummary, signatures, stampUrl, defaultTemplate] = await Promise.all([
      supabase.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle().then((r: any) => r.data),
      supabase.from('term_configurations').select('*').eq('academic_year_id', academicYearId).eq('term_name', term).maybeSingle().then((r: any) => r.data),
      calculateFeesBalance(supabase, studentId, academicYearId, term),
      fetchAttendanceSummary(supabase, studentId, schoolId),
      fetchSignatures(supabase, schoolId, classTeacherId),
      fetchSchoolStamp(supabase, schoolId),
      supabase.from('report_templates').select('template_type').eq('school_id', schoolId).eq('is_default', true).maybeSingle().then((r: any) => r.data),
    ]);

    // Fetch report_card_fees
    const classId = enrollment?.class_id;
    let reportCardFees: any = null;
    if (classId) {
      const { data } = await supabase
        .from('report_card_fees').select('*')
        .eq('academic_year_id', academicYearId).eq('term', term).eq('class_id', classId)
        .maybeSingle();
      reportCardFees = data;
    }
    if (!reportCardFees) {
      const { data } = await supabase
        .from('report_card_fees').select('*')
        .eq('academic_year_id', academicYearId).eq('term', term).is('class_id', null)
        .maybeSingle();
      reportCardFees = data;
    }

    // Calculate age
    const dob = studentData.date_of_birth ? new Date(studentData.date_of_birth) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

    // Process subjects
    const processedSubjects = processSubjects(submissions);

    // Calculate overall averages
    const validTotals = processedSubjects.filter(s => s.total100 !== null).map(s => s.total100 as number);
    const overallAvg = validTotals.length > 0 ? validTotals.reduce((a, b) => a + b, 0) / validTotals.length : 0;

    let overallGrade = 'F';
    let overallRemark = 'Basic';
    for (const gc of gradingConfig || []) {
      if (overallAvg >= gc.min_marks && overallAvg <= gc.max_marks) {
        overallGrade = gc.grade;
        overallRemark = gc.remark || '';
        break;
      }
    }

    const avgIdentifier = processedSubjects.length > 0
      ? Math.round(processedSubjects.reduce((sum, s) => sum + (s.identifier || 2), 0) / processedSubjects.length)
      : 2;

    const classTeacherComment = overrideCtComment || comments?.find((c: any) => c.comment_type === 'class_teacher')?.comment || '';
    const headTeacherComment = overrideHtComment || comments?.find((c: any) => c.comment_type === 'head_teacher')?.comment || '';

    // Format fees balance for display
    const feesBalanceDisplay = feesData.finalBalance > 0
      ? `UGX ${feesData.finalBalance.toLocaleString()}`
      : 'Fully Paid';

    // Get class teacher name
    let classTeacherName = '';
    if (classTeacherId) {
      const { data: ctProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', classTeacherId)
        .single();
      if (ctProfile) {
        classTeacherName = `${ctProfile.first_name} ${ctProfile.last_name}`;
      }
    }

    // Build report data
    const reportData = {
      student: {
        name: `${studentData.profiles?.first_name || ''} ${studentData.profiles?.last_name || ''}`.trim(),
        gender: studentData.gender || 'Not specified',
        section: studentData.section || 'Day',
        class: (enrollment?.classes as any)?.name || '',
        stream: (enrollment?.streams as any)?.name || '',
        level: (enrollment?.classes as any)?.levels?.name || '',
        house: studentData.house || '',
        age,
        photoUrl: studentData.photo_url || '',
        admissionNo: studentData.student_id || '',
      },
      school: {
        name: schoolSettings?.school_name || 'School Name',
        motto: schoolSettings?.motto || '',
        address: schoolSettings?.address || '',
        phone: schoolSettings?.phone || '',
        email: schoolSettings?.email || '',
        website: schoolSettings?.website || '',
        logoUrl: schoolSettings?.logo_url || '',
        footerMotto: schoolSettings?.footer_motto || '',
        badge: schoolSettings?.badge_url || '',
      },
      term: {
        name: term,
        year: academicYear?.name || '',
        printedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDate: termConfig?.end_date || '',
        nextTermStart: termConfig?.next_term_start_date || '',
        feesBalance: feesBalanceDisplay,
        feesNextTerm: reportCardFees?.fees_next_term || termConfig?.fees_next_term || '',
        otherRequirements: reportCardFees?.other_requirements || termConfig?.other_requirements || '',
      },
      fees: {
        totalRequired: feesData.totalRequired,
        totalScholarship: feesData.totalScholarship,
        adjustedFees: feesData.adjustedFees,
        totalPaid: feesData.totalPaid,
        calculatedBalance: feesData.calculatedBalance,
        hasOverride: feesData.hasOverride,
        overrideAmount: feesData.overrideAmount,
        finalBalance: feesData.finalBalance,
      },
      attendance: attendanceSummary,
      subjects: processedSubjects,
      summary: {
        overallAvg: Math.round(overallAvg * 10) / 10,
        overallGrade,
        overallIdentifier: avgIdentifier,
        overallAchievement: overallRemark,
        classTeacherComment,
        headTeacherComment,
        classTeacherName,
      },
      signatures: {
        classTeacher: signatures.classTeacher,
        headTeacher: signatures.headTeacher,
      },
      stampUrl,
      gradingScale: gradingConfig?.map((gc: any) => ({
        grade: gc.grade,
        minScore: gc.min_marks,
        maxScore: gc.max_marks,
      })) || [],
    };

    // Generate verification code
    const verificationCode = `${studentId.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    // Store generated report
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .upsert({
        student_id: studentId,
        academic_year_id: academicYearId,
        term: term,
        school_id: schoolId,
        overall_average: reportData.summary.overallAvg,
        overall_grade: reportData.summary.overallGrade,
        attendance_percentage: attendanceSummary.percentage,
        status: 'draft',
        generated_by: generatedBy,
        generated_at: new Date().toISOString(),
        verification_code: verificationCode,
        report_data: reportData,
      }, {
        onConflict: 'student_id,academic_year_id,term',
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report save error:', reportError);
    }

    // Log the action
    await supabase.from('report_audit_log').insert({
      actor_id: generatedBy,
      action: 'generate_report',
      target_type: 'report',
      target_id: report?.id || studentId,
      details: { term, academicYearId, verificationCode },
    });

    console.log('Report generated successfully:', verificationCode);

    return new Response(JSON.stringify({
      success: true,
      reportData,
      verificationCode,
      reportId: report?.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

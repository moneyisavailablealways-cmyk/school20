import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportData {
  student: {
    name: string;
    gender: string;
    section: string;
    class: string;
    house: string;
    age: number;
    photoUrl: string;
    admissionNo: string;
  };
  school: {
    name: string;
    motto: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    footerMotto: string;
  };
  term: {
    name: string;
    year: string;
    printedDate: string;
    endDate: string;
    nextTermStart: string;
    feesBalance: string;
    feesNextTerm: string;
    otherRequirements: string;
  };
  subjects: Array<{
    code: string;
    name: string;
    a1: number | null;
    a2: number | null;
    a3: number | null;
    avg: number | null;
    ca20: number | null;
    exam80: number | null;
    total100: number | null;
    identifier: number;
    grade: string;
    remark: string;
    teacherInitials: string;
  }>;
  summary: {
    overallAvg: number;
    overallGrade: string;
    overallIdentifier: number;
    overallAchievement: string;
    classTeacherComment: string;
    headTeacherComment: string;
  };
  gradingScale: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { studentId, academicYearId, term, generatedBy } = await req.json();

    if (!studentId || !academicYearId || !term) {
      throw new Error('Missing required parameters: studentId, academicYearId, term');
    }

    console.log(`Generating report for student: ${studentId}, year: ${academicYearId}, term: ${term}`);

    // Fetch student data with enrollment
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        gender,
        date_of_birth,
        section,
        house,
        photo_url,
        profile_id,
        profiles:profile_id(first_name, last_name)
      `)
      .eq('id', studentId)
      .single();

    if (studentError) throw new Error(`Student fetch error: ${studentError.message}`);

    // Fetch enrollment for class info
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select(`
        class_id,
        stream_id,
        classes(name, level_id, levels(name)),
        streams(name)
      `)
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'active')
      .single();

    // Fetch school settings
    const { data: schoolSettings } = await supabase
      .from('school_settings')
      .select('*')
      .maybeSingle();

    // Fetch term configuration
    const { data: termConfig } = await supabase
      .from('term_configurations')
      .select('*')
      .eq('academic_year_id', academicYearId)
      .eq('term_name', term)
      .maybeSingle();

    // Fetch academic year
    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('name')
      .eq('id', academicYearId)
      .single();

    // Fetch subject submissions with grades
    const { data: submissions, error: subError } = await supabase
      .from('subject_submissions')
      .select(`
        *,
        subjects(id, name, code)
      `)
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('term', term)
      .eq('status', 'approved');

    if (subError) throw new Error(`Submissions fetch error: ${subError.message}`);

    // Fetch grading config
    const { data: gradingConfig } = await supabase
      .from('grading_config')
      .select('*')
      .eq('is_active', true)
      .order('max_marks', { ascending: false });

    // Fetch comments
    const { data: comments } = await supabase
      .from('report_comments')
      .select('*')
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('term', term);

    // Calculate age
    const dob = new Date(studentData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();

    // Process subjects
    const processedSubjects = submissions?.map((sub: any) => {
      const a1 = sub.a1_score;
      const a2 = sub.a2_score;
      const a3 = sub.a3_score;
      const validScores = [a1, a2, a3].filter((s) => s !== null && s !== undefined);
      const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null;
      const ca20 = avg !== null ? (avg / 3) * 0.2 * 100 : null; // 20% of average
      const exam80 = sub.exam_score !== null ? sub.exam_score * 0.8 : null; // 80% of exam
      const total100 = ca20 !== null && exam80 !== null ? ca20 + exam80 : sub.marks;

      return {
        code: sub.subjects?.code || '',
        name: sub.subjects?.name || '',
        a1,
        a2,
        a3,
        avg: avg !== null ? Math.round(avg * 10) / 10 : null,
        ca20: ca20 !== null ? Math.round(ca20 * 10) / 10 : null,
        exam80: exam80 !== null ? Math.round(exam80 * 10) / 10 : null,
        total100: total100 !== null ? Math.round(total100 * 10) / 10 : null,
        identifier: sub.identifier || 2,
        grade: sub.grade || '',
        remark: sub.remark || '',
        teacherInitials: sub.teacher_initials || '',
      };
    }) || [];

    // Calculate overall averages
    const validTotals = processedSubjects.filter(s => s.total100 !== null).map(s => s.total100 as number);
    const overallAvg = validTotals.length > 0 ? validTotals.reduce((a, b) => a + b, 0) / validTotals.length : 0;
    
    // Determine overall grade
    let overallGrade = 'F';
    let overallRemark = 'Basic';
    for (const gc of gradingConfig || []) {
      if (overallAvg >= gc.min_marks && overallAvg <= gc.max_marks) {
        overallGrade = gc.grade;
        overallRemark = gc.remark || '';
        break;
      }
    }

    // Calculate average identifier
    const avgIdentifier = processedSubjects.length > 0
      ? Math.round(processedSubjects.reduce((sum, s) => sum + (s.identifier || 2), 0) / processedSubjects.length)
      : 2;

    // Get comments
    const classTeacherComment = comments?.find(c => c.comment_type === 'class_teacher')?.comment || '';
    const headTeacherComment = comments?.find(c => c.comment_type === 'head_teacher')?.comment || '';

    // Build report data
    const reportData: ReportData = {
      student: {
        name: `${studentData.profiles?.first_name || ''} ${studentData.profiles?.last_name || ''}`.toUpperCase(),
        gender: (studentData.gender || 'Not specified').toUpperCase(),
        section: studentData.section || 'Day',
        class: (enrollment?.classes as any)?.name || '',
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
        footerMotto: schoolSettings?.footer_motto || 'Work hard to excel',
      },
      term: {
        name: term,
        year: academicYear?.name || '',
        printedDate: new Date().toLocaleDateString('en-GB'),
        endDate: termConfig?.end_date || '',
        nextTermStart: termConfig?.next_term_start_date || '',
        feesBalance: termConfig?.fees_balance_note || '',
        feesNextTerm: termConfig?.fees_next_term || '',
        otherRequirements: termConfig?.other_requirements || '',
      },
      subjects: processedSubjects,
      summary: {
        overallAvg: Math.round(overallAvg * 10) / 10,
        overallGrade,
        overallIdentifier: avgIdentifier,
        overallAchievement: overallRemark,
        classTeacherComment,
        headTeacherComment,
      },
      gradingScale: gradingConfig?.map(gc => ({
        grade: gc.grade,
        minScore: gc.min_marks,
        maxScore: gc.max_marks,
      })) || [],
    };

    // Generate verification code
    const verificationCode = `${studentId.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    // Store generated report record
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .upsert({
        student_id: studentId,
        academic_year_id: academicYearId,
        term: term,
        overall_average: reportData.summary.overallAvg,
        overall_grade: reportData.summary.overallGrade,
        status: 'draft',
        generated_by: generatedBy,
        generated_at: new Date().toISOString(),
        verification_code: verificationCode,
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
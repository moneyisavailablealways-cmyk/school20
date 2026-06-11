import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import ReportCardPreview from './ReportCardPreview';
import { mergeCurrentSchoolBranding } from './reportBranding';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: string;
  templateName: string;
}

const TemplatePreviewWithDataDialog = ({ open, onOpenChange, templateType, templateName }: Props) => {
  const { profile } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreviewData(null);
      setSelectedStudent('');
    }
  }, [open]);

  const { data: classes } = useQuery({
    queryKey: ['tpl-preview-classes', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile!.school_id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.school_id && open,
  });

  const { data: students } = useQuery({
    queryKey: ['tpl-preview-students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner(id, student_id, profiles:profile_id(first_name, last_name))
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((e: any) => ({
        id: e.student_id,
        admissionNo: e.students?.student_id,
        name: `${e.students?.profiles?.first_name || ''} ${e.students?.profiles?.last_name || ''}`.trim(),
      }));
    },
    enabled: !!selectedClass,
  });

  const { data: currentYear } = useQuery({
    queryKey: ['tpl-preview-year'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_years')
        .select('id, name, is_current')
        .order('is_current', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const loadPreview = async () => {
    if (!selectedStudent || !currentYear?.id) {
      toast.error('Pick a class, term and student first');
      return;
    }
    setLoading(true);
    setPreviewData(null);
    try {
      // Try existing report first
      const { data: existing } = await supabase
        .from('generated_reports')
        .select('report_data, school_id')
        .eq('student_id', selectedStudent)
        .eq('term', selectedTerm)
        .maybeSingle();

      let reportData: any = null;
      if (existing?.report_data) {
        reportData = await mergeCurrentSchoolBranding(
          existing.report_data as Record<string, any>,
          existing.school_id || profile?.school_id,
        );
      } else {
        const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
          body: {
            studentId: selectedStudent,
            academicYearId: currentYear.id,
            term: selectedTerm,
            generatedBy: profile?.id,
          },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed');
        reportData = await mergeCurrentSchoolBranding(data.reportData, profile?.school_id);
      }
      // Force this template
      reportData.templateType = templateType;
      setPreviewData(reportData);
    } catch (err: any) {
      toast.error('Failed to load preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('template-preview-printable');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Preview - ${templateName}</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>@page { size: A4; margin: 10mm; }</style></head>
      <body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Preview – {templateName}
          </DialogTitle>
          <DialogDescription>
            Pick a real student to see how this template will look with live data from your school.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(''); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
              <SelectTrigger><SelectValue placeholder={selectedClass ? 'Select student' : 'Pick class first'} /></SelectTrigger>
              <SelectContent>
                {students?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.admissionNo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadPreview} disabled={!selectedStudent || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Load Preview
            </Button>
            {previewData && (
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print">
                <Printer className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 border rounded bg-muted/30 p-2 min-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Building preview with real data...
            </div>
          )}
          {!loading && !previewData && (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
              Select a student and click "Load Preview" to see this template rendered with real data.
            </div>
          )}
          {previewData && (
            <div id="template-preview-printable" className="bg-white">
              <ReportCardPreview data={previewData} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewWithDataDialog;

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GENDER_OPTIONS } from '@/lib/constants/gender';


const Apply: React.FC = () => {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ application_number: string } | null>(null);

  const [form, setForm] = useState({
    application_type: 'learner',
    student_name: '',
    date_of_birth: '',
    gender: '',
    class_applying_for: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_relationship: '',
    address: '',
    previous_school: '',
    notes: '',
  });

  useEffect(() => {
    (async () => {
      if (!schoolSlug) return;
      const { data: s } = await supabase.from('schools').select('id, school_name, logo_url, slug').eq('slug', schoolSlug).maybeSingle();
      setSchool(s);
      if (s) {
        const { data: cfg } = await supabase.from('school_settings').select('admissions_mode').eq('school_id', s.id).maybeSingle();
        setEnabled(cfg?.admissions_mode === 'internal_and_online');
      } else setEnabled(false);
    })();
  }, [schoolSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-public-application', {
        body: { school_slug: schoolSlug, ...form },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({ application_number: (data as any).application_number });
      toast({ title: 'Application submitted', description: `Your reference: ${(data as any).application_number}` });
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (school === null) return <div className="p-8 text-center">Loading…</div>;
  if (!school) return <div className="p-8 text-center text-red-600">School not found.</div>;
  if (enabled === false)
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">{school.school_name}</h1>
        <p className="mt-3 text-muted-foreground">Online admissions are not currently enabled for this school. Please contact the school directly.</p>
      </div>
    );

  if (result)
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Application received</h1>
        <p>Thank you. Your application has been submitted to <strong>{school.school_name}</strong>.</p>
        <div className="p-4 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Reference number</p>
          <p className="font-mono text-xl">{result.application_number}</p>
        </div>
        <Link to={`/apply/${schoolSlug}/status`} className="underline text-primary">
          Check application status
        </Link>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          {school.logo_url && <img src={school.logo_url} className="h-12 w-12 rounded" alt="" />}
          <div>
            <CardTitle>{school.school_name} — Admission Application</CardTitle>
            <p className="text-sm text-muted-foreground">No account required. Save your reference to check status later.</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Applicant Name *</Label>
                <Input required value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>

                </Select>
              </div>
              <div>
                <Label>Class Applying For *</Label>
                <Input required value={form.class_applying_for} onChange={(e) => setForm({ ...form, class_applying_for: e.target.value })} placeholder="e.g. P.4 or S.2" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="text-sm font-semibold">Parent / Guardian</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input required value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
                <div><Label>Relationship</Label><Input value={form.parent_relationship} onChange={(e) => setForm({ ...form, parent_relationship: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input required value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
              </div>
            </div>

            <div><Label>Home Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Previous School</Label><Input value={form.previous_school} onChange={(e) => setForm({ ...form, previous_school: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Button>
            <p className="text-center text-sm">
              <Link to={`/apply/${schoolSlug}/status`} className="text-primary underline">Check application status</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Apply;

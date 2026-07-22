import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolLevel } from '@/hooks/useSchoolLevel';
import { useTerminology } from '@/hooks/useTerminology';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, CheckCircle, XCircle, Clock, GraduationCap, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const STAGES = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'entrance_exam', label: 'Entrance Exam' },
  { value: 'waiting_list', label: 'Waiting List' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'enrolled', label: 'Enrolled' },
];

const stageBadge = (stage: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    interview_scheduled: 'bg-purple-100 text-purple-800',
    entrance_exam: 'bg-indigo-100 text-indigo-800',
    waiting_list: 'bg-orange-100 text-orange-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-200 text-gray-700',
    enrolled: 'bg-green-100 text-green-800',
  };
  return <Badge className={map[stage] || 'bg-gray-100'}>{stage.replace(/_/g, ' ')}</Badge>;
};

type ApplicationType = 'learner' | 'staff';

const Admissions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = profile?.school_id;
  const t = useTerminology();
  const { schoolLevel } = useSchoolLevel();

  const [tab, setTab] = useState<ApplicationType>('learner');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewApp, setViewApp] = useState<any>(null);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveClassId, setApproveClassId] = useState<string>('');

  const emptyForm = {
    application_type: 'learner' as ApplicationType,
    student_name: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_relationship: '',
    parent_national_id: '',
    date_of_birth: '',
    gender: '',
    address: '',
    previous_school: '',
    class_applying_for: '',
    national_id: '',
    birth_certificate_number: '',
    notes: '',
    // staff
    qualification: '',
    experience_years: '',
    position: '',
  };
  const [form, setForm] = useState(emptyForm);

  const { data: applications = [] } = useQuery({
    queryKey: ['admission-applications', schoolId, tab],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('school_id', schoolId)
        .eq('application_type', tab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['admissions-classes', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name');
      return data || [];
    },
    enabled: !!schoolId,
  });

  const filtered = useMemo(
    () => (stageFilter === 'all' ? applications : applications.filter((a: any) => a.stage === stageFilter)),
    [applications, stageFilter],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error('No school context');
      const payload: any = {
        school_id: schoolId,
        application_type: tab,
        source: 'internal',
        stage: 'pending',
        student_name: form.student_name,
        parent_name: form.parent_name || (tab === 'staff' ? form.student_name : ''),
        parent_email: form.parent_email || null,
        parent_phone: form.parent_phone || null,
        parent_relationship: form.parent_relationship || null,
        parent_national_id: form.parent_national_id || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
        previous_school: form.previous_school || null,
        class_applying_for: tab === 'learner' ? form.class_applying_for : 'N/A',
        national_id: form.national_id || null,
        birth_certificate_number: form.birth_certificate_number || null,
        notes: form.notes || null,
        staff_details: tab === 'staff' ? {
          qualification: form.qualification,
          experience_years: form.experience_years ? parseInt(form.experience_years) : 0,
          position: form.position,
        } : {},
        created_by: profile?.id ?? null,
      };
      const { error } = await supabase.from('admission_applications').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-applications'] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: 'Application submitted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, stage, reason }: { id: string; stage: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('transition_application', {
        p_app_id: id, p_new_stage: stage, p_reason: reason ?? null,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-applications'] });
      toast({ title: 'Application updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId?: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-admission', {
        body: {
          applicationId: id,
          classId: classId || null,
          streamId: null,
        },
      });
      if (error) {
        const response = (error as any).context;
        const body = response instanceof Response
          ? await response.clone().json().catch(() => null)
          : null;
        throw new Error(body?.error || error.message || 'Approval failed');
      }
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Approval failed');
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admission-applications'] });
      setApproveTarget(null);
      setApproveClassId('');
      toast({
        title: tab === 'staff' ? 'Teacher hired' : `${t.Student} enrolled`,
        description: data?.admission_number
          ? `Admission #: ${data.admission_number}`
          : data?.employee_id ? `Employee #: ${data.employee_id}` : undefined,
      });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = (type: ApplicationType) => {
    setForm({ ...emptyForm, application_type: type });
    setTab(type);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admissions Management</h1>
          <p className="text-muted-foreground">Applicants only. Approved records appear in their management pages.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicationType)}>
        <TabsList>
          <TabsTrigger value="learner">
            <GraduationCap className="h-4 w-4 mr-2" />
            {t.Student} Admissions
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Briefcase className="h-4 w-4 mr-2" />
            Staff Recruitment
          </TabsTrigger>
        </TabsList>

        {(['learner', 'staff'] as const).map((tv) => (
          <TabsContent key={tv} value={tv} className="space-y-4">
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <div>
                  <CardTitle>
                    {tv === 'learner' ? `${t.Student} Applications` : 'Staff Applications'}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => openNew(tv)}>
                    <Plus className="h-4 w-4 mr-2" />New Application
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App #</TableHead>
                      <TableHead>Name</TableHead>
                      {tv === 'learner' && <TableHead>Class</TableHead>}
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No applications
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.application_number}</TableCell>
                        <TableCell className="font-medium">{a.student_name}</TableCell>
                        {tv === 'learner' && <TableCell>{a.class_applying_for}</TableCell>}
                        <TableCell><Badge variant="outline">{a.source}</Badge></TableCell>
                        <TableCell>{stageBadge(a.stage)}</TableCell>
                        <TableCell>{format(new Date(a.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => setViewApp(a)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {a.stage !== 'enrolled' && a.stage !== 'rejected' && (
                            <>
                              <Button size="sm" variant="default" onClick={() => { setApproveTarget(a); setApproveClassId(''); }}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {tv === 'staff' ? 'Hire' : 'Approve'}
                              </Button>
                              <Button size="sm" variant="destructive"
                                onClick={() => transitionMutation.mutate({ id: a.id, stage: 'rejected' })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* New application dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New {tab === 'learner' ? `${t.Student}` : 'Staff'} Application
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name *</Label>
                <Input required value={form.student_name}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tab === 'learner' && (
                <div>
                  <Label>Class Applying For *</Label>
                  <Select value={form.class_applying_for} onValueChange={(v) => setForm({ ...form, class_applying_for: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>National ID / Passport</Label>
                <Input value={form.national_id}
                  onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
              </div>
              {tab === 'learner' && (
                <div>
                  <Label>Birth Certificate No.</Label>
                  <Input value={form.birth_certificate_number}
                    onChange={(e) => setForm({ ...form, birth_certificate_number: e.target.value })} />
                </div>
              )}
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea rows={2} value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              {tab === 'learner' && (
                <div className="col-span-2">
                  <Label>Previous School</Label>
                  <Input value={form.previous_school}
                    onChange={(e) => setForm({ ...form, previous_school: e.target.value })} />
                </div>
              )}
            </div>

            {tab === 'learner' && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-semibold">Parent / Guardian</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parent Name *</Label>
                    <Input required value={form.parent_name}
                      onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input placeholder="Father / Mother / Guardian" value={form.parent_relationship}
                      onChange={(e) => setForm({ ...form, parent_relationship: e.target.value })} />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input value={form.parent_phone}
                      onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Parent Email</Label>
                    <Input type="email" value={form.parent_email}
                      onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Parent National ID</Label>
                    <Input value={form.parent_national_id}
                      onChange={(e) => setForm({ ...form, parent_national_id: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'staff' && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-semibold">Position Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Position</Label>
                    <Input value={form.position} placeholder="Teacher, Support, etc."
                      onChange={(e) => setForm({ ...form, position: e.target.value })} />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={form.parent_phone}
                      onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input type="email" value={form.parent_email}
                      onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Highest Qualification</Label>
                    <Input value={form.qualification}
                      onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
                  </div>
                  <div>
                    <Label>Years of Experience</Label>
                    <Input type="number" min="0" value={form.experience_years}
                      onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View application */}
      <Dialog open={!!viewApp} onOpenChange={(o) => !o && setViewApp(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application {viewApp?.application_number}</DialogTitle>
          </DialogHeader>
          {viewApp && (
            <div className="text-sm space-y-2">
              <div><strong>Name:</strong> {viewApp.student_name}</div>
              <div><strong>Type:</strong> {viewApp.application_type}</div>
              <div><strong>Source:</strong> {viewApp.source}</div>
              <div><strong>Stage:</strong> {stageBadge(viewApp.stage)}</div>
              {viewApp.application_type === 'learner' && (<>
                <div><strong>Class:</strong> {viewApp.class_applying_for}</div>
                <div><strong>Date of Birth:</strong> {viewApp.date_of_birth || '—'}</div>
                <div><strong>Gender:</strong> {viewApp.gender || '—'}</div>
                <div><strong>Previous School:</strong> {viewApp.previous_school || '—'}</div>
                <div className="border-t pt-2"><strong>Parent:</strong> {viewApp.parent_name}</div>
                <div><strong>Parent Phone:</strong> {viewApp.parent_phone || '—'}</div>
                <div><strong>Parent Email:</strong> {viewApp.parent_email || '—'}</div>
              </>)}
              {viewApp.application_type === 'staff' && viewApp.staff_details && (
                <>
                  <div><strong>Position:</strong> {viewApp.staff_details.position || '—'}</div>
                  <div><strong>Qualification:</strong> {viewApp.staff_details.qualification || '—'}</div>
                  <div><strong>Experience:</strong> {viewApp.staff_details.experience_years ?? 0} years</div>
                </>
              )}
              <div><strong>Address:</strong> {viewApp.address || '—'}</div>
              <div><strong>Notes:</strong> {viewApp.notes || '—'}</div>
              <div className="border-t pt-2 flex flex-wrap gap-2">
                {['under_review', 'interview_scheduled', 'entrance_exam', 'waiting_list', 'cancelled'].map((s) => (
                  <Button key={s} size="sm" variant="outline"
                    onClick={() => transitionMutation.mutate({ id: viewApp.id, stage: s })}>
                    Move to {s.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve with class */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approveTarget?.application_type === 'staff' ? 'Hire Staff' : `Approve ${t.Student} Admission`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>This will create all related records automatically and mark the application as <b>enrolled</b>.</p>
            {approveTarget?.application_type === 'learner' && (
              <div>
                <Label>Enroll into class</Label>
                <Select value={approveClassId} onValueChange={setApproveClassId}>
                  <SelectTrigger><SelectValue placeholder={approveTarget?.class_applying_for || 'Choose class'} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Leaving blank tries to match the requested class name automatically.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              onClick={() => approveMutation.mutate({ id: approveTarget.id, classId: approveClassId })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admissions;

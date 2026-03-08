import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Eye, Pencil, Trash2, Search, FileText, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface MySubmissionsProps {
  teacherId: string;
  currentYearId: string | undefined;
  selectedTerm: string;
  onEditSubmission?: (submission: any) => void;
}

const MySubmissions = ({ teacherId, currentYearId, selectedTerm, onEditSubmission }: MySubmissionsProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewSubmission, setViewSubmission] = useState<any | null>(null);
  const [editSubmission, setEditSubmission] = useState<any | null>(null);
  const [editValues, setEditValues] = useState({ a1: '', a2: '', a3: '', score20: '', score80: '' });
  const [saving, setSaving] = useState(false);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['my-submissions', teacherId, currentYearId, selectedTerm],
    queryFn: async () => {
      if (!teacherId || !currentYearId) return [];
      let query = supabase
        .from('subject_submissions')
        .select('*')
        .eq('submitted_by', teacherId)
        .eq('academic_year_id', currentYearId)
        .order('submitted_at', { ascending: false });
      
      if (selectedTerm) {
        query = query.eq('term', selectedTerm);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) return [];

      // Fetch related data
      const studentIds = [...new Set(data.map(s => s.student_id))];
      const subjectIds = [...new Set(data.map(s => s.subject_id))];

      const [{ data: students }, { data: subjects }] = await Promise.all([
        supabase.from('students').select('id, student_id, profile_id').in('id', studentIds),
        supabase.from('subjects').select('id, name, code').in('id', subjectIds),
      ]);

      const profileIds = (students || []).map(s => s.profile_id).filter(Boolean);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const studentMap = new Map((students || []).map(s => {
        const p = profileMap.get(s.profile_id);
        return [s.id, { name: p ? `${p.first_name} ${p.last_name}` : 'Unknown', admNo: s.student_id || '' }];
      }));
      const subjectMap = new Map((subjects || []).map(s => [s.id, { name: s.name, code: s.code }]));

      return data.map(sub => ({
        ...sub,
        student_name: studentMap.get(sub.student_id)?.name || 'Unknown',
        student_adm: studentMap.get(sub.student_id)?.admNo || '',
        subject_name: subjectMap.get(sub.subject_id)?.name || 'Unknown',
        subject_code: subjectMap.get(sub.subject_id)?.code || '',
      }));
    },
    enabled: !!teacherId && !!currentYearId,
  });

  const filtered = (submissions || []).filter(s =>
    s.student_name.toLowerCase().includes(search.toLowerCase()) ||
    s.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_adm.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subject_submissions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete submission');
    } else {
      toast.success('Submission deleted');
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    }
  };

  const openEdit = (sub: any) => {
    setEditSubmission(sub);
    setEditValues({
      a1: sub.a1_score?.toString() || '',
      a2: sub.a2_score?.toString() || '',
      a3: sub.a3_score?.toString() || '',
      score20: sub.marks != null ? (sub.marks * 0.2).toFixed(2) : '',
      score80: sub.exam_score?.toString() || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editSubmission) return;
    setSaving(true);
    const a1 = parseFloat(editValues.a1) || null;
    const a2 = parseFloat(editValues.a2) || null;
    const a3 = parseFloat(editValues.a3) || null;
    const s20 = parseFloat(editValues.score20) || null;
    const s80 = parseFloat(editValues.score80) || null;
    const total = s20 !== null && s80 !== null ? Math.round((s20 + s80) * 100) / 100 : null;

    const { error } = await supabase
      .from('subject_submissions')
      .update({
        a1_score: a1,
        a2_score: a2,
        a3_score: a3,
        exam_score: s80,
        marks: total,
        status: 'draft',
      })
      .eq('id', editSubmission.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to update submission');
    } else {
      toast.success('Submission updated and set back to draft');
      setEditSubmission(null);
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          My Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading submissions...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No submissions found</p>
        ) : (
          <div className="overflow-x-auto rounded-md border max-w-full">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(sub => {
                  const isApproved = sub.status === 'approved';
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium text-sm">
                        <div>{sub.student_name}</div>
                        {sub.student_adm && <div className="text-xs text-muted-foreground">{sub.student_adm}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{sub.subject_name}</TableCell>
                      <TableCell className="text-sm font-semibold">{sub.marks != null ? sub.marks.toFixed(1) : '-'}</TableCell>
                      <TableCell className="text-sm">{sub.grade || '-'}</TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.submitted_at ? formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewSubmission(sub)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isApproved && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sub)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Delete marks for {sub.student_name} – {sub.subject_name}? This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(sub.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={!!viewSubmission} onOpenChange={() => setViewSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription>View marks submission details</DialogDescription>
            </DialogHeader>
            {viewSubmission && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Student:</span> <strong>{viewSubmission.student_name}</strong></div>
                  <div><span className="text-muted-foreground">Subject:</span> <strong>{viewSubmission.subject_name}</strong></div>
                  <div><span className="text-muted-foreground">Term:</span> <strong>{viewSubmission.term}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> {statusBadge(viewSubmission.status)}</div>
                </div>
                <div className="border-t pt-3 grid grid-cols-4 gap-2">
                  <div><span className="text-muted-foreground block text-xs">A1</span>{viewSubmission.a1_score ?? '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">A2</span>{viewSubmission.a2_score ?? '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">A3</span>{viewSubmission.a3_score ?? '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">AVG</span>
                    {viewSubmission.a1_score != null && viewSubmission.a2_score != null && viewSubmission.a3_score != null
                      ? ((viewSubmission.a1_score + viewSubmission.a2_score + viewSubmission.a3_score) / 3).toFixed(2)
                      : '-'}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div><span className="text-muted-foreground block text-xs">Exam (80%)</span>{viewSubmission.exam_score ?? '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">Total</span><strong>{viewSubmission.marks?.toFixed(1) ?? '-'}</strong></div>
                  <div><span className="text-muted-foreground block text-xs">Grade</span>{viewSubmission.grade || '-'}</div>
                  <div><span className="text-muted-foreground block text-xs">Remark</span>{viewSubmission.remark || '-'}</div>
                </div>
                {viewSubmission.rejection_reason && (
                  <div className="border-t pt-3">
                    <span className="text-muted-foreground text-xs">Rejection Reason:</span>
                    <p className="text-destructive mt-1">{viewSubmission.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editSubmission} onOpenChange={() => setEditSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Submission</DialogTitle>
              <DialogDescription>
                {editSubmission?.student_name} – {editSubmission?.subject_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">A1 Score</Label>
                  <Input type="number" step="0.1" value={editValues.a1} onChange={e => setEditValues(p => ({ ...p, a1: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">A2 Score</Label>
                  <Input type="number" step="0.1" value={editValues.a2} onChange={e => setEditValues(p => ({ ...p, a2: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">A3 Score</Label>
                  <Input type="number" step="0.1" value={editValues.a3} onChange={e => setEditValues(p => ({ ...p, a3: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">20% Score</Label>
                  <Input type="number" step="0.1" value={editValues.score20} onChange={e => setEditValues(p => ({ ...p, score20: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">80% Score (Exam)</Label>
                  <Input type="number" step="0.1" value={editValues.score80} onChange={e => setEditValues(p => ({ ...p, score80: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Editing will reset the status to Draft. You'll need to re-submit for approval.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSubmission(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MySubmissions;

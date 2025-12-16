import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Check, X, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const SubmissionsApproval = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; ids: string[] }>({ isOpen: false, ids: [] });
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch submissions
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions-for-approval', filterStatus, filterClass, filterSubject],
    queryFn: async () => {
      let query = supabase
        .from('subject_submissions')
        .select(`
          *,
          student:students!inner(
            id,
            student_id,
            profile_id,
            profiles:profile_id(first_name, last_name)
          ),
          subject:subjects!inner(id, name, code),
          submitter:profiles!subject_submissions_submitted_by_fkey(first_name, last_name),
          approver:profiles!subject_submissions_approved_by_fkey(first_name, last_name),
          academic_year:academic_years(name)
        `)
        .order('submitted_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterSubject !== 'all') {
        query = query.eq('subject_id', filterSubject);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by class if needed (through student enrollments)
      if (filterClass !== 'all' && data) {
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('class_id', filterClass)
          .eq('status', 'active');

        const enrolledStudentIds = enrollments?.map(e => e.student_id) || [];
        return data.filter(s => enrolledStudentIds.includes(s.student_id));
      }

      return data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('subject_submissions')
        .update({
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Submissions approved');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['submissions-for-approval'] });
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const { error } = await supabase
        .from('subject_submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Submissions rejected');
      setSelectedIds([]);
      setRejectDialog({ isOpen: false, ids: [] });
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['submissions-for-approval'] });
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!submissions) return;
    const pendingIds = submissions.filter(s => s.status === 'pending').map(s => s.id);
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  const filteredSubmissions = submissions?.filter(s => {
    if (!searchQuery) return true;
    const studentName = `${(s.student as any)?.profiles?.first_name || ''} ${(s.student as any)?.profiles?.last_name || ''}`.toLowerCase();
    const subjectName = (s.subject as any)?.name?.toLowerCase() || '';
    return studentName.includes(searchQuery.toLowerCase()) || subjectName.includes(searchQuery.toLowerCase());
  });

  const stats = {
    pending: submissions?.filter(s => s.status === 'pending').length || 0,
    approved: submissions?.filter(s => s.status === 'approved').length || 0,
    rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects?.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mark Submissions</CardTitle>
              <CardDescription>{filteredSubmissions?.length || 0} submissions</CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-green-600"
                  onClick={() => approveMutation.mutate(selectedIds)}
                  disabled={approveMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve ({selectedIds.length})
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => setRejectDialog({ isOpen: true, ids: selectedIds })}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredSubmissions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === submissions?.filter(s => s.status === 'pending').length && selectedIds.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions?.map(submission => {
                    const student = submission.student as any;
                    const subject = submission.subject as any;
                    const submitter = submission.submitter as any;

                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          {submission.status === 'pending' && (
                            <Checkbox
                              checked={selectedIds.includes(submission.id)}
                              onCheckedChange={() => toggleSelect(submission.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {student?.profiles?.first_name} {student?.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{student?.student_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{subject?.code || subject?.name}</Badge>
                        </TableCell>
                        <TableCell>{submission.term}</TableCell>
                        <TableCell className="font-bold">{submission.marks}</TableCell>
                        <TableCell>
                          <Badge>{submission.grade}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{submission.remark}</TableCell>
                        <TableCell>
                          {submitter?.first_name} {submitter?.last_name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {submission.submitted_at && format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              submission.status === 'approved' ? 'bg-green-500' :
                              submission.status === 'rejected' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }
                          >
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600"
                                onClick={() => approveMutation.mutate([submission.id])}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600"
                                onClick={() => setRejectDialog({ isOpen: true, ids: [submission.id] })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => !open && setRejectDialog({ isOpen: false, ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission(s)</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {rejectDialog.ids.length} submission(s).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ isOpen: false, ids: [] })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ ids: rejectDialog.ids, reason: rejectionReason })}
              disabled={!rejectionReason || rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmissionsApproval;

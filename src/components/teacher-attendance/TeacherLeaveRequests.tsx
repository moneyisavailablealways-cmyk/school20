import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { Plus, Check, X, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TeacherLeaveRequestsProps {
  isTeacherView?: boolean;
}

const leaveTypes = [
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'vacation_leave', label: 'Vacation Leave' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'other', label: 'Other' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const TeacherLeaveRequests = ({ isTeacherView = false }: TeacherLeaveRequestsProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ isOpen: boolean; requestId: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Fetch leave requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['teacher-leave-requests', isTeacherView ? profile?.id : 'all'],
    queryFn: async () => {
      let query = supabase
        .from('teacher_leave_requests')
        .select(`
          *,
          teacher:profiles!teacher_leave_requests_teacher_id_fkey(first_name, last_name, email),
          approver:profiles!teacher_leave_requests_approved_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (isTeacherView && profile?.id) {
        query = query.eq('teacher_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isTeacherView ? !!profile?.id : true,
  });

  // Create leave request mutation
  const createRequest = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('teacher_leave_requests')
        .insert({
          teacher_id: profile.id,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully');
      setIsDialogOpen(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
    },
    onError: (error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });

  // Approve/Reject mutation
  const handleRequestAction = useMutation({
    mutationFn: async ({ requestId, action, reason }: { requestId: string; action: 'approve' | 'reject'; reason?: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      };

      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      const { data: request, error: fetchError } = await supabase
        .from('teacher_leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('teacher_leave_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // If approved, update attendance records
      if (action === 'approve') {
        const startDate = new Date(request.start_date);
        const endDate = new Date(request.end_date);
        const days = differenceInDays(endDate, startDate) + 1;

        const attendanceRecords = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          attendanceRecords.push({
            teacher_id: request.teacher_id,
            date: format(date, 'yyyy-MM-dd'),
            status: request.leave_type === 'half_day' ? 'half_day' : request.leave_type,
            is_approved: true,
            marked_by: profile.id,
            approved_by: profile.id,
          });
        }

        await supabase
          .from('teacher_attendance')
          .upsert(attendanceRecords, { onConflict: 'teacher_id,date' });
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionDialog(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['teacher-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
    onError: (error) => {
      toast.error(`Failed to process request: ${error.message}`);
    },
  });

  const pendingCount = leaveRequests?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {leaveRequests?.filter(r => r.status === 'approved').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {leaveRequests?.filter(r => r.status === 'rejected').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{leaveRequests?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>
                {isTeacherView ? 'Your leave requests' : 'Manage teacher leave requests'}
              </CardDescription>
            </div>
            {isTeacherView && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Request Leave
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                    <DialogDescription>Submit a new leave request for approval</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Leave Type</Label>
                      <Select
                        value={formData.leaveType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea
                        value={formData.reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Provide a reason for your leave request"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createRequest.mutate()}
                      disabled={!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason || createRequest.isPending}
                    >
                      {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : leaveRequests?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isTeacherView && <TableHead>Teacher</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    {!isTeacherView && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests?.map(request => (
                    <TableRow key={request.id}>
                      {!isTeacherView && (
                        <TableCell className="font-medium">
                          {request.teacher?.first_name} {request.teacher?.last_name}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {leaveTypes.find(t => t.value === request.leave_type)?.label || request.leave_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={request.reason}>
                        {request.reason}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[request.status]}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {!isTeacherView && (
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => setActionDialog({ isOpen: true, requestId: request.id, action: 'approve' })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setActionDialog({ isOpen: true, requestId: request.id, action: 'reject' })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <AlertDialog open={actionDialog?.isOpen} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.action === 'approve'
                ? 'This will approve the leave request and automatically update attendance records.'
                : 'Please provide a reason for rejecting this request.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionDialog?.action === 'reject' && (
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="mt-2"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionDialog && handleRequestAction.mutate({
                requestId: actionDialog.requestId,
                action: actionDialog.action,
                reason: rejectionReason,
              })}
              disabled={actionDialog?.action === 'reject' && !rejectionReason}
              className={actionDialog?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionDialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherLeaveRequests;

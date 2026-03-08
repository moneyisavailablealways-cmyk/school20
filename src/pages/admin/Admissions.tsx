import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, Eye, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Admissions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = profile?.school_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewApplicationDialogOpen, setIsNewApplicationDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [applicationForm, setApplicationForm] = useState({
    student_name: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    previous_school: '',
    class_applying_for: '',
    notes: '',
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admission-applications', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof applicationForm) => {
      const { error } = await supabase.from('admission_applications').insert({
        school_id: schoolId!,
        student_name: form.student_name,
        parent_name: form.parent_name,
        parent_email: form.parent_email || null,
        parent_phone: form.parent_phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
        previous_school: form.previous_school || null,
        class_applying_for: form.class_applying_for,
        notes: form.notes || null,
        created_by: profile?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-applications', schoolId] });
      setApplicationForm({ student_name: '', parent_name: '', parent_email: '', parent_phone: '', date_of_birth: '', gender: '', address: '', previous_school: '', class_applying_for: '', notes: '' });
      setIsNewApplicationDialogOpen(false);
      toast({ title: 'Success', description: 'Admission application submitted successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to submit application', variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('admission_applications').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admission-applications', schoolId] });
      toast({ title: 'Success', description: `Application ${status} successfully` });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }),
  });

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(applicationForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredApplications = applications.filter((app: any) => {
    const matchesSearch = app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.parent_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter((a: any) => a.status === 'pending').length,
    approved: applications.filter((a: any) => a.status === 'approved').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admissions Management</h1>
          <p className="text-muted-foreground">Manage student admission applications</p>
        </div>
        <Dialog open={isNewApplicationDialogOpen} onOpenChange={setIsNewApplicationDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Admission Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Student Name</Label>
                  <Input id="student_name" value={applicationForm.student_name} onChange={(e) => setApplicationForm(prev => ({ ...prev, student_name: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" value={applicationForm.date_of_birth} onChange={(e) => setApplicationForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={applicationForm.gender} onValueChange={(value) => setApplicationForm(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class_applying_for">Class Applying For</Label>
                  <Input id="class_applying_for" value={applicationForm.class_applying_for} onChange={(e) => setApplicationForm(prev => ({ ...prev, class_applying_for: e.target.value }))} placeholder="e.g., P.1" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                  <Input id="parent_name" value={applicationForm.parent_name} onChange={(e) => setApplicationForm(prev => ({ ...prev, parent_name: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="parent_phone">Parent Phone</Label>
                  <Input id="parent_phone" value={applicationForm.parent_phone} onChange={(e) => setApplicationForm(prev => ({ ...prev, parent_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="parent_email">Parent Email</Label>
                <Input id="parent_email" type="email" value={applicationForm.parent_email} onChange={(e) => setApplicationForm(prev => ({ ...prev, parent_email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={applicationForm.address} onChange={(e) => setApplicationForm(prev => ({ ...prev, address: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label htmlFor="previous_school">Previous School</Label>
                <Input id="previous_school" value={applicationForm.previous_school} onChange={(e) => setApplicationForm(prev => ({ ...prev, previous_school: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" value={applicationForm.notes} onChange={(e) => setApplicationForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsNewApplicationDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Submitting...' : 'Submit Application'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.rejected}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by student name, parent name, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admission Applications</CardTitle>
          <CardDescription>Review and manage student admission applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application: any) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">{application.student_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{application.parent_name}</p>
                        {application.parent_email && <p className="text-sm text-muted-foreground">{application.parent_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{application.class_applying_for}</TableCell>
                    <TableCell>{application.application_date ? format(new Date(application.application_date), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedApplication(application); setIsViewDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {application.status === 'pending' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'approved' })} className="text-green-600 hover:text-green-700">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'rejected' })} className="text-red-600 hover:text-red-700">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredApplications.length === 0 && (
            <div className="text-center py-8">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No applications found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by creating a new admission application.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Application Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Student Name</Label>
                  <p className="font-medium">{selectedApplication.student_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p>{selectedApplication.date_of_birth ? format(new Date(selectedApplication.date_of_birth), 'MMM dd, yyyy') : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                  <p>{selectedApplication.gender || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Class Applying For</Label>
                  <p>{selectedApplication.class_applying_for}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                <p>{selectedApplication.address || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Parent/Guardian</Label>
                  <p className="font-medium">{selectedApplication.parent_name}</p>
                  {selectedApplication.parent_email && <p className="text-sm text-muted-foreground">{selectedApplication.parent_email}</p>}
                  {selectedApplication.parent_phone && <p className="text-sm text-muted-foreground">{selectedApplication.parent_phone}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Previous School</Label>
                  <p>{selectedApplication.previous_school || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Application Status</Label>
                <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
              </div>
              {selectedApplication.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p>{selectedApplication.notes}</p>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                {selectedApplication.status === 'pending' && (
                  <>
                    <Button onClick={() => { updateStatusMutation.mutate({ id: selectedApplication.id, status: 'approved' }); setIsViewDialogOpen(false); }} className="bg-green-600 hover:bg-green-700">Approve</Button>
                    <Button variant="destructive" onClick={() => { updateStatusMutation.mutate({ id: selectedApplication.id, status: 'rejected' }); setIsViewDialogOpen(false); }}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admissions;

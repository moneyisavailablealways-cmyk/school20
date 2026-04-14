import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ParentAdmissions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = profile?.school_id;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const [form, setForm] = useState({
    student_name: '',
    date_of_birth: '',
    gender: '',
    class_applying_for: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    previous_school: '',
    notes: '',
  });

  const parentName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';

  // Fetch applications submitted by this parent
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['parent-admission-applications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      if (!schoolId) throw new Error('No school associated with your account');
      const { error } = await supabase.from('admission_applications').insert({
        school_id: schoolId,
        student_name: f.student_name,
        parent_name: parentName,
        parent_email: f.parent_email || profile?.email || null,
        parent_phone: f.parent_phone || null,
        date_of_birth: f.date_of_birth || null,
        gender: f.gender || null,
        address: f.address || null,
        previous_school: f.previous_school || null,
        class_applying_for: f.class_applying_for,
        notes: f.notes || null,
        created_by: profile?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-admission-applications'] });
      setForm({ student_name: '', date_of_birth: '', gender: '', class_applying_for: '', parent_phone: '', parent_email: '', address: '', previous_school: '', notes: '' });
      setIsFormOpen(false);
      toast({ title: 'Application Submitted', description: 'Your admission application has been submitted successfully.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message || 'Failed to submit application', variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(form);
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
          <h1 className="text-3xl font-bold">Admission Applications</h1>
          <p className="text-muted-foreground">Apply for admission for your children</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Application</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Admission Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Child's Full Name *</Label>
                  <Input id="student_name" value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class_applying_for">Class Applying For *</Label>
                  <Input id="class_applying_for" value={form.class_applying_for} onChange={e => setForm(p => ({ ...p, class_applying_for: e.target.value }))} placeholder="e.g., P.1" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent_phone">Your Phone Number</Label>
                  <Input id="parent_phone" value={form.parent_phone} onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="parent_email">Your Email</Label>
                  <Input id="parent_email" type="email" value={form.parent_email} onChange={e => setForm(p => ({ ...p, parent_email: e.target.value }))} placeholder={profile?.email || ''} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label htmlFor="previous_school">Previous School</Label>
                <Input id="previous_school" value={form.previous_school} onChange={e => setForm(p => ({ ...p, previous_school: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitMutation.isPending}>{submitMutation.isPending ? 'Submitting...' : 'Submit Application'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Applications */}
      <Card>
        <CardHeader>
          <CardTitle>My Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">You haven't submitted any admission applications yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child's Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app: any) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.student_name}</TableCell>
                    <TableCell>{app.class_applying_for}</TableCell>
                    <TableCell>{format(new Date(app.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      <Dialog open={selectedApp?.id === app.id} onOpenChange={open => setSelectedApp(open ? app : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
                          <div className="space-y-3 text-sm">
                            <div><strong>Child:</strong> {app.student_name}</div>
                            <div><strong>Date of Birth:</strong> {app.date_of_birth || 'N/A'}</div>
                            <div><strong>Gender:</strong> {app.gender || 'N/A'}</div>
                            <div><strong>Class:</strong> {app.class_applying_for}</div>
                            <div><strong>Previous School:</strong> {app.previous_school || 'N/A'}</div>
                            <div><strong>Address:</strong> {app.address || 'N/A'}</div>
                            <div><strong>Status:</strong> {getStatusBadge(app.status)}</div>
                            {app.notes && <div><strong>Notes:</strong> {app.notes}</div>}
                            <div><strong>Applied:</strong> {format(new Date(app.created_at), 'PPpp')}</div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentAdmissions;

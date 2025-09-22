import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Search,
  Filter,
  Edit,
  Phone,
  Mail,
  Calendar,
  Users,
  Trash2,
} from 'lucide-react';

interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'teacher' as 'teacher' | 'head_teacher',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['teacher', 'head_teacher'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone || '',
      role: teacher.role as 'teacher' | 'head_teacher',
      is_active: teacher.is_active
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingTeacher) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone || null,
          role: editForm.role,
          is_active: editForm.is_active
        })
        .eq('user_id', editingTeacher.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Teacher updated successfully',
      });

      setEditDialogOpen(false);
      setEditingTeacher(null);
      loadTeachers();
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      toast({
        title: 'Error',
        description: 'Failed to update teacher',
        variant: 'destructive',
      });
    }
  };

  const deleteTeacher = async (userId: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to delete teacher "${teacherName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Teacher deleted successfully',
      });

      loadTeachers();
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete teacher',
        variant: 'destructive',
      });
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = 
      teacher.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && teacher.is_active) ||
      (statusFilter === 'inactive' && !teacher.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and their information
          </p>
        </div>
        <Button className="gap-2" onClick={() => window.location.href = '/admin/add-teacher'}>
          <GraduationCap className="h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.filter(t => t.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Head Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.filter(t => t.role === 'head_teacher').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Teachers ({filteredTeachers.length})
          </CardTitle>
          <CardDescription>
            Teaching staff members and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={teacher.avatar_url} />
                        <AvatarFallback>
                          {teacher.first_name[0]}{teacher.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {teacher.first_name} {teacher.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.role === 'head_teacher' ? 'default' : 'secondary'}>
                      {teacher.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {teacher.email}
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {teacher.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(teacher.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(teacher)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTeacher(teacher.user_id, `${teacher.first_name} ${teacher.last_name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredTeachers.length === 0 && (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teachers found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={editForm.role} onValueChange={(value: 'teacher' | 'head_teacher') => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="head_teacher">Head Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.is_active ? 'active' : 'inactive'} onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherManagement;
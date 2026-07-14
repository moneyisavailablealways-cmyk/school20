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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PhotoUpload from '@/components/PhotoUpload';
import { uploadAvatarForProfile } from '@/lib/uploadAvatar';
import {
  Heart,
  Search,
  Filter,
  Edit,
  Phone,
  Mail,
  Calendar,
  Users,
  UserPlus,
  Trash2,
} from 'lucide-react';

interface Parent {
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
  children_count?: number;
}

interface ParentDetails {
  id: string;
  profile_id: string;
  occupation?: string | null;
  workplace?: string | null;
  national_id?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  preferred_contact_method?: string | null;
}

const ParentManagement = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [parentDetailsId, setParentDetailsId] = useState<string | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_active: true,
    occupation: '',
    workplace: '',
    national_id: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    preferred_contact_method: 'email',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          parent_relationships:parent_student_relationships!parent_id(count)
        `)
        .eq('role', 'parent')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parentsWithChildrenCount = (data || []).map((parent: any) => ({
        ...parent,
        children_count: parent.parent_relationships?.[0]?.count || 0,
      }));

      setParents(parentsWithChildrenCount);
    } catch (error) {
      console.error('Error loading parents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load parents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = async (parent: Parent) => {
    setEditingParent(parent);
    setEditPhotoFile(null);

    // Load parent-specific details
    const { data: details } = await supabase
      .from('parents')
      .select('*')
      .eq('profile_id', parent.id)
      .maybeSingle();

    const d = (details || {}) as Partial<ParentDetails>;
    setParentDetailsId(d.id || null);

    setEditForm({
      first_name: parent.first_name,
      last_name: parent.last_name,
      email: parent.email,
      phone: parent.phone || '',
      is_active: parent.is_active,
      occupation: d.occupation || '',
      workplace: d.workplace || '',
      national_id: d.national_id || '',
      address: d.address || '',
      emergency_contact_name: d.emergency_contact_name || '',
      emergency_contact_phone: d.emergency_contact_phone || '',
      emergency_contact_relationship: d.emergency_contact_relationship || '',
      preferred_contact_method: d.preferred_contact_method || 'email',
    });

    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingParent) return;
    setSavingEdit(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone || null,
          is_active: editForm.is_active,
        })
        .eq('user_id', editingParent.user_id);

      if (profileError) throw profileError;

      // Upload new photo if selected
      if (editPhotoFile) {
        try {
          await uploadAvatarForProfile(editingParent.id, editPhotoFile);
        } catch (e) {
          console.error('Photo upload failed:', e);
        }
      }

      // Upsert parent details
      const parentDetailsData = {
        profile_id: editingParent.id,
        occupation: editForm.occupation || null,
        workplace: editForm.workplace || null,
        national_id: editForm.national_id || null,
        address: editForm.address || null,
        emergency_contact_name: editForm.emergency_contact_name || null,
        emergency_contact_phone: editForm.emergency_contact_phone || null,
        emergency_contact_relationship: editForm.emergency_contact_relationship || null,
        preferred_contact_method: editForm.preferred_contact_method || null,
      };

      if (parentDetailsId) {
        const { error } = await supabase
          .from('parents')
          .update(parentDetailsData)
          .eq('id', parentDetailsId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('parents').insert(parentDetailsData);
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Parent updated successfully' });
      setEditDialogOpen(false);
      setEditingParent(null);
      loadParents();
    } catch (error: any) {
      console.error('Error updating parent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update parent',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteParent = async (userId: string, parentName: string) => {
    if (!confirm(`Are you sure you want to delete parent "${parentName}"? This action cannot be undone.`)) {
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
        description: 'Parent deleted successfully',
      });

      loadParents();
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete parent',
        variant: 'destructive',
      });
    }
  };

  const filteredParents = parents.filter(parent => {
    const matchesSearch =
      parent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && parent.is_active) ||
      (statusFilter === 'inactive' && !parent.is_active);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parent Management</h1>
          <p className="text-muted-foreground">
            Manage parent accounts and student relationships
          </p>
        </div>
        <Button className="gap-2" onClick={() => window.location.href = '/admin/add-parent'}>
          <UserPlus className="h-4 w-4" />
          Add Parent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Parents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parents.filter(p => p.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Relationships</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parents.reduce((sum, parent) => sum + (parent.children_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parents..."
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Parents ({filteredParents.length})
          </CardTitle>
          <CardDescription>
            Parent accounts and their student relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParents.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={parent.avatar_url} />
                        <AvatarFallback>
                          {parent.first_name[0]}{parent.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {parent.first_name} {parent.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{parent.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {parent.email}
                      </div>
                      {parent.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {parent.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {parent.children_count || 0} children
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={parent.is_active ? 'default' : 'secondary'}>
                      {parent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(parent.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(parent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteParent(parent.user_id, `${parent.first_name} ${parent.last_name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredParents.length === 0 && (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No parents found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Parent Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Edit Parent
            </DialogTitle>
            <DialogDescription>
              Update parent contact information, occupation, and emergency contact details
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Photo */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Profile Photo</h3>
                <PhotoUpload
                  value={editingParent?.avatar_url}
                  file={editPhotoFile}
                  onFileSelected={setEditPhotoFile}
                  fallback={`${(editForm.first_name || 'P')[0]}${(editForm.last_name || '')[0] || ''}`}
                />
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(v) => setEditForm({ ...editForm, is_active: v === 'active' })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input
                      value={editForm.occupation}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Workplace</Label>
                    <Input
                      value={editForm.workplace}
                      onChange={(e) => setEditForm({ ...editForm, workplace: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>National ID</Label>
                  <Input
                    value={editForm.national_id}
                    onChange={(e) => setEditForm({ ...editForm, national_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input
                      value={editForm.emergency_contact_relationship}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_relationship: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Contact Method</Label>
                    <Select
                      value={editForm.preferred_contact_method}
                      onValueChange={(v) => setEditForm({ ...editForm, preferred_contact_method: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentManagement;

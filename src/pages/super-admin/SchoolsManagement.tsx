import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { School, Plus, Edit, Power, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface School {
  id: string;
  school_name: string;
  school_code: string;
  slug: string;
  country: string;
  region: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  subscription_plan: string | null;
  admin_name: string | null;
  admin_email: string | null;
  created_at: string;
}

const defaultForm = {
  school_name: '',
  school_code: '',
  slug: '',
  country: 'Uganda',
  region: '',
  email: '',
  phone: '',
  address: '',
  admin_name: '',
  admin_email: '',
  subscription_plan: 'standard',
};

const SchoolsManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['super-admin-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as School[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.school_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const school_code = form.school_code.toUpperCase();

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update({ ...form, slug, school_code })
          .eq('id', editingSchool.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schools')
          .insert([{ ...form, slug, school_code }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSchool ? 'School updated' : 'School created successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-schools'] });
      setDialogOpen(false);
      setEditingSchool(null);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'suspended' : 'active';
      const { error } = await supabase.from('schools').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('School status updated');
      queryClient.invalidateQueries({ queryKey: ['super-admin-schools'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (school: School) => {
    setEditingSchool(school);
    setForm({
      school_name: school.school_name,
      school_code: school.school_code,
      slug: school.slug,
      country: school.country,
      region: school.region || '',
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
      admin_name: school.admin_name || '',
      admin_email: school.admin_email || '',
      subscription_plan: school.subscription_plan || 'standard',
    });
    setDialogOpen(true);
  };

  const filtered = schools.filter(
    s =>
      s.school_name.toLowerCase().includes(search.toLowerCase()) ||
      s.school_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schools Management</h1>
          <p className="text-muted-foreground text-sm">Create and manage schools on the platform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingSchool(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              New School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchool ? 'Edit School' : 'Register New School'}</DialogTitle>
              <DialogDescription>Fill in the school details below</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>School Name *</Label>
                  <Input value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} placeholder="e.g. Kampala High School" />
                </div>
                <div className="space-y-1">
                  <Label>School Code *</Label>
                  <Input value={form.school_code} onChange={e => setForm(f => ({ ...f, school_code: e.target.value.toUpperCase() }))} placeholder="e.g. KHS001" />
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Uganda" />
                </div>
                <div className="space-y-1">
                  <Label>Region</Label>
                  <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Central" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@school.com" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000 000" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="School physical address" />
                </div>
                <div className="space-y-1">
                  <Label>Admin Name</Label>
                  <Input value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} placeholder="First Admin name" />
                </div>
                <div className="space-y-1">
                  <Label>Admin Email</Label>
                  <Input type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@school.com" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Subscription Plan</Label>
                  <Select value={form.subscription_plan} onValueChange={v => setForm(f => ({ ...f, subscription_plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.school_name || !form.school_code || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : editingSchool ? 'Update School' : 'Create School'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search schools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Schools Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(school => (
            <Card key={school.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {school.school_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{school.school_name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{school.school_code}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={school.status === 'active' ? 'default' : 'destructive'}
                    className={school.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                  >
                    {school.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  {school.email && <p>📧 {school.email}</p>}
                  {school.phone && <p>📞 {school.phone}</p>}
                  {school.address && <p>📍 {school.address}</p>}
                  {school.admin_email && <p>👤 Admin: {school.admin_name} ({school.admin_email})</p>}
                  <p>📅 Registered: {format(new Date(school.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openEdit(school)}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 gap-1 ${school.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                    onClick={() => toggleStatusMutation.mutate({ id: school.id, status: school.status })}
                    disabled={toggleStatusMutation.isPending}
                  >
                    <Power className="w-3 h-3" />
                    {school.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No schools found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolsManagement;

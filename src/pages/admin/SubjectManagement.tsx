import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';

interface Level {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  level_id: string | null;
  sub_level: string | null;
  is_core: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  level?: Level;
}

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level_id: '',
    sub_level: '',
    is_core: false,
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
    fetchLevels();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          level:levels(id, name, parent_id)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('id, name, parent_id')
        .order('name', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load levels',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const subjectData = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        level_id: formData.level_id || null,
        sub_level: formData.sub_level || null,
        is_core: formData.is_core,
        is_active: formData.is_active,
      };

      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update(subjectData)
          .eq('id', editingSubject.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subject updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([subjectData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subject created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subject',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      level_id: subject.level_id || '',
      sub_level: subject.sub_level || '',
      is_core: subject.is_core,
      is_active: subject.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Subject deleted successfully',
      });
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level_id: '',
      sub_level: '',
      is_core: false,
      is_active: true,
    });
    setEditingSubject(null);
  };

  const handleNewSubject = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading && subjects.length === 0) {
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
          <h1 className="text-3xl font-bold">Subject Management</h1>
          <p className="text-muted-foreground">
            Manage school subjects and curriculum
          </p>
        </div>
        <Button onClick={handleNewSubject} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subjects ({subjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Sub-Level</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">
                    {subject.name}
                  </TableCell>
                  <TableCell>
                    {subject.code || '-'}
                  </TableCell>
                  <TableCell>
                    {subject.level?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {subject.sub_level || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={subject.is_core ? 'default' : 'secondary'}>
                      {subject.is_core ? 'Core' : 'Elective'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subject.is_active ? 'default' : 'secondary'}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(subject)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {subjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No subjects found</p>
                      <p className="text-sm">Add your first subject to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Update subject information' : 'Create a new subject'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Subject Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., MATH101"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Subject description..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select 
                  value={formData.level_id} 
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      level_id: value,
                      sub_level: '' // Reset sub-level when level changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Level dropdown - show only if the selected level has children */}
              {(() => {
                const selectedLevelData = levels.find(l => l.id === formData.level_id);
                const hasChildren = selectedLevelData && levels.some(l => l.parent_id === selectedLevelData.id);
                const subLevels = hasChildren ? levels.filter(l => l.parent_id === selectedLevelData.id) : [];
                
                return hasChildren && subLevels.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="sub_level">Sub-Level *</Label>
                    <Select 
                      value={formData.sub_level} 
                      onValueChange={(value) => setFormData({ ...formData, sub_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub-level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Levels">All Levels</SelectItem>
                        {subLevels.map((subLevel) => (
                          <SelectItem key={subLevel.id} value={subLevel.name}>
                            {subLevel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_core"
                  checked={formData.is_core}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_core: checked })}
                />
                <Label htmlFor="is_core">Core Subject</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectManagement;
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface GradeConfig {
  id?: string;
  name: string;
  min_marks: number;
  max_marks: number;
  grade: string;
  grade_points: number;
  remark: string;
  division_contribution: number;
  is_active: boolean;
}

const defaultGrade: GradeConfig = {
  name: '',
  min_marks: 0,
  max_marks: 100,
  grade: '',
  grade_points: 1,
  remark: '',
  division_contribution: 1,
  is_active: true,
};

const GradingConfig = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeConfig | null>(null);
  const [formData, setFormData] = useState<GradeConfig>(defaultGrade);

  // Fetch grading config
  const { data: gradingConfig, isLoading } = useQuery({
    queryKey: ['grading-config-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_config')
        .select('*')
        .order('min_marks', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: GradeConfig) => {
      const payload = {
        name: data.grade, // Use grade as name for simplicity
        grade: data.grade,
        min_marks: data.min_marks,
        max_marks: data.max_marks,
        grade_points: data.grade_points,
        remark: data.remark || '',
        division_contribution: data.division_contribution,
        is_active: true,
      };
      
      if (data.id) {
        const { error } = await supabase
          .from('grading_config')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grading_config')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingGrade ? 'Grade updated' : 'Grade added');
      setIsDialogOpen(false);
      setEditingGrade(null);
      setFormData(defaultGrade);
      queryClient.invalidateQueries({ queryKey: ['grading-config-admin'] });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grading_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grade deleted');
      queryClient.invalidateQueries({ queryKey: ['grading-config-admin'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const openEditDialog = (grade: GradeConfig) => {
    setEditingGrade(grade);
    setFormData(grade);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingGrade(null);
    setFormData(defaultGrade);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.grade) {
      toast.error('Please enter a grade');
      return;
    }
    if (formData.min_marks > formData.max_marks) {
      toast.error('Minimum score cannot be greater than maximum score');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingGrade?.id });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grade Boundaries</CardTitle>
              <CardDescription>
                Define the score ranges for each grade
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add New Grade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Grade</TableHead>
                  <TableHead className="text-muted-foreground">Minimum Score</TableHead>
                  <TableHead className="text-muted-foreground">Maximum Score</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading grades...
                    </TableCell>
                  </TableRow>
                ) : gradingConfig?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No grades configured. Click "Add New Grade" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  gradingConfig?.map(grade => (
                    <TableRow key={grade.id} className="border-border">
                      <TableCell className="font-bold text-foreground">{grade.grade}</TableCell>
                      <TableCell className="text-foreground">{grade.min_marks}</TableCell>
                      <TableCell className="text-foreground">{grade.max_marks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(grade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(grade.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGrade ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
            <DialogDescription>
              Define the score range for this grade
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                value={formData.grade}
                onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value.toUpperCase() }))}
                placeholder="e.g., A, B, C"
                maxLength={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.min_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_marks: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.max_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_marks: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradingConfig;
